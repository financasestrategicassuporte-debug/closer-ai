const { Redis } = require("@upstash/redis");
const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Busca transcrições do Fireflies
  const ffRes = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}` },
    body: JSON.stringify({ query: `{ transcripts(limit: 10) { id title date meeting_link } }` })
  });
  const ffData = await ffRes.json();
  const transcripts = ffData?.data?.transcripts || [];

  // Busca reuniões pendentes do banco
  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });
  const ids = await db.lrange("meetings_list", 0, 10);
  const meetings = [];
  for (const id of ids) {
    const raw = await db.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m) meetings.push({ id: m.id, closer: m.closer, meetLink: m.meetLink, status: m.status, evalId: m.evalId });
  }

  return res.status(200).json({
    fireflies_transcripts: transcripts.map(t => ({ id: t.id, title: t.title, date: t.date, meeting_link: t.meeting_link })),
    platform_meetings: meetings
  });
};
