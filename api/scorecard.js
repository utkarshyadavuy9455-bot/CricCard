module.exports = async function handler(req, res) {
const allowedOrigin = "https://utkarshyadavuy9455-bot.github.io";

res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
res.setHeader("Vary", "Origin");
res.setHeader("Cache-Control", "no-store");
res.setHeader("Content-Type", "application/json");

if (req.headers.origin && req.headers.origin !== allowedOrigin) {
return res.status(403).json({ error: "Website origin not allowed" });
}

if (req.method !== "GET") {
res.setHeader("Allow", "GET");
return res.status(405).json({ error: "Method not allowed" });
}

const matchId = String(req.query.id || "");

if (!/^\d{1,12}$/.test(matchId)) {
return res.status(400).json({ error: "Provide a numeric EliteSport match ID" });
}

const apiKey = process.env.ELITESPORT_API_KEY;

if (!apiKey) {
return res.status(500).json({ error: "API key is not configured" });
}

try {
const url = new URL(
"https://trial.elitesportapi.com/api/v2/getMatchScoreCard"
);
url.searchParams.set("matchId", matchId);

const response = await fetch(url.toString(), {
  headers: {
    "x-api-key": apiKey,
    Accept: "application/json"
  },
  signal: AbortSignal.timeout(10000)
});

const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch {
  data = { message: "Provider returned non-JSON data" };
}

return res.status(response.ok ? 200 : 502).json({
  providerStatus: response.status,
  data
});

} catch {
return res.status(502).json({
error: "Unable to contact the scorecard provider"
});
}
};
