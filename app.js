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

const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const state = {
  currentUser: null,
  currentProfile: null,
  invitations: [],
  tournaments: [],
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

function setVisible(node, visible) {
  node.classList.toggle("hidden", !visible);
}

function getRole() {
  return state.currentProfile?.role || "user";
}

function setDraftFromTournament(data) {
  state.draft = JSON.parse(JSON.stringify(data));
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
    }
  });
  return matches;
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.draft.players.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Fjern ${name}`);
    removeBtn.addEventListener("click", () => {
      state.draft.players.splice(index, 1);
      renderPlayers();
    });

    li.appendChild(removeBtn);
    playerList.appendChild(li);
  });
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  setVisible(scheduleEmpty, state.draft.schedule.length === 0);
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

async function loadProfile() {
  if (!state.currentUser) {
    state.currentProfile = null;
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", state.currentUser.id)
    .single();

  if (error) {
    alert(`Kunne ikke hente profil: ${error.message}`);
    return;
  }

  state.currentProfile = data;
}

async function loadInvitations() {
  if (!state.currentUser || getRole() !== "admin") {
    state.invitations = [];
    renderInvitations();
    return;
  }

  const { data, error } = await supabase
    .from("invitations")
    .select("email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    alert(`Kunne ikke hente invitationer: ${error.message}`);
    return;
  }

  state.invitations = data || [];
  renderInvitations();
}

function renderInvitations() {
  inviteList.innerHTML = "";
  state.invitations.forEach((invite) => {
    const li = document.createElement("li");
    li.innerHTML = `<span><strong>${invite.email}</strong> (${invite.role})</span><small>${new Date(invite.created_at).toLocaleString("da-DK")}</small>`;
    inviteList.appendChild(li);
  });
}

async function loadHistory() {
  if (!state.currentUser) {
    state.tournaments = [];
    renderHistory();
    return;
  }

  let query = supabase
    .from("tournaments")
    .select("id, owner_id, name, data, updated_at")
    .order("updated_at", { ascending: false });

  if (getRole() !== "admin") query = query.eq("owner_id", state.currentUser.id);

  const { data, error } = await query;

  if (error) {
    alert(`Kunne ikke hente historik: ${error.message}`);
    return;
  }

  state.tournaments = data || [];
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  setVisible(historyEmpty, state.tournaments.length === 0);

  state.tournaments.forEach((tournament) => {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.innerHTML = `<strong>${tournament.name}</strong><br><small>Opdateret: ${new Date(tournament.updated_at).toLocaleString("da-DK")}</small>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Indlæs";
    loadBtn.addEventListener("click", () => {
      setDraftFromTournament(tournament.data);
      renderDraft();
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Omdøb";
    editBtn.addEventListener("click", async () => {
      const name = prompt("Nyt navn", tournament.name);
      if (!name) return;

      const { error } = await supabase
        .from("tournaments")
        .update({ name: name.trim() })
        .eq("id", tournament.id);

      if (error) {
        alert(`Kunne ikke omdøbe: ${error.message}`);
        return;
      }

      await loadHistory();
    });

    actions.append(loadBtn, editBtn);
    li.append(title, actions);
    historyList.appendChild(li);
  });
}

async function renderShell() {
  const loggedIn = Boolean(state.currentUser);
  setVisible(authCard, !loggedIn);
  setVisible(appCard, loggedIn);
  setVisible(sessionBox, loggedIn);

  if (!loggedIn) return;

  sessionLabel.textContent = `${state.currentProfile?.email || state.currentUser.email} (${getRole()})`;
  setVisible(adminCard, getRole() === "admin");

  renderDraft();
  await loadHistory();
  await loadInvitations();
}

async function isInvitedEmail(email) {
  const { data, error } = await supabase.rpc("is_email_invited", { input_email: email });
  if (error) {
    alert(`Kunne ikke validere invitation: ${error.message}`);
    return false;
  }
  return Boolean(data);
}

async function applyInvitationRole() {
  const { error } = await supabase.rpc("apply_invitation_role");
  if (error) alert(`Kunne ikke sætte rolle fra invitation: ${error.message}`);
}

async function inviteByEmail(email, role) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const response = await fetch(`${window.SUPABASE_URL}/functions/v1/invite-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ email, role })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.error || "Kunne ikke sende invitation.");
    return;
  }

  await loadInvitations();
  alert("Invitation sendt.");
}

async function createTournamentSchedule() {
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

  const { error } = await supabase.from("tournaments").insert({
    owner_id: state.currentUser.id,
    name: `Turnering ${new Date().toLocaleDateString("da-DK")}`,
    data: JSON.parse(JSON.stringify(state.draft))
  });

  if (error) {
    alert(`Kunne ikke gemme turnering: ${error.message}`);
    return;
  }

  renderSchedule();
  await loadHistory();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(`Forkert login: ${error.message}`);
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;

  if (!(await isInvitedEmail(email))) {
    alert("Du skal have en invitation fra en admin for at oprette konto.");
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert(`Kunne ikke oprette konto: ${error.message}`);
    return;
  }

  alert("Konto oprettet. Tjek evt. din e-mail for bekræftelse.");
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

inviteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("invite-email").value.trim().toLowerCase();
  const role = document.getElementById("invite-role").value;
  await inviteByEmail(email, role);
  inviteForm.reset();
});

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerInput.value.trim();
  if (!name) return;
  if (state.draft.players.includes(name)) {
    alert("Spilleren findes allerede.");
    return;
  }

  state.draft.players.push(name);
  playerInput.value = "";
  renderPlayers();
});

generateBtn.addEventListener("click", createTournamentSchedule);

supabase.auth.onAuthStateChange(async (_, session) => {
  state.currentUser = session?.user || null;
  if (state.currentUser) {
    await applyInvitationRole();
    await loadProfile();
  } else {
    state.currentProfile = null;
  }
  await renderShell();
});

(async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  state.currentUser = session?.user || null;
  if (state.currentUser) {
    await applyInvitationRole();
    await loadProfile();
  }
  await renderShell();
})();
