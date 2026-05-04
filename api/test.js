const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const key = process.env.FIREFLIES_API_KEY;
  if (!key) return res.json({ error: "FIREFLIES_API_KEY não encontrada" });

  const r = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      query: `mutation {
        addToLiveMeeting(meeting_link: "https://meet.google.com/test-xxxx-test", title: "Teste CloserAI") {
          id title date
        }
      }`
    })
  });
  const data = await r.json();
  return res.json({ result: data });
};
