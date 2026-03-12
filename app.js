const STORAGE_KEY = "padel-planner-state";

const playerForm = document.getElementById("player-form");
const playerInput = document.getElementById("player-input");
const playerList = document.getElementById("player-list");
const generateBtn = document.getElementById("generate-btn");
const courtsInput = document.getElementById("courts");
const matchDurationInput = document.getElementById("match-duration");
const startTimeInput = document.getElementById("start-time");
const scheduleRoot = document.getElementById("schedule");
const scheduleEmpty = document.getElementById("schedule-empty");
const matchTemplate = document.getElementById("match-template");

const state = {
  players: [],
  schedule: []
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
      matches.push({
        teamA: `${p1} / ${p2}`,
        teamB: `${p3} / ${p4}`
      });
    }
  });
  return matches;
}

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
  if (state.players.includes(name)) {
    alert("Denne spiller findes allerede.");
    return;
  }
  state.players.push(name);
  playerInput.value = "";
  saveState();
  renderPlayers();
});

generateBtn.addEventListener("click", generateSchedule);

loadState();
renderPlayers();
renderSchedule();
