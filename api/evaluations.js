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
    if (!ids || !ids.length) return res.status(200).json({ evaluations: [] });
    const evals = [];
    for (const id of ids) {
      const raw = await kv.get(`eval_${id}`);
      if (raw) evals.push(typeof raw === "string" ? JSON.parse(raw) : raw);
    }
    return res.status(200).json({ evaluations: evals.reverse() });
  } catch (e) {
    return res.status(500).json({ error: "Banco não configurado.", detail: e.message });
  }
};
