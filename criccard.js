
"use strict";

// CricCard — OpenCricket Live Scores
// Direct browser access requires OpenCricket CORS support.
// Never publish a private API key in browser JavaScript.

const OPENCRICKET_KEY = "oc_live_Zp7JCdgwlq5ZDYehwE5EqTmLnGIx33Ny";
const OPENCRICKET_URL = "https://opencricketapi.com/v1/live";

const countryFlags = {
  india: "🇮🇳",
  pakistan: "🇵🇰",
  australia: "🇦🇺",
  england: "🏴",
  "new zealand": "🇳🇿",
  "south africa": "🇿🇦",
  "sri lanka": "🇱🇰",
  bangladesh: "🇧🇩",
  afghanistan: "🇦🇫",
  ireland: "🇮🇪",
  zimbabwe: "🇿🇼",
  nepal: "🇳🇵",
  oman: "🇴🇲",
  canada: "🇨🇦",
  "united states": "🇺🇸",
  usa: "🇺🇸",
  uae: "🇦🇪"
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function teamName(team) {
  if (typeof team === "string") return team;
  return team?.name || team?.team || "Team";
}

function teamFlag(name) {
  const key = Object.keys(countryFlags).find(country =>
    name.toLowerCase().includes(country)
  );
  return key ? countryFlags[key] : "🏏";
}

async function loadLiveMatches() {
  const container = document.getElementById("live-matches");
  const status = document.getElementById("live-status");
  const refresh = document.getElementById("refresh-live");

  if (!container) {
    console.warn("CricCard: Missing live-matches container.");
    return;
  }

  if (
    !OPENCRICKET_KEY ||
    OPENCRICKET_KEY === "PASTE_API_KEY_HERE"
  ) {
    container.replaceChildren(
      element(
        "p",
        "live-message",
        "Live scores are not configured yet."
      )
    );
    if (status) status.textContent = "API key required";
    return;
  }

  if (refresh) refresh.disabled = true;
  if (status) status.textContent = "Loading live scores…";

  container.replaceChildren(
    element("p", "live-message", "Connecting to OpenCricket…")
  );

  try {
    const response = await fetch(OPENCRICKET_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${OPENCRICKET_KEY}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error?.message ||
        `API request failed: ${response.status}`
      );
    }

    const matches = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.matches)
        ? result.matches
        : [];

    container.replaceChildren();

    if (matches.length === 0) {
      container.append(
        element(
          "p",
          "live-message",
          "No live matches are available right now."
        )
      );
      if (status) status.textContent = "No live matches";
      return;
    }

    matches.forEach(match => {
      const card = element("article", "match-card live-api-card");
      const top = element("div", "card-top");

      top.append(
        element(
          "span",
          "tournament",
          match.competition?.name ||
          match.event_name ||
          "CRICKET"
        ),
        element(
          "span",
          "tag",
          match.status || match.state || "LIVE"
        )
      );

      const teams = element("div", "teams");
      const teamList = Array.isArray(match.teams)
        ? match.teams
        : [];
      const innings = Array.isArray(match.innings)
        ? match.innings
        : [];

      teamList.forEach(team => {
        const name = teamName(team);
        const id = typeof team === "object" ? team.id : null;

        const teamScores = innings.filter(item =>
          (id && item.team_id === id) ||
          item.team === name
        );
        const latest = teamScores[teamScores.length - 1];

        const row = element("div", "team");
        const info = element("div", "team-info");

        info.append(
          element("div", "team-name", name),
          element(
            "div",
            "team-code",
            typeof team === "object"
              ? team.short_name || team.code || ""
              : ""
          )
        );

        row.append(
          element("span", "flag", teamFlag(name)),
          info
        );

        if (latest?.total) {
          const total = latest.total;
          const score = element(
            "div",
            "score",
            `${total.runs ?? 0}/${total.wickets ?? 0}`
          );
          score.append(
            element(
              "small",
              "",
              `${total.overs ?? "—"} overs`
            )
          );
          row.append(score);
        }

        teams.append(row);
      });

      const footer = element("div", "card-foot");
      footer.append(
        element(
          "span",
          "",
          match.venue?.name || match.venue || "Venue unavailable"
        ),
        element(
          "span",
          "",
          match.result || match.status || "Match in progress"
        )
      );

      card.append(top, teams, footer);
      container.append(card);
    });

    if (status) {
      status.textContent =
        `Updated ${new Date().toLocaleTimeString()} · ` +
        `${matches.length} match(es)`;
    }
  } catch (error) {
    console.error("CricCard API error:", error);

    container.replaceChildren(
      element(
        "p",
        "live-message",
        "Unable to load live scores. Check API access and try again."
      )
    );

    if (status) status.textContent = "Connection failed";
  } finally {
    if (refresh) refresh.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refresh = document.getElementById("refresh-live");

  if (refresh) {
    refresh.addEventListener("click", loadLiveMatches);
  }

  loadLiveMatches();
});
  
