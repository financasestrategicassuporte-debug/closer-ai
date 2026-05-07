const { Redis } = require("@upstash/redis");
const Anthropic = require("@anthropic-ai/sdk");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { meetingId, transcript } = req.body || {};
  if (!meetingId || !transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: "meetingId e transcrição são obrigatórios" });
  }

  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  const raw = await db.get(meetingId);
  const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada" });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{
        role: "user",
        content: `Você é avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT DA REUNIÃO:
${meeting.scriptSteps || "Não informado"}

CRITÉRIOS DE AVALIAÇÃO:
${meeting.scriptCriteria || "Não informado"}

TRANSCRIÇÃO DA REUNIÃO:
${transcript}

Retorne APENAS JSON válido sem markdown:
{"score":0,"feedback":"","criteria_scores":{},"highlights":[],"improvements":[],"closer_analysis":{"melhor_etapa":"","etapa_critica":"","tecnicas_usadas":[],"oportunidades_perdidas":[],"postura_geral":""},"lead_info":{"segmento":"","situacao_atual":"","principais_dores":[],"objecoes_levantadas":[],"nivel_interesse":"","detalhes_negocio":"","proximo_passo":""}}`
      }]
    });

    const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
    const evalId = `eval_${meetingId}`;

    await db.set(evalId, JSON.stringify({
      id: evalId, meetingId,
      closer: meeting.closer,
      scriptName: meeting.scriptName,
      transcript,
      evaluation,
      createdAt: new Date().toISOString()
    }));

    meeting.status = "evaluated";
    meeting.evalId = evalId;
    await db.set(meetingId, JSON.stringify(meeting));

    return res.status(200).json({ success: true, score: evaluation.score });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
