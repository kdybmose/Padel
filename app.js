const appCard = document.getElementById("app-card");
const adminCard = document.getElementById("admin-card");
const adminPlayerCard = document.getElementById("admin-player-card");

const homeView = document.getElementById("home-view");
const currentView = document.getElementById("current-view");
const playersView = document.getElementById("players-view");
const changelogVersion = document.getElementById("changelog-version");
const changelogCount = document.getElementById("changelog-count");

const savedPlayerForm = document.getElementById("saved-player-form");
const savedPlayerInput = document.getElementById("saved-player-input");
const savedPlayerList = document.getElementById("saved-player-list");
const savedPlayerEmpty = document.getElementById("saved-player-empty");
const savedPlayerSelect = document.getElementById("saved-player-select");

const playerForm = document.getElementById("player-form");
const playerList = document.getElementById("player-list");

const homeTab = document.getElementById("home-tab");
const currentTab = document.getElementById("current-tab");
const playersTab = document.getElementById("players-tab");

const courtTypeInput = document.getElementById("court-type");
const ballsPerRoundInput = document.getElementById("balls-per-round");
const courtsCountInput = document.getElementById("courts-count");
const roundsHint = document.getElementById("rounds-hint");
const tournamentNameInput = document.getElementById("tournament-name");
const tournamentTypeInput = document.getElementById("tournament-type");
const generateBtn = document.getElementById("generate-btn");
const addRoundBtn = document.getElementById("add-round-btn");
const completeBtn = document.getElementById("complete-btn");
const mobileHomeTab = document.getElementById("mobile-home-tab");
const mobileCurrentTab = document.getElementById("mobile-current-tab");
const mobilePlayersTab = document.getElementById("mobile-players-tab");
const mobileGenerateBtn = document.getElementById("mobile-generate-btn");
const mobileAddRoundBtn = document.getElementById("mobile-add-round-btn");
const mobileCompleteBtn = document.getElementById("mobile-complete-btn");

const scheduleRoot = document.getElementById("schedule");
const scheduleEmpty = document.getElementById("schedule-empty");
const standingsRoot = document.getElementById("standings");
const standingsEmpty = document.getElementById("standings-empty");

const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const aggregateRoot = document.getElementById("aggregate");
const aggregateEmpty = document.getElementById("aggregate-empty");
const statsSortInput = document.getElementById("stats-sort");
const clearHistoryBtn = document.getElementById("clear-history-btn");


const CHANGELOG_ENTRIES = [
  { version: "v1.0.5", date: "16.03.2026", note: "Fjernet localStorage. Data lever nu kun i den åbne session og deles ikke mellem enheder." },
  { version: "v1.0.4", date: "15.03.2026", note: "Rangliste genererer nu flere kampe pr. batch, hvis der er flere kampe end baner." },
  { version: "v1.0.3", date: "13.03.2026", note: "Fjernet login-flow midlertidigt. Appen kører nu lokalt uden login, og data gemmes i browserens localStorage." },
  { version: "v1.0.2", date: "13.03.2026", note: "Formularer bruger nu POST som fallback, så siden ikke ender på en tom ?-URL ved submit uden aktiv JavaScript." },
  { version: "v1.0.1", date: "13.03.2026", note: "Forbedret login-feedback: fejl vises nu direkte under login-formen." },
  { version: "v1.0.0", date: "13.03.2026", note: "Tilføjet versionshistorik på forsiden og gjort den synlig uden login." }
];

const STORAGE_KEYS = {
  savedPlayers: "padel_saved_players",
  tournaments: "padel_tournaments",
  draft: "padel_active_draft"
};

const sessionStore = new Map();

