const { Redis } = require("@upstash/redis");

function getKV() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Banco não configurado.");
  return new Redis({ url, token });
}

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

async function firefliesPost(body) {
  const res = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify(body)
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
  const title = `CloserAI - ${closer || "Closer"} - ${scriptName || "Reunião"}`;

  let firefliesMeetingId = null;
  let botStatus = null;
  let botError = null;

  if (process.env.FIREFLIES_API_KEY) {
    try {
      // Campos corretos: retorna { message success }
      const data = await firefliesPost({
        query: `mutation AddToLiveMeeting($meeting_link: String!, $title: String!) {
          addToLiveMeeting(meeting_link: $meeting_link, title: $title) {
            success
            message
          }
        }`,
        variables: { meeting_link: fullLink, title }
      });

      const result = data?.data?.addToLiveMeeting;
      if (result?.success === true) {
        firefliesMeetingId = `ff_${Date.now()}`;
        botStatus = result.message || "Bot entrou com sucesso!";
        console.log("✅ Bot entrou:", botStatus);
      } else {
        botError = result?.message || data?.errors?.[0]?.message || "Reunião não está ao vivo ainda";
        console.log("❌ Bot não entrou:", botError);
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
    firefliesMeetingId, botStatus, botError,
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
