let kv;
try { kv = require("@vercel/kv").kv; } catch(e) {
  const { Redis } = require("@upstash/redis");
  kv = new Redis({ url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const ids = await kv.lrange("meetings_list", 0, 49);
    if (!ids || !ids.length) return res.status(200).json({ meetings: [] });
    const meetings = await Promise.all(ids.map(async id => {
      const raw = await kv.get(id);
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    }));
    return res.status(200).json({ meetings: meetings.filter(Boolean).reverse() });
  } catch (e) {
    return res.status(500).json({ error: "Banco não configurado. Conecte o Upstash KV.", detail: e.message });
  }
};
