const STORAGE_KEY = "padel-planner-v3";

const state = {
  users: [],
  invitations: [],
  tournaments: [],
  currentUserId: null,
  draft: {
    name: "",
    players: [],
    settings: { courts: 1, duration: 25, startTime: "10:00" },
    schedule: []
  }
};

const byId = (id) => document.getElementById(id);

const authView = byId("auth-view");
const appView = byId("app-view");
const adminPanel = byId("admin-panel");
const session = byId("session");
const sessionUser = byId("session-user");

const loginForm = byId("login-form");
const registerForm = byId("register-form");
const logoutBtn = byId("logout-btn");

const inviteForm = byId("invite-form");
const inviteList = byId("invite-list");

const playerForm = byId("player-form");
const playerInput = byId("player-input");
const clearPlayersBtn = byId("clear-players-btn");
const playerList = byId("player-list");

const courtsInput = byId("courts");
const durationInput = byId("duration");
const startTimeInput = byId("start-time");
const tournamentNameInput = byId("tournament-name");
const generateBtn = byId("generate-btn");

const scheduleRoot = byId("schedule");
const scheduleEmpty = byId("schedule-empty");
const historyList = byId("history-list");
const historyEmpty = byId("history-empty");
const matchTemplate = byId("match-template");

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function show(el, isVisible) {
  el.classList.toggle("hidden", !isVisible);
}

