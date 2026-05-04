const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const key = process.env.FIREFLIES_API_KEY;
  if (!key) return res.json({ error: "FIREFLIES_API_KEY não encontrada" });

  // Testa conta do Fireflies
  try {
    const r1 = await fetch(FIREFLIES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ query: "{ user { user_id name email minutes_used minutes_purchased } }" })
    });
    const user = await r1.json();

    // Testa addToLiveMeeting com um link de exemplo
    const r2 = await fetch(FIREFLIES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        query: `mutation { addToLiveMeeting(url: "https://meet.google.com/test-test-test", title: "Teste CloserAI") { id title } }`
      })
    });
    const live = await r2.json();

    return res.json({ user: user.data?.user || user.errors, liveTest: live });
  } catch(e) {
    return res.json({ error: e.message });
  }
};
