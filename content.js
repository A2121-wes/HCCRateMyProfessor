// HCCRate - content.js

const BADGE_CLASS = "hccrate-badge";
const PROCESSED_ATTR = "data-hccrate-done";
const professorData = {}; // name -> rmp data
const rowData = [];       // { name, rating, difficulty, room, rmpUrl }

init();

function init() {
  processPage();
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) { processPage(); break; }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function processPage() {
  for (const el of findInstructorElements()) {
    if (el.getAttribute(PROCESSED_ATTR)) continue;
    el.setAttribute(PROCESSED_ATTR, "true");
    const rawName = el.textContent.trim();
    if (!rawName || rawName.length < 3) continue;
    const cleanName = normalizeName(rawName);
    if (cleanName) injectRating(el, cleanName);
  }
}

function findInstructorElements() {
  const found = new Set();
  const psSelectors = [
    '[id*="DERIVED_CLSRCH_INSTR_NAME"]',
    '[id*="SSR_CLSRSLT_WRK_INSTR"]',
    '[id*="INSTR_LONG_NM"]',
    '[id*="INSTR_NAME"]',
  ];
  for (const sel of psSelectors) {
    document.querySelectorAll(sel).forEach(el => found.add(el));
  }
  if (found.size === 0) findByColumnHeader("Instructor").forEach(el => found.add(el));
  if (found.size === 0) {
    document.querySelectorAll("td").forEach(td => {
      if (td.getAttribute(PROCESSED_ATTR)) return;
      if (td.querySelector("table")) return;
      const text = td.textContent.trim();
      if (looksLikeProfessorName(text)) found.add(td);
    });
  }
  return [...found];
}

function findByColumnHeader(headerText) {
  const results = [];
  const allHeaders = document.querySelectorAll(
    "th, .PSLEVEL1GRIDCOLUMNHDR, .PSLEVEL2GRIDCOLUMNHDR, [role='columnheader']"
  );
  for (const th of allHeaders) {
    if (th.textContent.trim().toLowerCase() !== headerText.toLowerCase()) continue;
    const row = th.closest("tr");
    if (!row) continue;
    const colIndex = [...row.children].indexOf(th);
    if (colIndex === -1) continue;
    const table = th.closest("table");
    if (!table) continue;
    table.querySelectorAll("tbody tr").forEach(tr => {
      const cell = tr.children[colIndex];
      if (!cell) return;
      const inner = cell.querySelector("span, div, a") ?? cell;
      if (inner.textContent.trim()) results.push(inner);
    });
    break;
  }
  return results;
}

// Try to grab the room from the same table row as the instructor element
function getRoomForEl(el) {
  const row = el.closest("tr");
  if (!row) return null;
  // Look for a cell whose id contains "ROOM" or find by column header index
  const roomEl = row.querySelector('[id*="ROOM"], [id*="FACIL"]');
  if (roomEl) return roomEl.textContent.trim() || null;
  // Fallback: find "Room" column index from header
  const table = row.closest("table");
  if (!table) return null;
  const headers = table.querySelectorAll("th, .PSLEVEL1GRIDCOLUMNHDR");
  let roomIdx = -1;
  headers.forEach((th, i) => {
    if (th.textContent.trim().toLowerCase() === "room") roomIdx = i;
  });
  if (roomIdx === -1) return null;
  const cell = row.children[roomIdx];
  return cell?.textContent.trim() || null;
}

function looksLikeProfessorName(text) {
  if (/\d/.test(text)) return false;
  if (text.length > 40) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(w => /^[A-Za-zÀ-ÿ''\-]{2,}\.?$/.test(w));
}

function normalizeName(raw) {
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map(s => s.trim());
    if (first && last) return `${first} ${last}`;
  }
  return raw.replace(/\s+/g, " ").trim() || null;
}

// ── Injection ─────────────────────────────────────────────────────────────────

