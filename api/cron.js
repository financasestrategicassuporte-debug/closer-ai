const { Redis } = require("@upstash/redis");
const Anthropic = require("@anthropic-ai/sdk");

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function ffQuery(query, variables) {
  const res = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

function getKV() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });
}

module.exports = async function handler(req, res) {
  // Proteção: só Vercel Cron ou chamada manual autorizada
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && req.headers["x-vercel-cron"] !== "1") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const kv = getKV();
  const meetingIds = await kv.lrange("meetings_list", 0, 49);
  const results = [];

  for (const id of meetingIds) {
    const raw = await kv.get(id);
    const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!meeting) continue;

    // Só processa reuniões com bot mas ainda não avaliadas
    if (meeting.status !== "bot_joined" || !meeting.firefliesMeetingId) continue;

    console.log(`Verificando transcrição para ${meeting.closer} - ${meeting.firefliesMeetingId}`);

    try {
      // Busca transcrição no Fireflies
      const data = await ffQuery(
        `query T($id: String!) { transcript(id: $id) { id title date sentences { text speaker_name } } }`,
        { id: meeting.firefliesMeetingId }
      );

      const transcript_data = data?.data?.transcript;
      if (!transcript_data || !transcript_data.sentences || !transcript_data.sentences.length) {
        results.push({ id, status: "transcript_not_ready" });
        continue;
      }

      const transcript = transcript_data.sentences
        .map(s => `${s.speaker_name || "Participante"}: ${s.text}`)
        .join("\n");

      // Avalia com Claude
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        messages: [{
          role: "user",
          content: `Você é um avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT DA REUNIÃO:
${meeting.scriptSteps}

CRITÉRIOS DE AVALIAÇÃO:
${meeting.scriptCriteria}

TRANSCRIÇÃO DA REUNIÃO:
${transcript}

Retorne APENAS um JSON válido sem markdown:
{
  "score": <0-100>,
  "feedback": "<análise geral em 2-3 parágrafos>",
  "criteria_scores": { "<critério>": <0-100> },
  "highlights": ["<ponto positivo>"],
  "improvements": ["<melhoria>"],
  "closer_analysis": {
    "melhor_etapa": "<etapa e motivo>",
    "etapa_critica": "<etapa e como melhorar>",
    "tecnicas_usadas": ["<técnica>"],
    "oportunidades_perdidas": ["<oportunidade>"],
    "postura_geral": "<avaliação da postura>"
  },
  "lead_info": {
    "segmento": "<segmento do lead>",
    "situacao_atual": "<situação atual>",
    "principais_dores": ["<dor>"],
    "objecoes_levantadas": ["<objeção>"],
    "nivel_interesse": "<alto/médio/baixo e motivo>",
    "detalhes_negocio": "<detalhes mencionados>",
    "proximo_passo": "<próximo passo combinado>"
  }
}`
        }]
      });

      const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());

      // Salva avaliação
      const evalId = `eval_${id}`;
      await kv.set(evalId, JSON.stringify({
        id: evalId, meetingId: id,
        closer: meeting.closer, scriptName: meeting.scriptName,
        transcript, evaluation,
        createdAt: new Date().toISOString()
      }));

      meeting.status = "evaluated";
      meeting.evalId = evalId;
      await kv.set(id, JSON.stringify(meeting));

      results.push({ id, closer: meeting.closer, status: "evaluated", score: evaluation.score });
      console.log(`✅ Avaliado: ${meeting.closer} - Score: ${evaluation.score}`);

    } catch (e) {
      console.log(`❌ Erro em ${id}:`, e.message);
      results.push({ id, status: "error", error: e.message });
    }
  }

  return res.status(200).json({ checked: meetingIds.length, results });
};