const state = {
  savedPlayers: [],
  tournaments: [],
  activeView: "home",
  draft: {
    players: [],
    mode: "single",
    type: "classic",
    ballsPerRound: 24,
    courts: 1,
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
  sessionStore.set(key, clone(data));
}

function loadFromStorage(key, fallback) {
  return sessionStore.has(key) ? clone(sessionStore.get(key)) : fallback;
}

function setActiveView(view) {
  state.activeView = view;

  setVisible(homeView, view === "home");
  setVisible(currentView, view === "current");
  setVisible(playersView, view === "players");

  const tabs = [
    [homeTab, view === "home"],
    [currentTab, view === "current"],
    [playersTab, view === "players"],
    [mobileHomeTab, view === "home"],
    [mobileCurrentTab, view === "current"],
    [mobilePlayersTab, view === "players"]
  ];

  tabs.forEach(([tab, isActive]) => {
    tab.classList.toggle("primary", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
}

function renderChangelogSummary() {
  const latest = CHANGELOG_ENTRIES[0];
  if (changelogVersion) changelogVersion.textContent = latest ? `${latest.date} · ${latest.version} — ${latest.note}` : "-";
  if (changelogCount) changelogCount.textContent = String(CHANGELOG_ENTRIES.length);
}

function updateDraftInputs() {
  tournamentNameInput.value = state.draft.name;
  courtTypeInput.value = state.draft.mode;
  tournamentTypeInput.value = state.draft.type || "classic";
  ballsPerRoundInput.value = state.draft.ballsPerRound;
  courtsCountInput.value = Math.max(1, Number(state.draft.courts) || 1);
  updateRoundsHint();
}

async function saveActiveTournament() {
  saveToStorage(STORAGE_KEYS.draft, state.draft);
}

async function clearActiveTournament() {
  state.draft = { players: [], mode: "single", type: "classic", ballsPerRound: 24, courts: 1, name: "", matches: [] };
  updateDraftInputs();
  saveToStorage(STORAGE_KEYS.draft, state.draft);
}

function getPairKey(team) {
  return [...team].sort((a, b) => a.localeCompare(b, "da")).join("|");
}

function buildSinglesMatches(players) {
  const matches = [];
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      matches.push({ teamA: [players[i]], teamB: [players[j]] });
    }
  }
  return matches;
}

function buildDoublesMatches(players) {
  const pairings = [];
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      pairings.push([players[i], players[j]]);
    }
  }

  const seen = new Set();
  const matches = [];

  for (let i = 0; i < pairings.length; i += 1) {
    for (let j = i + 1; j < pairings.length; j += 1) {
      const teamA = pairings[i];
      const teamB = pairings[j];
      const combined = [...teamA, ...teamB];
      if (new Set(combined).size !== 4) continue;

      const orderedTeams = [getPairKey(teamA), getPairKey(teamB)].sort((a, b) => a.localeCompare(b, "da"));
      const key = orderedTeams.join(" vs ");
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ teamA: [...teamA], teamB: [...teamB] });
    }
  }

  return matches;
}

function scheduleMatches(rawMatches, courts, startingRound = 1) {
  const pending = rawMatches.map((match) => ({ ...match }));
  const scheduled = [];
  let round = startingRound;
  const playedCount = new Map();
  const lastRoundPlayed = new Map();

  pending.forEach((match) => {
    [...match.teamA, ...match.teamB].forEach((name) => {
      if (!playedCount.has(name)) {
        playedCount.set(name, 0);
        lastRoundPlayed.set(name, startingRound - 2);
      }
    });
  });

  function getMatchPriority(match) {
    const players = [...match.teamA, ...match.teamB];
    const rests = players.map((name) => round - (lastRoundPlayed.get(name) ?? startingRound - 2) - 1);
    const minRest = Math.min(...rests);
    const totalRest = rests.reduce((sum, value) => sum + value, 0);
    const totalPlayed = players.reduce((sum, name) => sum + (playedCount.get(name) ?? 0), 0);

    return { minRest, totalRest, totalPlayed };
  }

  function compareByPriority(matchA, matchB) {
    const a = getMatchPriority(matchA);
    const b = getMatchPriority(matchB);

    if (b.minRest !== a.minRest) return b.minRest - a.minRest;
    if (b.totalRest !== a.totalRest) return b.totalRest - a.totalRest;
    if (a.totalPlayed !== b.totalPlayed) return a.totalPlayed - b.totalPlayed;
    const namesA = [...matchA.teamA, ...matchA.teamB].join("|");
    const namesB = [...matchB.teamA, ...matchB.teamB].join("|");
    return namesA.localeCompare(namesB, "da");
  }

  while (pending.length) {
    const usedPlayers = new Set();
    const picked = [];

    const candidateIndexes = pending
      .map((_, index) => index)
      .sort((a, b) => compareByPriority(pending[a], pending[b]));

    for (let i = 0; i < candidateIndexes.length && picked.length < courts; i += 1) {
      const matchIndex = candidateIndexes[i];
      const match = pending[matchIndex];
      const allPlayers = [...match.teamA, ...match.teamB];
      if (allPlayers.some((name) => usedPlayers.has(name))) continue;

      picked.push(matchIndex);
      allPlayers.forEach((name) => usedPlayers.add(name));
      scheduled.push({ ...match, round, scoreA: null, scoreB: null });

      allPlayers.forEach((name) => {
        playedCount.set(name, (playedCount.get(name) ?? 0) + 1);
        lastRoundPlayed.set(name, round);
      });
    }

    if (!picked.length) {
      const forcedIndex = candidateIndexes[0];
      const [forced] = pending.splice(forcedIndex, 1);
      scheduled.push({ ...forced, round, scoreA: null, scoreB: null });
      [...forced.teamA, ...forced.teamB].forEach((name) => {
        playedCount.set(name, (playedCount.get(name) ?? 0) + 1);
        lastRoundPlayed.set(name, round);
      });
    } else {
      for (let i = picked.length - 1; i >= 0; i -= 1) pending.splice(picked[i], 1);
    }

    round += 1;
  }

  return scheduled;
}