async function injectRating(el, professorName) {
  const placeholder = createBadge({ loading: true });
  el.insertAdjacentElement("afterend", placeholder);

  try {
    const result = await chrome.runtime.sendMessage({
      type: "GET_PROFESSOR_RATING",
      name: professorName,
    });
    placeholder.remove();

    if (!result.success || result.data?.notFound) {
      el.insertAdjacentElement("afterend", createBadge({ notFound: true, name: professorName }));
    } else {
      el.insertAdjacentElement("afterend", createBadge({ data: result.data }));
      const room = getRoomForEl(el);
      // Avoid duplicates
      if (!rowData.find(r => r.name === professorName)) {
        rowData.push({ name: professorName, room, ...result.data });
      }
      updateRankingPanel();
    }
  } catch (err) {
    placeholder.remove();
    console.warn("[HCCRate] Error fetching rating for", professorName, err);
  }
}

// ── Ranking Panel ─────────────────────────────────────────────────────────────

let currentSort = "rating";
let panelCollapsed = false;

const SORTS = {
  rating:     { label: "Rating",     fn: (a, b) => b.rating - a.rating },
  difficulty: { label: "Easiest",    fn: (a, b) => a.difficulty - b.difficulty },
  room:       { label: "Room",       fn: (a, b) => (a.room ?? "zzz").localeCompare(b.room ?? "zzz") },
};

function updateRankingPanel() {
  const valid = rowData.filter(d => d.rating && d.numRatings > 0);
  if (valid.length < 2) return;

  let panel = document.getElementById("hccrate-panel");
  if (!panel) {
    panel = buildPanel();
    document.body.appendChild(panel);
    makeDraggable(panel);
  }

  renderPanel(panel, valid);
}

function buildPanel() {
  const panel = document.createElement("div");
  panel.id = "hccrate-panel";
  Object.assign(panel.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    zIndex: "99999",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontFamily: "Arial, sans-serif",
    fontSize: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
    width: "260px",
    userSelect: "none",
  });
  return panel;
}

function renderPanel(panel, valid) {
  const sorted = [...valid].sort(SORTS[currentSort].fn);

  const headerHtml = `
    <div id="hccrate-header" style="
      display:flex;justify-content:space-between;align-items:center;
      padding:10px 14px;cursor:grab;background:#f8f8f8;
      border-radius:10px 10px 0 0;border-bottom:1px solid #eee;
    ">
      <span style="font-weight:700;font-size:13px;color:#111;">🏆 Best Instructors</span>
      <button id="hccrate-toggle" style="
        background:none;border:none;cursor:pointer;
        font-size:16px;color:#888;padding:0;line-height:1;
      ">${panelCollapsed ? "▲" : "▼"}</button>
    </div>`;

  const sortHtml = `
    <div style="display:flex;gap:4px;padding:8px 14px 4px;flex-wrap:wrap;">
      ${Object.entries(SORTS).map(([key, s]) => `
        <button data-sort="${key}" style="
          padding:3px 9px;border-radius:20px;font-size:11px;cursor:pointer;
          border:1px solid ${currentSort === key ? "#1a73e8" : "#ddd"};
          background:${currentSort === key ? "#e8f0fe" : "#fff"};
          color:${currentSort === key ? "#1a73e8" : "#555"};
          font-weight:${currentSort === key ? "700" : "400"};
        ">${s.label}</button>
      `).join("")}
    </div>`;

  const rowsHtml = sorted.map((p, i) => `
    <div style="
      display:flex;justify-content:space-between;align-items:center;
      padding:6px 14px;
      ${i < sorted.length - 1 ? "border-bottom:1px solid #f5f5f5;" : ""}
    ">
      <div style="flex:1;min-width:0;overflow:hidden;">
        <span style="color:#bbb;margin-right:4px;">#${i + 1}</span>
        <a href="${p.rmpUrl}" target="_blank" rel="noopener"
           style="color:#111;text-decoration:none;font-weight:600;font-size:12px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
           onclick="event.stopPropagation();event.stopImmediatePropagation();">
          ${p.name}
        </a>
        ${p.room ? `<div style="color:#aaa;font-size:10px;margin-left:16px;">${p.room}</div>` : ""}
      </div>
      <div style="text-align:right;margin-left:8px;white-space:nowrap;">
        <span style="color:${ratingToColor(p.rating)};font-weight:700;">${p.rating.toFixed(1)}</span>
        <span style="color:#ddd;"> · </span>
        <span style="color:${diffToColor(p.difficulty)};font-size:11px;">${p.difficulty.toFixed(1)}</span>
      </div>
    </div>
  `).join("");

  const bodyHtml = `
    <div id="hccrate-body" style="display:${panelCollapsed ? "none" : "block"}">
      <div style="padding:4px 14px 4px;font-size:10px;color:#aaa;">
        ${Object.values(SORTS)[0].label === currentSort ? "Higher rating · lower difficulty" :
          currentSort === "difficulty" ? "Lower difficulty first" : "By room name"}
      </div>
      ${sortHtml}
      <div style="max-height:260px;overflow-y:auto;padding-bottom:6px;">
        ${rowsHtml}
      </div>
    </div>`;

  panel.innerHTML = headerHtml + bodyHtml;

  // Collapse toggle
  panel.querySelector("#hccrate-toggle").addEventListener("click", (e) => {
    e.stopPropagation();
    panelCollapsed = !panelCollapsed;
    updateRankingPanel();
  });

  // Sort buttons
  panel.querySelectorAll("[data-sort]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentSort = btn.dataset.sort;
      updateRankingPanel();
    });
  });
}

