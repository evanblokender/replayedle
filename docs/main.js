// Game State
let previewTime = 3;
let attempts = 0;
const maxAttempts = 6;
let answer = "";
let answerDisplay = "";
let dailyDate = "";
let gameOver = false;
let gameMode = "daily";
let infiniteScore = 0;
let currentScoreId = null;
let currentMapHash = null;
let currentDifficulty = null;

// Anti-cheat
let encryptedAnswer = "";

// Version
const APP_VERSION = "1.0.0";

// DOM Elements
const replayIframe = document.getElementById("replay-iframe");
const loadingIndicator = document.getElementById("loading-indicator");
const skipBtn = document.getElementById("skip-btn");
const guessInput = document.getElementById("guess-input");
const autocompleteResults = document.getElementById("autocomplete-results");
const guessesContainer = document.getElementById("guesses-container");
const gameOverDiv = document.getElementById("game-over");
const resultMessage = document.getElementById("result-message");
const shareBtn = document.getElementById("share-btn");
const countdownEl = document.getElementById("countdown");
const attemptsCount = document.getElementById("attempts-count");
const previewTimeDisplay = document.getElementById("preview-time");
const previewTimeValue = document.getElementById("preview-time-value");
const modeBtn = document.getElementById("mode-btn");
const resetBtn = document.getElementById("reset-btn");
const infiniteScoreEl = document.getElementById("infinite-score");

// Modals
const helpBtn = document.getElementById("help-btn");
const statsBtn = document.getElementById("stats-btn");
const themeBtn = document.getElementById("theme-btn");
const helpModal = document.getElementById("help-modal");
const statsModal = document.getElementById("stats-modal");
const modeModal = document.getElementById("mode-modal");
const toast = document.getElementById("toast");

// Initialize
init();

function init() {
  checkVersion();
  loadTheme();
  loadGameMode();
  if (gameMode === "daily") {
    loadDaily();
  } else {
    loadInfiniteMode();
  }
  setupEventListeners();
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function checkVersion() {
  const savedVersion = localStorage.getItem("replayedle-version");
  if (savedVersion !== APP_VERSION) {
    localStorage.setItem("replayedle-version", APP_VERSION);
    showToast("Welcome to Replayedle!");
  }
}

// Game Mode Management
function loadGameMode() {
  const savedMode = localStorage.getItem("replayedle-mode");
  if (savedMode) {
    gameMode = savedMode;
  }
  updateModeDisplay();
}

function saveGameMode() {
  localStorage.setItem("replayedle-mode", gameMode);
}

function updateModeDisplay() {
  const modeIndicator = document.getElementById("mode-indicator");
  const countdownParent = countdownEl?.parentElement;
  const infiniteScoreContainer = document.getElementById("infinite-score-container");
  
  if (modeIndicator) {
    modeIndicator.textContent = gameMode === "daily" ? "Daily Mode" : "Infinite Mode";
  }
  
  if (gameMode === "infinite") {
    if (countdownParent) countdownParent.style.display = "none";
    if (infiniteScoreContainer) infiniteScoreContainer.style.display = "block";
    updateInfiniteScoreDisplay();
  } else {
    if (countdownParent) countdownParent.style.display = "block";
    if (infiniteScoreContainer) infiniteScoreContainer.style.display = "none";
  }
}

function switchMode(newMode) {
  if (gameMode === newMode) return;
  
  gameMode = newMode;
  saveGameMode();
  resetGame();
  
  if (gameMode === "daily") {
    loadDaily();
  } else {
    loadInfiniteMode();
  }
  
  updateModeDisplay();
  closeModal(modeModal);
  showToast(`Switched to ${gameMode === "daily" ? "Daily" : "Infinite"} Mode`);
}

// Load Daily Level
async function loadDaily(skipRestore = false) {
  try {
    showLoading(true);
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`data.json${cacheBuster}`);
    const data = await response.json();
    
    const levelAnswer = data.songName.toLowerCase().trim();
    answer = levelAnswer;
    answerDisplay = data.songName;
    dailyDate = data.date;
    currentScoreId = data.scoreId;
    currentMapHash = data.mapHash;
    currentDifficulty = data.difficulty;
    
    if (window.antiCheat) {
      encryptedAnswer = window.antiCheat.encrypt(levelAnswer);
    }
    
    if (!skipRestore) {
      const gameState = loadGameState();
      if (gameState && gameState.date === dailyDate && gameState.completed) {
        restoreGameState(gameState);
        loadReplay();
        return;
      }
    }
    
    loadReplay();
  } catch (error) {
    console.error("Failed to load daily level:", error);
    showToast("Failed to load today's level. Please refresh.");
    showLoading(false);
  }
}

