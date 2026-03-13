const appCard = document.getElementById("app-card");
const adminCard = document.getElementById("admin-card");
const adminPlayerCard = document.getElementById("admin-player-card");

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

const STORAGE_KEYS = {
  savedPlayers: "padel_saved_players",
  tournaments: "padel_tournaments",
  draft: "padel_active_draft"
};

const state = {
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

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getDisplayName(team) {
  return team.join(" / ");
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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
  saveToStorage(STORAGE_KEYS.draft, state.draft);
}

async function clearActiveTournament() {
  state.draft = { players: [], mode: "single", ballsPerRound: 24, name: "", matches: [] };
  updateDraftInputs();
  saveToStorage(STORAGE_KEYS.draft, state.draft);
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
    li.innerHTML = `<div><strong>${player.name}</strong></div>`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.textContent = "Brug i turnering";
    useBtn.addEventListener("click", async () => {
      if (state.draft.players.includes(player.name)) return alert("Spilleren er allerede med i turneringen.");
      if (state.draft.players.length >= 4) return alert("Der kan kun være 4 spillere i denne version.");
      state.draft.players.push(player.name);
      setActiveView("current");
      renderPlayers();
      await saveActiveTournament();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Slet";
    deleteBtn.addEventListener("click", async () => {
      state.savedPlayers = state.savedPlayers.filter((saved) => saved.id !== player.id);
      saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
      renderSavedPlayers();
    });

    actions.append(useBtn, deleteBtn);
    li.appendChild(actions);
    savedPlayerList.appendChild(li);
  });

  renderSavedPlayerSelector();
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

  state.tournaments.unshift({ id: crypto.randomUUID(), name: state.draft.name, data: payload, updated_at: new Date().toISOString() });
  saveToStorage(STORAGE_KEYS.tournaments, state.tournaments);

  await clearActiveTournament();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHistory();
  alert("Turnering gemt i historik.");
}

homeViewBtn.addEventListener("click", () => setActiveView("home"));
currentViewBtn.addEventListener("click", () => setActiveView("current"));

savedPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = savedPlayerInput.value.trim();
  if (!name) return;
  if (state.savedPlayers.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    alert("Spilleren findes allerede i din liste.");
    return;
  }
  state.savedPlayers.push({ id: crypto.randomUUID(), name });
  state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));
  saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
  savedPlayerForm.reset();
  renderSavedPlayers();
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
    state.savedPlayers.push({ id: crypto.randomUUID(), name: typedName });
    state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));
    saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
    renderSavedPlayers();
  }

  playerInput.value = "";
  savedPlayerSelect.value = "";
  renderPlayers();
  await saveActiveTournament();
});

generateBtn.addEventListener("click", generateMexicanoTournament);
completeBtn.addEventListener("click", completeTournament);
statsSortInput.addEventListener("change", renderAggregateStats);

(function init() {
  state.savedPlayers = loadFromStorage(STORAGE_KEYS.savedPlayers, []);
  state.tournaments = loadFromStorage(STORAGE_KEYS.tournaments, []);
  state.draft = loadFromStorage(STORAGE_KEYS.draft, state.draft);

  setVisible(adminCard, false);
  setVisible(adminPlayerCard, false);
  setVisible(appCard, true);

  setActiveView("home");
  updateDraftInputs();
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHistory();
})();
