"use strict";

const API_URL = "https://criccard.vercel.app/api/live";
const SCORECARD_URL = "https://criccard.vercel.app/api/scorecard";

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

const $ = s => document.querySelector(s);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = String(text);
  return node;
}

function flag(name) {
  const key = Object.keys(FLAGS).find(k =>
    String(name || "").toLowerCase().includes(k.toLowerCase())
  );
  return key ? FLAGS[key] : "🏏";
}

function score(team) {
  if (!team) return "";
  return team.complete_score ||
    (team.score !== "" && team.score != null
      ? team.score + (
          team.wickets !== "" && team.wickets != null
            ? "-" + team.wickets : ""
        )
      : "");
}

function addStyles() {
  if ($("#cc-styles")) return;

  const style = el("style");
  style.id = "cc-styles";
  style.textContent = `
    .cc-overlay {
      position:fixed; inset:0; z-index:99999;
      display:flex; align-items:center; justify-content:center;
      padding:12px; background:rgba(0,0,0,.88);
      overflow:auto; box-sizing:border-box;
    }
    .cc-panel {
      width:min(850px,100%); max-height:94vh; overflow:auto;
      padding:20px; border-radius:20px; box-sizing:border-box;
      background:#102b35; color:#effcff;
      border:1px solid #06b6d455;
      box-shadow:0 20px 80px #0009;
    }
    .cc-panel * { box-sizing:border-box; }
    .cc-close {
      float:right; padding:9px 13px; border-radius:50%;
      border:1px solid #ffffff30; background:#164653;
      color:white; cursor:pointer; font-size:18px;
    }
    .cc-status { color:#06b6d4; font-weight:800; }
    .cc-muted { color:#a9cbd2; font-size:13px; }
    .cc-team {
      display:flex; align-items:center; gap:12px;
      padding:12px; margin:9px 0;
      border-radius:12px; background:#ffffff0b;
    }
    .cc-logo { width:40px; height:40px; object-fit:contain; }
    .cc-flag { width:40px; font-size:27px; }
    .cc-score { font-size:19px; font-weight:850; }
    .cc-detail {
      padding:9px; background:#ffffff08; border-radius:8px;
      overflow-wrap:anywhere;
    }
    .cc-section-title { margin:24px 0 10px; color:#06b6d4; }
    .cc-innings-select {
      width:100%; padding:12px; margin:8px 0 14px;
      background:#164653; color:white; border:1px solid #06b6d455;
      border-radius:10px; font-size:15px;
    }
    .cc-table-wrap { overflow-x:auto; margin:10px 0 20px; }
    .cc-table {
      width:100%; border-collapse:collapse;
      min-width:440px; font-size:13px;
    }
    .cc-table th, .cc-table td {
      padding:10px 8px; text-align:left;
      border-bottom:1px solid #ffffff16;
    }
    .cc-table th { color:#a9cbd2; font-weight:600; }
    .cc-table td.cc-num, .cc-table th.cc-num { text-align:right; }
    .cc-table tr.cc-total td {
      font-weight:800; color:#06b6d4;
      background:#ffffff08;
    }
    .cc-dismissal { color:#a9cbd2; font-size:12px; }
    .cc-note {
      padding:12px; border-radius:10px;
      background:#ffffff08; color:#d9f0f4;
    }
    .cc-tabs {
      display:flex; flex-wrap:wrap; gap:8px; margin:14px 0;
    }
    .cc-tab {
      padding:9px 13px; border-radius:9px;
      color:#eafcff; background:#164653;
      border:1px solid #ffffff20; cursor:pointer;
    }
    .cc-tab.active {
      background:#087e98;
      border-color:#06b6d4;
      color:#ffffff;
    }
    .cc-clickable { cursor:pointer; }
    .cc-clickable:focus-visible {
      outline:2px solid #06b6d4;
    }
    @media(max-width:480px) {
      .cc-panel { padding:14px; border-radius:15px; }
      .cc-team { padding:9px; }
      .cc-section-title { margin-top:20px; }
    }
  `;
  document.head.append(style);
}

