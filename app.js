const authCard = document.getElementById("auth-card");
const appCard = document.getElementById("app-card");
const adminCard = document.getElementById("admin-card");
const adminPlayerCard = document.getElementById("admin-player-card");
const adminPlayerList = document.getElementById("admin-player-list");
const adminPlayerEmpty = document.getElementById("admin-player-empty");
const sessionBox = document.getElementById("session-box");
const sessionLabel = document.getElementById("session-label");
const logoutBtn = document.getElementById("logout-btn");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const inviteForm = document.getElementById("invite-form");
const inviteList = document.getElementById("invite-list");

const homeViewBtn = document.getElementById("home-view-btn");
const currentViewBtn = document.getElementById("current-view-btn");
const homeView = document.getElementById("home-view");
const currentView = document.getElementById("current-view");

const savedPlayerForm = document.getElementById("saved-player-form");
const savedPlayerInput = document.getElementById("saved-player-input");
const savedPlayerList = document.getElementById("saved-player-list");
const savedPlayerEmpty = document.getElementById("saved-player-empty");
const savedPlayerSelect = document.getElementById("saved-player-select");

const playerForm = document.getElementById("player-form");
const playerInput = document.getElementById("player-input");
const playerList = document.getElementById("player-list");

const courtTypeInput = document.getElementById("court-type");
const ballsPerRoundInput = document.getElementById("balls-per-round");
const tournamentNameInput = document.getElementById("tournament-name");
const generateBtn = document.getElementById("generate-btn");
const completeBtn = document.getElementById("complete-btn");

const scheduleRoot = document.getElementById("schedule");
const scheduleEmpty = document.getElementById("schedule-empty");
const standingsRoot = document.getElementById("standings");
const standingsEmpty = document.getElementById("standings-empty");

const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const aggregateRoot = document.getElementById("aggregate");
const aggregateEmpty = document.getElementById("aggregate-empty");
const statsSortInput = document.getElementById("stats-sort");

const ADMIN_BOOTSTRAP_EMAIL = "dybmose@hotmail.com";

const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const state = {
  currentUser: null,
  currentProfile: null,
  invitations: [],
  savedPlayers: [],
  tournaments: [],
  activeView: "home",
  draft: {
    players: [],
    mode: "single",
    ballsPerRound: 24,
    name: "",
    matches: []
  }
};

function setVisible(node, visible) {
  node.classList.toggle("hidden", !visible);
}