// Infinite Mode
async function loadInfiniteMode() {
  try {
    showLoading(true);
    const randomPage = Math.floor(Math.random() * 50);
    const response = await fetch(
      `https://api.beatsaver.com/search/text/${randomPage}?ranked=true`
    );
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const randomLevel = data.docs[Math.floor(Math.random() * data.docs.length)];
      currentMapHash = randomLevel.versions[0].hash;
      
      const levelAnswer = randomLevel.metadata.songName.toLowerCase().trim();
      answer = levelAnswer;
      answerDisplay = randomLevel.metadata.songName;
      
      if (window.antiCheat) {
        encryptedAnswer = window.antiCheat.encrypt(levelAnswer);
      }
      
      // Try to get a replay from BeatLeader
      const difficulties = ["ExpertPlus", "Expert", "Hard"];
      let foundReplay = false;
      
      for (const diff of difficulties) {
        try {
          const blRes = await fetch(
            `https://api.beatleader.com/scores/${currentMapHash}/${diff}/1`
          );
          const blData = await blRes.json();
          
          if (blData.data && blData.data.length > 0) {
            const topScores = blData.data.slice(0, Math.min(20, blData.data.length));
            const randomScore = topScores[Math.floor(Math.random() * topScores.length)];
            currentScoreId = randomScore.id;
            currentDifficulty = diff;
            foundReplay = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (foundReplay) {
        const savedScore = localStorage.getItem("replayedle-infinite-score");
        infiniteScore = savedScore ? parseInt(savedScore) : 0;
        updateInfiniteScoreDisplay();
        loadReplay();
      } else {
        // No replay found, try another map
        loadInfiniteMode();
      }
    }
  } catch (error) {
    console.error("Failed to load infinite mode:", error);
    showToast("Failed to load level. Retrying...");
    setTimeout(loadInfiniteMode, 2000);
  }
}

// Load Replay into iframe
function loadReplay() {
  if (!currentScoreId) {
    showToast("No replay available");
    return;
  }
  
  const timeMs = previewTime * 1000;
  const replayUrl = `https://replay.beatleader.xyz/?scoreId=${currentScoreId}&time=${timeMs}`;
  
  replayIframe.src = replayUrl;
  
  // Hide loading after iframe loads
  replayIframe.onload = () => {
    showLoading(false);
  };
  
  updateTimeDisplay();
}

function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? "flex" : "none";
  }
}

function updateInfiniteScoreDisplay() {
  if (infiniteScoreEl) {
    infiniteScoreEl.textContent = infiniteScore;
  }
}

function saveInfiniteScore() {
  localStorage.setItem("replayedle-infinite-score", infiniteScore.toString());
}

function nextInfiniteLevel() {
  resetGame();
  loadInfiniteMode();
}

// Theme
function loadTheme() {
  const theme = localStorage.getItem("replayedle-theme") || "dark";
  document.body.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("replayedle-theme", newTheme);
  showToast(`Switched to ${newTheme} theme`);
}

