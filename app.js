(() => {
  "use strict";

  // ---------- Konfiguration ----------
  const ROUND_GOAL = 13;
  const STORAGE_KEY = "pluspunkte.state.v1";

  // ---------- Zustand ----------
  // Architektur-Hinweis: state ist bewusst als flaches, erweiterbares Objekt
  // gehalten. Für spätere Funktionen (Belohnungen, Verlauf, Statistiken)
  // können weitere Felder ergänzt werden, ohne bestehende Daten zu brechen.
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { round: 0, total: 0, history: [] };
      const parsed = JSON.parse(raw);
      return {
        round: Number.isInteger(parsed.round) ? parsed.round : 0,
        total: Number.isInteger(parsed.total) ? parsed.total : 0,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    } catch (e) {
      console.warn("Konnte gespeicherten Zustand nicht lesen, starte neu.", e);
      return { round: 0, total: 0, history: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  // ---------- DOM-Referenzen ----------
  const roundNumberEl = document.getElementById("roundNumber");
  const roundGoalEl = document.getElementById("roundGoal");
  const heartsRowEl = document.getElementById("heartsRow");
  const totalNumberEl = document.getElementById("totalNumber");
  const addBtn = document.getElementById("addBtn");
  const removeBtn = document.getElementById("removeBtn");
  const celebrateOverlay = document.getElementById("celebrateOverlay");
  const celebrateHearts = document.getElementById("celebrateHearts");
  const continueBtn = document.getElementById("continueBtn");

  roundGoalEl.textContent = String(ROUND_GOAL);

  // ---------- Herz-SVG ----------
  const HEART_PATH_D =
    "M16 27.2c-.5 0-1-.18-1.38-.53C9.6 22 4 16.9 4 11.6 4 7.6 7.1 4.6 10.9 4.6c2.02 0 3.9.94 5.1 2.46 " +
    "1.2-1.52 3.08-2.46 5.1-2.46 3.8 0 6.9 3 6.9 7 0 5.3-5.6 10.4-10.62 15.07-.38.35-.88.53-1.38.53z";

  function buildGradientDefs() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.setAttribute("aria-hidden", "true");
    const defs = document.createElementNS(svgNS, "defs");
    const grad = document.createElementNS(svgNS, "linearGradient");
    grad.setAttribute("id", "heartGradient");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");
    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#FF7CA3");
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#FF2D6A");
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);
    document.body.prepend(svg);
  }

  function makeHeartIcon() {
    const wrapper = document.createElement("div");
    wrapper.className = "heart-icon";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", HEART_PATH_D);
    path.setAttribute("class", "fill");
    svg.appendChild(path);
    wrapper.appendChild(svg);
    return wrapper;
  }

  // Herzreihe einmalig aufbauen
  const heartEls = [];
  function buildHeartsRow() {
    heartsRowEl.innerHTML = "";
    heartEls.length = 0;
    for (let i = 0; i < ROUND_GOAL; i++) {
      const el = makeHeartIcon();
      heartsRowEl.appendChild(el);
      heartEls.push(el);
    }
  }

  // ---------- Rendering ----------
  function render({ animateHeartIndex = null, bumpRound = false, bumpTotal = false } = {}) {
    roundNumberEl.textContent = String(state.round);
    totalNumberEl.textContent = String(state.total);

    heartEls.forEach((el, i) => {
      const shouldFill = i < state.round;
      el.classList.toggle("filled", shouldFill);
    });

    if (animateHeartIndex !== null && heartEls[animateHeartIndex]) {
      const el = heartEls[animateHeartIndex];
      el.classList.remove("pop");
      // reflow, damit die Animation bei erneutem Antippen neu startet
      void el.offsetWidth;
      el.classList.add("pop");
    }

    if (bumpRound) bump(roundNumberEl);
    if (bumpTotal) bump(totalNumberEl);

    removeBtn.disabled = state.round === 0;
  }

  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  // ---------- Aktionen ----------
  function addPoint() {
    if (state.round >= ROUND_GOAL) return; // Runde läuft gerade aus (Overlay offen)

    const newIndex = state.round;
    state.round += 1;
    state.total += 1;
    saveState();
    render({ animateHeartIndex: newIndex, bumpRound: true, bumpTotal: true });

    if (state.round >= ROUND_GOAL) {
      addBtn.disabled = true;
      setTimeout(showCelebration, 260);
    }
  }

  function removePoint() {
    if (state.round <= 0) return;
    state.round -= 1;
    if (state.total > 0) state.total -= 1;
    saveState();
    render({ bumpRound: true, bumpTotal: true });
  }

  function finishRound() {
    state.round = 0;
    saveState();
    hideCelebration();
    addBtn.disabled = false;
    render({ bumpRound: true });
  }

  // ---------- Feier-Overlay ----------
  const CONFETTI_COUNT = 22;
  const CONFETTI_EMOJI = ["❤️", "💗", "💕"];

  function showCelebration() {
    celebrateHearts.innerHTML = "";
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const span = document.createElement("span");
      span.className = "confetti-heart";
      span.textContent = CONFETTI_EMOJI[i % CONFETTI_EMOJI.length];
      const left = Math.random() * 100;
      const duration = 2.6 + Math.random() * 1.8;
      const delay = Math.random() * 0.6;
      const size = 16 + Math.random() * 14;
      span.style.left = left + "%";
      span.style.fontSize = size + "px";
      span.style.animationDuration = duration + "s";
      span.style.animationDelay = delay + "s";
      celebrateHearts.appendChild(span);
    }
    celebrateOverlay.hidden = false;
  }

  function hideCelebration() {
    celebrateOverlay.hidden = true;
    celebrateHearts.innerHTML = "";
  }

  // ---------- Events ----------
  addBtn.addEventListener("click", addPoint);
  removeBtn.addEventListener("click", removePoint);
  continueBtn.addEventListener("click", finishRound);

  // ---------- Start ----------
  buildGradientDefs();
  buildHeartsRow();

  // Falls die App mit bereits voller Runde geladen wird (z.B. Reload direkt
  // nach dem 13. Punkt, bevor "Weiter" gedrückt wurde), Button korrekt sperren.
  if (state.round >= ROUND_GOAL) {
    addBtn.disabled = true;
  }

  render();

  // ---------- Service Worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("Service Worker Registrierung fehlgeschlagen:", err);
      });
    });
  }
})();
