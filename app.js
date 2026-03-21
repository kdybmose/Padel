const appCard = document.getElementById("app-card");
const authCard = document.getElementById("auth-card");
const authStatus = document.getElementById("auth-status");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const registerNameInput = document.getElementById("register-name");
const registerEmailInput = document.getElementById("register-email");
const registerPasswordInput = document.getElementById("register-password");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
const logoutBtn = document.getElementById("logout-btn");
const adminAccessCard = document.getElementById("admin-access-card");
const adminCard = document.getElementById("admin-card");
const adminPlayerCard = document.getElementById("admin-player-card");

const homeView = document.getElementById("home-view");
const currentView = document.getElementById("current-view");
const playersView = document.getElementById("players-view");

const savedPlayerForm = document.getElementById("saved-player-form");
const savedPlayerInput = document.getElementById("saved-player-input");
const savedPlayerList = document.getElementById("saved-player-list");
const savedPlayerEmpty = document.getElementById("saved-player-empty");
const playerEditorDialog = document.getElementById("player-editor-dialog");
const playerEditorForm = document.getElementById("player-editor-form");
const playerEditorCloseBtn = document.getElementById("player-editor-close");
const editorPlayerIdInput = document.getElementById("editor-player-id");
const editorPlayerNameInput = document.getElementById("editor-player-name");
const editorPlayerEmailInput = document.getElementById("editor-player-email");
const editorPlayerOwnerInput = document.getElementById("editor-player-owner");
const editorStatsWonInput = document.getElementById("editor-stats-won");
const editorStatsAgainstInput = document.getElementById("editor-stats-against");
const editorStatsMatchesInput = document.getElementById("editor-stats-matches");
const editorStatsWinsInput = document.getElementById("editor-stats-wins");
const dbInviteForm = document.getElementById("db-invite-form");
const dbInviteEmailInput = document.getElementById("db-invite-email");
const dbInviteRoleInput = document.getElementById("db-invite-role");
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

const aggregateRoot = document.getElementById("aggregate");
const aggregateEmpty = document.getElementById("aggregate-empty");
const statsSortInput = document.getElementById("stats-sort");
const publicSignupCard = document.getElementById("public-signup-card");
const publicSignupForm = document.getElementById("public-signup-form");
const publicSignupNameInput = document.getElementById("public-signup-name");
const roundActions = document.getElementById("round-actions");
const mobileActionBar = document.getElementById("mobile-action-bar");
const adminAccessBtn = document.getElementById("admin-access-btn");
const adminAccessStatus = document.getElementById("admin-access-status");



const STORAGE_KEYS = {
  savedPlayers: "padel_saved_players",
  draft: "padel_active_draft"
};

const REMOTE_STATE_ROW_ID = "public";
const REMOTE_STATE_TABLE = "app_state";
const LOCAL_STORAGE_PREFIX = "padel_cache_";
const remoteStorage = {};
let persistTimer = null;
let isPersisting = false;

const state = {
  savedPlayers: [],
  activeView: "home",
  currentUser: null,
  isAdminUser: false,
  isAdminUnlocked: false,
  draft: {
    players: [],
    playerSnapshot: {},
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

function getDefaultPlayerStats() {
  return { totalBallsWon: 0, totalBallsAgainst: 0, totalMatches: 0, totalWins: 0 };
}

function normalizePlayerStats(stats = {}) {
  const defaults = getDefaultPlayerStats();
  return {
    totalBallsWon: Number.isFinite(stats.totalBallsWon) ? Math.max(0, Number(stats.totalBallsWon)) : defaults.totalBallsWon,
    totalBallsAgainst: Number.isFinite(stats.totalBallsAgainst) ? Math.max(0, Number(stats.totalBallsAgainst)) : defaults.totalBallsAgainst,
    totalMatches: Number.isFinite(stats.totalMatches) ? Math.max(0, Number(stats.totalMatches)) : defaults.totalMatches,
    totalWins: Number.isFinite(stats.totalWins) ? Math.max(0, Number(stats.totalWins)) : defaults.totalWins
  };
}

function getPlayerRecordById(playerId) {
  return state.savedPlayers.find((player) => player.id === playerId) || null;
}

function getPlayerName(playerId, snapshot = {}) {
  return getPlayerRecordById(playerId)?.name || snapshot[playerId] || playerId;
}

function getDisplayName(team) {
  return team.map((playerId) => getPlayerName(playerId, state.draft.playerSnapshot || {})).join(" / ");
}

function getSupabaseConfig() {
  const url = window.SUPABASE_URL;
  const anonKey = window.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config || !window.supabase?.createClient) return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

function getStorageScope() {
  if (!state.currentUser?.id) return "anon";
  return `user_${state.currentUser.id}`;
}

function getScopedStorageKey(key) {
  return `${getStorageScope()}_${key}`;
}

function isKristianAdmin(email) {
  return String(email || "").trim().toLowerCase() === "dybmose@hotmail.com";
}

function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message || "";
  authStatus.style.color = isError ? "#d13a3a" : "";
}


async function persistRemoteStorageNow() {
  const config = getSupabaseConfig();
  if (!config) return;

  if (isPersisting) return;
  isPersisting = true;

  try {
    await fetch(`${config.url}/rest/v1/${REMOTE_STATE_TABLE}?id=eq.${REMOTE_STATE_ROW_ID}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: REMOTE_STATE_ROW_ID,
        data: remoteStorage
      })
    });
  } catch (error) {
    console.warn("Kunne ikke gemme data i Supabase:", error);
  } finally {
    isPersisting = false;
  }
}

function queueRemotePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistRemoteStorageNow();
  }, 250);
}

async function hydrateRemoteStorage() {
  const config = getSupabaseConfig();
  if (!config) return;

  try {
    const response = await fetch(`${config.url}/rest/v1/${REMOTE_STATE_TABLE}?id=eq.${REMOTE_STATE_ROW_ID}&select=data`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`
      }
    });

    if (!response.ok) return;
    const rows = await response.json();
    const payload = rows?.[0]?.data;
    if (!payload || typeof payload !== "object") return;

    Object.assign(remoteStorage, payload);
  } catch (error) {
    console.warn("Kunne ikke hente data fra Supabase:", error);
  }
}

function getLocalStorageKey(key) {
  return `${LOCAL_STORAGE_PREFIX}${key}`;
}