function getRole() {
  return state.currentProfile?.role || "user";
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getDisplayName(team) {
  return team.join(" / ");
}

function setActiveView(view) {
  state.activeView = view;
  const isHome = view === "home";
  setVisible(homeView, isHome);
  setVisible(currentView, !isHome);
  homeViewBtn.classList.toggle("primary", isHome);
  currentViewBtn.classList.toggle("primary", !isHome);
}

function updateDraftInputs() {
  tournamentNameInput.value = state.draft.name;
  courtTypeInput.value = state.draft.mode;
  ballsPerRoundInput.value = state.draft.ballsPerRound;
}

async function saveActiveTournament() {
  if (!state.currentUser) return;
  const { error } = await supabase.from("active_tournaments").upsert({
    owner_id: state.currentUser.id,
    name: state.draft.name || "Kladde",
    data: clone(state.draft)
  });
  if (error) alert(`Kunne ikke gemme nuværende turnering: ${error.message}`);
}

async function clearActiveTournament() {
  if (!state.currentUser) return;
  const { error } = await supabase.from("active_tournaments").delete().eq("owner_id", state.currentUser.id);
  if (error) alert(`Kunne ikke rydde aktiv turnering: ${error.message}`);
}

function createSinglesMexicano(players) {
  const [a, b, c, d] = players;
  return [
    { round: 1, teamA: [a], teamB: [b] },
    { round: 2, teamA: [c], teamB: [d] },
    { round: 3, teamA: [a], teamB: [c] },
    { round: 4, teamA: [b], teamB: [d] },
    { round: 5, teamA: [a], teamB: [d] },
    { round: 6, teamA: [b], teamB: [c] }
  ];
}

function createDoublesMexicano(players) {
  const [a, b, c, d] = players;
  return [
    { round: 1, teamA: [a, b], teamB: [c, d] },
    { round: 2, teamA: [a, c], teamB: [b, d] },
    { round: 3, teamA: [a, d], teamB: [b, c] }
  ];
}

function buildDraftMatches(players, mode) {
  const baseMatches = mode === "double" ? createDoublesMexicano(players) : createSinglesMexicano(players);
  return baseMatches.map((match) => ({ ...match, scoreA: null, scoreB: null }));
}

function getTournamentStandings(tournament) {
  const map = new Map();
  tournament.players.forEach((player) => map.set(player, { player, totalBallsWon: 0, totalBallsAgainst: 0, matches: 0, wins: 0 }));

  tournament.matches.forEach((match) => {
    if (match.scoreA === null || match.scoreB === null) return;
    match.teamA.forEach((name) => {
      const row = map.get(name);
      row.totalBallsWon += match.scoreA;
      row.totalBallsAgainst += match.scoreB;
      row.matches += 1;
      if (match.scoreA > match.scoreB) row.wins += 1;
    });
    match.teamB.forEach((name) => {
      const row = map.get(name);
      row.totalBallsWon += match.scoreB;
      row.totalBallsAgainst += match.scoreA;
      row.matches += 1;
      if (match.scoreB > match.scoreA) row.wins += 1;
    });
  });

  return [...map.values()]
    .map((row) => ({ ...row, avgBallsPerMatch: row.matches ? Number((row.totalBallsWon / row.matches).toFixed(2)) : 0 }))
    .sort((a, b) => b.totalBallsWon - a.totalBallsWon || b.wins - a.wins || a.player.localeCompare(b.player, "da"));
}

function allResultsEntered() {
  return state.draft.matches.length > 0 && state.draft.matches.every((m) => Number.isInteger(m.scoreA) && Number.isInteger(m.scoreB));
}

function renderSavedPlayerSelector() {
  savedPlayerSelect.innerHTML = `<option value="">Vælg gemt spiller</option>${state.savedPlayers
    .map((player) => `<option value="${player.name}">${player.name}</option>`)
    .join("")}`;
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.draft.players.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", async () => {
      state.draft.players.splice(index, 1);
      if (state.draft.players.length < 4) state.draft.matches = [];
      renderPlayers();
      renderSchedule();
      renderStandings();
      await saveActiveTournament();
    });
    li.appendChild(removeBtn);
    playerList.appendChild(li);
  });
}

