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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const kv = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  const meetingIds = await kv.lrange("meetings_list", 0, 49);
  const results = [];

  for (const id of meetingIds) {
    const raw = await kv.get(id);
    const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!meeting) continue;

    // Processa reuniões com bot (bot_joined) ou que ainda não foram avaliadas
    const needsEval = (meeting.status === "bot_joined" || meeting.status === "scheduled") && !meeting.evalId;
    if (!needsEval || !meeting.firefliesMeetingId) {
      results.push({ id, closer: meeting.closer, status: meeting.status, skipped: true });
      continue;
    }

    try {
      // Busca transcrições recentes do Fireflies
      const data = await ffQuery(
        `query T($id: String!) { transcript(id: $id) { id title sentences { text speaker_name } } }`,
        { id: meeting.firefliesMeetingId }
      );

      const td = data?.data?.transcript;
      if (!td || !td.sentences || !td.sentences.length) {
        results.push({ id, closer: meeting.closer, status: "transcript_not_ready_yet" });
        continue;
      }

      const transcript = td.sentences.map(s => `${s.speaker_name || "Participante"}: ${s.text}`).join("\n");

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        messages: [{
          role: "user",
          content: `Você é avaliador especialista em reuniões de vendas em português.\n\nSCRIPT:\n${meeting.scriptSteps}\n\nCRITÉRIOS:\n${meeting.scriptCriteria}\n\nTRANSCRIÇÃO:\n${transcript}\n\nRetorne APENAS JSON válido:\n{"score":0-100,"feedback":"texto 2-3 parágrafos","criteria_scores":{"critério":0-100},"highlights":["ponto"],"improvements":["melhoria"],"closer_analysis":{"melhor_etapa":"texto","etapa_critica":"texto","tecnicas_usadas":["técnica"],"oportunidades_perdidas":["oportunidade"],"postura_geral":"texto"},"lead_info":{"segmento":"texto","situacao_atual":"texto","principais_dores":["dor"],"objecoes_levantadas":["objeção"],"nivel_interesse":"alto/médio/baixo","detalhes_negocio":"texto","proximo_passo":"texto"}}`
        }]
      });

      const evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
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

    } catch (e) {
      results.push({ id, closer: meeting.closer, status: "error", error: e.message });
    }
  }

  const evaluated = results.filter(r => r.status === "evaluated");
  const pending = results.filter(r => r.status === "transcript_not_ready_yet");
  const skipped = results.filter(r => r.skipped);

  return res.status(200).json({
    message: evaluated.length ? `✅ ${evaluated.length} reunião(ões) avaliada(s)!` : pending.length ? `⏳ Transcrição ainda não pronta — tente novamente em 5 minutos` : `Nenhuma reunião pendente`,
    evaluated, pending, skipped
  });
};
