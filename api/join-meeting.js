const { Redis } = require("@upstash/redis");

function getKV() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Banco não configurado.");
  return new Redis({ url, token });
}

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
  const data = await res.json();
  console.log("Fireflies:", JSON.stringify(data));
  return data;
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

  let firefliesMeetingId = null;
  let botError = null;

  if (process.env.FIREFLIES_API_KEY) {
    try {
      // Corrigido: campo correto é meeting_link (não url)
      const liveData = await firefliesRequest(
        `mutation AddToLiveMeeting($meeting_link: String!, $title: String!) {
          addToLiveMeeting(meeting_link: $meeting_link, title: $title)
        }`,
        { meeting_link: fullLink, title: `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}` }
      );

      if (liveData?.data?.addToLiveMeeting === true || liveData?.data?.addToLiveMeeting) {
        firefliesMeetingId = `live_${Date.now()}`;
        console.log("Bot entrou na reunião ao vivo!");
      } else {
        // Tenta agendar para reuniões futuras
        const schedTime = scheduledAt ? new Date(scheduledAt).getTime() : (Date.now() + 300000);
        const schedData = await firefliesRequest(
          `mutation ScheduleNotetaker($meeting_link: String!, $title: String!, $start_time: Long!) {
            scheduleNotetaker(meeting_link: $meeting_link, title: $title, start_time: $start_time) {
              id
            }
          }`,
          { meeting_link: fullLink, title: `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}`, start_time: schedTime }
        );

        if (schedData?.data?.scheduleNotetaker?.id) {
          firefliesMeetingId = schedData.data.scheduleNotetaker.id;
          console.log("Bot agendado:", firefliesMeetingId);
        } else {
          botError = liveData?.errors?.[0]?.message || schedData?.errors?.[0]?.message || "Reunião não está ao vivo";
          console.log("Erro bot:", botError);
        }
      }
    } catch(e) {
      botError = e.message;
      console.log("Exceção:", e.message);
    }
  } else {
    botError = "FIREFLIES_API_KEY não configurada";
  }

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
