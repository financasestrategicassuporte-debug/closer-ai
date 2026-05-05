const { Redis } = require("@upstash/redis");
function kv() {
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN });
}
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const { closers, scripts } = req.body;
  const db = kv();
  if (closers && closers.length) await db.set("closers_list", JSON.stringify(closers));
  if (scripts && scripts.length) await db.set("scripts_list", JSON.stringify(scripts));
  return res.status(200).json({ ok: true, closers: closers?.length || 0, scripts: scripts?.length || 0 });
};