function makeDraggable(panel) {
  let dragging = false, ox = 0, oy = 0;

  panel.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    panel.style.cursor = "grabbing";
    panel.style.right = "auto";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = (e.clientX - ox) + "px";
    panel.style.top = (e.clientY - oy) + "px";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    panel.style.cursor = "";
  });
}

// ── Badge rendering ───────────────────────────────────────────────────────────

function createBadge({ loading, notFound, data, name }) {
  const wrapper = document.createElement("span");
  wrapper.className = BADGE_CLASS;
  Object.assign(wrapper.style, {
    display: "block",
    marginTop: "4px",
    fontFamily: "Arial, sans-serif",
    fontSize: "11px",
    lineHeight: "1.7",
    color: "#444",
  });

  if (loading) {
    wrapper.textContent = "Loading...";
    wrapper.style.color = "#bbb";
    return wrapper;
  }

  if (notFound) {
    const url = `https://www.ratemyprofessors.com/search/professors/2184?q=${encodeURIComponent(name ?? "")}`;
    const a = makeLink(url, "Not on RMP");
    a.style.color = "#bbb";
    wrapper.appendChild(a);
    return wrapper;
  }

  const { rating, difficulty, numRatings, wouldTakeAgain, rmpUrl } = data;

  const lines = [
    ["Rating",     rating?.toFixed(1) ?? "N/A",              ratingToColor(rating)],
    ["Difficulty", difficulty?.toFixed(1) ?? "N/A",          diffToColor(difficulty)],
    ...(wouldTakeAgain != null && wouldTakeAgain >= 0
      ? [["Again", `${Math.round(wouldTakeAgain)}%`, "#444"]]
      : []),
  ];

  for (const [label, val, color] of lines) {
    const row = document.createElement("div");
    row.innerHTML =
      `<span style="color:#999;">${label} </span>` +
      `<span style="color:${color};font-weight:700;">${val}</span>`;
    wrapper.appendChild(row);
  }

  const linkRow = document.createElement("div");
  const a = makeLink(rmpUrl, `${numRatings} ratings →`);
  a.style.color = "#1a73e8";
  linkRow.appendChild(a);
  wrapper.appendChild(linkRow);

  return wrapper;
}

function makeLink(url, text) {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = text;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  Object.assign(a.style, { textDecoration: "none", fontSize: "11px" });
  a.addEventListener("click", e => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  });
  return a;
}

function ratingToColor(r) {
  if (!r) return "#888";
  return r >= 4 ? "#2e7d32" : r >= 3 ? "#e65100" : "#c62828";
}
function diffToColor(d) {
  if (!d) return "#888";
  return d <= 2.5 ? "#2e7d32" : d <= 3.5 ? "#e65100" : "#c62828";
}
