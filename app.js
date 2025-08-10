// ===============================
// Pulse+ — MVP Gamificado (JS)
// ===============================

// -------------------------------
// Armazenamento (localStorage)
// -------------------------------
const LS = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

// -------------------------------
// Estado inicial e constantes
// -------------------------------
const defaultUsers = ["Você", "Ana", "Bruno", "Carlos", "Dora"];

const tabs = [
  { id: "checkin",     label: "Check-in" },
  { id: "kudos",       label: "Kudos" },
  { id: "missions",    label: "Missões" },
  { id: "leaderboard", label: "Ranking" },
  { id: "dashboard",   label: "Dashboard" },
];

const MOODS = [
  { key: "muito_bem", emoji: "😀", label: "Muito bem" },
  { key: "bem",       emoji: "🙂", label: "Bem" },
  { key: "neutro",    emoji: "😐", label: "Neutro" },
  { key: "cansado",   emoji: "🙁", label: "Cansado" },
  { key: "stressado", emoji: "😢", label: "Estressado" },
];

const MISSIONS = [
  { id: "seguranca_1", title: "Sinalize 2 melhorias de segurança", points: 40, badge: "Guardião da Segurança" },
  { id: "empatia_1",   title: "Dê 3 Kudos a colegas de setores diferentes", points: 30, badge: "Mestre da Empatia" },
  { id: "ideia_1",     title: "Envie 1 ideia de melhoria de processo", points: 25, badge: "Inovador do Dia" },
];

function initState() {
  if (!LS.get("pulse_users"))        LS.set("pulse_users", defaultUsers);
  if (!LS.get("pulse_points")) {
    const pts = {}; for (const u of LS.get("pulse_users",[])) pts[u] = 0; LS.set("pulse_points", pts);
  }
  if (!LS.get("pulse_checkins"))     LS.set("pulse_checkins", []);
  if (!LS.get("pulse_kudos"))        LS.set("pulse_kudos", []);
  if (!LS.get("pulse_badges"))       LS.set("pulse_badges", {});
  if (!LS.get("pulse_missions")) {
    const ms = {}; for (const u of LS.get("pulse_users",[])) ms[u] = {}; LS.set("pulse_missions", ms);
  }
  if (!LS.get("pulse_suggestions"))  LS.set("pulse_suggestions", []);
  if (!LS.get("pulse_currentUser"))  LS.set("pulse_currentUser", "Você");
}

// -------------------------------
// Helpers de UI
// -------------------------------
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const nowFmt = (ts) => new Date(ts).toLocaleString();

function addPoints(user, pts) {
  const all = LS.get("pulse_points", {});
  all[user] = (all[user] || 0) + pts;
  LS.set("pulse_points", all);
}

function addBadge(user, badge) {
  const all = LS.get("pulse_badges", {});
  all[user] = all[user] || [];
  if (!all[user].includes(badge)) all[user].push(badge);
  LS.set("pulse_badges", all);
}

// -------------------------------
// Navegação (abas)
// -------------------------------
function renderTabs() {
  const wrap = $("#tabs");
  wrap.innerHTML = "";
  const active = location.hash.replace("#", "") || "checkin";
  tabs.forEach(t => {
    const el = document.createElement("div");
    el.className = "tab" + (active === t.id ? " active" : "");
    el.textContent = t.label;
    el.onclick = () => { location.hash = t.id; updateScreens(); };
    wrap.appendChild(el);
  });
}

function updateScreens() {
  const active = location.hash.replace("#", "") || "checkin";
  $$(".screen").forEach(s => s.style.display = "none");
  const scr = document.getElementById("screen-" + active);
  if (scr) scr.style.display = "block";
  $$(".tab").forEach((t, i) => t.classList.toggle("active", tabs[i].id === active));
  if (active === "checkin")     renderCheckins();
  if (active === "kudos")       renderKudos();
  if (active === "missions")    renderMissions();
  if (active === "leaderboard") renderLeaderboard();
  if (active === "dashboard")   renderDashboard();
}

