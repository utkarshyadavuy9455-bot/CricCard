
"use strict";

const API_URL = "https://criccard.vercel.app/api/live";

const FLAGS = {
  India: "🇮🇳",
  Pakistan: "🇵🇰",
  Australia: "🇦🇺",
  England: "🏴",
  "South Africa": "🇿🇦",
  "New Zealand": "🇳🇿",
  "Sri Lanka": "🇱🇰",
  Bangladesh: "🇧🇩",
  Afghanistan: "🇦🇫",
  Ireland: "🇮🇪",
  Zimbabwe: "🇿🇼",
  Nepal: "🇳🇵",
  Canada: "🇨🇦"
};

const $ = (s) => document.querySelector(s);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function flag(name) {
  const key = Object.keys(FLAGS).find(
    k => String(name || "").toLowerCase().includes(k.toLowerCase())
  );
  return key ? FLAGS[key] : "🏏";
}

function score(team) {
  if (!team) return "";
  return team.complete_score ||
    (team.score !== "" && team.score != null
      ? team.score + (team.wickets !== "" && team.wickets != null
        ? "-" + team.wickets : "")
      : "");
}

function showDetails(m) {
  const overlay = el("div", "cc-overlay");
  const panel = el("div", "cc-panel");
  const close = el("button", "cc-close", "✕");

  close.onclick = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  panel.append(
    close,
    el("p", "cc-status", m.result ? "MATCH RESULT" : m.status || "MATCH"),
    el("h2", "", (m.teama_name || "Team A") + " vs " + (m.teamb_name || "Team B")),
    el("p", "cc-muted", m.series_name || "Cricket")
  );

  [0, 1].forEach(i => {
    const name = i === 0 ? m.teama_name : m.teamb_name;
    const data = i === 0 ? m.teama_score : m.teamb_score;
    const logo = i === 0 ? m.teama_logo_url : m.teamb_logo_url;
    const row = el("div", "cc-team");

    if (logo && /^https:\/\//i.test(logo)) {
      const img = el("img", "cc-logo");
      img.src = logo;
      img.alt = "";
      img.onerror = () => img.replaceWith(el("span", "cc-flag", flag(name)));
      row.append(img);
    } else {
      row.append(el("span", "cc-flag", flag(name)));
    }

    const info = el("div", "");
    info.append(
      el("strong", "", name || "Team"),
      el("div", "cc-score", score(data) || "Score unavailable"),
      el("small", "cc-muted", data && data.overs ? data.overs + " overs" : "")
    );
    row.append(info);
    panel.append(row);
  });

  [
    ["Match", [m.type, m.title].filter(Boolean).join(" · ")],
    ["Venue", m.venue],
    ["Date", m.date],
    ["Toss", m.toss],
    ["Match situation", m.runs_needed],
    ["Result", m.result]
  ].forEach(([label, value]) => {
    if (value) {
      const row = el("p", "cc-detail");
      row.append(el("b", "", label + ": "), document.createTextNode(value));
      panel.append(row);
    }
  });

  panel.append(el(
    "p", "cc-muted",
    "Scorecard details will be connected in the next step."
  ));

  overlay.append(panel);
  overlay.onclick = e => {
    if (e.target === overlay) close.click();
  };
  document.body.append(overlay);
  document.body.style.overflow = "hidden";
}

function addStyles() {
  if ($("#cc-styles")) return;

  const style = el("style");
  style.id = "cc-styles";
  style.textContent = `
    .cc-overlay {
      position:fixed; inset:0; z-index:99999;
      display:flex; align-items:center; justify-content:center;
      padding:12px; background:#000d; overflow:auto;
    }
    .cc-panel {
      width:min(650px,100%); max-height:92vh; overflow:auto;
      padding:20px; border-radius:20px;
      background:#0d2820; color:#f1fff6;
      border:1px solid #67f0a355;
    }
    .cc-close {
      float:right; padding:9px 12px; border-radius:50%;
      border:1px solid #ffffff30; background:#163e2d;
      color:white; cursor:pointer;
    }
    .cc-status { color:#67f0a3; font-weight:800; }
    .cc-muted { color:#a5c2b2; font-size:13px; }
    .cc-team {
      display:flex; align-items:center; gap:12px;
      padding:12px; margin:9px 0;
      border-radius:12px; background:#ffffff0b;
    }
    .cc-logo { width:40px; height:40px; object-fit:contain; }
    .cc-flag { width:40px; font-size:27px; }
    .cc-score { font-size:19px; font-weight:850; }
    .cc-detail { padding:9px; background:#ffffff08; border-radius:8px; }
    .cc-clickable { cursor:pointer; }
    .cc-clickable:focus-visible { outline:2px solid #67f0a3; }
  `;
  document.head.append(style);
}

