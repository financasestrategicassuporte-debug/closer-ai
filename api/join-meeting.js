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
  console.log("Fireflies response:", JSON.stringify(data));
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
  const title = `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}`;

  let firefliesMeetingId = null;
  let botError = null;

  if (process.env.FIREFLIES_API_KEY) {
    try {
      // Tenta entrar na reunião ao vivo (com subcampos corretos)
      const liveData = await firefliesRequest(
        `mutation AddToLiveMeeting($meeting_link: String!, $title: String!) {
          addToLiveMeeting(meeting_link: $meeting_link, title: $title) {
            id
            title
            date
          }
        }`,
        { meeting_link: fullLink, title }
      );

      if (liveData?.data?.addToLiveMeeting?.id) {
        firefliesMeetingId = liveData.data.addToLiveMeeting.id;
        console.log("✅ Bot entrou! ID:", firefliesMeetingId);
      } else {
        // Tenta agendar para reunião futura
        const schedTime = scheduledAt ? new Date(scheduledAt).getTime() : (Date.now() + 300000);
        const schedData = await firefliesRequest(
          `mutation ScheduleNotetaker($meeting_link: String!, $title: String!, $start_time: Long!) {
            scheduleNotetaker(meeting_link: $meeting_link, title: $title, start_time: $start_time) {
              id
              title
            }
          }`,
          { meeting_link: fullLink, title, start_time: schedTime }
        );

        if (schedData?.data?.scheduleNotetaker?.id) {
          firefliesMeetingId = schedData.data.scheduleNotetaker.id;
          console.log("✅ Bot agendado! ID:", firefliesMeetingId);
        } else {
          const err = liveData?.errors?.[0]?.message || schedData?.errors?.[0]?.message || "Erro desconhecido";
          botError = err;
          console.log("❌ Erro:", err);
        }
      }
    } catch(e) {
      botError = e.message;
      console.log("❌ Exceção:", e.message);
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
