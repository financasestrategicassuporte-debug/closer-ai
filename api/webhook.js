let kv;
try { kv = require("@vercel/kv").kv; } catch(e) {
  const { Redis } = require("@upstash/redis");
  kv = new Redis({ url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN });
}
const Anthropic = require("@anthropic-ai/sdk");
const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { meetingId: firefliesMeetingId } = req.body;
  if (!firefliesMeetingId) return res.status(200).json({ received: true });
  const meetingIds = await kv.lrange("meetings_list", 0, -1);
  let meeting = null, meetingKey = null;
  for (const id of meetingIds) {
    const raw = await kv.get(id);
    const m = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (m?.firefliesMeetingId === firefliesMeetingId) { meeting = m; meetingKey = id; break; }
  }
  if (!meeting) return res.status(200).json({ received: true });
  let transcript = "";
  try {
    const tRes = await fetch(FIREFLIES_API, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}` }, body: JSON.stringify({ query: `query T($id:String!){transcript(id:$id){sentences{text speaker_name}}}`, variables: { id: firefliesMeetingId } }) });
    const tData = await tRes.json();
    transcript = (tData?.data?.transcript?.sentences || []).map(s => `${s.speaker_name}: ${s.text}`).join("\n");
  } catch(e) { transcript = "[Erro transcrição]"; }
  let evaluation = { score: 0, feedback: "Erro ao avaliar.", criteria_scores: {}, highlights: [], improvements: [] };
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: `Avaliador de reuniões de vendas em português.\nSCRIPT:\n${meeting.scriptSteps}\nCRITÉRIOS:\n${meeting.scriptCriteria}\nTRANSCRIÇÃO:\n${transcript}\nRetorne APENAS JSON: {"score":0-100,"feedback":"texto","criteria_scores":{"critério":score},"highlights":[],"improvements":[]}` }] });
    evaluation = JSON.parse(msg.content[0].text.replace(/```json|```/g, "").trim());
  } catch(e) {}
  const evalId = `eval_${meetingKey}`;
  await kv.set(evalId, JSON.stringify({ id: evalId, meetingId: meetingKey, closer: meeting.closer, scriptName: meeting.scriptName, transcript, evaluation, createdAt: new Date().toISOString() }));
  meeting.status = "evaluated"; meeting.evalId = evalId;
  await kv.set(meetingKey, JSON.stringify(meeting));
  return res.status(200).json({ success: true });
};