function buildNearestOpponentRounds(players, standingsRows, mode, courts, startingRound) {
  const rankByPlayer = new Map(standingsRows.map((row, index) => [row.player, index]));
  const sortedPlayers = [...players].sort((a, b) => {
    const indexA = rankByPlayer.get(a);
    const indexB = rankByPlayer.get(b);
    if (indexA === undefined && indexB === undefined) return a.localeCompare(b, "da");
    if (indexA === undefined) return 1;
    if (indexB === undefined) return -1;
    if (indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b, "da");
  });

  const roundMatches = [];
  if (mode === "single") {
    for (let i = 0; i + 1 < sortedPlayers.length; i += 2) {
      roundMatches.push({ teamA: [sortedPlayers[i]], teamB: [sortedPlayers[i + 1]] });
    }
  } else {
    for (let i = 0; i + 3 < sortedPlayers.length; i += 4) {
      roundMatches.push({
        teamA: [sortedPlayers[i], sortedPlayers[i + 1]],
        teamB: [sortedPlayers[i + 2], sortedPlayers[i + 3]]
      });
    }
  }

  const perRound = Math.max(1, courts);
  return roundMatches.map((match, index) => ({
    ...match,
    round: startingRound + Math.floor(index / perRound),
    scoreA: null,
    scoreB: null
  }));
}

function getAggregateStandingsForPlayers(players) {
  const aggregatedRows = getBaseAggregateStats().sort((a, b) => b.tournamentWins - a.tournamentWins || b.totalBallsWon - a.totalBallsWon || b.avgBallsPerMatch - a.avgBallsPerMatch || a.player.localeCompare(b.player, "da"));
  const aggregateByPlayer = new Map(aggregatedRows.map((row, index) => [row.player, { ...row, index }]));

  return players
    .map((player) => ({
      player,
      tournamentWins: aggregateByPlayer.get(player)?.tournamentWins ?? 0,
      totalBallsWon: aggregateByPlayer.get(player)?.totalBallsWon ?? 0,
      avgBallsPerMatch: aggregateByPlayer.get(player)?.avgBallsPerMatch ?? 0,
      aggregateIndex: aggregateByPlayer.get(player)?.index ?? Number.MAX_SAFE_INTEGER
    }))
    .sort(
      (a, b) =>
        a.aggregateIndex - b.aggregateIndex ||
        b.tournamentWins - a.tournamentWins ||
        b.totalBallsWon - a.totalBallsWon ||
        b.avgBallsPerMatch - a.avgBallsPerMatch ||
        a.player.localeCompare(b.player, "da")
    );
}

function buildNearestDraftMatches(players, mode, courts, existingMatches = []) {
  const hasCurrentResults = existingMatches.some((match) => Number.isInteger(match.scoreA) && Number.isInteger(match.scoreB));
  const standings = hasCurrentResults
    ? getTournamentStandings({ players, matches: existingMatches })
    : getAggregateStandingsForPlayers(players);
  const firstRound = Math.max(1, existingMatches.reduce((max, m) => Math.max(max, m.round || 0), 0) + 1);
  return buildNearestOpponentRounds(players, standings, mode, courts, firstRound);
}
function buildRoundPackage(players, mode, courts, startingRound = 1) {
  const rawMatches = mode === "double" ? buildDoublesMatches(players) : buildSinglesMatches(players);
  return scheduleMatches(rawMatches, courts, startingRound);
}

