
"use strict";

/* =========================================
   CRICCARD — INTERACTIVE CRICKET CARDS
   ========================================= */

// Keep your existing API key private.
// Replace the placeholder with your own key locally.
// WARNING: Browser JavaScript on GitHub Pages is public.
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
  uae: "🇦🇪",
  "united arab emirates": "🇦🇪",
  "west indies": "🏏"
};

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

function makeElement(tag, className, text) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

function getTeamName(team) {
  if (typeof team === "string") return team;

  return (
    team?.name ||
    team?.team_name ||
    team?.short_name ||
    team?.title ||
    "Team"
  );
}

function getFlag(name) {
  const lower = String(name).toLowerCase();

  const country = Object.keys(countryFlags).find(key =>
    lower.includes(key)
  );

  return country ? countryFlags[country] : "🏏";
}

function getMatchTeams(match) {
  if (Array.isArray(match?.teams)) {
    return match.teams.map(getTeamName);
  }

  const names = [
    match?.team1?.name || match?.team1,
    match?.team2?.name || match?.team2,
    match?.home_team?.name || match?.home_team,
    match?.away_team?.name || match?.away_team
  ].filter(value => typeof value === "string" && value.trim());

  return [...new Set(names)];
}

function getMatchTitle(match) {
  const teams = getMatchTeams(match);

  return (
    match?.name ||
    match?.title ||
    match?.event_name ||
    match?.match_name ||
    (teams.length ? teams.join(" vs ") : "Cricket Match")
  );
}

function getCompetition(match) {
  return (
    match?.competition?.name ||
    match?.competition_name ||
    match?.series?.name ||
    match?.event_name ||
    "Cricket"
  );
}

function getVenue(match) {
  return (
    match?.venue?.name ||
    (typeof match?.venue === "string" ? match.venue : "") ||
    match?.ground?.name ||
    "Venue information unavailable"
  );
}

function getStatus(match) {
  return (
    match?.status ||
    match?.status_text ||
    match?.state ||
    match?.match_status ||
    "Status unavailable"
  );
}

/* =========================================
   POPUP / MATCH DETAILS WINDOW
   ========================================= */

let modal;
let modalContent;
let lastFocusedElement = null;

function addModalStyles() {
  if ($("#criccard-interaction-styles")) return;

  const style = document.createElement("style");
  style.id = "criccard-interaction-styles";

  style.textContent = `
    .cc-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 10, 7, .82);
      backdrop-filter: blur(9px);
    }

    .cc-modal-overlay.cc-open {
      display: flex;
      animation: ccFadeIn .18s ease;
    }

    .cc-modal {
      position: relative;
      width: min(540px, 100%);
      max-height: min(82vh, 760px);
      overflow-y: auto;
      padding: 24px;
      color: #f1fff6;
      background: #0d2820;
      border: 1px solid rgba(103, 240, 163, .3);
      border-radius: 22px;
      box-shadow: 0 24px 90px rgba(0,0,0,.5);
    }

    .cc-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 40px;
      height: 40px;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 50%;
      color: #f1fff6;
      background: #163e2d;
      font-size: 24px;
      cursor: pointer;
    }

    .cc-modal-close:hover {
      background: #24563e;
    }

    .cc-modal-kicker {
      color: #67f0a3;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
      padding-right: 42px;
    }

    .cc-modal h2 {
      margin: 0 40px 16px 0;
      font-size: clamp(23px, 5vw, 31px);
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .cc-modal-status {
      display: inline-block;
      padding: 6px 11px;
      margin-bottom: 18px;
      color: #67f0a3;
      background: rgba(103,240,163,.1);
      border: 1px solid rgba(103,240,163,.2);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }

    .cc-modal-teams {
      display: grid;
      gap: 10px;
      margin: 12px 0 20px;
    }

    .cc-modal-team {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px;
      border-radius: 13px;
      background: rgba(255,255,255,.045);
      border: 1px solid rgba(255,255,255,.08);
    }

    .cc-modal-flag {
      font-size: 27px;
    }

    .cc-modal-team-name {
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .cc-modal-info {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }

    .cc-modal-info-row {
      padding: 12px 13px;
      border-radius: 12px;
      background: rgba(255,255,255,.035);
    }

    .cc-modal-info-label {
      display: block;
      margin-bottom: 3px;
      color: #a5c2b2;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cc-modal-info-value {
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .cc-modal-note {
      margin-top: 16px;
      color: #a5c2b2;
      font-size: 13px;
      line-height: 1.6;
    }

    .cc-clickable {
      cursor: pointer !important;
      -webkit-tap-highlight-color: transparent;
    }

    .cc-clickable:focus-visible {
      outline: 2px solid #67f0a3;
      outline-offset: 4px;
    }

    .cc-click-hint {
      margin-top: 12px;
      color: #67f0a3;
      font-size: 12px;
      font-weight: 750;
    }

    @keyframes ccFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 480px) {
      .cc-modal { padding: 20px; border-radius: 18px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .cc-modal-overlay { animation: none; }
    }
  `;

  document.head.appendChild(style);
}

