const { Redis } = require("@upstash/redis");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { meetingId } = req.body;
  if (!meetingId) return res.status(400).json({ error: "meetingId obrigatório" });

  const db = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  });

  const raw = await db.get(meetingId);
  const meeting = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada" });

  // Remove avaliação errada
  if (meeting.evalId) {
    await db.del(meeting.evalId);
  }

  // Reseta status para bot_joined
  meeting.status = "bot_joined";
  meeting.evalId = null;
  await db.set(meetingId, JSON.stringify(meeting));

  return res.status(200).json({ success: true, message: "Reunião resetada — pronta para reavaliação" });
};
