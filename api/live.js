module.exports = async function handler(req, res) {
  const allowedOrigin =
    "https://utkarshyadavuy9455-bot.github.io";

  const origin = req.headers.origin;

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=15");
  res.setHeader("Content-Type", "application/json");

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({
      error: "Website origin not allowed"
    });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.ELITESPORT_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key is not configured"
    });
  }

  try {
    const response = await fetch(
      "https://trial.elitesportapi.com/api/v2/getLiveMatches",
      {
        headers: {
          "x-api-key": apiKey
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Cricket data provider returned an error",
        providerStatus: response.status
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(502).json({
      error: "Unable to fetch live cricket scores"
    });
  }
};
