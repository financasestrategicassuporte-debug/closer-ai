const { Redis } = require("@upstash/redis");

function getKV() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Banco de dados não configurado. Conecte o Upstash no painel da Vercel.");
  return new Redis({ url, token });
}

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function firefliesRequest(query, variables) {
  try {
    const res = await fetch(FIREFLIES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}` },
      body: JSON.stringify({ query, variables })
    });
    return res.json();
  } catch(e) {
    return { errors: [{ message: e.message }] };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { closer, closerId, scriptId, scriptName, scriptSteps, scriptCriteria, meetLink, scheduledAt } = req.body || {};
  if (!meetLink) return res.status(400).json({ error: "meetLink é obrigatório" });

  const fullLink = meetLink.startsWith("http") ? meetLink : `https://${meetLink}`;
  const meetingId = `meeting_${Date.now()}`;

  // Tenta enviar o bot (sem bloquear se falhar)
  let firefliesMeetingId = null;
  let botError = null;

  if (process.env.FIREFLIES_API_KEY) {
    const liveData = await firefliesRequest(
      `mutation AddToLiveMeeting($url: String!, $title: String!) { addToLiveMeeting(url: $url, title: $title) { id } }`,
      { url: fullLink, title: `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}` }
    );
    if (liveData?.data?.addToLiveMeeting?.id) {
      firefliesMeetingId = liveData.data.addToLiveMeeting.id;
    } else {
      const schedTime = scheduledAt ? new Date(scheduledAt).getTime() : (Date.now() + 300000);
      const schedData = await firefliesRequest(
        `mutation ScheduleNotetaker($url: String!, $title: String!, $startTime: Long!) { scheduleNotetaker(url: $url, title: $title, start_time: $startTime) { id } }`,
        { url: fullLink, title: `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}`, startTime: schedTime }
      );
      firefliesMeetingId = schedData?.data?.scheduleNotetaker?.id || null;
      botError = !firefliesMeetingId ? (liveData?.errors?.[0]?.message || "Reunião não está ao vivo ainda") : null;
    }
  } else {
    botError = "FIREFLIES_API_KEY não configurada";
  }

  // Salva a reunião no banco
  const meeting = {
    id: meetingId, closer: closer || "", closerId: closerId || "",
    scriptId: scriptId || "", scriptName: scriptName || "",
    scriptSteps: scriptSteps || "", scriptCriteria: scriptCriteria || "",
    meetLink: fullLink,
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: firefliesMeetingId ? "bot_joined" : "scheduled",
    firefliesMeetingId, botError,
    createdAt: new Date().toISOString()
  };

  try {
    const kv = getKV();
    await kv.set(meetingId, JSON.stringify(meeting));
    await kv.lpush("meetings_list", meetingId);
    return res.status(200).json({ success: true, meeting });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
