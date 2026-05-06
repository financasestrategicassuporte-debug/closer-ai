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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  // 1. Busca reuniões pendentes de avaliação
  const meetingIds = await db.lrange("meetings_list", 0, 49);
  const pending = [];
  for (const id of meetingIds) {
    const raw = await db.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m && m.status === "bot_joined" && !m.evalId) pending.push(m);
  }

  if (!pending.length) {
    return res.status(200).json({ message: "Nenhuma reunião pendente de avaliação" });
  }

  // 2. Busca transcrições recentes do Fireflies (últimas 20)
  let transcripts = [];
  try {
    const data = await ffQuery(`{
      transcripts(limit: 20) {
        id
        title
        date
        meeting_link
        sentences { text speaker_name }
      }
    }`);
    transcripts = data?.data?.transcripts || [];
  } catch(e) {
    return res.status(500).json({ error: "Erro ao buscar transcrições do Fireflies: " + e.message });
  }

  if (!transcripts.length) {
    return res.status(200).json({ message: "⏳ Nenhuma transcrição disponível ainda no Fireflies. Aguarde 5-10 minutos após o fim da reunião." });
  }

  const results = [];

  for (const meeting of pending) {
    // 3. Tenta casar a transcrição com a reunião pelo link ou pela data
    const meetLinkClean = (meeting.meetLink || "").replace("https://", "").replace(/\?.*/g, "").trim();
    const meetDate = new Date(meeting.scheduledAt || meeting.createdAt);

    let matched = null;

    // Tenta pelo link
    matched = transcripts.find(t => {
      const tLink = (t.meeting_link || "").replace("https://", "").replace(/\?.*/g, "").trim();
      return tLink && meetLinkClean && tLink.includes(meetLinkClean.split("?")[0]);
    });

    // Se não achou pelo link, pega a transcrição mais próxima em tempo (±6h)
    if (!matched) {
      matched = transcripts.find(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date);
        const diffHours = Math.abs(tDate - meetDate) / 1000 / 3600;
        return diffHours < 6;
      });
    }

    // Se ainda não achou, pega a mais recente com conteúdo
    if (!matched) {
      matched = transcripts.find(t => t.sentences && t.sentences.length > 0);
    }

    if (!matched || !matched.sentences || !matched.sentences.length) {
      results.push({ closer: meeting.closer, status: "⏳ Transcrição ainda não pronta. Tente em 5 minutos." });
      continue;
    }

    const transcript = matched.sentences.map(s => `${s.speaker_name || "Participante"}: ${s.text}`).join("\n");

    // 4. Avalia com Claude
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        messages: [{
          role: "user",
          content: `Você é um avaliador especialista em reuniões de vendas em português brasileiro.

SCRIPT DA REUNIÃO:
${meeting.scriptSteps || "Script não informado"}

CRITÉRIOS DE AVALIAÇÃO:
${meeting.scriptCriteria || "Critérios não informados"}

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
    "segmento": "<segmento>",
    "situacao_atual": "<situação>",
    "principais_dores": ["<dor>"],
    "objecoes_levantadas": ["<objeção>"],
    "nivel_interesse": "<alto/médio/baixo>",
    "detalhes_negocio": "<detalhes>",
    "proximo_passo": "<próximo passo>"
  }
}`
        }]
      });

      const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());

      // 5. Salva avaliação
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

      results.push({ closer: meeting.closer, status: `✅ Avaliado! Score: ${evaluation.score}%` });

    } catch(e) {
      results.push({ closer: meeting.closer, status: "❌ Erro ao avaliar: " + e.message });
    }
  }

  const evaluated = results.filter(r => r.status.startsWith("✅")).length;
  const msg = evaluated > 0
    ? `✅ ${evaluated} reunião(ões) avaliada(s)! Acesse Avaliações da IA na plataforma.`
    : results[0]?.status || "Sem resultado";

  return res.status(200).json({ message: msg, results });
};
