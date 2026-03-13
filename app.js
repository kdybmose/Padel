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

const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const state = {
  currentUser: null,
  currentProfile: null,
  invitations: [],
  tournaments: [],
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
  tournament.players.forEach((player) => {
    map.set(player, {
      player,
      totalBallsWon: 0,
      totalBallsAgainst: 0,
      matches: 0,
      wins: 0
    });
  });

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
    .map((row) => ({
      ...row,
      avgBallsPerMatch: row.matches ? Number((row.totalBallsWon / row.matches).toFixed(2)) : 0
    }))
    .sort((a, b) => b.totalBallsWon - a.totalBallsWon || b.wins - a.wins || a.player.localeCompare(b.player, "da"));
}

function allResultsEntered() {
  return state.draft.matches.length > 0 && state.draft.matches.every((m) => Number.isInteger(m.scoreA) && Number.isInteger(m.scoreB));
}

function renderPlayers() {
  playerList.innerHTML = "";
  state.draft.players.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      state.draft.players.splice(index, 1);
      if (state.draft.players.length < 4) state.draft.matches = [];
      renderPlayers();
      renderSchedule();
      renderStandings();
    });

    li.appendChild(removeBtn);
    playerList.appendChild(li);
  });
}

function renderSchedule() {
  scheduleRoot.innerHTML = "";
  setVisible(scheduleEmpty, state.draft.matches.length === 0);

  state.draft.matches.forEach((match, index) => {
    const row = document.createElement("article");
    row.className = "match";

    const title = document.createElement("div");
    title.className = "match-time";
    title.textContent = `Runde ${match.round}`;

    const type = document.createElement("div");
    type.className = "match-court";
    type.textContent = state.draft.mode === "double" ? "Double" : "Single";

    const teams = document.createElement("div");
    teams.className = "match-teams";
    teams.textContent = `${getDisplayName(match.teamA)} vs ${getDisplayName(match.teamB)}`;

    const scoreWrap = document.createElement("div");
    scoreWrap.className = "row";

    const scoreLabel = document.createElement("label");
    scoreLabel.textContent = `${getDisplayName(match.teamA)} score`;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(state.draft.ballsPerRound);
    input.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
    input.placeholder = `0-${state.draft.ballsPerRound}`;
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0 || value > state.draft.ballsPerRound) {
        alert(`Indtast et tal mellem 0 og ${state.draft.ballsPerRound}.`);
        input.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
        return;
      }

      const scoreA = Math.round(value);
      match.scoreA = scoreA;
      match.scoreB = state.draft.ballsPerRound - scoreA;
      renderSchedule();
      renderStandings();
    });

    scoreLabel.appendChild(input);

    const autoScore = document.createElement("div");
    autoScore.className = "muted";
    autoScore.textContent = Number.isInteger(match.scoreB)
      ? `${getDisplayName(match.teamB)} får automatisk ${match.scoreB}`
      : `${getDisplayName(match.teamB)} bliver auto-beregnet`;

    scoreWrap.append(scoreLabel, autoScore);
    row.append(title, type, teams, scoreWrap);
    scheduleRoot.appendChild(row);
  });
}

