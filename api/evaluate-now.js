const { Redis } = require("@upstash/redis");
const Anthropic = require("@anthropic-ai/sdk");
const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function ffQuery(q, v) {
  const r = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}` },
    body: JSON.stringify({ query: q, variables: v || {} })
  });
  return r.json();
}

async function avaliar(db, meeting, transcript) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2500,
    messages: [{ role: "user", content: `Avaliador de reuniões de vendas em português.\nSCRIPT:\n${meeting.scriptSteps||""}\nCRITÉRIOS:\n${meeting.scriptCriteria||""}\nTRANSCRIÇÃO:\n${transcript}\nRetorne APENAS JSON sem markdown:\n{"score":0,"feedback":"","criteria_scores":{},"highlights":[],"improvements":[],"closer_analysis":{"melhor_etapa":"","etapa_critica":"","tecnicas_usadas":[],"oportunidades_perdidas":[],"postura_geral":""},"lead_info":{"segmento":"","situacao_atual":"","principais_dores":[],"objecoes_levantadas":[],"nivel_interesse":"","detalhes_negocio":"","proximo_passo":""}}` }]
  });
  const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g,"").trim());
  const evalId = `eval_${meeting.id}`;
  await db.set(evalId, JSON.stringify({ id: evalId, meetingId: meeting.id, closer: meeting.closer, scriptName: meeting.scriptName, transcript, evaluation, createdAt: new Date().toISOString() }));
  meeting.status = "evaluated"; meeting.evalId = evalId;
  await db.set(meeting.id, JSON.stringify(meeting));
  return evaluation.score;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  // POST: avalia uma reunião com uma transcrição específica
  if (req.method === "POST") {
    const { meetingId, transcriptId } = req.body || {};
    if (!meetingId || !transcriptId) return res.status(400).json({ error: "meetingId e transcriptId obrigatórios" });
    const raw = await db.get(meetingId);
    const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!meeting) return res.status(404).json({ error: "Reunião não encontrada" });
    const data = await ffQuery(`query T($id:String!){transcript(id:$id){sentences{text speaker_name}}}`, { id: transcriptId });
    const sentences = data?.data?.transcript?.sentences || [];
    if (!sentences.length) return res.status(400).json({ error: "Transcrição vazia ou não processada ainda" });
    const transcript = sentences.map(s => `${s.speaker_name||"Participante"}: ${s.text}`).join("\n");
    try {
      const score = await avaliar(db, meeting, transcript);
      return res.status(200).json({ success: true, score, message: `Avaliado com sucesso! Score: ${score}%` });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET: retorna reuniões pendentes + transcrições disponíveis
  const ids = await db.lrange("meetings_list", 0, 49);
  const pending = [];
  for (const id of ids) {
    const raw = await db.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m && m.status === "bot_joined" && !m.evalId) pending.push({ id: m.id, closer: m.closer, scriptName: m.scriptName, meetLink: m.meetLink, scheduledAt: m.scheduledAt });
  }

  const ffData = await ffQuery(`{ transcripts(limit: 20) { id title date meeting_link } }`);
  const transcripts = (ffData?.data?.transcripts || []).map(t => ({ id: t.id, title: t.title || "Sem título", date: t.date, meeting_link: t.meeting_link || "" }));

  return res.status(200).json({ pending_meetings: pending, available_transcripts: transcripts });
};
