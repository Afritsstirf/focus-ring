(() => {
  const CIRCUMFERENCE = 2 * Math.PI * 130; // 816.8...

  const modes = {
    focus: { label: "Focus", cssVar: "--accent-focus", minutesInputId: "focusMin" },
    short: { label: "Short Break", cssVar: "--accent-short", minutesInputId: "shortMin" },
    long: { label: "Long Break", cssVar: "--accent-long", minutesInputId: "longMin" },
  };

  function getModeColor(mode) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(modes[mode].cssVar)
      .trim();
  }

  const el = {
    modeTabs: document.getElementById("modeTabs"),
    ring: document.getElementById("ringProgress"),
    time: document.getElementById("timeDisplay"),
    sessionCount: document.getElementById("sessionCount"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    skipBtn: document.getElementById("skipBtn"),
    streak: document.getElementById("streak"),
    logList: document.getElementById("logList"),
    clearLogBtn: document.getElementById("clearLogBtn"),
    focusMin: document.getElementById("focusMin"),
    shortMin: document.getElementById("shortMin"),
    longMin: document.getElementById("longMin"),
    root: document.documentElement,
  };

  let state = {
    mode: "focus",
    remaining: getMinutes("focus") * 60,
    total: getMinutes("focus") * 60,
    running: false,
    timerId: null,
    focusCount: 0,
  };

  function getMinutes(mode) {
    const input = document.getElementById(modes[mode].minutesInputId);
    const val = parseInt(input && input.value, 10);
    return Number.isFinite(val) && val > 0 ? val : 25;
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function loadLog() {
    try {
      const raw = JSON.parse(localStorage.getItem("focusRingLog") || "{}");
      return raw[todayKey()] || [];
    } catch {
      return [];
    }
  }

  function saveLogEntry(entry) {
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem("focusRingLog") || "{}");
    } catch {
      raw = {};
    }
    const key = todayKey();
    raw[key] = raw[key] || [];
    raw[key].push(entry);
    localStorage.setItem("focusRingLog", JSON.stringify(raw));
  }

  function clearTodayLog() {
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem("focusRingLog") || "{}");
    } catch {
      raw = {};
    }
    raw[todayKey()] = [];
    localStorage.setItem("focusRingLog", JSON.stringify(raw));
    renderLog();
  }

  function renderLog() {
    const entries = loadLog();
    el.logList.innerHTML = "";
    entries
      .slice()
      .reverse()
      .forEach((entry) => {
        const li = document.createElement("li");
        li.className = "log-item";
        li.innerHTML = `
          <span class="kind">
            <span class="dot" style="background:${getModeColor(entry.mode)}"></span>
            ${modes[entry.mode].label}
          </span>
          <span class="time-stamp">${entry.time}</span>
        `;
        el.logList.appendChild(li);
      });
  }

  function updateStreak(didCompleteFocus) {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem("focusRingStreak") || "{}");
    } catch {
      data = {};
    }
    const today = todayKey();

    if (didCompleteFocus && data.lastFocusDay !== today) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterdayKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
      data.streak = data.lastFocusDay === yesterdayKey ? (data.streak || 0) + 1 : 1;
      data.lastFocusDay = today;
      localStorage.setItem("focusRingStreak", JSON.stringify(data));
    }

    renderStreak(data.streak || 0, data.lastFocusDay === today);
  }

  function renderStreak(count, activeToday) {
    el.streak.textContent = `🔥 ${count} day streak`;
    el.streak.style.opacity = activeToday || count === 0 ? "1" : "0.6";
  }

  function initStreakDisplay() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem("focusRingStreak") || "{}");
    } catch {
      data = {};
    }
    renderStreak(data.streak || 0, data.lastFocusDay === todayKey());
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function applyMode(mode, resetTime = true) {
    state.mode = mode;
    el.root.style.setProperty("--accent", getModeColor(mode));

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    if (resetTime) {
      state.total = getMinutes(mode) * 60;
      state.remaining = state.total;
    }
    updateDisplay();
  }

  function updateDisplay() {
    el.time.textContent = formatTime(state.remaining);
    const progress = 1 - state.remaining / state.total;
    el.ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    el.sessionCount.textContent =
      state.mode === "focus"
        ? `Session ${state.focusCount + 1}`
        : modes[state.mode].label;
  }

  function tick() {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      completeSession();
      return;
    }
    updateDisplay();
  }

  function completeSession() {
    stopTimer();
    playChime();

    const entry = {
      mode: state.mode,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    saveLogEntry(entry);
    renderLog();

    if (state.mode === "focus") {
      state.focusCount += 1;
      updateStreak(true);
      const nextMode = state.focusCount % 4 === 0 ? "long" : "short";
      applyMode(nextMode);
    } else {
      applyMode("focus");
    }

    state.remaining = state.total;
    updateDisplay();
  }

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      /* audio not available */
    }
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    el.startBtn.textContent = "Pause";
    state.timerId = setInterval(tick, 1000);
  }

  function pauseTimer() {
    state.running = false;
    el.startBtn.textContent = "Start";
    clearInterval(state.timerId);
  }

  function stopTimer() {
    state.running = false;
    el.startBtn.textContent = "Start";
    clearInterval(state.timerId);
  }

  function resetTimer() {
    stopTimer();
    state.total = getMinutes(state.mode) * 60;
    state.remaining = state.total;
    updateDisplay();
  }

  function skipSession() {
    stopTimer();
    if (state.mode === "focus") {
      state.focusCount += 1;
      const nextMode = state.focusCount % 4 === 0 ? "long" : "short";
      applyMode(nextMode);
    } else {
      applyMode("focus");
    }
    state.remaining = state.total;
    updateDisplay();
  }

  el.modeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;
    stopTimer();
    applyMode(btn.dataset.mode);
  });

  el.startBtn.addEventListener("click", () => {
    state.running ? pauseTimer() : startTimer();
  });

  el.resetBtn.addEventListener("click", resetTimer);
  el.skipBtn.addEventListener("click", skipSession);
  el.clearLogBtn.addEventListener("click", clearTodayLog);

  [el.focusMin, el.shortMin, el.longMin].forEach((input) => {
    input.addEventListener("change", () => {
      if (!state.running) {
        const modeForInput = Object.keys(modes).find(
          (m) => modes[m].minutesInputId === input.id
        );
        if (modeForInput === state.mode) {
          resetTimer();
        }
      }
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.running) {
      // resync display in case of throttled background tab
      updateDisplay();
    }
  });

  applyMode("focus");
  initStreakDisplay();
  renderLog();
})();
