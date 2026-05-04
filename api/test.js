const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const key = process.env.FIREFLIES_API_KEY;
  const meetLink = req.query.link || "https://meet.google.com/teste";

  const r = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      query: `mutation {
        addToLiveMeeting(meeting_link: "${meetLink}", title: "Teste CloserAI") {
          success
          message
        }
      }`
    })
  });
  const data = await r.json();
  return res.json({ link: meetLink, resposta_fireflies: data });
};