function addTeam(panel, name, data, logo) {
  const row = el("div", "cc-team");

  if (logo && /^https:\/\//i.test(logo)) {
    const img = el("img", "cc-logo");
    img.src = logo;
    img.alt = "";
    img.onerror = () =>
      img.replaceWith(el("span", "cc-flag", flag(name)));
    row.append(img);
  } else {
    row.append(el("span", "cc-flag", flag(name)));
  }

  const info = el("div", "");
  info.append(
    el("strong", "", name || "Team"),
    el("div", "cc-score", score(data) || "Score unavailable"),
    el("small", "cc-muted",
      data && data.overs ? data.overs + " overs" : "")
  );
  row.append(info);
  panel.append(row);
}

function addDetails(panel, m) {
  [
    ["Match", [m.type, m.title].filter(Boolean).join(" · ")],
    ["Venue", m.venue],
    ["Date", m.date],
    ["Toss", m.toss],
    ["Match situation", m.runs_needed],
    ["Result", m.result]
  ].forEach(([label, value]) => {
    if (!value) return;
    const row = el("p", "cc-detail");
    row.append(el("b", "", label + ": "),
      document.createTextNode(value));
    panel.append(row);
  });
}

function makeTable(headers, rows, numericColumns = []) {
  const wrap = el("div", "cc-table-wrap");
  const table = el("table", "cc-table");
  const thead = el("thead");
  const headRow = el("tr");

  headers.forEach((header, i) => {
    const th = el("th", numericColumns.includes(i) ? "cc-num" : "", header);
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  rows.forEach(row => {
    const tr = el("tr", row.total ? "cc-total" : "");
    row.cells.forEach((value, i) => {
      const td = el("td", numericColumns.includes(i) ? "cc-num" : "");
      if (value && typeof value === "object" && value.dismissal) {
        td.append(
          el("div", "", value.name),
          el("div", "cc-dismissal", value.dismissal)
        );
      } else {
        td.textContent = value == null ? "—" : String(value);
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  wrap.append(table);
  return wrap;
}

function renderInning(container, inning) {
  container.replaceChildren();

  container.append(el("h3", "cc-section-title",
    (inning.name || "Innings") + " · " +
    (inning.score ?? "—") + "/" + (inning.wickets ?? "—") +
    " (" + (inning.overs || "—") + " ov)"
  ));

  if (inning.extras) {
    container.append(el("p", "cc-muted", "Extras: " + inning.extras));
  }

  const batters = Array.isArray(inning.batters) ? inning.batters : [];
  container.append(el("h4", "", "Batting"));
  if (batters.length) {
    container.append(makeTable(
      ["Batter", "R", "B", "4s", "6s", "SR"],
      batters.map(p => ({
        cells: [
          {
            name: p.name || "Batter",
            dismissal: p.out_by || "Dismissal unavailable"
          },
          p.runs, p.balls, p.fours, p.sixes, p.strike_rate
        ]
      })),
      [1, 2, 3, 4, 5]
    ));
  } else {
    container.append(el("p", "cc-note", "Batting details unavailable."));
  }

  const bowlers = Array.isArray(inning.bowlers) ? inning.bowlers : [];
  container.append(el("h4", "", "Bowling"));
  if (bowlers.length) {
    container.append(makeTable(
      ["Bowler", "O", "M", "R", "W", "Econ"],
      bowlers.map(p => ({
        cells: [
          p.name, p.overs, p.maidens, p.runs,
          p.wickets, p.economy
        ]
      })),
      [1, 2, 3, 4, 5]
    ));
  } else {
    container.append(el("p", "cc-note", "Bowling details unavailable."));
  }

  const fow = Array.isArray(inning.fall_of_wickets)
    ? inning.fall_of_wickets : [];
  container.append(el("h4", "", "Fall of wickets"));
  if (fow.length) {
    container.append(makeTable(
      ["Wicket", "Score", "Batter", "Over"],
      fow.map(p => ({
        cells: [p.wicket, p.score, p.player, p.over]
      })),
      [0, 1, 3]
    ));
  } else {
    container.append(el("p", "cc-note", "Fall of wickets unavailable."));
  }

  const partnerships = Array.isArray(inning.partnerships)
    ? inning.partnerships : [];
  container.append(el("h4", "", "Partnerships"));
  if (partnerships.length) {
    container.append(makeTable(
      ["Batters", "Runs", "Balls"],
      partnerships.map(p => ({
        cells: [p.players_name, p.run, p.ball]
      })),
      [1, 2]
    ));
  } else {
    container.append(el("p", "cc-note", "Partnerships unavailable."));
  }
}

async function loadScorecard(panel, m) {
  const area = el("div", "cc-scorecard-area");
  panel.append(el("h3", "cc-section-title", "Full scorecard"), area);

  if (!m.id || !/^\d{1,12}$/.test(String(m.id))) {
    area.append(el("p", "cc-note",
      "This match does not have a valid numeric match ID."));
    return;
  }

  area.append(el("p", "cc-note", "Loading batting and bowling details…"));

  try {
    const response = await fetch(
      SCORECARD_URL + "?id=" + encodeURIComponent(String(m.id)),
      { headers: { Accept: "application/json" } }
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Scorecard request failed.");
    }

    if (payload.error) throw new Error(payload.error);

    const provider = payload.data;
    const innings = Array.isArray(provider?.data) ? provider.data : [];

    if (provider?.status === false) {
      throw new Error(provider.message || "The provider returned an error.");
    }

    if (!innings.length) {
      area.replaceChildren(el("p", "cc-note",
        "No scorecard is available for this match yet."));
      return;
    }

    const selector = el("select", "cc-innings-select");
    selector.setAttribute("aria-label", "Select innings");
    const content = el("div", "cc-innings-content");

    innings.forEach((inning, index) => {
      const option = el("option", "",
        "Innings " + (inning.inning_number || index + 1) +
        " — " + (inning.name || "Team") +
        " (" + (inning.score ?? "—") + "/" +
        (inning.wickets ?? "—") + ")");
      option.value = String(index);
      selector.append(option);
    });

    selector.addEventListener("change", () => {
      renderInning(content, innings[Number(selector.value)]);
    });

    area.replaceChildren(selector, content);
    renderInning(content, innings[0]);

    if (provider.apiMetadata?.updated) {
      area.append(el("p", "cc-muted",
        "Provider data version: " + provider.apiMetadata.updated +
        ". Check the match details for freshness."));
    }
  } catch (error) {
    console.error("CricCard scorecard:", error);
    area.replaceChildren(
      el("p", "cc-note",
        "Could not load the scorecard. " + error.message),
      el("button", "cc-tab", "Retry scorecard")
    );
    area.lastChild.onclick = () => {
      area.remove();
      loadScorecard(panel, m);
    };
  }
}

function showDetails(m) {
  const overlay = el("div", "cc-overlay");
  const panel = el("div", "cc-panel");
  const close = el("button", "cc-close", "✕");
  close.setAttribute("aria-label", "Close match details");

  function closePanel() {
    overlay.remove();
    document.body.style.overflow = "";
  }

  close.onclick = closePanel;

  panel.append(
    close,
    el("p", "cc-status", m.result ? "MATCH RESULT" : m.status || "MATCH"),
    el("h2", "", (m.teama_name || "Team A") + " vs " +
      (m.teamb_name || "Team B")),
    el("p", "cc-muted", m.series_name || "Cricket")
  );

  addTeam(panel, m.teama_name, m.teama_score, m.teama_logo_url);
  addTeam(panel, m.teamb_name, m.teamb_score, m.teamb_logo_url);
  addDetails(panel, m);

  overlay.append(panel);
  overlay.onclick = event => {
    if (event.target === overlay) closePanel();
  };

  document.body.append(overlay);
  document.body.style.overflow = "hidden";

  loadScorecard(panel, m);
}

async function loadLiveMatches() {
  const container = $("#live-matches");
  const status = $("#live-status");
  const refresh = $("#refresh-live");

  if (!container) return;

  if (refresh) refresh.disabled = true;
  if (status) status.textContent = "Loading cricket scores…";
  container.replaceChildren(
    el("p", "live-message", "Fetching cricket data…")
  );

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
      container.append(el("p", "live-message",
        "No matches returned right now."));
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
      card.setAttribute("aria-label",
        "View scorecard: " + m.teama_name + " versus " + m.teamb_name);

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
          img.onerror = () =>
            img.replaceWith(el("span", "flag", flag(name)));
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
        el("span", "", m.runs_needed || m.result || "View scorecard →")
      );

      card.append(top, teams, foot);
      card.onclick = () => showDetails(m);
      card.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showDetails(m);
        }
      };

      container.append(card);
    });

    if (status) {
      status.textContent = "Updated " +
        new Date().toLocaleTimeString() + " · " +
        matches.length + " matches";
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
