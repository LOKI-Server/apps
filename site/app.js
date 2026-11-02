// Draws the registry from index.json, the same file LOKI reads.
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const size = n => n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const safe = url => /^https:\/\//.test(url) ? url : "#";

const DOWNLOAD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>';
const APP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';

function card(app) {
  const icon = app.icon ? `<img src="${esc(app.icon)}" alt="" width="48" height="48" loading="lazy">` : APP;
  const tags = [`v${app.version}`, ...app.capabilities].map(t => `<span class="tag">${esc(t)}</span>`).join("");
  const file = app.url.split("/").pop();
  return `<article class="card" id="${esc(app.id)}" data-search="${esc(`${app.name} ${app.id} ${app.description}`.toLowerCase())}">`
    + `<div class="symbol">${icon}</div><h2>${esc(app.name)}</h2><div class="tags">${tags}</div>`
    + `<p>${esc(app.description || "No description.")}</p>`
    + `<p class="needs">Needs LOKI ${esc(app.sdk)} or newer · ${size(app.size)}</p>`
    + `<div class="actions"><a class="button" href="${esc(safe(app.url))}" download="${esc(file)}">${DOWNLOAD}Download .loki-app</a>`
    + (app.source ? `<a class="button ghost" href="${esc(safe(app.source))}" rel="noopener">Source</a>` : "")
    + `</div><details><summary>SHA-256</summary><code>${esc(app.sha256)}</code></details></article>`;
}

function filter() {
  const query = $("#search").value.trim().toLowerCase();
  const cards = [...document.querySelectorAll(".card")];
  let shown = 0;
  for (const c of cards) { c.hidden = !c.dataset.search.includes(query); if (!c.hidden) shown++; }
  $("#none").hidden = shown > 0 || !cards.length;
  $("#count").textContent = query ? `${shown} of ${cards.length}` : `${cards.length} app${cards.length === 1 ? "" : "s"}`;
}

try {
  const response = await fetch("index.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(response.status);
  const { apps } = await response.json();
  $("#apps").innerHTML = apps.length ? apps.map(card).join("") : '<p class="muted">No apps yet. Be the first to submit one.</p>';
  filter();
} catch {
  $("#apps").innerHTML = '<p class="muted">The app list couldn\'t be loaded. Try again in a moment.</p>';
}
$("#apps").removeAttribute("aria-busy");
$("#search").addEventListener("input", filter);
