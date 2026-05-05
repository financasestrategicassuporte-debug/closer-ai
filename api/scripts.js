const { Redis } = require("@upstash/redis");
function kv() {
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN });
}
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const db = kv();
  if (req.method === "GET") {
    try {
      const raw = await db.get("scripts_list");
      const list = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
      return res.json({ scripts: list });
    } catch(e) { return res.json({ scripts: [] }); }
  }
  if (req.method === "POST") {
    const { id, name, steps, criteria } = req.body;
    if (!name || !steps) return res.status(400).json({ error: "nome e etapas obrigatórios" });
    const raw = await db.get("scripts_list").catch(() => null);
    const list = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
    list.push({ id: id || Date.now().toString(), name, steps, criteria: criteria || "" });
    await db.set("scripts_list", JSON.stringify(list));
    return res.json({ scripts: list });
  }
  if (req.method === "DELETE") {
    const { id } = req.body;
    const raw = await db.get("scripts_list").catch(() => null);
    const list = (raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : []).filter(s => s.id !== id);
    await db.set("scripts_list", JSON.stringify(list));
    return res.json({ scripts: list });
  }
  return res.status(405).end();
};
