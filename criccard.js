// CricCard — Live Cricket Scores
// Never put your OpenCricket API key in this file.

const CRICCARD_API =
  "https://criccard-api.utkarshyadavuy9455.workers.dev";

async function loadLiveMatches() {
  const container = document.getElementById("live-matches");

  if (!container) {
    console.warn('CricCard: Add an element with id="live-matches" to index.html.');
    return;
  }

  container.textContent = "Loading live matches…";

  try {
    const response = await fetch(`${CRICCARD_API}/live`);

    if (!response.ok) {
      throw new Error(`API request failed (${response.status})`);
    }

    const result = await response.json();
    console.log("CricCard live data:", result);

    const matches = Array.isArray(result)
      ? result
      : result.matches || result.data || [];

    if (!matches.length) {
      container.textContent = "No live matches found right now.";
      return;
    }

    container.replaceChildren();

    matches.forEach((match) => {
      const card = document.createElement("article");
      card.className = "live-match-card";

      const title = document.createElement("h3");
      title.textContent =
        match.name ||
        match.title ||
        match.match_name ||
        "Live cricket match";

      const details = document.createElement("p");
      details.textContent =
        match.status ||
        match.status_text ||
        match.venue ||
        "Live match details";

      card.append(title, details);
      container.appendChild(card);
    });
  } catch (error) {
    console.error("CricCard live-score error:", error);
    container.textContent =
      "Live scores are temporarily unavailable. Please try again later.";
  }
}

document.addEventListener("DOMContentLoaded", loadLiveMatches);