function writeLocalStorage(key, data) {
  try {
    window.localStorage.removeItem(getLocalStorageKey(key));
  } catch (error) {
    console.warn("Kunne ikke rydde lokal data:", error);
  }
}

function readLocalStorage(key) {
  return undefined;
}

function saveToStorage(key, data) {
  const scopedKey = getScopedStorageKey(key);
  remoteStorage[scopedKey] = clone(data);
  writeLocalStorage(scopedKey, data);
  queueRemotePersist();
}

function loadFromStorage(key, fallback) {
  const scopedKey = getScopedStorageKey(key);
  if (scopedKey in remoteStorage) return clone(remoteStorage[scopedKey]);
  return fallback;
}

function getConfiguredAdminPin() {
  if (window.PADEL_ADMIN_PIN === undefined || window.PADEL_ADMIN_PIN === null) return "";
  return String(window.PADEL_ADMIN_PIN).trim();
}

function isAdminPinConfigured() {
  return getConfiguredAdminPin().length > 0;
}

function hasAdminAccess() {
  return state.isAdminUser;
}

function updateAdminAccessUi() {
  if (!adminAccessStatus || !adminAccessBtn) return;

  if (state.isAdminUser) {
    adminAccessStatus.textContent = "Admin-adgang aktiv (Kristian Dybmose).";
    adminAccessBtn.textContent = "Admin";
    adminAccessBtn.disabled = true;
    return;
  }

  adminAccessStatus.textContent = "Kun admin kan redigere turneringer og spillere.";
  adminAccessBtn.textContent = "Kun admin";
  adminAccessBtn.disabled = true;
}

function requireAdminAccess() {
  if (hasAdminAccess()) return true;
  alert("Kun Kristian Dybmose (admin) har adgang til denne handling.");
  return false;
}

function setEditingEnabled(enabled) {
  const controls = [
    savedPlayerInput,
    savedPlayerSelect,
    tournamentNameInput,
    tournamentTypeInput,
    courtTypeInput,
    ballsPerRoundInput,
    courtsCountInput,
    generateBtn,
    addRoundBtn,
    completeBtn,
    mobileGenerateBtn,
    mobileAddRoundBtn,
    mobileCompleteBtn
  ];

  controls.forEach((control) => {
    if (!control) return;
    control.disabled = !enabled;
  });
}

function isDraftLockedForPlayerChanges() {
  return state.draft.matches.length > 0;
}

function ensurePlayerIds(players) {
  const byName = new Map(state.savedPlayers.map((player) => [player.name.toLowerCase(), player.id]));
  return players.map((player) => {
    if (typeof player !== "string") return String(player);
    if (player.startsWith("id:")) return player.slice(3);
    return byName.get(player.toLowerCase()) || player;
  });
}

function buildPlayerSnapshot(playerIds) {
  return playerIds.reduce((snapshot, playerId) => {
    snapshot[playerId] = getPlayerName(playerId);
    return snapshot;
  }, {});
}

function migrateTournamentData(tournamentData) {
  const players = ensurePlayerIds(tournamentData.players || []);
  const playerSnapshot = {
    ...(tournamentData.playerSnapshot || {}),
    ...buildPlayerSnapshot(players)
  };

  const matches = (tournamentData.matches || []).map((match) => ({
    ...match,
    teamA: ensurePlayerIds(match.teamA || []),
    teamB: ensurePlayerIds(match.teamB || [])
  }));

  return {
    ...tournamentData,
    players,
    playerSnapshot,
    matches
  };
}

function updateRoundActionButtons() {
  const hasMatches = state.draft.matches.length > 0;
  const editingEnabled = hasAdminAccess();

  if (generateBtn) generateBtn.disabled = !editingEnabled || hasMatches;
  if (mobileGenerateBtn) mobileGenerateBtn.disabled = !editingEnabled || hasMatches;

  if (addRoundBtn) addRoundBtn.disabled = !editingEnabled;
  if (mobileAddRoundBtn) mobileAddRoundBtn.disabled = !editingEnabled;
}

