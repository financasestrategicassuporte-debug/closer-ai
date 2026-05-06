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
    body: JSON.stringify({ query, variables: variables || {} })
  });
  return res.json();
}

// Extrai o código único do Meet (ex: "abc-defg-hij") do link
function getMeetCode(url) {
  if (!url) return null;
  const match = (url + "").replace(/\?.*/g, "").match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  // 1. Busca reuniões pendentes (bot_joined, sem avaliação)
  const meetingIds = await db.lrange("meetings_list", 0, 49);
  const pending = [];
  for (const id of meetingIds) {
    const raw = await db.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m && m.status === "bot_joined" && !m.evalId) pending.push(m);
  }

  if (!pending.length) {
    return res.status(200).json({ message: "✅ Nenhuma reunião pendente de avaliação." });
  }

  // 2. Busca transcrições recentes do Fireflies
  let transcripts = [];
  try {
    const data = await ffQuery(`{
      transcripts(limit: 30) {
        id title date meeting_link
        sentences { text speaker_name }
      }
    }`);
    transcripts = data?.data?.transcripts || [];
  } catch(e) {
    return res.status(500).json({ error: "Erro ao buscar transcrições: " + e.message });
  }

  const results = [];

  for (const meeting of pending) {
    const meetCode = getMeetCode(meeting.meetLink);

    // Busca SOMENTE pelo código único do link do Meet — sem fallback
    let matched = null;
    if (meetCode) {
      matched = transcripts.find(t => {
        const tCode = getMeetCode(t.meeting_link || "");
        return tCode && tCode === meetCode;
      });
    }

    if (!matched) {
      results.push({
        closer: meeting.closer,
        meetLink: meeting.meetLink,
        status: "⏳ Transcrição não encontrada ainda. Aguarde 5-10 min após o fim da reunião e tente novamente."
      });
      continue;
    }

    if (!matched.sentences || !matched.sentences.length) {
      results.push({
        closer: meeting.closer,
        status: "⏳ Transcrição vazia — Fireflies ainda processando."
      });
      continue;
    }

    const transcript = matched.sentences
      .map(s => `${s.speaker_name || "Participante"}: ${s.text}`)
      .join("\n");

    // 3. Avalia com Claude
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        messages: [{
          role: "user",
          content: `Você é avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT:
${meeting.scriptSteps || "Não informado"}

CRITÉRIOS:
${meeting.scriptCriteria || "Não informado"}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS JSON válido sem markdown:
{
  "score": <0-100>,
  "feedback": "<análise em 2-3 parágrafos>",
  "criteria_scores": { "<critério>": <0-100> },
  "highlights": ["<positivo>"],
  "improvements": ["<melhoria>"],
  "closer_analysis": {
    "melhor_etapa": "<texto>",
    "etapa_critica": "<texto>",
    "tecnicas_usadas": ["<técnica>"],
    "oportunidades_perdidas": ["<oportunidade>"],
    "postura_geral": "<texto>"
  },
  "lead_info": {
    "segmento": "<texto>",
    "situacao_atual": "<texto>",
    "principais_dores": ["<dor>"],
    "objecoes_levantadas": ["<objeção>"],
    "nivel_interesse": "<alto/médio/baixo>",
    "detalhes_negocio": "<texto>",
    "proximo_passo": "<texto>"
  }
}`
        }]
      });

      const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());

      const evalId = `eval_${meeting.id}`;
      await db.set(evalId, JSON.stringify({
        id: evalId,
        meetingId: meeting.id,
        closer: meeting.closer,
        scriptName: meeting.scriptName,
        transcript,
        evaluation,
        createdAt: new Date().toISOString()
      }));

      meeting.status = "evaluated";
      meeting.evalId = evalId;
      meeting.firefliesTranscriptId = matched.id;
      await db.set(meeting.id, JSON.stringify(meeting));

      results.push({
        closer: meeting.closer,
        status: `✅ Avaliado! Score: ${evaluation.score}%`
      });

    } catch(e) {
      results.push({
        closer: meeting.closer,
        status: "❌ Erro ao avaliar: " + e.message
      });
    }
  }

  const evaluated = results.filter(r => r.status.startsWith("✅")).length;
  const pending2 = results.filter(r => r.status.startsWith("⏳")).length;

  const message = evaluated > 0
    ? `✅ ${evaluated} reunião(ões) avaliada(s)! Veja em Avaliações da IA.`
    : pending2 > 0
    ? `⏳ Transcrição ainda não pronta. Aguarde 5-10 min após a reunião terminar e tente novamente.`
    : `❌ Erro ao processar. Verifique os créditos da Anthropic.`;

  return res.status(200).json({ message, results });
};
