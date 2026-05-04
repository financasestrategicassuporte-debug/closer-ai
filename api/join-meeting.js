const { kv } = require("@vercel/kv");

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function firefliesRequest(query, variables) {
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { closer, closerId, scriptId, scriptName, scriptSteps, scriptCriteria, meetLink, scheduledAt } = req.body;
  if (!meetLink || !scriptSteps) return res.status(400).json({ error: "meetLink e script são obrigatórios" });

  const meetingId = `meeting_${Date.now()}`;
  const fullLink = meetLink.startsWith("http") ? meetLink : `https://${meetLink}`;

  let firefliesMeetingId = null;
  let botError = null;

  try {
    const liveData = await firefliesRequest(
      `mutation AddToLiveMeeting($url: String!, $title: String!) {
        addToLiveMeeting(url: $url, title: $title) { id title }
      }`,
      { url: fullLink, title: `CloserAI - ${closer} - ${scriptName}` }
    );
    if (liveData?.data?.addToLiveMeeting?.id) {
      firefliesMeetingId = liveData.data.addToLiveMeeting.id;
    } else {
      const schedTime = scheduledAt ? new Date(scheduledAt).getTime() : (Date.now() + 60000);
      const schedData = await firefliesRequest(
        `mutation ScheduleNotetaker($url: String!, $title: String!, $startTime: Long!) {
          scheduleNotetaker(url: $url, title: $title, start_time: $startTime) { id title }
        }`,
        { url: fullLink, title: `CloserAI - ${closer} - ${scriptName}`, startTime: schedTime }
      );
      firefliesMeetingId = schedData?.data?.scheduleNotetaker?.id || null;
      if (!firefliesMeetingId) botError = liveData?.errors?.[0]?.message || "Erro ao enviar bot";
    }
  } catch (e) {
    botError = e.message;
  }

  const meeting = {
    id: meetingId, closer, closerId, scriptId, scriptName, scriptSteps, scriptCriteria,
    meetLink: fullLink, scheduledAt: scheduledAt || new Date().toISOString(),
    status: firefliesMeetingId ? "bot_joined" : "scheduled",
    firefliesMeetingId, botError, createdAt: new Date().toISOString()
  };

  try {
    await kv.set(meetingId, JSON.stringify(meeting));
    await kv.lpush("meetings_list", meetingId);
  } catch(e) {
    return res.status(500).json({ error: "Banco KV não configurado. Vá em Storage → Create KV.", detail: e.message });
  }

  return res.status(200).json({ success: true, meeting });
};