// -------------------------------
// Topo: seleção de usuário
// -------------------------------
function renderUsers() {
  const sel = $("#currentUser");
  sel.innerHTML = "";
  const users = LS.get("pulse_users", []);
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u; opt.textContent = u;
    sel.appendChild(opt);
  });
  sel.value = LS.get("pulse_currentUser", users[0] || "Você");
  sel.onchange = () => { LS.set("pulse_currentUser", sel.value); renderAll(); };

  $("#addUserBtn").onclick = () => {
    const name = prompt("Nome do novo usuário:");
    if (!name) return;
    const list = LS.get("pulse_users", []);
    if (list.includes(name)) return alert("Usuário já existe");
    list.push(name); LS.set("pulse_users", list);
    const pts = LS.get("pulse_points", {}); pts[name] = 0; LS.set("pulse_points", pts);
    const ms  = LS.get("pulse_missions", {}); ms[name] = {}; LS.set("pulse_missions", ms);
    renderUsers(); renderAll();
  };
}

// -------------------------------
// Check-ins
// -------------------------------
function renderCheckins() {
  const moodWrap = $("#moodBtns");
  moodWrap.innerHTML = "";
  let selectedMood = null;

  MOODS.forEach(m => {
    const b = document.createElement("button");
    b.className = "mood";
    b.textContent = `${m.emoji} ${m.label}`;
    b.onclick = () => { selectedMood = m.key; $$(".mood").forEach(x => x.classList.remove("selected")); b.classList.add("selected"); };
    moodWrap.appendChild(b);
  });

  $("#submitMood").onclick = () => {
    if (!selectedMood) return alert("Selecione um humor");
    const note = $("#moodNote").value.trim();
    const u = LS.get("pulse_currentUser", "Você");
    const arr = LS.get("pulse_checkins", []);
    const rec = { user: u, mood: selectedMood, note, ts: Date.now() };
    arr.unshift(rec);
    LS.set("pulse_checkins", arr);
    if (note) LS.set("pulse_suggestions", [{ user: u, note, ts: rec.ts }, ...LS.get("pulse_suggestions", [])]);
    addPoints(u, 10);
    $("#moodNote").value = "";
    $("#checkinStatus").textContent = "Check-in registrado! (+10 pts)";
    setTimeout(() => $("#checkinStatus").textContent = "", 1800);
    renderLeaderboard(); renderDashboard(); renderRecentCheckins();
  };

  renderRecentCheckins();
}

function renderRecentCheckins() {
  const box = $("#recentCheckins");
  const arr = LS.get("pulse_checkins", []).slice(0, 8);
  const MOOD_LABEL = Object.fromEntries(MOODS.map(m => [m.key, `${m.emoji} ${m.label}`]));
  box.innerHTML = arr.map(r => `
    <div class="item">
      <div class="flex-between">
        <strong>${r.user}</strong>
        <span class="badge">${MOOD_LABEL[r.mood] || r.mood}</span>
      </div>
      <div class="muted">${r.note ? r.note : "—"}</div>
      <div class="muted">${nowFmt(r.ts)}</div>
    </div>`).join("");
}

// -------------------------------
/* Kudos */
function renderKudos() {
  const toSel = $("#kudoTo");
  const users = LS.get("pulse_users", []);
  toSel.innerHTML = users.map(u => `<option>${u}</option>`).join("");
  const current = LS.get("pulse_currentUser", "Você");
  if (toSel.value === current) toSel.value = users.find(u => u !== current) || current;

  $("#sendKudo").onclick = () => {
    const to = toSel.value;
    const msg = $("#kudoMsg").value.trim();
    if (!to)  return alert("Selecione o destinatário");
    if (!msg) return alert("Escreva uma mensagem");
    const from = LS.get("pulse_currentUser", "Você");
    if (from === to) return alert("Envie um kudo para outra pessoa :)");

    const ks = LS.get("pulse_kudos", []);
    ks.unshift({ from, to, msg, ts: Date.now() });
    LS.set("pulse_kudos", ks);
    addPoints(from, 5);
    addPoints(to, 15);
    $("#kudoMsg").value = "";
    $("#kudoStatus").textContent = "Kudo enviado! (+5 para você, +15 para o colega)";
    setTimeout(() => $("#kudoStatus").textContent = "", 2000);
    renderLeaderboard(); renderKudoFeed();
  };

  renderKudoFeed();
}

function renderKudoFeed() {
  const feed = $("#kudoFeed");
  const ks = LS.get("pulse_kudos", []).slice(0, 12);
  feed.innerHTML = ks.map(k => `
    <div class="item">
      <div class="flex-between"><strong>${k.from}</strong><span class="muted">para</span><strong>${k.to}</strong></div>
      <div class="muted">“${k.msg}”</div>
      <div class="muted">${nowFmt(k.ts)}</div>
    </div>`).join("");
}

