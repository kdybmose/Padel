const STORAGE_KEY = "padel-planner-v2";

const authCard = document.getElementById("auth-card");
const appCard = document.getElementById("app-card");
const adminCard = document.getElementById("admin-card");
const sessionBox = document.getElementById("session-box");
const sessionLabel = document.getElementById("session-label");
const logoutBtn = document.getElementById("logout-btn");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const inviteForm = document.getElementById("invite-form");
const inviteList = document.getElementById("invite-list");

const playerForm = document.getElementById("player-form");
const playerInput = document.getElementById("player-input");
const playerList = document.getElementById("player-list");

const courtsInput = document.getElementById("courts");
const matchDurationInput = document.getElementById("match-duration");
const startTimeInput = document.getElementById("start-time");
const generateBtn = document.getElementById("generate-btn");

const scheduleRoot = document.getElementById("schedule");
const scheduleEmpty = document.getElementById("schedule-empty");
const matchTemplate = document.getElementById("match-template");

const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

const state = {
  users: [],
  invitations: [],
  tournaments: [],
  currentUserEmail: null,
  draft: {
    players: [],
    settings: {
      courts: 1,
      duration: 25,
      startTime: "10:00"
    },
    schedule: []
  }
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.players)) state.players = parsed.players;
    if (Array.isArray(parsed.schedule)) state.schedule = parsed.schedule;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.players.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      state.draft.players.splice(index, 1);
    removeBtn.setAttribute("aria-label", `Fjern ${name}`);
    removeBtn.addEventListener("click", () => {
      state.players.splice(index, 1);
      saveState();
      renderPlayers();
    });

    li.appendChild(removeBtn);
    playerList.appendChild(li);
  });
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  if (!state.draft.schedule.length) {
    setVisible(scheduleEmpty, true);
    return;
  }

  setVisible(scheduleEmpty, false);
  state.draft.schedule.forEach((match, index) => {
    const node = matchTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".match-time").textContent = `Kamp ${index + 1} – ${match.time}`;
    node.querySelector(".match-court").textContent = `Bane ${match.court}`;
    node.querySelector(".match-teams").textContent = `${match.teamA} vs ${match.teamB}`;
    scheduleRoot.appendChild(node);
  });
}

function renderDraft() {
  courtsInput.value = state.draft.settings.courts;
  matchDurationInput.value = state.draft.settings.duration;
  startTimeInput.value = state.draft.settings.startTime;
  renderPlayers();
  renderSchedule();
}

function renderHistory() {
  const user = getCurrentUser();
  historyList.innerHTML = "";
  if (!user) return;

  const visible = state.tournaments.filter((t) => user.role === "admin" || t.owner === user.email);
  setVisible(historyEmpty, visible.length === 0);

  visible
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach((tournament) => {
      const li = document.createElement("li");
      const title = document.createElement("div");
      title.innerHTML = `<strong>${tournament.name}</strong><br><small>Opdateret: ${new Date(tournament.updatedAt).toLocaleString("da-DK")}</small>`;

      const actions = document.createElement("div");
      actions.className = "actions";

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.textContent = "Indlæs";
      loadBtn.addEventListener("click", () => {
        state.draft = JSON.parse(JSON.stringify(tournament.data));
        saveState();
        renderDraft();
      });

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Omdøb";
      editBtn.addEventListener("click", () => {
        const name = prompt("Nyt navn", tournament.name);
        if (!name) return;
        tournament.name = name.trim();
        tournament.updatedAt = new Date().toISOString();
        saveState();
        renderHistory();
      });

      actions.append(loadBtn, editBtn);
      li.append(title, actions);
      historyList.appendChild(li);
    });
}

function renderInvitations() {
  const user = getCurrentUser();
  inviteList.innerHTML = "";
  if (!user || user.role !== "admin") return;

  state.invitations
    .slice()
    .reverse()
    .forEach((invite) => {
      const li = document.createElement("li");
      li.innerHTML = `<span><strong>${invite.email}</strong> (${invite.role})</span><small>${new Date(invite.createdAt).toLocaleString("da-DK")}</small>`;
      inviteList.appendChild(li);
    });
}

function login(email, password) {
  const user = state.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    alert("Forkert login.");
    return;
  }

  state.currentUserEmail = user.email;
  saveState();
  renderShell();
}

function register(email, password) {
  const invitation = state.invitations.find((i) => i.email === email);
  if (!invitation) {
    alert("Du skal have en invitation fra en admin for at oprette konto.");
    return;
  }

  if (state.users.some((u) => u.email === email)) {
    alert("Brugeren findes allerede.");
    return;
  }

  state.users.push({ email, password, role: invitation.role });
  state.currentUserEmail = email;
  saveState();
  renderShell();
}

