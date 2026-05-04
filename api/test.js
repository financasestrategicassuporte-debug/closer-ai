const FIREFLIES_API = "https://api.fireflies.ai/graphql";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const key = process.env.FIREFLIES_API_KEY;
  if (!key) return res.json({ error: "FIREFLIES_API_KEY não encontrada" });

  // Descobre os campos do tipo AddToLiveMeeting via introspecção
  const r = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      query: `{
        __type(name: "AddToLiveMeeting") {
          name
          kind
          fields { name type { name kind } }
        }
      }`
    })
  });
  const schema = await r.json();

  // Também descobre os argumentos da mutation
  const r2 = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      query: `{
        __schema {
          mutationType {
            fields {
              name
              args { name type { name kind ofType { name kind } } }
              type { name kind fields { name type { name kind } } }
            }
          }
        }
      }`
    })
  });
  const mutations = await r2.json();
  const addToLive = mutations?.data?.__schema?.mutationType?.fields?.find(f => f.name === "addToLiveMeeting");
  const scheduleNotetaker = mutations?.data?.__schema?.mutationType?.fields?.find(f => f.name === "scheduleNotetaker");

  return res.json({
    addToLiveMeetingType: schema.data?.__type,
    addToLiveMeetingMutation: addToLive,
    scheduleNotetakerMutation: scheduleNotetaker
  });
};