function renderSavedPlayers() {
  savedPlayerList.innerHTML = "";
  setVisible(savedPlayerEmpty, state.savedPlayers.length === 0);

  state.savedPlayers.forEach((player) => {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${player.name}</strong>${player.linked_email ? `<br><small>Tilknyttet: ${player.linked_email}</small>` : ""}</div>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Brug i turnering";
    useBtn.addEventListener("click", async () => {
      if (state.draft.players.includes(player.name)) {
        alert("Spilleren er allerede med i turneringen.");
        return;
      }
      if (state.draft.players.length >= 4) {
        alert("Der kan kun være 4 spillere i denne version.");
        return;
      }
      state.draft.players.push(player.name);
      setActiveView("current");
      renderPlayers();
      await saveActiveTournament();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Slet";
    deleteBtn.addEventListener("click", async () => {
      const { error } = await supabase.from("players").delete().eq("id", player.id);
      if (error) {
        alert(`Kunne ikke slette spiller: ${error.message}`);
        return;
      }
      await loadSavedPlayers();
    });

    actions.append(useBtn, deleteBtn);
    li.appendChild(actions);
    savedPlayerList.appendChild(li);
  });

  renderSavedPlayerSelector();
}

function renderAdminPlayers() {
  adminPlayerList.innerHTML = "";
  setVisible(adminPlayerEmpty, state.savedPlayers.length === 0);

  state.savedPlayers.forEach((player) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<strong>${player.name}</strong><br><small>Ejer: ${player.owner_email || "Ukendt"}</small>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.placeholder = "ven@email.dk";
    emailInput.value = player.linked_email || "";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Gem email";
    saveBtn.addEventListener("click", async () => {
      const emailValue = emailInput.value.trim().toLowerCase() || null;
      const { error } = await supabase.from("players").update({ linked_email: emailValue }).eq("id", player.id);
      if (error) {
        alert(`Kunne ikke opdatere e-mail: ${error.message}`);
        return;
      }
      await loadSavedPlayers();
    });

    const unlinkBtn = document.createElement("button");
    unlinkBtn.type = "button";
    unlinkBtn.textContent = "Afbryd tilknytning";
    unlinkBtn.addEventListener("click", async () => {
      const { error } = await supabase.from("players").update({ linked_email: null }).eq("id", player.id);
      if (error) {
        alert(`Kunne ikke fjerne tilknytning: ${error.message}`);
        return;
      }
      await loadSavedPlayers();
    });

    actions.append(emailInput, saveBtn, unlinkBtn);
    li.append(left, actions);
    adminPlayerList.appendChild(li);
  });
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  setVisible(scheduleEmpty, state.draft.matches.length === 0);

  state.draft.matches.forEach((match) => {
    const row = document.createElement("article");
    row.className = "match";
    const title = document.createElement("div");
    title.className = "match-time";
    title.textContent = `Runde ${match.round}`;
    const teams = document.createElement("div");
    teams.className = "match-teams";
    teams.textContent = `${getDisplayName(match.teamA)} vs ${getDisplayName(match.teamB)}`;

    const scoreLabel = document.createElement("label");
    scoreLabel.textContent = `${getDisplayName(match.teamA)} score`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(state.draft.ballsPerRound);
    input.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
    input.addEventListener("change", async () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0 || value > state.draft.ballsPerRound) {
        alert(`Indtast et tal mellem 0 og ${state.draft.ballsPerRound}.`);
        input.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
        return;
      }
      match.scoreA = Math.round(value);
      match.scoreB = state.draft.ballsPerRound - match.scoreA;
      renderSchedule();
      renderStandings();
      await saveActiveTournament();
    });
    scoreLabel.appendChild(input);

    const autoScore = document.createElement("div");
    autoScore.className = "muted";
    autoScore.textContent = Number.isInteger(match.scoreB)
      ? `${getDisplayName(match.teamB)} får automatisk ${match.scoreB}`
      : `${getDisplayName(match.teamB)} bliver auto-beregnet`;

    row.append(title, teams, scoreLabel, autoScore);
    scheduleRoot.appendChild(row);
  });
}

function renderStandings() {
  standingsRoot.innerHTML = "";
  setVisible(standingsEmpty, state.draft.matches.length === 0);
  completeBtn.disabled = !allResultsEntered();
  if (!state.draft.matches.length) return;

  const standings = getTournamentStandings(state.draft);
  const table = document.createElement("table");
  table.className = "stats-table";
  table.innerHTML = `<thead><tr><th>Spiller</th><th>Bolde vundet</th><th>Bolde imod</th><th>Kampe</th><th>Sejre</th><th>Bolde pr. kamp</th></tr></thead><tbody>${standings
    .map(
      (row, i) => `<tr><td>${i === 0 ? "🏆 " : ""}${row.player}</td><td>${row.totalBallsWon}</td><td>${row.totalBallsAgainst}</td><td>${row.matches}</td><td>${row.wins}</td><td>${row.avgBallsPerMatch}</td></tr>`
    )
    .join("")}</tbody>`;
  standingsRoot.appendChild(table);
}