function getRoundEstimation(players, mode, courts, type) {
  if (!players.length) return { totalMatches: 0, totalRounds: 0 };
  if (type === "nearest") {
    const playersPerCourt = mode === "double" ? 4 : 2;
    const totalMatches = Math.floor(players.length / playersPerCourt);
    return { totalMatches, totalRounds: Math.max(1, Math.ceil(totalMatches / Math.max(1, courts))) };
  }
  const rawMatches = mode === "double" ? buildDoublesMatches(players) : buildSinglesMatches(players);
  const totalRounds = scheduleMatches(rawMatches, Math.max(1, courts)).reduce((max, m) => Math.max(max, m.round), 0);
  return { totalMatches: rawMatches.length, totalRounds };
}

function updateRoundsHint() {
  const mode = courtTypeInput.value;
  const type = tournamentTypeInput.value;
  const courts = Math.max(1, Number(courtsCountInput.value) || 1);
  const { totalMatches, totalRounds } = getRoundEstimation(state.draft.players, mode, courts, type);

  if (!state.draft.players.length) {
    roundsHint.textContent = "Tilføj spillere for at se antal mulige kampe og runder.";
    return;
  }

  if (type === "nearest") {
    roundsHint.textContent = `Rangliste: ${totalMatches} kamp(e) fordelt på ca. ${totalRounds} runde(r) med ${courts} bane(r).`;
    return;
  }

  roundsHint.textContent = `Kombinationer: ${totalMatches} kampe fordelt på ca. ${totalRounds} runder med ${courts} bane(r).`;
}

function buildDraftMatches(players, mode, courts, type) {
  if (type === "nearest") return buildNearestDraftMatches(players, mode, courts);
  return buildRoundPackage(players, mode, courts);
}