function nowIso() {
  return new Date().toISOString();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seed() {
  state.users = [{ id: uid(), email: "admin@padel.local", password: "admin123", role: "admin", createdAt: nowIso() }];
  state.invitations = [];
  state.tournaments = [];
  state.currentUserId = null;
  state.draft = { name: "", players: [], settings: { courts: 1, duration: 25, startTime: "10:00" }, schedule: [] };
  save();
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    seed();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.users = Array.isArray(parsed.users) ? parsed.users : [];
    state.invitations = Array.isArray(parsed.invitations) ? parsed.invitations : [];
    state.tournaments = Array.isArray(parsed.tournaments) ? parsed.tournaments : [];
    state.currentUserId = parsed.currentUserId || null;

    const draft = parsed.draft && typeof parsed.draft === "object" ? parsed.draft : {};
    state.draft = {
      name: typeof draft.name === "string" ? draft.name : "",
      players: Array.isArray(draft.players) ? draft.players : [],
      settings: {
        courts: Math.max(1, Number(draft.settings?.courts || 1)),
        duration: Math.max(10, Number(draft.settings?.duration || 25)),
        startTime: draft.settings?.startTime || "10:00"
      },
      schedule: Array.isArray(draft.schedule) ? draft.schedule : []
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    seed();
    return;
  }

  if (!state.users.length) seed();
}

function currentUser() {
  return state.users.find((u) => u.id === state.currentUserId) || null;
}

function requireAdmin() {
  const user = currentUser();
  return user && user.role === "admin";
}

function hashish(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function login(email, password) {
  const user = state.users.find((u) => u.email === email && u.password === hashish(password));
  if (!user) {
    alert("Ugyldigt login.");
    return;
  }
  state.currentUserId = user.id;
  save();
  render();
}

function register(email, code, password) {
  const existing = state.users.find((u) => u.email === email);
  if (existing) {
    alert("Bruger findes allerede.");
    return;
  }

  const invite = state.invitations.find((i) => i.email === email && i.code === code && !i.usedAt);
  if (!invite) {
    alert("Ugyldig invitation eller kode.");
    return;
  }

  const user = { id: uid(), email, password: hashish(password), role: invite.role, createdAt: nowIso() };
  invite.usedAt = nowIso();
  state.users.push(user);
  state.currentUserId = user.id;
  save();
  render();
}

function createInvite(email, role) {
  if (!requireAdmin()) return;
  const already = state.invitations.find((i) => i.email === email && !i.usedAt);
  if (already) {
    alert("Der findes allerede en aktiv invitation til denne e-mail.");
    return;
  }

  const invite = { id: uid(), email, role, code: Math.random().toString(36).slice(2, 8).toUpperCase(), createdAt: nowIso(), usedAt: null };
  state.invitations.push(invite);
  save();
  renderInvites();

  const subject = encodeURIComponent("Invitation til Padel Planner");
  const body = encodeURIComponent(
    `Hej!\n\nDu er inviteret som ${role}.\nInvitationskode: ${invite.code}\n\nÅbn appen på GitHub Pages og opret konto med din e-mail + kode.`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function formatTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function buildRoundRobin(players) {
  const names = [...players];
  if (names.length % 2) names.push("BYE");

  const rounds = [];
  for (let r = 0; r < names.length - 1; r += 1) {
    const round = [];
    for (let i = 0; i < names.length / 2; i += 1) {
      const a = names[i];
      const b = names[names.length - 1 - i];
      if (a !== "BYE" && b !== "BYE") round.push([a, b]);
    }
    rounds.push(round);

    const fixed = names[0];
    const rest = names.slice(1);
    rest.unshift(rest.pop());
    names.splice(0, names.length, fixed, ...rest);
  }

  return rounds;
}

function toDoublesMatches(rounds) {
  const matches = [];
  rounds.forEach((round) => {
    for (let i = 0; i + 1 < round.length; i += 2) {
      const [a1, a2] = round[i];
      const [b1, b2] = round[i + 1];
      matches.push({ teamA: `${a1} / ${a2}`, teamB: `${b1} / ${b2}` });
    }
  });
  return matches;
}

function createSchedule() {
  if (state.draft.players.length < 4) {
    alert("Du skal have mindst 4 spillere.");
    return;
  }

  state.draft.name = tournamentNameInput.value.trim() || `Turnering ${new Date().toLocaleDateString("da-DK")}`;
  state.draft.settings = {
    courts: Math.max(1, Number(courtsInput.value) || 1),
    duration: Math.max(10, Number(durationInput.value) || 25),
    startTime: startTimeInput.value || "10:00"
  };

  const [h, m] = state.draft.settings.startTime.split(":").map(Number);
  const startMinutes = h * 60 + m;

  const base = toDoublesMatches(buildRoundRobin(state.draft.players));
  if (!base.length) {
    alert("Kunne ikke lave padel-kampe med det antal spillere.");
    return;
  }

  state.draft.schedule = base.map((match, index) => {
    const slot = Math.floor(index / state.draft.settings.courts);
    return {
      ...match,
      court: (index % state.draft.settings.courts) + 1,
      time: formatTime(startMinutes + slot * state.draft.settings.duration)
    };
  });

  const user = currentUser();
  const tournament = {
    id: uid(),
    ownerId: user.id,
    ownerEmail: user.email,
    name: state.draft.name,
    updatedAt: nowIso(),
    data: JSON.parse(JSON.stringify(state.draft))
  };

  state.tournaments.push(tournament);
  save();
  renderDraft();
  renderHistory();
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.draft.players.forEach((name, idx) => {
    const li = document.createElement("li");
    li.append(name);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.addEventListener("click", () => {
      state.draft.players.splice(idx, 1);
      save();
      renderPlayers();
    });
    li.append(remove);
    playerList.append(li);
  });
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  show(scheduleEmpty, state.draft.schedule.length === 0);

  state.draft.schedule.forEach((match, idx) => {
    const node = matchTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".match-top").textContent = `Kamp ${idx + 1} • ${match.time} • Bane ${match.court}`;
    node.querySelector(".match-bottom").textContent = `${match.teamA} vs ${match.teamB}`;
    scheduleRoot.append(node);
  });
}

function renderDraft() {
  tournamentNameInput.value = state.draft.name;
  courtsInput.value = state.draft.settings.courts;
  durationInput.value = state.draft.settings.duration;
  startTimeInput.value = state.draft.settings.startTime;
  renderPlayers();
  renderSchedule();
}

function renderHistory() {
  historyList.innerHTML = "";
  const user = currentUser();
  if (!user) return;

  const visible = state.tournaments
    .filter((t) => user.role === "admin" || t.ownerId === user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  show(historyEmpty, visible.length === 0);

  visible.forEach((t) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.innerHTML = `<strong>${t.name}</strong><br><small>${new Date(t.updatedAt).toLocaleString("da-DK")} • ${t.ownerEmail}</small>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Indlæs";
    loadBtn.addEventListener("click", () => {
      state.draft = JSON.parse(JSON.stringify(t.data));
      save();
      renderDraft();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Slet";
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Slet turneringen?")) return;
      state.tournaments = state.tournaments.filter((x) => x.id !== t.id);
      save();
      renderHistory();
    });

    actions.append(loadBtn, deleteBtn);
    li.append(info, actions);
    historyList.append(li);
  });
}

function renderInvites() {
  inviteList.innerHTML = "";
  if (!requireAdmin()) return;

  const invites = state.invitations.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  invites.forEach((invite) => {
    const li = document.createElement("li");
    const status = invite.usedAt ? "brugt" : "aktiv";
    li.innerHTML = `<div><strong>${invite.email}</strong> (${invite.role})<br><small>Kode: ${invite.code} • ${status}</small></div>`;

    const actions = document.createElement("div");
    actions.className = "actions";
    if (!invite.usedAt) {
      const revokeBtn = document.createElement("button");
      revokeBtn.type = "button";
      revokeBtn.textContent = "Tilbagekald";
      revokeBtn.addEventListener("click", () => {
        state.invitations = state.invitations.filter((x) => x.id !== invite.id);
        save();
        renderInvites();
      });
      actions.append(revokeBtn);
    }

    li.append(actions);
    inviteList.append(li);
  });
}

function render() {
  const user = currentUser();
  show(authView, !user);
  show(appView, Boolean(user));
  show(session, Boolean(user));

  if (!user) return;

  sessionUser.textContent = `${user.email} (${user.role})`;
  show(adminPanel, user.role === "admin");
  renderDraft();
  renderHistory();
  renderInvites();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = byId("login-email").value.trim().toLowerCase();
  const password = byId("login-password").value;
  login(email, password);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = byId("register-email").value.trim().toLowerCase();
  const code = byId("register-code").value.trim().toUpperCase();
  const password = byId("register-password").value;
  register(email, code, password);
});

logoutBtn.addEventListener("click", () => {
  state.currentUserId = null;
  save();
  render();
});

inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = byId("invite-email").value.trim().toLowerCase();
  const role = byId("invite-role").value;
  createInvite(email, role);
  inviteForm.reset();
});

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerInput.value.trim();
  if (!name) return;
  if (state.draft.players.includes(name)) {
    alert("Spiller findes allerede.");
    return;
  }

  state.draft.players.push(name);
  playerInput.value = "";
  save();
  renderPlayers();
});

clearPlayersBtn.addEventListener("click", () => {
  state.draft.players = [];
  save();
  renderPlayers();
});

generateBtn.addEventListener("click", createSchedule);

load();
if (state.users[0] && state.users[0].email === "admin@padel.local" && state.users[0].password === "admin123") {
  state.users[0].password = hashish("admin123");
  save();
}
render();
