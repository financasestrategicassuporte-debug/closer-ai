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

function getMeetCode(url) {
  const m = (url + "").replace(/\?.*/g, "").match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return m ? m[1].toLowerCase() : null;
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

  // POST = avaliação manual com transcriptId específico
  if (req.method === "POST") {
    const { meetingId, transcriptId } = req.body;
    if (!meetingId || !transcriptId) return res.status(400).json({ error: "meetingId e transcriptId obrigatórios" });

    const raw = await db.get(meetingId);
    const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!meeting) return res.status(404).json({ error: "Reunião não encontrada" });

    // Busca transcrição específica
    const data = await ffQuery(`query T($id: String!) { transcript(id: $id) { id title sentences { text speaker_name } } }`, { id: transcriptId });
    const td = data?.data?.transcript;
    if (!td?.sentences?.length) return res.status(400).json({ error: "Transcrição vazia ou não encontrada" });

    const transcript = td.sentences.map(s => `${s.speaker_name || "Participante"}: ${s.text}`).join("\n");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 2500,
      messages: [{ role: "user", content: `Avaliador de reuniões de vendas em português.\nSCRIPT:\n${meeting.scriptSteps || ""}\nCRITÉRIOS:\n${meeting.scriptCriteria || ""}\nTRANSCRIÇÃO:\n${transcript}\nRetorne APENAS JSON: {"score":0-100,"feedback":"texto","criteria_scores":{"critério":0-100},"highlights":["texto"],"improvements":["texto"],"closer_analysis":{"melhor_etapa":"texto","etapa_critica":"texto","tecnicas_usadas":["texto"],"oportunidades_perdidas":["texto"],"postura_geral":"texto"},"lead_info":{"segmento":"texto","situacao_atual":"texto","principais_dores":["texto"],"objecoes_levantadas":["texto"],"nivel_interesse":"texto","detalhes_negocio":"texto","proximo_passo":"texto"}}` }]
    });

    const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
    const evalId = `eval_${meetingId}`;
    await db.set(evalId, JSON.stringify({ id: evalId, meetingId, closer: meeting.closer, scriptName: meeting.scriptName, transcript, evaluation, createdAt: new Date().toISOString() }));
    meeting.status = "evaluated"; meeting.evalId = evalId;
    await db.set(meetingId, JSON.stringify(meeting));
    return res.status(200).json({ success: true, score: evaluation.score, message: `✅ Avaliado! Score: ${evaluation.score}%` });
  }

  // GET = tenta match automático, retorna transcrições disponíveis se não achar
  const ids = await db.lrange("meetings_list", 0, 49);
  const pending = [];
  for (const id of ids) {
    const raw = await db.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m && m.status === "bot_joined" && !m.evalId) pending.push(m);
  }

  if (!pending.length) return res.status(200).json({ message: "✅ Nenhuma reunião pendente." });

  // Busca transcrições do Fireflies
  const ffData = await ffQuery(`{ transcripts(limit: 20) { id title date meeting_link sentences { text speaker_name } } }`);
  const transcripts = ffData?.data?.transcripts || [];

  const results = [];
  let anyEvaluated = false;

  for (const meeting of pending) {
    const meetCode = getMeetCode(meeting.meetLink);
    let matched = transcripts.find(t => { const c = getMeetCode(t.meeting_link || ""); return c && meetCode && c === meetCode; });

    if (matched && matched.sentences?.length) {
      // Avalia automaticamente
      try {
        const transcript = matched.sentences.map(s => `${s.speaker_name || "Participante"}: ${s.text}`).join("\n");
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
          model: "claude-sonnet-4-20250514", max_tokens: 2500,
          messages: [{ role: "user", content: `Avaliador de reuniões de vendas em português.\nSCRIPT:\n${meeting.scriptSteps || ""}\nCRITÉRIOS:\n${meeting.scriptCriteria || ""}\nTRANSCRIÇÃO:\n${transcript}\nRetorne APENAS JSON: {"score":0-100,"feedback":"texto","criteria_scores":{"critério":0-100},"highlights":["texto"],"improvements":["texto"],"closer_analysis":{"melhor_etapa":"texto","etapa_critica":"texto","tecnicas_usadas":["texto"],"oportunidades_perdidas":["texto"],"postura_geral":"texto"},"lead_info":{"segmento":"texto","situacao_atual":"texto","principais_dores":["texto"],"objecoes_levantadas":["texto"],"nivel_interesse":"texto","detalhes_negocio":"texto","proximo_passo":"texto"}}` }]
        });
        const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
        const evalId = `eval_${meeting.id}`;
        await db.set(evalId, JSON.stringify({ id: evalId, meetingId: meeting.id, closer: meeting.closer, scriptName: meeting.scriptName, transcript, evaluation, createdAt: new Date().toISOString() }));
        meeting.status = "evaluated"; meeting.evalId = evalId;
        await db.set(meeting.id, JSON.stringify(meeting));
        results.push({ meetingId: meeting.id, closer: meeting.closer, status: "evaluated", score: evaluation.score });
        anyEvaluated = true;
      } catch(e) {
        results.push({ meetingId: meeting.id, closer: meeting.closer, status: "error", error: e.message });
      }
    } else {
      // Retorna transcrições disponíveis para seleção manual
      const available = transcripts.filter(t => t.sentences?.length).map(t => ({ id: t.id, title: t.title || "Sem título", date: t.date, meeting_link: t.meeting_link || "" }));
      results.push({ meetingId: meeting.id, closer: meeting.closer, meetLink: meeting.meetLink, status: "manual_needed", available_transcripts: available });
    }
  }

  const evaluated = results.filter(r => r.status === "evaluated").length;
  const needsManual = results.filter(r => r.status === "manual_needed");

  return res.status(200).json({
    message: evaluated > 0 ? `✅ ${evaluated} avaliada(s) automaticamente!` : needsManual.length ? "⚠️ Link não encontrado no Fireflies — selecione a transcrição manualmente" : "Sem resultados",
    results,
    needs_manual: needsManual
  });
};