async function loadLiveMatches() {
  const container = $("#live-matches");
  const status = $("#live-status");
  const refresh = $("#refresh-live");

  if (!container) return;

  if (refresh) refresh.disabled = true;
  if (status) status.textContent = "Loading live scores…";

  container.replaceChildren(el("p", "live-message", "Fetching cricket data…"));

  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" }
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Live-score service error.");
    }

    if (payload.status === false) {
      throw new Error(payload.message || "Provider error.");
    }

    const matches = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.data?.matches)
        ? payload.data.matches : [];

    container.replaceChildren();

    if (!matches.length) {
      container.append(el("p", "live-message", "No matches returned right now."));
      if (status) status.textContent = "No matches found";
      return;
    }

    matches.sort((a, b) => {
      if (!!a.result !== !!b.result) return a.result ? 1 : -1;
      return new Date(b.start_datetime || 0) -
             new Date(a.start_datetime || 0);
    });

    matches.forEach(m => {
      const card = el("article", "match-card live-api-card cc-clickable");
      card.tabIndex = 0;
      card.setAttribute("role", "button");

      const top = el("div", "card-top");
      top.append(
        el("span", "tournament", m.series_name || "Cricket"),
        el("span", "tag", m.result ? "RESULT" : m.status || "MATCH")
      );

      const teams = el("div", "teams");

      [
        [m.teama_name, m.teama_name_abbr, m.teama_score, m.teama_logo_url],
        [m.teamb_name, m.teamb_name_abbr, m.teamb_score, m.teamb_logo_url]
      ].forEach(([name, abbr, data, logo]) => {
        const row = el("div", "team");

        if (logo && /^https:\/\//i.test(logo)) {
          const img = el("img", "flag");
          img.src = logo;
          img.alt = "";
          img.loading = "lazy";
          img.style.objectFit = "contain";
          img.onerror = () => img.replaceWith(el("span", "flag", flag(name)));
          row.append(img);
        } else {
          row.append(el("span", "flag", flag(name)));
        }

        const info = el("div", "team-info");
        info.append(el("div", "team-name", name || "Team"));
        if (abbr) info.append(el("div", "team-code", abbr));
        row.append(info);

        const value = score(data);
        if (value) {
          const scoreBox = el("div", "score", value);
          if (data?.overs) {
            scoreBox.append(el("small", "", data.overs + " ov"));
          }
          row.append(scoreBox);
        }

        teams.append(row);
      });

      const foot = el("div", "card-foot");
      foot.append(
        el("span", "", m.venue || m.date || "Venue unavailable"),
        el("span", "", m.runs_needed || m.result || m.type || "View details")
      );

      card.append(top, teams, foot);
      card.onclick = () => showDetails(m);
      card.onkeydown = e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showDetails(m);
        }
      };

      container.append(card);
    });

    if (status) {
      status.textContent = "Updated " +
        new Date().toLocaleTimeString() + " · " + matches.length + " matches";
    }
  } catch (error) {
    console.error("CricCard:", error);
    container.replaceChildren(
      el("p", "live-message", "Unable to load scores. " + error.message)
    );
    if (status) status.textContent = "Connection failed";
  } finally {
    if (refresh) refresh.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  addStyles();
  $("#refresh-live")?.addEventListener("click", loadLiveMatches);
  loadLiveMatches();
  window.setInterval(loadLiveMatches, 30000);
});
   