function renderStandings() {
  standingsRoot.innerHTML = "";
  const hasTournament = state.draft.matches.length > 0;
  setVisible(standingsEmpty, !hasTournament);
  completeBtn.disabled = !allResultsEntered();

  if (!hasTournament) return;

  const standings = getTournamentStandings(state.draft);
  const table = document.createElement("table");
  table.className = "stats-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Spiller</th>
        <th>Bolde vundet</th>
        <th>Bolde imod</th>
        <th>Kampe</th>
        <th>Sejre</th>
        <th>Bolde pr. kamp</th>
      </tr>
    </thead>
    <tbody>
      ${standings
        .map(
          (row, i) => `<tr>
            <td>${i === 0 ? "🏆 " : ""}${row.player}</td>
            <td>${row.totalBallsWon}</td>
            <td>${row.totalBallsAgainst}</td>
            <td>${row.matches}</td>
            <td>${row.wins}</td>
            <td>${row.avgBallsPerMatch}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  `;

  standingsRoot.appendChild(table);
}

async function loadProfile() {
  if (!state.currentUser) {
    state.currentProfile = null;
    return;
  }

  const { data, error } = await supabase.from("profiles").select("id, email, role").eq("id", state.currentUser.id).single();
  if (error) {
    alert(`Kunne ikke hente profil: ${error.message}`);
    return;
  }

  state.currentProfile = data;
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
    renderInvitations();
    return;
  }

  const { data, error } = await supabase.from("invitations").select("email, role, created_at").order("created_at", { ascending: false });
  if (error) {
    alert(`Kunne ikke hente invitationer: ${error.message}`);
    return;
  }

  state.invitations = data || [];
  renderInvitations();
}

function getAggregateStats() {
  const stats = new Map();

  state.tournaments.forEach((tournament) => {
    const standings = getTournamentStandings(tournament.data);
    if (!standings.length) return;
    const winner = standings[0].player;

    standings.forEach((row) => {
      if (!stats.has(row.player)) {
        stats.set(row.player, {
          player: row.player,
          tournamentWins: 0,
          totalBallsWon: 0,
          totalMatches: 0
        });
      }

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
  table.innerHTML = `
    <thead>
      <tr>
        <th>Spiller</th>
        <th>Turneringssejre</th>
        <th>Samlet bolde vundet</th>
        <th>Kampe</th>
        <th>Bolde vundet pr. kamp</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, i) => `<tr>
            <td>${i === 0 ? "⭐ " : ""}${row.player}</td>
            <td>${row.tournamentWins}</td>
            <td>${row.totalBallsWon}</td>
            <td>${row.totalMatches}</td>
            <td>${row.avgBallsPerMatch}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  `;

  aggregateRoot.appendChild(table);
}

function renderHistory() {
  historyList.innerHTML = "";
  setVisible(historyEmpty, state.tournaments.length === 0);

  state.tournaments.forEach((tournament) => {
    const standings = getTournamentStandings(tournament.data);
    const winner = standings[0];

    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${tournament.name}</strong><br>
        <small>${new Date(tournament.updated_at).toLocaleString("da-DK")}</small><br>
        <small>${tournament.data.mode === "double" ? "Double" : "Single"} · ${tournament.data.ballsPerRound} bolde pr. runde</small><br>
        <small>Vinder: ${winner ? `${winner.player} (${winner.totalBallsWon} bolde)` : "-"}</small>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Indlæs";
    loadBtn.addEventListener("click", () => {
      state.draft = clone(tournament.data);
      tournamentNameInput.value = state.draft.name;
      courtTypeInput.value = state.draft.mode;
      ballsPerRoundInput.value = state.draft.ballsPerRound;
      renderPlayers();
      renderSchedule();
      renderStandings();
    });

    actions.appendChild(loadBtn);
    li.appendChild(actions);
    historyList.appendChild(li);
  });

  renderAggregateStats();
}

async function loadHistory() {
  if (!state.currentUser) {
    state.tournaments = [];
    renderHistory();
    return;
  }

  let query = supabase.from("tournaments").select("id, owner_id, name, data, updated_at").order("updated_at", { ascending: false });
  if (getRole() !== "admin") query = query.eq("owner_id", state.currentUser.id);

  const { data, error } = await query;
  if (error) {
    alert(`Kunne ikke hente historik: ${error.message}`);
    return;
  }

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

  renderPlayers();
  renderSchedule();
  renderStandings();
  await loadInvitations();
  await loadHistory();
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

function validateMexicanoSetup() {
  if (state.draft.players.length !== 4) {
    alert("Mexicano-flowet her kræver præcis 4 spillere.");
    return false;
  }

  if (!["single", "double"].includes(state.draft.mode)) {
    alert("Vælg en gyldig bane-type.");
    return false;
  }

  if (!Number.isInteger(state.draft.ballsPerRound) || state.draft.ballsPerRound < 8) {
    alert("Bolde pr. runde skal være mindst 8.");
    return false;
  }

  return true;
}

function generateMexicanoTournament() {
  state.draft.mode = courtTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.name = tournamentNameInput.value.trim() || `Mexicano ${new Date().toLocaleDateString("da-DK")}`;

  if (!validateMexicanoSetup()) return;

  state.draft.matches = buildDraftMatches(state.draft.players, state.draft.mode);
  renderSchedule();
  renderStandings();
}

async function completeTournament() {
  if (!validateMexicanoSetup()) return;
  if (!allResultsEntered()) {
    alert("Indtast resultater for alle runder før du afslutter.");
    return;
  }

  const payload = {
    players: clone(state.draft.players),
    mode: state.draft.mode,
    ballsPerRound: state.draft.ballsPerRound,
    name: state.draft.name,
    matches: clone(state.draft.matches)
  };

  const { error } = await supabase.from("tournaments").insert({
    owner_id: state.currentUser.id,
    name: state.draft.name,
    data: payload
  });

  if (error) {
    alert(`Kunne ikke gemme turnering: ${error.message}`);
    return;
  }

  alert("Turnering gemt i historik.");
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

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playerInput.value.trim();
  if (!name) return;
  if (state.draft.players.includes(name)) {
    alert("Spilleren findes allerede.");
    return;
  }

  if (state.draft.players.length >= 4) {
    alert("Denne version understøtter 4 spillere pr. Mexicano-turnering.");
    return;
  }

  state.draft.players.push(name);
  playerInput.value = "";
  renderPlayers();
});

generateBtn.addEventListener("click", generateMexicanoTournament);
completeBtn.addEventListener("click", completeTournament);
statsSortInput.addEventListener("change", renderAggregateStats);

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