function setupModal() {
  if (modal) return;

  addModalStyles();

  modal = makeElement("div", "cc-modal-overlay");
  modal.id = "criccard-modal";
  modal.setAttribute("aria-hidden", "true");

  const panel = makeElement("section", "cc-modal");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "cc-modal-title");

  const close = makeElement("button", "cc-modal-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close details");

  modalContent = makeElement("div", "cc-modal-content");

  panel.append(close, modalContent);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  close.addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (!modal.classList.contains("cc-open")) return;

    if (event.key === "Escape") {
      closeModal();
    }

    if (event.key === "Tab") {
      const focusable = $$(
        "button, a[href], [tabindex]:not([tabindex='-1'])",
        modal
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

function openModal(kicker, title, contentBuilder) {
  setupModal();

  lastFocusedElement = document.activeElement;
  modalContent.replaceChildren();

  modalContent.append(
    makeElement("div", "cc-modal-kicker", kicker),
    makeElement("h2", "", title)
  );

  contentBuilder(modalContent);

  modal.classList.add("cc-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const closeButton = $(".cc-modal-close", modal);
  if (closeButton) closeButton.focus();
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("cc-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (lastFocusedElement?.focus) {
    lastFocusedElement.focus();
  }
}

function addInfoRow(parent, label, value) {
  const row = makeElement("div", "cc-modal-info-row");

  row.append(
    makeElement("span", "cc-modal-info-label", label),
    makeElement(
      "span",
      "cc-modal-info-value",
      value || "Not available"
    )
  );

  parent.appendChild(row);
}

/* =========================================
   LIVE MATCH DETAILS
   ========================================= */

function addScoreDetails(parent, match) {
  const teams = getMatchTeams(match);
  const innings = Array.isArray(match?.innings)
    ? match.innings
    : [];

  const teamBox = makeElement("div", "cc-modal-teams");

  teams.forEach(name => {
    const row = makeElement("div", "cc-modal-team");

    row.append(
      makeElement("span", "cc-modal-flag", getFlag(name)),
      makeElement("span", "cc-modal-team-name", name)
    );

    teamBox.appendChild(row);
  });

  if (teams.length) parent.appendChild(teamBox);

  const info = makeElement("div", "cc-modal-info");

  addInfoRow(info, "Competition", getCompetition(match));
  addInfoRow(info, "Match status", getStatus(match));
  addInfoRow(info, "Venue", getVenue(match));

  if (match?.result) {
    addInfoRow(info, "Result", match.result);
  }

  if (innings.length) {
    const scoreText = innings.map((inning, index) => {
      const total = inning?.total || inning?.score || {};
      const name =
        inning?.team_name ||
        inning?.team?.name ||
        inning?.team ||
        `Innings ${index + 1}`;

      if (typeof total === "string" || typeof total === "number") {
        return `${name}: ${total}`;
      }

      const runs = total.runs ?? inning?.runs;
      const wickets = total.wickets ?? inning?.wickets;
      const overs = total.overs ?? inning?.overs;

      if (runs === undefined && wickets === undefined) {
        return "";
      }

      let line = `${name}: ${runs ?? 0}/${wickets ?? 0}`;

      if (overs !== undefined) line += ` (${overs} overs)`;

      return line;
    }).filter(Boolean);

    if (scoreText.length) {
      addInfoRow(info, "Available innings", scoreText.join(" • "));
    }
  }

  parent.appendChild(info);

  parent.appendChild(
    makeElement(
      "p",
      "cc-modal-note",
      "Match information is supplied by the available API response. Some score details may not be included in every response."
    )
  );
}

function showLiveMatch(match) {
  openModal("CricCard · Match Centre", getMatchTitle(match), parent => {
    const status = makeElement(
      "div",
      "cc-modal-status",
      getStatus(match)
    );

    parent.appendChild(status);
    addScoreDetails(parent, match);
  });
}

/* =========================================
   POPULAR TEAM CARD DETAILS
   ========================================= */

function showTeamCard(card) {
  const teamNames = $$(".team-name", card)
    .map(node => node.textContent.trim())
    .filter(Boolean);

  const uniqueNames = [...new Set(teamNames)];

  const title = uniqueNames.length
    ? uniqueNames.join(" vs ")
    : "Cricket Team";

  const competition =
    $(".tournament", card)?.textContent.trim() ||
    "Popular cricket teams";

  openModal("CricCard · Team Spotlight", title, parent => {
    const teamsBox = makeElement("div", "cc-modal-teams");

    uniqueNames.forEach(name => {
      const row = makeElement("div", "cc-modal-team");

      row.append(
        makeElement("span", "cc-modal-flag", getFlag(name)),
        makeElement("span", "cc-modal-team-name", name)
      );

      teamsBox.appendChild(row);
    });

    if (teamsBox.children.length) {
      parent.appendChild(teamsBox);
    }

    const info = makeElement("div", "cc-modal-info");

    addInfoRow(info, "Category", competition);

    const foot = $(".card-foot", card);
    if (foot) {
      addInfoRow(info, "Team spotlight", foot.textContent.trim());
    }

    parent.appendChild(info);

    parent.appendChild(
      makeElement(
        "p",
        "cc-modal-note",
        "This is a team spotlight, not a live score. Open the Live Matches section to view match information returned by the API."
      )
    );
  });
}

/* =========================================
   MAKE CARDS CLICKABLE
   ========================================= */

function makeClickable(card, label, handler) {
  if (card.dataset.ccClickable === "true") return;

  card.dataset.ccClickable = "true";
  card.classList.add("cc-clickable");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", label);

  card.addEventListener("click", event => {
    if (event.target.closest("a, button")) return;
    handler();
  });

  card.addEventListener("keydown", event => {
    if (event.target !== card) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });

  if (!card.querySelector(".cc-click-hint")) {
    card.appendChild(
      makeElement("div", "cc-click-hint", "Tap to view details ↗")
    );
  }
}

function enablePopularCards() {
  const liveContainer = $("#live-matches");

  $$(".match-card").forEach(card => {
    if (liveContainer?.contains(card)) return;

    if (!card.querySelector(".team-name")) return;

    makeClickable(card, "Open team details", () => {
      showTeamCard(card);
    });
  });
}

/* =========================================
   LOAD REAL LIVE MATCHES
   ========================================= */

async function loadLiveMatches() {
  const container = $("#live-matches");
  const status = $("#live-status");
  const refresh = $("#refresh-live");

  if (!container) return;

  if (
    !OPENCRICKET_KEY ||
    OPENCRICKET_KEY === "PASTE_YOUR_API_KEY_HERE"
  ) {
    container.replaceChildren(
      makeElement(
        "p",
        "live-message",
        "Configure your OpenCricket API key to load live matches."
      )
    );

    if (status) status.textContent = "API key required";
    return;
  }

  if (refresh) refresh.disabled = true;

  if (status) status.textContent = "Loading live scores…";

  container.replaceChildren(
    makeElement("p", "live-message", "Connecting to OpenCricket…")
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
        `API request failed (${response.status})`
      );
    }

    const matches = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.matches)
          ? result.matches
          : [];

    container.replaceChildren();

    if (!matches.length) {
      container.append(
        makeElement(
          "p",
          "live-message",
          "No live matches are currently listed by OpenCricket."
        )
      );

      if (status) status.textContent = "No live matches found";
      return;
    }

    matches.forEach(match => {
      const card = makeElement("article", "match-card live-api-card");
      const top = makeElement("div", "card-top");

      top.append(
        makeElement("span", "tournament", getCompetition(match)),
        makeElement("span", "tag", getStatus(match))
      );

      const teamsBox = makeElement("div", "teams");
      const teams = Array.isArray(match?.teams)
        ? match.teams
        : [];

      const innings = Array.isArray(match?.innings)
        ? match.innings
        : [];

      teams.forEach(team => {
        const name = getTeamName(team);
        const row = makeElement("div", "team");
        const info = makeElement("div", "team-info");

        info.append(
          makeElement("div", "team-name", name),
          makeElement(
            "div",
            "team-code",
            typeof team === "object"
              ? team.short_name || team.code || ""
              : ""
          )
        );

        row.append(
          makeElement("span", "flag", getFlag(name)),
          info
        );

        const id = typeof team === "object" ? team.id : null;

        const teamInnings = innings.filter(inning =>
          (id && inning.team_id === id) ||
          inning.team === name ||
          inning.team_name === name
        );

        const latest = teamInnings[teamInnings.length - 1];
        const total = latest?.total || latest?.score;

        if (total) {
          let runs;
          let wickets;
          let overs;

          if (typeof total === "object") {
            runs = total.runs ?? latest.runs;
            wickets = total.wickets ?? latest.wickets;
            overs = total.overs ?? latest.overs;
          } else {
            runs = total;
            wickets = latest.wickets;
            overs = latest.overs;
          }

          if (runs !== undefined) {
            const score = makeElement(
              "div",
              "score",
              `${runs}/${wickets ?? 0}`
            );

            score.append(
              makeElement(
                "small",
                "",
                `${overs ?? "—"} overs`
              )
            );

            row.appendChild(score);
          }
        }

        teamsBox.appendChild(row);
      });

      if (teamsBox.children.length) {
        card.appendChild(top);
        card.appendChild(teamsBox);
      } else {
        card.append(
          top,
          makeElement("h3", "team-name", getMatchTitle(match))
        );
      }

      const footer = makeElement("div", "card-foot");

      footer.append(
        makeElement("span", "", getVenue(match)),
        makeElement("span", "", getStatus(match))
      );

      card.appendChild(footer);

      makeClickable(card, `View ${getMatchTitle(match)} details`, () => {
        showLiveMatch(match);
      });

      container.appendChild(card);
    });

    if (status) {
      status.textContent =
        `Updated ${new Date().toLocaleTimeString()} · ` +
        `${matches.length} match(es)`;
    }
  } catch (error) {
    console.error("CricCard live-score error:", error);

    container.replaceChildren(
      makeElement(
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

/* =========================================
   START CRICCARD
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupModal();
  enablePopularCards();

  const refresh = $("#refresh-live");

  if (refresh) {
    refresh.addEventListener("click", loadLiveMatches);
  }

  loadLiveMatches();
});