async function loadProfile() {
  if (!state.currentUser) return;
  const { data, error } = await supabase.from("profiles").select("id, email, role").eq("id", state.currentUser.id).maybeSingle();
  if (error) {
    if (error.code === "42P01") {
      alert("Database-setup mangler (public.profiles findes ikke). Kør SQL migrationer i Supabase først.");
      return;
    }
    return alert(`Kunne ikke hente profil: ${error.message}`);
  }

  if (data) {
    state.currentProfile = data;
    if (isBootstrapAdminEmail(state.currentUser.email) && data.role !== "admin") {
      const { error: promoteError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", state.currentUser.id);
      if (promoteError) return alert(`Kunne ikke sætte admin-rolle: ${promoteError.message}`);
      state.currentProfile = { ...data, role: "admin" };
    }
    return;
  }

  const { error: createError } = await supabase
    .from("profiles")
    .insert({ id: state.currentUser.id, email: (state.currentUser.email || "").toLowerCase() });
  if (createError) return alert(`Kunne ikke oprette profil automatisk: ${createError.message}`);

  const { data: createdProfile, error: createdError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", state.currentUser.id)
    .single();
  if (createdError) return alert(`Profil oprettet, men kunne ikke hentes: ${createdError.message}`);

  if (isBootstrapAdminEmail(state.currentUser.email) && createdProfile.role !== "admin") {
    const { error: promoteError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", state.currentUser.id);
    if (promoteError) return alert(`Kunne ikke sætte admin-rolle: ${promoteError.message}`);
    state.currentProfile = { ...createdProfile, role: "admin" };
    return;
  }

  state.currentProfile = createdProfile;
}

function renderInvitations() {
  inviteList.innerHTML = "";
  state.invitations.forEach((invite) => {
    const li = document.createElement("li");
    li.innerHTML = `<span><strong>${invite.email}</strong> (${invite.role})</span><small>${new Date(invite.created_at).toLocaleString("da-DK")}</small>`;
    inviteList.appendChild(li);
  });
}

async function loadInvitations() {
  if (!state.currentUser || getRole() !== "admin") {
    state.invitations = [];
    return renderInvitations();
  }
  const { data, error } = await supabase.from("invitations").select("email, role, created_at").order("created_at", { ascending: false });
  if (error) return alert(`Kunne ikke hente invitationer: ${error.message}`);
  state.invitations = data || [];
  renderInvitations();
}

async function loadSavedPlayers() {
  if (!state.currentUser) {
    state.savedPlayers = [];
    renderSavedPlayers();
    renderAdminPlayers();
    return;
  }

  let query = supabase.from("players").select("id, name, linked_email, owner_id, profiles:owner_id(email)").order("name", { ascending: true });
  if (getRole() !== "admin") query = query.eq("owner_id", state.currentUser.id);

  const { data, error } = await query;
  if (error) return alert(`Kunne ikke hente spillere: ${error.message}`);

  state.savedPlayers = (data || []).map((player) => ({
    ...player,
    owner_email: player.profiles?.email || null
  }));

  renderSavedPlayers();
  renderAdminPlayers();
}

async function loadActiveTournament() {
  if (!state.currentUser) return;
  const { data, error } = await supabase.from("active_tournaments").select("data").eq("owner_id", state.currentUser.id).maybeSingle();
  if (error) return alert(`Kunne ikke hente aktiv turnering: ${error.message}`);
  if (data?.data) state.draft = clone(data.data);
  updateDraftInputs();
}

function getAggregateStats() {
  const stats = new Map();
  state.tournaments.forEach((tournament) => {
    const standings = getTournamentStandings(tournament.data);
    if (!standings.length) return;
    const winner = standings[0].player;
    standings.forEach((row) => {
      if (!stats.has(row.player)) stats.set(row.player, { player: row.player, tournamentWins: 0, totalBallsWon: 0, totalMatches: 0 });
      const aggregate = stats.get(row.player);
      aggregate.totalBallsWon += row.totalBallsWon;
      aggregate.totalMatches += row.matches;
      if (row.player === winner) aggregate.tournamentWins += 1;
    });
  });

  const rows = [...stats.values()].map((row) => ({
    ...row,
    avgBallsPerMatch: row.totalMatches ? Number((row.totalBallsWon / row.totalMatches).toFixed(2)) : 0
  }));

  const sortBy = statsSortInput.value;
  if (sortBy === "totalBalls") rows.sort((a, b) => b.totalBallsWon - a.totalBallsWon || b.tournamentWins - a.tournamentWins);
  else if (sortBy === "avgBalls") rows.sort((a, b) => b.avgBallsPerMatch - a.avgBallsPerMatch || b.totalBallsWon - a.totalBallsWon);
  else rows.sort((a, b) => b.tournamentWins - a.tournamentWins || b.totalBallsWon - a.totalBallsWon);

  return rows;
}

function renderAggregateStats() {
  aggregateRoot.innerHTML = "";
  const rows = getAggregateStats();
  setVisible(aggregateEmpty, rows.length === 0);
  if (!rows.length) return;

  const table = document.createElement("table");
  table.className = "stats-table";
  table.innerHTML = `<thead><tr><th>Spiller</th><th>Turneringssejre</th><th>Samlet bolde vundet</th><th>Kampe</th><th>Bolde vundet pr. kamp</th></tr></thead><tbody>${rows
    .map(
      (row, i) => `<tr><td>${i === 0 ? "⭐ " : ""}${row.player}</td><td>${row.tournamentWins}</td><td>${row.totalBallsWon}</td><td>${row.totalMatches}</td><td>${row.avgBallsPerMatch}</td></tr>`
    )
    .join("")}</tbody>`;
  aggregateRoot.appendChild(table);
}

function renderHistory() {
  historyList.innerHTML = "";
  setVisible(historyEmpty, state.tournaments.length === 0);

  state.tournaments.forEach((tournament) => {
    const standings = getTournamentStandings(tournament.data);
    const winner = standings[0];
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${tournament.name}</strong><br><small>${new Date(tournament.updated_at).toLocaleString("da-DK")}</small><br><small>Vinder: ${winner ? `${winner.player} (${winner.totalBallsWon} bolde)` : "-"}</small></div>`;

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Åbn turnering";
    loadBtn.addEventListener("click", async () => {
      state.draft = clone(tournament.data);
      updateDraftInputs();
      renderPlayers();
      renderSchedule();
      renderStandings();
      setActiveView("current");
      await saveActiveTournament();
    });

    li.appendChild(loadBtn);
    historyList.appendChild(li);
  });

  renderAggregateStats();
}

async function loadHistory() {
  if (!state.currentUser) return;
  let query = supabase.from("tournaments").select("id, owner_id, name, data, updated_at").order("updated_at", { ascending: false });
  if (getRole() !== "admin") query = query.eq("owner_id", state.currentUser.id);
  const { data, error } = await query;
  if (error) return alert(`Kunne ikke hente historik: ${error.message}`);
  state.tournaments = data || [];
  renderHistory();
}

async function renderShell() {
  const loggedIn = Boolean(state.currentUser);
  setVisible(authCard, !loggedIn);
  setVisible(appCard, loggedIn);
  setVisible(sessionBox, loggedIn);
  if (!loggedIn) return;

  sessionLabel.textContent = `${state.currentProfile?.email || state.currentUser.email} (${getRole()})`;
  setVisible(adminCard, getRole() === "admin");
  setVisible(adminPlayerCard, getRole() === "admin");

  await loadInvitations();
  await loadSavedPlayers();
  await loadActiveTournament();
  await loadHistory();

  renderPlayers();
  renderSchedule();
  renderStandings();
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
  if (error) alert(`Kunne ikke sætte rolle: ${error.message}`);
}

function explainAuthError(error, fallbackPrefix) {
  if (!error) return fallbackPrefix;
  const code = error.code || "";
  const message = (error.message || "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return `${fallbackPrefix}: E-mail eller adgangskode er forkert.`;
  }

  if (message.includes("email not confirmed")) {
    return `${fallbackPrefix}: Din e-mail er ikke bekræftet endnu. Tjek din indbakke og klik på bekræftelseslinket.`;
  }

  if (message.includes("too many requests") || code === "over_request_rate_limit") {
    return `${fallbackPrefix}: For mange forsøg. Vent et øjeblik og prøv igen.`;
  }

  if (message.includes("network") || message.includes("fetch")) {
    return `${fallbackPrefix}: Netværksfejl. Tjek forbindelse og prøv igen.`;
  }

  return `${fallbackPrefix}: ${error.message || "Ukendt fejl"}`;
}

function isBootstrapAdminEmail(email) {
  return (email || "").trim().toLowerCase() === ADMIN_BOOTSTRAP_EMAIL;
}

function isInvalidCredentialsError(error) {
  const code = error?.code || "";
  const message = (error?.message || "").toLowerCase();
  return code === "invalid_credentials" || message.includes("invalid login credentials");
}

async function inviteByEmail(email, role) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const response = await fetch(`${window.SUPABASE_URL}/functions/v1/invite-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ email, role })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) return alert(result.error || "Kunne ikke sende invitation.");
  await loadInvitations();
  alert("Invitation sendt.");
}

function validateMexicanoSetup() {
  if (state.draft.players.length !== 4) return alert("Mexicano-flowet kræver præcis 4 spillere."), false;
  if (!Number.isInteger(state.draft.ballsPerRound) || state.draft.ballsPerRound < 8) return alert("Bolde pr. runde skal være mindst 8."), false;
  return true;
}

async function generateMexicanoTournament() {
  state.draft.mode = courtTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.name = tournamentNameInput.value.trim() || `Mexicano ${new Date().toLocaleDateString("da-DK")}`;
  if (!validateMexicanoSetup()) return;
  state.draft.matches = buildDraftMatches(state.draft.players, state.draft.mode);
  renderSchedule();
  renderStandings();
  setActiveView("current");
  await saveActiveTournament();
}

async function completeTournament() {
  if (!validateMexicanoSetup()) return;
  if (!allResultsEntered()) return alert("Indtast resultater for alle runder før du afslutter.");

  const payload = {
    players: clone(state.draft.players),
    mode: state.draft.mode,
    ballsPerRound: state.draft.ballsPerRound,
    name: state.draft.name,
    matches: clone(state.draft.matches)
  };

  const { error } = await supabase.from("tournaments").insert({ owner_id: state.currentUser.id, name: state.draft.name, data: payload });
  if (error) return alert(`Kunne ikke gemme turnering: ${error.message}`);

  state.draft = { players: [], mode: "single", ballsPerRound: 24, name: "", matches: [] };
  updateDraftInputs();
  renderPlayers();
  renderSchedule();
  renderStandings();
  await clearActiveTournament();
  await loadHistory();
  alert("Turnering gemt i historik.");
}

homeViewBtn.addEventListener("click", () => setActiveView("home"));
currentViewBtn.addEventListener("click", () => setActiveView("current"));

savedPlayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = savedPlayerInput.value.trim();
  if (!name) return;
  const { error } = await supabase.from("players").insert({ owner_id: state.currentUser.id, name });
  if (error) {
    if (error.code === "23505") alert("Spilleren findes allerede i din liste.");
    else alert(`Kunne ikke gemme spiller: ${error.message}`);
    return;
  }
  savedPlayerForm.reset();
  await loadSavedPlayers();
});

playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedName = savedPlayerSelect.value.trim();
  const typedName = playerInput.value.trim();
  const name = selectedName || typedName;
  if (!name) return alert("Vælg en spiller eller skriv et navn.");
  if (state.draft.players.includes(name)) return alert("Spilleren er allerede med i turneringen.");
  if (state.draft.players.length >= 4) return alert("Denne version understøtter 4 spillere pr. Mexicano-turnering.");

  state.draft.players.push(name);
  if (typedName && !state.savedPlayers.some((player) => player.name.toLowerCase() === typedName.toLowerCase())) {
    await supabase.from("players").insert({ owner_id: state.currentUser.id, name: typedName });
    await loadSavedPlayers();
  }

  playerInput.value = "";
  savedPlayerSelect.value = "";
  renderPlayers();
  await saveActiveTournament();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;

    if (isBootstrapAdminEmail(email) && isInvalidCredentialsError(error)) {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) return alert(explainAuthError(signupError, "Kunne ikke oprette bootstrap-admin"));
      if (signupData.session) return alert("Bootstrap-admin oprettet og logget ind.");
      return alert("Bootstrap-admin oprettet. Tjek din e-mail for bekræftelse før login.");
    }

    return alert(explainAuthError(error, "Kunne ikke logge ind"));
  } catch (error) {
    alert(explainAuthError(error, "Kunne ikke logge ind"));
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;
  if (!isBootstrapAdminEmail(email) && !(await isInvitedEmail(email))) {
    return alert("Du skal have en invitation fra en admin for at oprette konto.");
  }

  try {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(explainAuthError(error, "Kunne ikke oprette konto"));
  } catch (error) {
    return alert(explainAuthError(error, "Kunne ikke oprette konto"));
  }

  alert("Konto oprettet. Tjek din e-mail for bekræftelse.");
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

generateBtn.addEventListener("click", generateMexicanoTournament);
completeBtn.addEventListener("click", completeTournament);
statsSortInput.addEventListener("change", renderAggregateStats);

supabase.auth.onAuthStateChange(async (_, session) => {
  state.currentUser = session?.user || null;
  if (state.currentUser) {
    await applyInvitationRole();
    await loadProfile();
    setActiveView("home");
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
  setActiveView("home");
  await renderShell();
})();