function appendRoundsToDraft() {
  const nextRound = state.draft.matches.reduce((max, m) => Math.max(max, m.round), 0) + 1;
  const extraMatches =
    state.draft.type === "nearest"
      ? buildNearestDraftMatches(state.draft.players, state.draft.mode, state.draft.courts, state.draft.matches)
      : buildRoundPackage(state.draft.players, state.draft.mode, state.draft.courts, nextRound);
  state.draft.matches.push(...extraMatches);
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
    .map((row) => ({
      ...row,
      avgBallsPerMatch: row.matches ? Number((row.totalBallsWon / row.matches).toFixed(2)) : 0,
      ballDiff: row.totalBallsWon - row.totalBallsAgainst
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.ballDiff - a.ballDiff ||
        b.totalBallsWon - a.totalBallsWon ||
        a.player.localeCompare(b.player, "da")
    );
}

function allResultsEntered() {
  return state.draft.matches.length > 0 && state.draft.matches.every((m) => Number.isInteger(m.scoreA) && Number.isInteger(m.scoreB));
}

function renderSavedPlayerSelector() {
  savedPlayerSelect.innerHTML = `<option value="">Vælg spiller fra databasen</option>${state.savedPlayers
    .map((player) => `<option value="${player.name}">${player.name}</option>`)
    .join("")}`;
}

function syncDraftPlayersWithDatabase() {
  const allowedPlayers = new Set(state.savedPlayers.map((player) => player.name));
  const filteredPlayers = state.draft.players.filter((name) => allowedPlayers.has(name));
  if (filteredPlayers.length !== state.draft.players.length) {
    state.draft.players = filteredPlayers;
    state.draft.matches = [];
  }
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
      const minPlayers = state.draft.mode === "double" ? 4 : 2;
      if (state.draft.players.length < minPlayers) state.draft.matches = [];
      updateRoundsHint();
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
      if (state.draft.players.length >= 40) return alert("Der kan maks være 40 spillere i en turnering.");
      state.draft.players.push(player.name);
      setActiveView("current");
      renderPlayers();
      updateRoundsHint();
      await saveActiveTournament();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Slet";
    deleteBtn.addEventListener("click", async () => {
      state.savedPlayers = state.savedPlayers.filter((saved) => saved.id !== player.id);
      syncDraftPlayersWithDatabase();
      saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
      renderSavedPlayers();
      renderPlayers();
      updateRoundsHint();
      renderSchedule();
      renderStandings();
      await saveActiveTournament();
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

    const scoreInputs = document.createElement("div");
    scoreInputs.className = "match-score-inputs";

    const scoreALabel = document.createElement("label");
    scoreALabel.textContent = `${getDisplayName(match.teamA)} score`;
    const inputA = document.createElement("input");
    inputA.type = "number";
    inputA.min = "0";
    inputA.max = String(state.draft.ballsPerRound);
    inputA.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
    scoreALabel.appendChild(inputA);

    const scoreBLabel = document.createElement("label");
    scoreBLabel.textContent = `${getDisplayName(match.teamB)} score`;
    const inputB = document.createElement("input");
    inputB.type = "number";
    inputB.min = "0";
    inputB.max = String(state.draft.ballsPerRound);
    inputB.value = Number.isInteger(match.scoreB) ? String(match.scoreB) : "";
    scoreBLabel.appendChild(inputB);

    const applyScore = async (changedInput, otherInput) => {
      const value = Number(changedInput.value);
      if (!Number.isFinite(value) || value < 0 || value > state.draft.ballsPerRound) {
        alert(`Indtast et tal mellem 0 og ${state.draft.ballsPerRound}.`);
        renderSchedule();
        return;
      }

      const rounded = Math.round(value);
      const adjusted = state.draft.ballsPerRound - rounded;

      changedInput.value = String(rounded);
      otherInput.value = String(adjusted);

      if (changedInput === inputA) {
        match.scoreA = rounded;
        match.scoreB = adjusted;
      } else {
        match.scoreB = rounded;
        match.scoreA = adjusted;
      }

      renderStandings();
      await saveActiveTournament();
    };

    inputA.addEventListener("change", () => applyScore(inputA, inputB));
    inputB.addEventListener("change", () => applyScore(inputB, inputA));

    scoreInputs.append(scoreALabel, scoreBLabel);
    row.append(title, teams, scoreInputs);
    scheduleRoot.appendChild(row);
  });
}

function renderStandings() {
  standingsRoot.innerHTML = "";
  setVisible(standingsEmpty, state.draft.matches.length === 0);
  completeBtn.disabled = state.draft.matches.length === 0;
  mobileCompleteBtn.disabled = completeBtn.disabled;
  if (!state.draft.matches.length) return;

  const standings = getTournamentStandings(state.draft);
  const table = document.createElement("table");
  table.className = "stats-table";
  table.innerHTML = `<thead><tr><th>Spiller</th><th>Bolde vundet</th><th>Bolde imod</th><th>Kampe</th><th>Sejre</th><th>Bolde pr. kamp</th></tr></thead><tbody>${standings
    .map(
      (row, i) => `<tr><td>${i === 0 ? "🏆 " : ""}${row.player}</td><td>${row.totalBallsWon}</td><td>${row.totalBallsAgainst}</td><td>${row.matches}</td><td>${row.wins}</td><td>${row.avgBallsPerMatch}</td></tr>`
    )
    .join("")}</tbody>`;
  const tableWrap = document.createElement("div");
  tableWrap.className = "stats-table-wrap";
  tableWrap.appendChild(table);
  standingsRoot.appendChild(tableWrap);
}

function getBaseAggregateStats() {
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

  return [...stats.values()].map((row) => ({
    ...row,
    avgBallsPerMatch: row.totalMatches ? Number((row.totalBallsWon / row.totalMatches).toFixed(2)) : 0
  }));
}

function getAggregateStats() {
  const rows = getBaseAggregateStats();

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
  const tableWrap = document.createElement("div");
  tableWrap.className = "stats-table-wrap";
  tableWrap.appendChild(table);
  aggregateRoot.appendChild(tableWrap);
}


async function clearTournamentHistory() {
  if (!state.tournaments.length) return;

  const shouldDelete = confirm("Vil du slette hele historikken? Dette kan ikke fortrydes.");
  if (!shouldDelete) return;

  state.tournaments = [];
  saveToStorage(STORAGE_KEYS.tournaments, state.tournaments);
  renderHistory();
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
      if (!Number.isInteger(state.draft.courts) || state.draft.courts < 1) state.draft.courts = 1;
      if (!["classic", "nearest"].includes(state.draft.type)) state.draft.type = "classic";
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
  const minPlayers = state.draft.mode === "double" ? 4 : 2;
  const playersPerCourt = state.draft.mode === "double" ? 4 : 2;
  const maxCourts = Math.max(1, Math.floor(state.draft.players.length / playersPerCourt));

  if (state.draft.players.length < minPlayers) return alert(`Vælg mindst ${minPlayers} spillere for ${state.draft.mode === "double" ? "double" : "single"}.`), false;
  if (state.draft.players.length > 40) return alert("Der kan maks være 40 spillere i en turnering."), false;
  if (!Number.isInteger(state.draft.ballsPerRound) || state.draft.ballsPerRound < 8) return alert("Bolde pr. runde skal være mindst 8."), false;
  if (!Number.isInteger(state.draft.courts) || state.draft.courts < 1) return alert("Antal baner skal være mindst 1."), false;
  if (state.draft.courts > maxCourts) return alert(`Med ${state.draft.players.length} spillere kan du maksimalt bruge ${maxCourts} bane(r) for denne bane-type.`), false;
  return true;
}

async function generateMexicanoTournament() {
  state.draft.mode = courtTypeInput.value;
  state.draft.type = tournamentTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.courts = Math.max(1, Number(courtsCountInput.value) || 1);
  state.draft.name = tournamentNameInput.value.trim() || `${state.draft.type === "nearest" ? "Rangliste" : "Mexicano"} ${new Date().toLocaleDateString("da-DK")}`;
  if (!validateMexicanoSetup()) return;
  state.draft.matches = buildDraftMatches(state.draft.players, state.draft.mode, state.draft.courts, state.draft.type);
  renderSchedule();
  renderStandings();
  setActiveView("current");
  await saveActiveTournament();
}

async function addRounds() {
  state.draft.mode = courtTypeInput.value;
  state.draft.type = tournamentTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.courts = Math.max(1, Number(courtsCountInput.value) || 1);
  state.draft.name = tournamentNameInput.value.trim() || `${state.draft.type === "nearest" ? "Rangliste" : "Mexicano"} ${new Date().toLocaleDateString("da-DK")}`;
  if (!validateMexicanoSetup()) return;

  if (!state.draft.matches.length) {
    state.draft.matches = buildDraftMatches(state.draft.players, state.draft.mode, state.draft.courts, state.draft.type);
  } else {
    appendRoundsToDraft();
  }

  renderSchedule();
  renderStandings();
  setActiveView("current");
  await saveActiveTournament();
}

async function completeTournament() {
  if (!validateMexicanoSetup()) return;
  if (!state.draft.matches.length) return alert("Generér mindst én runde før du afslutter.");

  if (!allResultsEntered()) {
    const shouldComplete = confirm("Der mangler resultater i nogle runder. Vil du afslutte og gemme turneringen alligevel?");
    if (!shouldComplete) return;
  }

  const payload = {
    players: clone(state.draft.players),
    mode: state.draft.mode,
    type: state.draft.type || "classic",
    ballsPerRound: state.draft.ballsPerRound,
    courts: state.draft.courts,
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
  if (!selectedName) return alert("Vælg en spiller fra databasen.");
  if (state.draft.players.includes(selectedName)) return alert("Spilleren er allerede med i turneringen.");
  if (state.draft.players.length >= 40) return alert("Der kan maks være 40 spillere i en turnering.");

  state.draft.players.push(selectedName);
  savedPlayerSelect.value = "";
  renderPlayers();
  updateRoundsHint();
  await saveActiveTournament();
});

generateBtn.addEventListener("click", generateMexicanoTournament);
addRoundBtn.addEventListener("click", addRounds);
completeBtn.addEventListener("click", completeTournament);
homeTab.addEventListener("click", () => setActiveView("home"));
currentTab.addEventListener("click", () => setActiveView("current"));
playersTab.addEventListener("click", () => setActiveView("players"));
mobileHomeTab.addEventListener("click", () => setActiveView("home"));
mobileCurrentTab.addEventListener("click", () => setActiveView("current"));
mobilePlayersTab.addEventListener("click", () => setActiveView("players"));
mobileGenerateBtn.addEventListener("click", generateMexicanoTournament);
mobileAddRoundBtn.addEventListener("click", addRounds);
mobileCompleteBtn.addEventListener("click", completeTournament);
statsSortInput.addEventListener("change", renderAggregateStats);
clearHistoryBtn.addEventListener("click", clearTournamentHistory);
courtTypeInput.addEventListener("change", updateRoundsHint);
courtsCountInput.addEventListener("input", updateRoundsHint);
tournamentTypeInput.addEventListener("change", updateRoundsHint);

(function init() {
  state.savedPlayers = loadFromStorage(STORAGE_KEYS.savedPlayers, []);
  state.tournaments = loadFromStorage(STORAGE_KEYS.tournaments, []);
  state.draft = loadFromStorage(STORAGE_KEYS.draft, state.draft);
  syncDraftPlayersWithDatabase();
  if (!Number.isInteger(state.draft.courts) || state.draft.courts < 1) state.draft.courts = 1;
  if (!["classic", "nearest"].includes(state.draft.type)) state.draft.type = "classic";

  setVisible(adminCard, false);
  setVisible(adminPlayerCard, false);
  setVisible(appCard, true);

  setActiveView("home");
  renderChangelogSummary();
  updateDraftInputs();
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHistory();
})();
