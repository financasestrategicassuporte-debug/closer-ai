const { Redis } = require("@upstash/redis");
const Anthropic = require("@anthropic-ai/sdk");
const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { meetingId: firefliesMeetingId } = req.body;
  if (!firefliesMeetingId) return res.status(200).json({ received: true });

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const kv = new Redis({ url, token });

  const meetingIds = await kv.lrange("meetings_list", 0, -1);
  let meeting = null, meetingKey = null;
  for (const id of meetingIds) {
    const raw = await kv.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m?.firefliesMeetingId === firefliesMeetingId) { meeting = m; meetingKey = id; break; }
  }
  if (!meeting) return res.status(200).json({ received: true });

  let transcript = "";
  try {
    const tRes = await fetch(FIREFLIES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}` },
      body: JSON.stringify({ query: `query T($id:String!){transcript(id:$id){sentences{text speaker_name}}}`, variables: { id: firefliesMeetingId } })
    });
    const tData = await tRes.json();
    transcript = (tData?.data?.transcript?.sentences || []).map(s => `${s.speaker_name}: ${s.text}`).join("\n");
  } catch(e) { transcript = "[Erro ao buscar transcrição]"; }

  let evaluation = { score: 0, feedback: "Erro ao avaliar.", criteria_scores: {}, highlights: [], improvements: [], closer_analysis: {}, lead_info: {} };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: `Você é um avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT DA REUNIÃO:
${meeting.scriptSteps}

CRITÉRIOS DE AVALIAÇÃO:
${meeting.scriptCriteria}

TRANSCRIÇÃO DA REUNIÃO:
${transcript}

Analise a reunião e retorne APENAS um JSON válido sem markdown:
{
  "score": <0-100>,
  "feedback": "<análise geral do closer em 2-3 parágrafos>",
  "criteria_scores": { "<critério>": <0-100> },
  "highlights": ["<ponto positivo 1>", "<ponto positivo 2>"],
  "improvements": ["<melhoria 1>", "<melhoria 2>"],
  "closer_analysis": {
    "melhor_etapa": "<qual etapa o closer foi melhor e por quê>",
    "etapa_critica": "<qual etapa poderia ter melhorado e como>",
    "tecnicas_usadas": ["<técnica de venda identificada>"],
    "oportunidades_perdidas": ["<oportunidade que o closer deixou passar>"],
    "postura_geral": "<avaliação da postura, tom e condução geral>"
  },
  "lead_info": {
    "segmento": "<segmento/nicho do lead identificado na conversa>",
    "situacao_atual": "<situação atual do lead conforme revelada na conversa>",
    "principais_dores": ["<dor 1 mencionada>", "<dor 2>"],
    "objecoes_levantadas": ["<objeção 1>", "<objeção 2>"],
    "nivel_interesse": "<alto/médio/baixo e justificativa>",
    "detalhes_negocio": "<detalhes do negócio mencionados: número de unidades, faturamento, equipe, etc>",
    "proximo_passo": "<qual foi o próximo passo combinado, se houve>"
  }
}` }]
    });
    evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
  } catch(e) { console.log("Erro IA:", e.message); }

  const evalId = `eval_${meetingKey}`;
  await kv.set(evalId, JSON.stringify({ id: evalId, meetingId: meetingKey, closer: meeting.closer, scriptName: meeting.scriptName, transcript, evaluation, createdAt: new Date().toISOString() }));
  meeting.status = "evaluated"; meeting.evalId = evalId;
  await kv.set(meetingKey, JSON.stringify(meeting));
  return res.status(200).json({ success: true, score: evaluation.score });
};