// Game State
function loadGameState() {
  if (gameMode === "infinite") return null;
  const key = `replayedle-${dailyDate}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : null;
}

function saveGameState() {
  if (gameMode === "infinite") return;
  const key = `replayedle-${dailyDate}`;
  const state = {
    date: dailyDate,
    attempts: attempts,
    previewTime: previewTime,
    guesses: Array.from(guessesContainer.children).map(el => {
      const textEl = el.querySelector('.guess-text');
      const text = textEl ? textEl.textContent : el.textContent;
      return {
        text: text,
        type: el.classList.contains("correct") ? "correct" : 
              el.classList.contains("skip") ? "skip" : "incorrect"
      };
    }),
    completed: gameOver,
    won: gameOver && resultMessage.classList.contains("win")
  };
  localStorage.setItem(key, JSON.stringify(state));
}

function restoreGameState(state) {
  attempts = state.attempts;
  previewTime = state.previewTime;
  gameOver = state.completed;
  
  state.guesses.forEach(guess => {
    addGuess(guess.text, guess.type);
  });
  
  updateAttemptsDisplay();
  updateTimeDisplay();
  
  if (state.completed) {
    endGame(state.won);
  }
}

// Statistics
function loadStats() {
  const defaultStats = {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0],
    lastPlayedDate: null
  };
  const saved = localStorage.getItem("replayedle-stats");
  return saved ? JSON.parse(saved) : defaultStats;
}

function saveStats(won, guessCount) {
  if (gameMode === "infinite") return;
  const stats = loadStats();
  
  if (stats.lastPlayedDate !== dailyDate) {
    stats.played++;
    stats.lastPlayedDate = dailyDate;
    
    if (won) {
      stats.wins++;
      stats.currentStreak++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
      stats.distribution[guessCount - 1]++;
    } else {
      stats.currentStreak = 0;
    }
    
    localStorage.setItem("replayedle-stats", JSON.stringify(stats));
  }
}

function displayStats() {
  const stats = loadStats();
  document.getElementById("stat-played").textContent = stats.played;
  document.getElementById("stat-wins").textContent = stats.wins;
  document.getElementById("stat-streak").textContent = stats.currentStreak;
  document.getElementById("stat-max-streak").textContent = stats.maxStreak;
  
  const distributionEl = document.getElementById("distribution");
  distributionEl.innerHTML = "";
  
  const maxCount = Math.max(...stats.distribution, 1);
  stats.distribution.forEach((count, index) => {
    const bar = document.createElement("div");
    bar.className = "distribution-bar";
    
    const label = document.createElement("div");
    label.className = "distribution-label";
    label.textContent = index + 1;
    
    const fill = document.createElement("div");
    fill.className = "distribution-fill";
    
    const inner = document.createElement("div");
    inner.className = "distribution-inner";
    inner.style.width = `${(count / maxCount) * 100}%`;
    inner.textContent = count;
    
    fill.appendChild(inner);
    bar.appendChild(label);
    bar.appendChild(fill);
    distributionEl.appendChild(bar);
  });
}

// Reset Game
function resetGame() {
  attempts = 0;
  previewTime = 3;
  gameOver = false;
  
  guessesContainer.innerHTML = "";
  
  skipBtn.disabled = false;
  guessInput.disabled = false;
  guessInput.value = "";
  
  gameOverDiv.classList.add("hidden");
  
  updateAttemptsDisplay();
  updateTimeDisplay();
}

// Time Display
function updateTimeDisplay() {
  previewTimeDisplay.textContent = `${previewTime}s`;
  previewTimeValue.textContent = `${previewTime}s`;
}

function updateAttemptsDisplay() {
  attemptsCount.textContent = `${attempts}/${maxAttempts}`;
}

// Skip
function skipGuess() {
  if (gameOver) return;
  
  if (window.antiCheat && !window.antiCheat.checkOnGuess()) {
    return;
  }
  
  attempts++;
  previewTime += 2;
  addGuess("Skip", "skip");
  updateAttemptsDisplay();
  updateTimeDisplay();
  loadReplay(); // Reload with new time
  
  if (attempts >= maxAttempts) {
    endGame(false);
  }
  
  saveGameState();
}

// Autocomplete
let autocompleteTimeout;
async function handleInput() {
  const query = guessInput.value.trim();
  clearTimeout(autocompleteTimeout);
  
  if (query.length < 2) {
    autocompleteResults.innerHTML = "";
    return;
  }
  
  autocompleteTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://api.beatsaver.com/search/text/0?q=${encodeURIComponent(query)}&ranked=true`
      );
      const data = await response.json();
      displayAutocomplete(data.docs.slice(0, 5));
    } catch (error) {
      console.error("Autocomplete error:", error);
    }
  }, 300);
}

function displayAutocomplete(levels) {
  autocompleteResults.innerHTML = "";
  
  if (levels.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "autocomplete-item";
    noResults.textContent = "No ranked levels found";
    noResults.style.cursor = "default";
    autocompleteResults.appendChild(noResults);
    return;
  }
  
  levels.forEach(level => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    
    const levelName = level.metadata.songName;
    const artist = level.metadata.songAuthorName;
    
    item.innerHTML = `<strong>${levelName}</strong><br><small style="color: var(--text-muted)">${artist}</small>`;
    item.onclick = () => submitGuess(levelName);
    
    autocompleteResults.appendChild(item);
  });
}

// Submit Guess
function submitGuess(levelName) {
  if (gameOver) return;
  
  if (window.antiCheat && !window.antiCheat.checkOnGuess()) {
    return;
  }
  
  guessInput.value = "";
  autocompleteResults.innerHTML = "";
  
  const decryptedAnswer = window.antiCheat ? window.antiCheat.decrypt(encryptedAnswer) : answer;
  const isCorrect = levelName.toLowerCase().trim() === decryptedAnswer.toLowerCase().trim();
  
  attempts++;
  addGuess(levelName, isCorrect ? "correct" : "incorrect");
  updateAttemptsDisplay();
  
  if (isCorrect) {
    endGame(true);
  } else {
    previewTime += 2;
    updateTimeDisplay();
    loadReplay(); // Reload with new time
    
    if (attempts >= maxAttempts) {
      endGame(false);
    }
  }
  
  saveGameState();
}

