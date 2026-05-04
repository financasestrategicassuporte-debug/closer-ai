const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const ids = await kv.lrange("meetings_list", 0, 49);
    const meetings = await Promise.all(ids.map(async id => {
      const raw = await kv.get(id);
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    }));
    return res.status(200).json({ meetings: meetings.filter(Boolean).reverse() });
  } catch (e) {
    return res.status(500).json({ error: "Banco de dados não configurado. Crie o Vercel KV em Storage.", detail: e.message });
  }
};