function setActiveView(view) {
  const requestedView = view === "players" && !hasAdminAccess() ? "home" : view;
  state.activeView = requestedView;

  setVisible(homeView, requestedView === "home");
  setVisible(currentView, requestedView === "current");
  setVisible(playersView, requestedView === "players" && hasAdminAccess());

  const tabs = [
    [homeTab, requestedView === "home"],
    [currentTab, requestedView === "current"],
    [playersTab, requestedView === "players"],
    [mobileHomeTab, requestedView === "home"],
    [mobileCurrentTab, requestedView === "current"],
    [mobilePlayersTab, requestedView === "players"]
  ];

  tabs.forEach(([tab, isActive]) => {
    if (!tab) return;
    tab.classList.toggle("primary", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
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
  state.draft = { players: [], playerSnapshot: {}, mode: "single", type: "classic", ballsPerRound: 24, courts: 1, name: "", matches: [] };
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


function getPlayedMatchesCountByPlayer(players, matches = []) {
  const counts = new Map(players.map((playerId) => [playerId, 0]));
  matches.forEach((match) => {
    [...(match.teamA || []), ...(match.teamB || [])].forEach((playerId) => {
      if (!counts.has(playerId)) return;
      counts.set(playerId, (counts.get(playerId) || 0) + 1);
    });
  });
  return counts;
}


function getOpponentCountsByPlayer(players, matches = []) {
  const opponentCounts = new Map(players.map((playerId) => [playerId, new Map()]));

  function incrementOpponent(playerId, opponentId) {
    if (!opponentCounts.has(playerId)) opponentCounts.set(playerId, new Map());
    const row = opponentCounts.get(playerId);
    row.set(opponentId, (row.get(opponentId) || 0) + 1);
  }

  matches.forEach((match) => {
    const teamA = match.teamA || [];
    const teamB = match.teamB || [];
    teamA.forEach((playerA) => {
      teamB.forEach((playerB) => {
        incrementOpponent(playerA, playerB);
        incrementOpponent(playerB, playerA);
      });
    });
  });

  return opponentCounts;
}


function getTeammateCountsByPlayer(players, matches = []) {
  const teammateCounts = new Map(players.map((playerId) => [playerId, new Map()]));

  function incrementTeammate(playerId, teammateId) {
    if (!teammateCounts.has(playerId)) teammateCounts.set(playerId, new Map());
    const row = teammateCounts.get(playerId);
    row.set(teammateId, (row.get(teammateId) || 0) + 1);
  }

  matches.forEach((match) => {
    const teams = [match.teamA || [], match.teamB || []];
    teams.forEach((team) => {
      if (team.length < 2) return;
      for (let i = 0; i < team.length; i += 1) {
        for (let j = i + 1; j < team.length; j += 1) {
          incrementTeammate(team[i], team[j]);
          incrementTeammate(team[j], team[i]);
        }
      }
    });
  });

  return teammateCounts;
}

function buildNearestDoublesRoundMatches(activePlayers, rankByPlayer, opponentCountsByPlayer, teammateCountsByPlayer) {
  const unassigned = [...activePlayers];
  const matches = [];

  function getPairCount(mapByPlayer, playerA, playerB) {
    return mapByPlayer.get(playerA)?.get(playerB) || 0;
  }

  function rankDistance(playerA, playerB) {
    const rankA = rankByPlayer.get(playerA) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankByPlayer.get(playerB) ?? Number.MAX_SAFE_INTEGER;
    return Math.abs(rankA - rankB);
  }

  function updatePairCount(mapByPlayer, playerA, playerB) {
    const rowA = mapByPlayer.get(playerA) || new Map();
    const rowB = mapByPlayer.get(playerB) || new Map();
    rowA.set(playerB, (rowA.get(playerB) || 0) + 1);
    rowB.set(playerA, (rowB.get(playerA) || 0) + 1);
    mapByPlayer.set(playerA, rowA);
    mapByPlayer.set(playerB, rowB);
  }

  while (unassigned.length >= 4) {
    const first = unassigned.shift();

    let teammateIndex = 0;
    let teammateScore = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < unassigned.length; i += 1) {
      const candidate = unassigned[i];
      const score = getPairCount(teammateCountsByPlayer, first, candidate) * 1000 + rankDistance(first, candidate);
      if (score < teammateScore) {
        teammateScore = score;
        teammateIndex = i;
      }
    }

    const [second] = unassigned.splice(teammateIndex, 1);
    const teamA = [first, second];

    let bestI = 0;
    let bestJ = 1;
    let bestScore = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < unassigned.length; i += 1) {
      for (let j = i + 1; j < unassigned.length; j += 1) {
        const third = unassigned[i];
        const fourth = unassigned[j];
        const teammateRepeats = getPairCount(teammateCountsByPlayer, third, fourth);
        const opponentRepeats =
          getPairCount(opponentCountsByPlayer, first, third) +
          getPairCount(opponentCountsByPlayer, first, fourth) +
          getPairCount(opponentCountsByPlayer, second, third) +
          getPairCount(opponentCountsByPlayer, second, fourth);
        const teamRankDistance =
          rankDistance(first, third) +
          rankDistance(first, fourth) +
          rankDistance(second, third) +
          rankDistance(second, fourth);
        const score = teammateRepeats * 10000 + opponentRepeats * 100 + teamRankDistance;
        if (score < bestScore) {
          bestScore = score;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const idxA = Math.max(bestI, bestJ);
    const idxB = Math.min(bestI, bestJ);
    const [playerHigh] = unassigned.splice(idxA, 1);
    const [playerLow] = unassigned.splice(idxB, 1);
    const teamB = [playerLow, playerHigh];

    matches.push({ teamA, teamB });

    updatePairCount(teammateCountsByPlayer, teamA[0], teamA[1]);
    updatePairCount(teammateCountsByPlayer, teamB[0], teamB[1]);

    teamA.forEach((playerA) => teamB.forEach((playerB) => updatePairCount(opponentCountsByPlayer, playerA, playerB)));
  }

  return matches;
}

function buildNearestSinglesRoundMatches(activePlayers, rankByPlayer, opponentCountsByPlayer) {
  const unpaired = [...activePlayers];
  const matches = [];

  function getOpponentCount(playerA, playerB) {
    return opponentCountsByPlayer.get(playerA)?.get(playerB) || 0;
  }

  function rankDistance(playerA, playerB) {
    const rankA = rankByPlayer.get(playerA) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankByPlayer.get(playerB) ?? Number.MAX_SAFE_INTEGER;
    return Math.abs(rankA - rankB);
  }

  while (unpaired.length >= 2) {
    const playerA = unpaired.shift();
    let bestIndex = 0;
    let bestScore = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < unpaired.length; i += 1) {
      const playerB = unpaired[i];
      const repeats = getOpponentCount(playerA, playerB);
      const score = repeats * 1000 + rankDistance(playerA, playerB);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const [playerB] = unpaired.splice(bestIndex, 1);
    matches.push({ teamA: [playerA], teamB: [playerB] });

    const rowA = opponentCountsByPlayer.get(playerA) || new Map();
    const rowB = opponentCountsByPlayer.get(playerB) || new Map();
    rowA.set(playerB, (rowA.get(playerB) || 0) + 1);
    rowB.set(playerA, (rowB.get(playerA) || 0) + 1);
    opponentCountsByPlayer.set(playerA, rowA);
    opponentCountsByPlayer.set(playerB, rowB);
  }

  return matches;
}

function buildNearestOpponentRounds(
  players,
  standingsRows,
  mode,
  courts,
  startingRound,
  playedMatchesByPlayer = new Map(),
  opponentCountsByPlayer = new Map(),
  teammateCountsByPlayer = new Map()
) {
  const rankByPlayer = new Map(standingsRows.map((row, index) => [row.playerId, index]));
  const packagePlayedByPlayer = new Map(players.map((playerId) => [playerId, 0]));
  const sortPlayers = (a, b) => {
    const packagePlayedA = packagePlayedByPlayer.get(a) || 0;
    const packagePlayedB = packagePlayedByPlayer.get(b) || 0;
    if (packagePlayedA !== packagePlayedB) return packagePlayedA - packagePlayedB;

    const playedA = playedMatchesByPlayer.get(a) || 0;
    const playedB = playedMatchesByPlayer.get(b) || 0;
    if (playedA !== playedB) return playedA - playedB;

    const indexA = rankByPlayer.get(a);
    const indexB = rankByPlayer.get(b);
    if (indexA === undefined && indexB === undefined) return getPlayerName(a).localeCompare(getPlayerName(b), "da");
    if (indexA === undefined) return 1;
    if (indexB === undefined) return -1;
    if (indexA !== indexB) return indexA - indexB;
    return getPlayerName(a).localeCompare(getPlayerName(b), "da");
  };

  const playersPerMatch = mode === "double" ? 4 : 2;
  if (players.length < playersPerMatch) return [];

  const perRound = Math.max(1, courts);
  const maxPlayersInRound = Math.min(players.length, perRound * playersPerMatch);
  const activePlayersCount = Math.floor(maxPlayersInRound / playersPerMatch) * playersPerMatch;
  if (!activePlayersCount) return [];

  const roundMatches = [];
  const requiredRounds = Math.max(1, Math.ceil(players.length / activePlayersCount));
  let roundsCreated = 0;

  while (roundsCreated < requiredRounds) {
    const sortedPlayers = [...players].sort(sortPlayers);
    const activePlayers = sortedPlayers.slice(0, activePlayersCount);

    if (mode === "single") {
      roundMatches.push(...buildNearestSinglesRoundMatches(activePlayers, rankByPlayer, opponentCountsByPlayer));
    } else {
      roundMatches.push(...buildNearestDoublesRoundMatches(activePlayers, rankByPlayer, opponentCountsByPlayer, teammateCountsByPlayer));
    }

    activePlayers.forEach((playerId) => {
      packagePlayedByPlayer.set(playerId, (packagePlayedByPlayer.get(playerId) || 0) + 1);
    });

    roundsCreated += 1;
  }

  return roundMatches.map((match, index) => ({
    ...match,
    round: startingRound + Math.floor(index / perRound),
    scoreA: null,
    scoreB: null
  }));
}

function getAggregateStandingsForPlayers(players) {
  const aggregateByPlayer = new Map(getBaseAggregateStats().map((row) => [row.playerId, row]));

  return players
    .map((playerId) => {
      const row = aggregateByPlayer.get(playerId);
      return {
        playerId,
        totalWins: row?.totalWins ?? 0,
        totalBallsWon: row?.totalBallsWon ?? 0,
        avgBallsPerMatch: row?.avgBallsPerMatch ?? 0
      };
    })
    .sort(
      (a, b) =>
        b.totalWins - a.totalWins ||
        b.totalBallsWon - a.totalBallsWon ||
        b.avgBallsPerMatch - a.avgBallsPerMatch ||
        getPlayerName(a.playerId).localeCompare(getPlayerName(b.playerId), "da")
    );
}

function buildNearestDraftMatches(players, mode, courts, existingMatches = []) {
  const hasCurrentResults = existingMatches.some((match) => isMatchScored(match));
  const standings = hasCurrentResults
    ? getTournamentStandings({ players, matches: existingMatches, playerSnapshot: buildPlayerSnapshot(players) })
    : getAggregateStandingsForPlayers(players);
  const firstRound = Math.max(1, existingMatches.reduce((max, m) => Math.max(max, m.round || 0), 0) + 1);
  const playedMatchesByPlayer = getPlayedMatchesCountByPlayer(players, existingMatches);
  const opponentCountsByPlayer = getOpponentCountsByPlayer(players, existingMatches);
  const teammateCountsByPlayer = getTeammateCountsByPlayer(players, existingMatches);
  return buildNearestOpponentRounds(
    players,
    standings,
    mode,
    courts,
    firstRound,
    playedMatchesByPlayer,
    opponentCountsByPlayer,
    teammateCountsByPlayer
  );
}
function buildRoundPackage(players, mode, courts, startingRound = 1) {
  const rawMatches = mode === "double" ? buildDoublesMatches(players) : buildSinglesMatches(players);
  return scheduleMatches(rawMatches, courts, startingRound);
}

function getRoundEstimation(players, mode, courts, type) {
  if (!players.length) return { totalMatches: 0, totalRounds: 0 };
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

function buildDraftMatches(players, mode, courts, type, existingMatches = []) {
  if (type === "nearest" && existingMatches.length > 0) {
    return buildNearestDraftMatches(players, mode, courts, existingMatches);
  }
  return buildRoundPackage(players, mode, courts);
}

function appendRoundsToDraft() {
  const nextRound = state.draft.matches.reduce((max, m) => Math.max(max, m.round), 0) + 1;
  const extraMatches = state.draft.type === "nearest"
    ? buildNearestDraftMatches(state.draft.players, state.draft.mode, state.draft.courts, state.draft.matches)
    : buildRoundPackage(state.draft.players, state.draft.mode, state.draft.courts, nextRound);
  state.draft.matches.push(...extraMatches);
}

function isMatchScored(match) {
  return Number.isInteger(match?.scoreA) && Number.isInteger(match?.scoreB);
}

function getTournamentStandings(tournament) {
  const snapshot = tournament.playerSnapshot || {};
  const map = new Map();
  tournament.players.forEach((playerId) =>
    map.set(playerId, { playerId, playerName: getPlayerName(playerId, snapshot), totalBallsWon: 0, totalBallsAgainst: 0, matches: 0, wins: 0 })
  );

  tournament.matches.forEach((match) => {
    if (!isMatchScored(match)) return;
    match.teamA.forEach((playerId) => {
      const row = map.get(playerId);
      if (!row) return;
      row.totalBallsWon += match.scoreA;
      row.totalBallsAgainst += match.scoreB;
      row.matches += 1;
      if (match.scoreA > match.scoreB) row.wins += 1;
    });
    match.teamB.forEach((playerId) => {
      const row = map.get(playerId);
      if (!row) return;
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
        a.playerName.localeCompare(b.playerName, "da")
    );
}

function getCompletedTournamentStatDeltas(tournament) {
  const deltas = new Map((tournament.players || []).map((playerId) => [playerId, getDefaultPlayerStats()]));

  (tournament.matches || []).forEach((match) => {
    if (!isMatchScored(match)) return;

    (match.teamA || []).forEach((playerId) => {
      const row = deltas.get(playerId) || getDefaultPlayerStats();
      row.totalBallsWon += match.scoreA;
      row.totalBallsAgainst += match.scoreB;
      row.totalMatches += 1;
      if (match.scoreA > match.scoreB) row.totalWins += 1;
      deltas.set(playerId, row);
    });

    (match.teamB || []).forEach((playerId) => {
      const row = deltas.get(playerId) || getDefaultPlayerStats();
      row.totalBallsWon += match.scoreB;
      row.totalBallsAgainst += match.scoreA;
      row.totalMatches += 1;
      if (match.scoreB > match.scoreA) row.totalWins += 1;
      deltas.set(playerId, row);
    });
  });

  return deltas;
}

function applyCompletedTournamentStats(tournament) {
  const deltas = getCompletedTournamentStatDeltas(tournament);

  state.savedPlayers = state.savedPlayers.map((player) => {
    const delta = deltas.get(player.id);
    if (!delta) return player;

    const currentStats = normalizePlayerStats(player.stats);
    return {
      ...player,
      stats: {
        totalBallsWon: currentStats.totalBallsWon + delta.totalBallsWon,
        totalBallsAgainst: currentStats.totalBallsAgainst + delta.totalBallsAgainst,
        totalMatches: currentStats.totalMatches + delta.totalMatches,
        totalWins: currentStats.totalWins + delta.totalWins
      }
    };
  });
}

function allResultsEntered() {
  return state.draft.matches.length > 0 && state.draft.matches.every(isMatchScored);
}

function getPlannedMatchesByPlayer(tournament) {
  const counts = new Map((tournament.players || []).map((playerId) => [playerId, 0]));
  (tournament.matches || []).forEach((match) => {
    [...(match.teamA || []), ...(match.teamB || [])].forEach((playerId) => {
      counts.set(playerId, (counts.get(playerId) || 0) + 1);
    });
  });
  return counts;
}

function getUnevenParticipationDetails(tournament) {
  const entries = [...getPlannedMatchesByPlayer(tournament).entries()].map(([playerId, matches]) => ({
    playerId,
    playerName: getPlayerName(playerId, tournament.playerSnapshot || {}),
    matches
  }));
  if (!entries.length) return null;
  const minMatches = Math.min(...entries.map((entry) => entry.matches));
  const maxMatches = Math.max(...entries.map((entry) => entry.matches));
  if (minMatches === maxMatches) return null;
  return { minMatches, maxMatches, entries };
}

function renderSavedPlayerSelector() {
  savedPlayerSelect.innerHTML = `<option value="">Vælg spiller fra databasen</option>${state.savedPlayers
    .map((player) => `<option value="${player.id}">${player.name}</option>`)
    .join("")}`;
}

function syncDraftPlayersWithDatabase() {
  state.draft.players = ensurePlayerIds(state.draft.players);
  state.draft.matches = state.draft.matches.map((match) => ({
    ...match,
    teamA: ensurePlayerIds(match.teamA || []),
    teamB: ensurePlayerIds(match.teamB || [])
  }));
  state.draft.playerSnapshot = {
    ...(state.draft.playerSnapshot || {}),
    ...buildPlayerSnapshot(state.draft.players)
  };
}

function renderPlayers() {
  setEditingEnabled(hasAdminAccess());
  playerList.innerHTML = "";
  state.draft.players.forEach((playerId, index) => {
    const li = document.createElement("li");
    li.textContent = getPlayerName(playerId, state.draft.playerSnapshot || {});
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.disabled = !hasAdminAccess() || isDraftLockedForPlayerChanges();
    removeBtn.addEventListener("click", async () => {
      if (!requireAdminAccess()) return;
      if (isDraftLockedForPlayerChanges()) return alert("Spillerlisten kan ikke ændres efter turneringen er startet.");
      state.draft.players.splice(index, 1);
      const minPlayers = state.draft.mode === "double" ? 4 : 2;
      if (state.draft.players.length < minPlayers) state.draft.matches = [];
      updateRoundsHint();
      renderPlayers();
      renderSchedule();
      renderStandings();
      renderHome();
      await saveActiveTournament();
    });
    if (hasAdminAccess()) li.appendChild(removeBtn);
    playerList.appendChild(li);
  });

  if (savedPlayerSelect) savedPlayerSelect.disabled = !hasAdminAccess() || isDraftLockedForPlayerChanges();
}

function renderSavedPlayers() {
  setEditingEnabled(hasAdminAccess());
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
    useBtn.disabled = !hasAdminAccess() || isDraftLockedForPlayerChanges();
    useBtn.addEventListener("click", async () => {
      if (!requireAdminAccess()) return;
      if (isDraftLockedForPlayerChanges()) return alert("Spillerlisten kan ikke ændres efter turneringen er startet.");
      if (state.draft.players.includes(player.id)) return alert("Spilleren er allerede med i turneringen.");
      if (state.draft.players.length >= 40) return alert("Der kan maks være 40 spillere i en turnering.");
      state.draft.players.push(player.id);
      state.draft.playerSnapshot[player.id] = player.name;
      setActiveView("current");
      renderPlayers();
      updateRoundsHint();
      await saveActiveTournament();
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Redigér";
    editBtn.disabled = !hasAdminAccess();
    editBtn.addEventListener("click", async () => {
      if (!requireAdminAccess()) return;
      openPlayerEditor(player.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Slet";
    deleteBtn.disabled = !hasAdminAccess();
    deleteBtn.addEventListener("click", async () => {
      if (!requireAdminAccess()) return;
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

    actions.append(useBtn, editBtn, deleteBtn);
    li.appendChild(actions);
    savedPlayerList.appendChild(li);
  });

  renderSavedPlayerSelector();
}

function openPlayerEditor(playerId) {
  if (!playerEditorDialog || !playerEditorForm) return;
  const player = getPlayerRecordById(playerId);
  if (!player) return;
  const stats = normalizePlayerStats(player.stats);
  editorPlayerIdInput.value = player.id || "";
  editorPlayerNameInput.value = player.name || "";
  editorPlayerEmailInput.value = player.linkedEmail || "";
  editorPlayerOwnerInput.value = player.ownerUserId || "";
  editorStatsWonInput.value = String(stats.totalBallsWon);
  editorStatsAgainstInput.value = String(stats.totalBallsAgainst);
  editorStatsMatchesInput.value = String(stats.totalMatches);
  editorStatsWinsInput.value = String(stats.totalWins);
  playerEditorForm.dataset.editingPlayerId = player.id;
  playerEditorDialog.showModal();
}

async function handlePlayerEditorSave(event) {
  event.preventDefault();
  if (!requireAdminAccess()) return;
  const editingPlayerId = playerEditorForm?.dataset?.editingPlayerId;
  if (!editingPlayerId) return;
  const player = getPlayerRecordById(editingPlayerId);
  if (!player) return;

  const nextName = editorPlayerNameInput.value.trim();
  if (!nextName) return alert("Navnet må ikke være tomt.");
  const nameExists = state.savedPlayers.some((saved) => saved.id !== player.id && saved.name.toLowerCase() === nextName.toLowerCase());
  if (nameExists) return alert("Der findes allerede en spiller med det navn.");

  const nextId = editorPlayerIdInput.value.trim();
  if (!nextId) return alert("Spiller-ID må ikke være tomt.");
  const idExists = state.savedPlayers.some((saved) => saved.id !== player.id && saved.id === nextId);
  if (idExists) return alert("Der findes allerede en spiller med det ID.");

  const nextEmail = editorPlayerEmailInput.value.trim().toLowerCase();
  const nextOwner = editorPlayerOwnerInput.value.trim();
  const nextStats = normalizePlayerStats({
    totalBallsWon: Number(editorStatsWonInput.value),
    totalBallsAgainst: Number(editorStatsAgainstInput.value),
    totalMatches: Number(editorStatsMatchesInput.value),
    totalWins: Number(editorStatsWinsInput.value)
  });

  const oldId = player.id;
  player.id = nextId;
  player.name = nextName;
  player.linkedEmail = nextEmail || null;
  player.ownerUserId = nextOwner || null;
  player.stats = nextStats;

  if (oldId !== nextId) {
    state.draft.players = state.draft.players.map((playerId) => (playerId === oldId ? nextId : playerId));
    state.draft.matches = state.draft.matches.map((match) => ({
      ...match,
      teamA: (match.teamA || []).map((playerId) => (playerId === oldId ? nextId : playerId)),
      teamB: (match.teamB || []).map((playerId) => (playerId === oldId ? nextId : playerId))
    }));
    if (state.draft.playerSnapshot?.[oldId]) {
      state.draft.playerSnapshot[nextId] = state.draft.playerSnapshot[oldId];
      delete state.draft.playerSnapshot[oldId];
    }
  }

  state.draft.playerSnapshot[nextId] = nextName;
  state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));
  saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHome();
  playerEditorDialog.close();
  await saveActiveTournament();
}

function registerPlayerInDatabase(name, owner = state.currentUser) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) return { ok: false, reason: "empty" };

  if (state.savedPlayers.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { ok: false, reason: "exists" };
  }

  state.savedPlayers.push({
    id: crypto.randomUUID(),
    name: trimmedName,
    stats: getDefaultPlayerStats(),
    ownerUserId: owner?.id || null,
    linkedEmail: owner?.email || null
  });
  state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));
  saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
  renderSavedPlayers();
  renderHome();
  return { ok: true };
}

function renderSchedule() {
  setEditingEnabled(hasAdminAccess());
  updateRoundActionButtons();
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
    inputA.disabled = !hasAdminAccess();
    inputA.min = "0";
    inputA.max = String(state.draft.ballsPerRound);
    inputA.value = Number.isInteger(match.scoreA) ? String(match.scoreA) : "";
    scoreALabel.appendChild(inputA);

    const scoreBLabel = document.createElement("label");
    scoreBLabel.textContent = `${getDisplayName(match.teamB)} score`;
    const inputB = document.createElement("input");
    inputB.type = "number";
    inputB.disabled = !hasAdminAccess();
    inputB.min = "0";
    inputB.max = String(state.draft.ballsPerRound);
    inputB.value = Number.isInteger(match.scoreB) ? String(match.scoreB) : "";
    scoreBLabel.appendChild(inputB);

    const applyScore = async (changedInput, otherInput) => {
      if (!requireAdminAccess()) {
        renderSchedule();
        return;
      }
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

      renderSchedule();
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
      (row, i) => `<tr><td>${i === 0 ? "🏆 " : ""}${row.playerName}</td><td>${row.totalBallsWon}</td><td>${row.totalBallsAgainst}</td><td>${row.matches}</td><td>${row.wins}</td><td>${row.avgBallsPerMatch}</td></tr>`
    )
    .join("")}</tbody>`;
  const tableWrap = document.createElement("div");
  tableWrap.className = "stats-table-wrap";
  tableWrap.appendChild(table);
  standingsRoot.appendChild(tableWrap);
}

function getBaseAggregateStats() {
  return state.savedPlayers.map((player) => {
    const stats = normalizePlayerStats(player.stats);
    return {
      playerId: player.id,
      playerName: player.name,
      totalBallsWon: stats.totalBallsWon,
      totalBallsAgainst: stats.totalBallsAgainst,
      totalMatches: stats.totalMatches,
      totalWins: stats.totalWins,
      avgBallsPerMatch: stats.totalMatches ? Number((stats.totalBallsWon / stats.totalMatches).toFixed(2)) : 0
    };
  });
}

function getAggregateStats() {
  const rows = getBaseAggregateStats();

  const sortBy = statsSortInput.value;
  if (sortBy === "totalBalls") rows.sort((a, b) => b.totalBallsWon - a.totalBallsWon || b.totalWins - a.totalWins);
  else if (sortBy === "ballsAgainst") rows.sort((a, b) => a.totalBallsAgainst - b.totalBallsAgainst || b.totalWins - a.totalWins || b.totalBallsWon - a.totalBallsWon);
  else if (sortBy === "avgBalls") rows.sort((a, b) => b.avgBallsPerMatch - a.avgBallsPerMatch || b.totalBallsWon - a.totalBallsWon);
  else rows.sort((a, b) => b.totalWins - a.totalWins || b.totalBallsWon - a.totalBallsWon || a.playerName.localeCompare(b.playerName, "da"));

  return rows;
}

function renderAggregateStats() {
  aggregateRoot.innerHTML = "";
  const rows = getAggregateStats();
  setVisible(aggregateEmpty, rows.length === 0);
  if (!rows.length) return;

  const table = document.createElement("table");
  table.className = "stats-table";
  table.innerHTML = `<thead><tr><th>Spiller</th><th>Bolde vundet</th><th>Bolde imod</th><th>Kampe</th><th>Sejre</th><th>Bolde pr. kamp</th></tr></thead><tbody>${rows
    .map(
      (row, i) => `<tr><td>${i === 0 ? "⭐ " : ""}${row.playerName}</td><td>${row.totalBallsWon}</td><td>${row.totalBallsAgainst}</td><td>${row.totalMatches}</td><td>${row.totalWins}</td><td>${row.avgBallsPerMatch}</td></tr>`
    )
    .join("")}</tbody>`;
  const tableWrap = document.createElement("div");
  tableWrap.className = "stats-table-wrap";
  tableWrap.appendChild(table);
  aggregateRoot.appendChild(tableWrap);
}

function renderHome() {
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
  if (!requireAdminAccess()) return;
  if (state.draft.matches.length) {
    alert("Turneringen er i gang. Brug 'Tilføj flere runder' i stedet for at generere på ny.");
    return;
  }
  state.draft.mode = courtTypeInput.value;
  state.draft.type = tournamentTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.courts = Math.max(1, Number(courtsCountInput.value) || 1);
  state.draft.name = tournamentNameInput.value.trim() || `${state.draft.type === "nearest" ? "Rangliste" : "Mexicano"} ${new Date().toLocaleDateString("da-DK")}`;
  state.draft.playerSnapshot = { ...(state.draft.playerSnapshot || {}), ...buildPlayerSnapshot(state.draft.players) };
  if (!validateMexicanoSetup()) return;
  state.draft.matches = buildDraftMatches(state.draft.players, state.draft.mode, state.draft.courts, state.draft.type);
  renderSchedule();
  renderStandings();
  setActiveView("current");
  await saveActiveTournament();
}

async function addRounds() {
  if (!requireAdminAccess()) return;
  state.draft.mode = courtTypeInput.value;
  state.draft.type = tournamentTypeInput.value;
  state.draft.ballsPerRound = Math.max(8, Number(ballsPerRoundInput.value) || 24);
  state.draft.courts = Math.max(1, Number(courtsCountInput.value) || 1);
  state.draft.name = tournamentNameInput.value.trim() || `${state.draft.type === "nearest" ? "Rangliste" : "Mexicano"} ${new Date().toLocaleDateString("da-DK")}`;
  state.draft.playerSnapshot = { ...(state.draft.playerSnapshot || {}), ...buildPlayerSnapshot(state.draft.players) };
  if (!validateMexicanoSetup()) return;

  if (state.draft.matches.length && !allResultsEntered()) {
    alert("Alle runder i den nuværende turnering skal være spillet færdig, før du kan tilføje flere runder.");
    return;
  }

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
  if (!requireAdminAccess()) return;
  if (!validateMexicanoSetup()) return;
  if (!state.draft.matches.length) return alert("Generér mindst én runde før du afslutter.");

  if (!allResultsEntered()) {
    const shouldComplete = confirm("Der mangler resultater i nogle runder. Vil du afslutte og gemme turneringen alligevel?");
    if (!shouldComplete) return;
  }

  const unevenParticipation = getUnevenParticipationDetails(state.draft);
  if (unevenParticipation) {
    const details = unevenParticipation.entries
      .sort((a, b) => b.matches - a.matches || a.playerName.localeCompare(b.playerName, "da"))
      .map((entry) => `${entry.playerName}: ${entry.matches}`)
      .join("\n");
    alert(
      `Spillerne skal spille lige mange kampe, før turneringen kan afsluttes (${unevenParticipation.minMatches}-${unevenParticipation.maxMatches}).\n\n${details}`
    );
    return;
  }

  const payload = {
    players: clone(state.draft.players),
    playerSnapshot: { ...(state.draft.playerSnapshot || {}), ...buildPlayerSnapshot(state.draft.players) },
    mode: state.draft.mode,
    type: state.draft.type || "classic",
    ballsPerRound: state.draft.ballsPerRound,
    courts: state.draft.courts,
    name: state.draft.name,
    matches: clone(state.draft.matches)
  };

  applyCompletedTournamentStats(payload);
  saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);

  await clearActiveTournament();
  setActiveView("home");
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHome();
  alert("Turnering afsluttet og spillerstatistik opdateret.");
}


function setAuthenticatedUi(isAuthenticated) {
  setVisible(authCard, !isAuthenticated);
  setVisible(appCard, isAuthenticated);
  setVisible(logoutBtn, isAuthenticated);
  if (adminAccessCard) setVisible(adminAccessCard, isAuthenticated);
}

function updateRoleBasedUi() {
  const admin = hasAdminAccess();
  setVisible(playersTab, admin);
  setVisible(mobilePlayersTab, admin);
  setVisible(playersView, admin && state.activeView === "players");
  setVisible(adminAccessBtn, admin);
  setVisible(playerForm, admin);
  setVisible(roundActions, admin);
  setVisible(completeBtn, admin);
  setVisible(mobileActionBar, admin);
  setVisible(savedPlayerForm, admin);
  setVisible(dbInviteForm, admin);
  setVisible(publicSignupCard, !admin);
}

function ensureDefaultAdminPlayer() {
  const adminName = "Kristian Dybmose";
  if (state.savedPlayers.some((player) => player.name.toLowerCase() === adminName.toLowerCase())) return;
  state.savedPlayers.push({
    id: crypto.randomUUID(),
    name: adminName,
    stats: getDefaultPlayerStats(),
    ownerUserId: null,
    linkedEmail: "dybmose@hotmail.com"
  });
  state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));
  saveToStorage(STORAGE_KEYS.savedPlayers, state.savedPlayers);
}

async function handleLogin(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) return setAuthStatus("Supabase er ikke konfigureret.", true);

  const email = authEmailInput.value.trim().toLowerCase();
  const password = authPasswordInput.value;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return setAuthStatus(`Login fejlede: ${error.message}`, true);

  await initializeAppForUser(data.user);
  loginForm.reset();
  setAuthStatus("Logget ind.");
}

async function handleRegister(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) return setAuthStatus("Supabase er ikke konfigureret.", true);

  const name = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim().toLowerCase();
  const password = registerPasswordInput.value;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  if (error) return setAuthStatus(`Registrering fejlede: ${error.message}`, true);

  const createdUser = data.user;
  if (createdUser) {
    await initializeAppForUser(createdUser);
    if (!state.savedPlayers.some((player) => String(player.linkedEmail || "").toLowerCase() === email)) {
      registerPlayerInDatabase(name || email, createdUser);
    }
  }

  registerForm.reset();
  setAuthStatus("Registrering gennemført. Du er nu logget ind.");
}

async function handleForgotPassword() {
  const client = getSupabaseClient();
  if (!client) return setAuthStatus("Supabase er ikke konfigureret.", true);
  const email = (authEmailInput?.value || registerEmailInput?.value || "").trim().toLowerCase();
  if (!email) return setAuthStatus("Skriv din e-mail først.", true);

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });

  if (error) return setAuthStatus(`Kunne ikke sende mail: ${error.message}`, true);
  setAuthStatus("Link til nulstilling af adgangskode er sendt.");
}

async function handleLogout() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
  state.currentUser = null;
  state.isAdminUser = false;
  state.savedPlayers = [];
  await clearActiveTournament();
  setAuthenticatedUi(false);
  updateAdminAccessUi();
  updateRoleBasedUi();
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHome();
}

async function initializeAppForUser(user) {
  state.currentUser = user;
  state.isAdminUser = isKristianAdmin(user?.email);

  state.savedPlayers = loadFromStorage(STORAGE_KEYS.savedPlayers, []).map((player) => {
    if (typeof player === "string") return { id: crypto.randomUUID(), name: player, stats: getDefaultPlayerStats(), ownerUserId: user?.id || null, linkedEmail: user?.email || null };
    return {
      id: player.id || crypto.randomUUID(),
      name: String(player.name || "").trim(),
      stats: normalizePlayerStats(player.stats),
      ownerUserId: player.ownerUserId || null,
      linkedEmail: player.linkedEmail || null
    };
  }).filter((player) => player.name);

  ensureDefaultAdminPlayer();

  state.savedPlayers = state.savedPlayers.filter((player) => {
    if (state.isAdminUser) return true;
    return player.ownerUserId === user.id || String(player.linkedEmail || "").toLowerCase() === String(user.email || "").toLowerCase();
  });
  state.savedPlayers.sort((a, b) => a.name.localeCompare(b.name, "da"));

  state.draft = loadFromStorage(STORAGE_KEYS.draft, state.draft);
  state.draft = migrateTournamentData({ ...state.draft, players: state.draft.players || [], matches: state.draft.matches || [] });
  syncDraftPlayersWithDatabase();
  if (!Number.isInteger(state.draft.courts) || state.draft.courts < 1) state.draft.courts = 1;
  if (!["classic", "nearest"].includes(state.draft.type)) state.draft.type = "classic";

  setAuthenticatedUi(true);
  setActiveView("home");
  updateAdminAccessUi();
  updateRoleBasedUi();
  setEditingEnabled(hasAdminAccess());
  updateDraftInputs();
  renderSavedPlayers();
  renderPlayers();
  renderSchedule();
  renderStandings();
  renderHome();
}

savedPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdminAccess()) return;
  const result = registerPlayerInDatabase(savedPlayerInput.value);
  if (result.reason === "empty") return;
  if (result.reason === "exists") {
    alert("Spilleren findes allerede i din liste.");
    return;
  }
  savedPlayerForm.reset();
});



async function addSelectedPlayerToDraft(selectedPlayerId) {
  if (!requireAdminAccess()) return;
  if (isDraftLockedForPlayerChanges()) return alert("Spillerlisten kan ikke ændres efter turneringen er startet.");
  if (!selectedPlayerId) return;
  if (state.draft.players.includes(selectedPlayerId)) return alert("Spilleren er allerede med i turneringen.");
  if (state.draft.players.length >= 40) return alert("Der kan maks være 40 spillere i en turnering.");

  state.draft.players.push(selectedPlayerId);
  state.draft.playerSnapshot[selectedPlayerId] = getPlayerName(selectedPlayerId);
  savedPlayerSelect.value = "";
  renderPlayers();
  updateRoundsHint();
  await saveActiveTournament();
}

async function handleDatabaseInvite(event) {
  event.preventDefault();
  if (!requireAdminAccess()) return;
  const client = getSupabaseClient();
  const config = getSupabaseConfig();
  if (!client || !config) return alert("Supabase er ikke konfigureret.");

  const email = dbInviteEmailInput.value.trim().toLowerCase();
  const role = dbInviteRoleInput.value;
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return alert("Din session er udløbet. Log ind igen.");

  const response = await fetch(`${config.url}/functions/v1/invite-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ email, role })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return alert(payload?.error || "Invitation kunne ikke sendes.");

  dbInviteForm.reset();
  alert(`Invitation sendt til ${email}.`);
}

playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addSelectedPlayerToDraft(savedPlayerSelect.value.trim());
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
courtTypeInput.addEventListener("change", updateRoundsHint);
courtsCountInput.addEventListener("input", updateRoundsHint);
tournamentTypeInput.addEventListener("change", updateRoundsHint);
adminAccessBtn.addEventListener("click", requireAdminAccess);
loginForm?.addEventListener("submit", handleLogin);
registerForm?.addEventListener("submit", handleRegister);
forgotPasswordBtn?.addEventListener("click", handleForgotPassword);
logoutBtn?.addEventListener("click", handleLogout);
savedPlayerSelect?.addEventListener("change", async () => {
  await addSelectedPlayerToDraft(savedPlayerSelect.value.trim());
});
publicSignupForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = registerPlayerInDatabase(publicSignupNameInput?.value);
  if (result.reason === "empty") return;
  if (result.reason === "exists") return alert("Spilleren findes allerede i databasen.");
  publicSignupForm.reset();
  alert("Tak for din registrering! Spilleren er oprettet i databasen.");
});
dbInviteForm?.addEventListener("submit", handleDatabaseInvite);
playerEditorForm?.addEventListener("submit", handlePlayerEditorSave);
playerEditorCloseBtn?.addEventListener("click", () => playerEditorDialog?.close());

(async function init() {
  await hydrateRemoteStorage();
  setVisible(adminCard, false);
  setVisible(adminPlayerCard, false);
  setAuthenticatedUi(false);
  updateRoleBasedUi();
  setAuthStatus("Log ind for at åbne appen.");

  const client = getSupabaseClient();
  if (!client) {
    setAuthStatus("Supabase mangler i konfigurationen.", true);
    return;
  }

  const { data } = await client.auth.getUser();
  if (data?.user) {
    await initializeAppForUser(data.user);
    setAuthStatus("");
  }
})();