// Add Guess
function addGuess(text, type) {
  const guess = document.createElement("div");
  guess.className = `guess-item ${type}`;
  
  const icon = document.createElement("span");
  icon.className = "guess-icon";
  icon.textContent = type === "correct" ? "✓" : type === "skip" ? "⏭" : "✗";
  
  const label = document.createElement("span");
  label.className = "guess-text";
  label.textContent = text;
  
  guess.appendChild(icon);
  guess.appendChild(label);
  guessesContainer.appendChild(guess);
}

// End Game
function endGame(won) {
  gameOver = true;
  
  skipBtn.disabled = true;
  guessInput.disabled = true;
  
  gameOverDiv.classList.remove("hidden");
  
  if (won) {
    resultMessage.textContent = `🎉 Correct! The level was: ${answerDisplay}`;
    resultMessage.className = "result-message win";
    
    if (gameMode === "infinite") {
      infiniteScore++;
      saveInfiniteScore();
      updateInfiniteScoreDisplay();
    }
  } else {
    resultMessage.textContent = `😔 Sorry! The level was: ${answerDisplay}`;
    resultMessage.className = "result-message lose";
    
    if (gameMode === "infinite" && infiniteScore > 0) {
      infiniteScore = 0;
      saveInfiniteScore();
      updateInfiniteScoreDisplay();
    }
  }
  
  if (gameMode === "daily") {
    const guessCount = won ? attempts : maxAttempts;
    saveStats(won, guessCount);
    saveGameState();
  }
  
  if (gameMode === "infinite") {
    resetBtn.style.display = "block";
  } else {
    resetBtn.style.display = "none";
  }
}

// Share
function shareResult() {
  const guesses = Array.from(guessesContainer.children);
  const squares = guesses.map(el => {
    if (el.classList.contains("correct")) return "🟩";
    if (el.classList.contains("skip")) return "⬜";
    return "⬛";
  }).join("");
  
  let text;
  if (gameMode === "infinite") {
    text = `Replayedle Infinite Mode\nScore: ${infiniteScore}\n${squares}\nhttps://yoursite.com/replayedle`;
  } else {
    text = `Replayedle ${dailyDate.split('T')[0]}\n${squares}\nhttps://yoursite.com/replayedle`;
  }
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Result copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy result");
    });
  } else {
    showToast("Clipboard not available");
  }
}

// Countdown
function updateCountdown() {
  const now = new Date();
  const estOffset = -5 * 60;
  const nowEST = new Date(now.getTime() + (estOffset + now.getTimezoneOffset()) * 60 * 1000);
  const tomorrow = new Date(nowEST);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const nextMidnightEST = new Date(tomorrow.getTime() - (estOffset + now.getTimezoneOffset()) * 60 * 1000);
  
  const diff = nextMidnightEST - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  countdownEl.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Toast
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Modals
function openModal(modal) {
  modal.classList.add("show");
  document.body.classList.add("modal-open");
  if (modal === statsModal) {
    displayStats();
  }
}

function closeModal(modal) {
  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

// Event Listeners
function setupEventListeners() {
  skipBtn.addEventListener("click", skipGuess);
  guessInput.addEventListener("input", handleInput);
  guessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && autocompleteResults.children.length > 0) {
      const firstResult = autocompleteResults.children[0];
      if (firstResult.textContent !== "No ranked levels found") {
        firstResult.click();
      }
    }
  });
  
  document.addEventListener("click", (e) => {
    if (!guessInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
      autocompleteResults.innerHTML = "";
    }
  });
  
  shareBtn.addEventListener("click", shareResult);
  
  if (modeBtn) modeBtn.addEventListener("click", () => openModal(modeModal));
  if (resetBtn) resetBtn.addEventListener("click", () => nextInfiniteLevel());
  
  document.querySelectorAll(".mode-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const mode = e.currentTarget.dataset.mode;
      switchMode(mode);
    });
  });
  
  helpBtn.addEventListener("click", () => openModal(helpModal));
  statsBtn.addEventListener("click", () => openModal(statsModal));
  themeBtn.addEventListener("click", toggleTheme);
  
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      closeModal(modal);
    });
  });
  
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(helpModal);
      closeModal(statsModal);
      closeModal(modeModal);
    }
  });
}