function inviteByEmail(email, role) {
  if (state.invitations.some((i) => i.email === email)) {
    alert("Denne e-mail er allerede inviteret.");
    return;
  }

  const invite = { email, role, createdAt: new Date().toISOString() };
  state.invitations.push(invite);
  saveState();
  renderInvitations();

  const subject = encodeURIComponent("Invitation til Padel Turneringsplan");
  const body = encodeURIComponent(
    `Hej!\n\nDu er inviteret som ${role} i Padel Turneringsplan.\nÅbn appen og opret konto med denne e-mail.\n\nMvh` 
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function formatTime(totalMinutes) {
  const hrs = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}`;
}

function buildRoundRobin(players) {
  const names = [...players];
  if (names.length % 2 === 1) names.push("BYE");

  const rounds = [];
  const totalRounds = names.length - 1;

  for (let i = 0; i < totalRounds; i += 1) {
    const round = [];
    for (let j = 0; j < names.length / 2; j += 1) {
      const a = names[j];
      const b = names[names.length - 1 - j];
      if (a !== "BYE" && b !== "BYE") round.push([a, b]);
    }
    rounds.push(round);
      if (a !== "BYE" && b !== "BYE") {
        round.push([a, b]);
      }
    }
    rounds.push(round);

    const fixed = names[0];
    const rotated = [fixed, names[names.length - 1], ...names.slice(1, names.length - 1)];
    names.splice(0, names.length, ...rotated);
  }

  return rounds;
}

function toPadelMatches(rounds) {
  const matches = [];
  rounds.forEach((round) => {
    for (let i = 0; i + 1 < round.length; i += 2) {
      const [p1, p2] = round[i];
      const [p3, p4] = round[i + 1];
      matches.push({ teamA: `${p1} / ${p2}`, teamB: `${p3} / ${p4}` });
      matches.push({
        teamA: `${p1} / ${p2}`,
        teamB: `${p3} / ${p4}`
      });
    }
  });
  return matches;
}

function createTournamentSchedule() {
  if (state.draft.players.length < 4) {
    alert("Tilføj mindst 4 spillere.");
    return;
  }

  const [h, m] = (startTimeInput.value || "10:00").split(":").map(Number);
  const startMinutes = h * 60 + m;

  state.draft.settings = {
    courts: Math.max(1, Number(courtsInput.value) || 1),
    duration: Math.max(10, Number(matchDurationInput.value) || 25),
    startTime: startTimeInput.value || "10:00"
  };

  const matches = toPadelMatches(buildRoundRobin(state.draft.players));
  if (!matches.length) {
    alert("Kunne ikke generere kampe.");
    return;
  }

  state.draft.schedule = matches.map((match, i) => ({
    ...match,
    court: (i % state.draft.settings.courts) + 1,
    time: formatTime(startMinutes + Math.floor(i / state.draft.settings.courts) * state.draft.settings.duration)
  }));

  const user = getCurrentUser();
  const timestamp = new Date().toISOString();
  state.tournaments.push({
    id: crypto.randomUUID(),
    owner: user.email,
    name: `Turnering ${new Date(timestamp).toLocaleDateString("da-DK")}`,
    updatedAt: timestamp,
    data: JSON.parse(JSON.stringify(state.draft))
  });

  saveState();
  renderSchedule();
  renderHistory();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;
  login(email, password);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;
  register(email, password);
});

logoutBtn.addEventListener("click", () => {
  state.currentUserEmail = null;
  saveState();
  renderShell();
});

inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("invite-email").value.trim().toLowerCase();
  const role = document.getElementById("invite-role").value;
  inviteByEmail(email, role);
  inviteForm.reset();
});
function generateSchedule() {
  if (state.players.length < 4) {
    alert("Tilføj mindst 4 spillere for at lave padel-kampe.");
    return;
  }

  const startTime = startTimeInput.value || "10:00";
  const [h, m] = startTime.split(":").map(Number);
  let currentMinutes = h * 60 + m;

  const courts = Math.max(1, Number(courtsInput.value) || 1);
  const duration = Math.max(10, Number(matchDurationInput.value) || 25);

  const rounds = buildRoundRobin(state.players);
  const baseMatches = toPadelMatches(rounds);

  if (baseMatches.length === 0) {
    alert("Der kunne ikke laves gyldige kampe. Prøv med flere deltagere.");
    return;
  }

  const scheduled = [];
  for (let i = 0; i < baseMatches.length; i += 1) {
    const slot = Math.floor(i / courts);
    const court = (i % courts) + 1;

    scheduled.push({
      ...baseMatches[i],
      court,
      time: formatTime(currentMinutes + slot * duration)
    });
  }

  state.schedule = scheduled;
  saveState();
  renderSchedule();
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  if (!state.schedule.length) {
    scheduleEmpty.style.display = "block";
    return;
  }

  scheduleEmpty.style.display = "none";
  state.schedule.forEach((match, index) => {
    const node = matchTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".match-time").textContent = `Kamp ${index + 1} – ${match.time}`;
    node.querySelector(".match-court").textContent = `Bane ${match.court}`;
    node.querySelector(".match-teams").textContent = `${match.teamA} vs ${match.teamB}`;
    scheduleRoot.appendChild(node);
  });
}

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerInput.value.trim();
  if (!name) return;
  if (state.draft.players.includes(name)) {
    alert("Spilleren findes allerede.");
    return;
  }
  state.draft.players.push(name);
  if (state.players.includes(name)) {
    alert("Denne spiller findes allerede.");
    return;
  }
  state.players.push(name);
  playerInput.value = "";
  saveState();
  renderPlayers();
});

generateBtn.addEventListener("click", createTournamentSchedule);

loadState();
renderShell();
generateBtn.addEventListener("click", generateSchedule);

loadState();
renderPlayers();
renderSchedule();