// -------------------------------
// Missões
// -------------------------------
function renderMissions() {
  const list = $("#missionsList");
  const user = LS.get("pulse_currentUser", "Você");
  const progress = LS.get("pulse_missions", {})[user] || {};
  list.innerHTML = "";

  MISSIONS.forEach(m => {
    const done = progress[m.id]?.done;
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="flex-between">
        <div>
          <strong>${m.title}</strong>
          <div class="muted">Valor: +${m.points} pts</div>
        </div>
        <div>${done ? '<span class="chip">Concluída</span>' : `<button class="primary" data-mid="${m.id}">Concluir</button>`}</div>
      </div>`;
    list.appendChild(item);
  });

  list.querySelectorAll("button[data-mid]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-mid");
      const all = LS.get("pulse_missions", {});
      all[user] = all[user] || {};
      all[user][id] = { done: true, ts: Date.now() };
      LS.set("pulse_missions", all);
      const m = MISSIONS.find(x => x.id === id);
      addPoints(user, m.points);
      addBadge(user, m.badge);
      renderMissions(); renderLeaderboard(); renderBadges();
    };
  });

  renderBadges();
}

function renderBadges() {
  const box = $("#badges");
  const user = LS.get("pulse_currentUser", "Você");
  const list = (LS.get("pulse_badges", {})[user] || []);
  if (!list.length) {
    box.innerHTML = '<div class="muted">Sem insígnias ainda. Complete missões para ganhar!</div>';
    return;
  }
  box.innerHTML = list.map(b => `<div class="item"><span class="badge">🏅 ${b}</span></div>`).join("");
}

// -------------------------------
// Ranking
// -------------------------------
function renderLeaderboard() {
  const body = $("#leaderboardTbl tbody");
  const pts = LS.get("pulse_points", {});
  const users = Object.keys(pts);
  const checks = LS.get("pulse_checkins", []);
  const kudos  = LS.get("pulse_kudos", []);
  const lastActions = {};

  users.forEach(u => {
    const lastCheck = checks.find(c => c.user === u)?.ts || 0;
    const lastKudo  = kudos.find(k => k.from === u || k.to === u)?.ts || 0;
    lastActions[u]  = Math.max(lastCheck, lastKudo);
  });

  users.sort((a,b) => (pts[b] - pts[a]) || (lastActions[b] - lastActions[a]));
  body.innerHTML = users.map((u,i) =>
    `<tr><td>${i+1}</td><td>${u}</td><td>${pts[u]}</td><td>${lastActions[u] ? nowFmt(lastActions[u]) : "—"}</td></tr>`
  ).join("");
}

// -------------------------------
// Dashboard
// -------------------------------
function renderDashboard() {
  const box = $("#climateBars");
  const checks = LS.get("pulse_checkins", []);
  const count = { muito_bem: 0, bem: 0, neutro: 0, cansado: 0, stressado: 0 };
  checks.slice(0, 100).forEach(c => { if (count[c.mood] !== undefined) count[c.mood]++; });
  const label = (k) => MOODS.find(m => m.key === k);

  box.innerHTML = Object.keys(count).map(k => {
    const v = count[k];
    const pct = Math.min(100, v * 8); // barra simples
    const L = label(k);
    return `
      <div class="item">
        <div class="flex-between"><strong>${L.emoji} ${L.label}</strong><span class="muted">${v}</span></div>
        <div style="height:10px; background:#0b1020; border-radius:999px; overflow:hidden; border:1px solid rgba(255,255,255,.08)">
          <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--accent-2), var(--accent))"></div>
        </div>
      </div>`;
  }).join("");

  const sug = $("#suggestions");
  const arr = LS.get("pulse_suggestions", []).slice(0, 12);
  sug.innerHTML = arr.length
    ? arr.map(s => `
      <div class="item">
        <div class="flex-between"><strong>${s.user}</strong><span class="muted">${nowFmt(s.ts)}</span></div>
        <div class="muted">${s.note}</div>
      </div>`).join("")
    : '<div class="muted">Sem sugestões ainda. Envie comentários nos check-ins!</div>';
}

// -------------------------------
// Boot
// -------------------------------
function renderAll() {
  renderTabs();
  updateScreens();
  renderUsers();
  renderLeaderboard();
}

// Garante que tudo rode após o DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  initState();
  renderAll();
});
