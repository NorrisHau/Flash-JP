const wordEl = document.getElementById("word");
const readingEl = document.getElementById("reading");
const meaningEl = document.getElementById("meaning");
const progressEl = document.getElementById("progress");
const favoriteBtn = document.getElementById("favoriteBtn");
const easyBtn = document.getElementById("easyBtn");
const appEl = document.getElementById("app");
const cardEl = document.querySelector(".card");
const timerEl = document.getElementById("timer");
const toastEl = document.getElementById("toast");
const overlayEl = document.getElementById("overlay");
const easyListEl = document.getElementById("easyList");
const moreBtn = document.getElementById("moreBtn");
const closePanel = document.getElementById("closePanel");
const easyTabBtn = document.getElementById("easyTab");
const favoriteTabBtn = document.getElementById("favoriteTab");

let index = 0;
const favorites = new Set(
  JSON.parse(localStorage.getItem("favoriteWords") || "[]"),
);
const easyWords = new Set(JSON.parse(localStorage.getItem("easyWords") || "[]"));
const studyTimes = JSON.parse(localStorage.getItem("studyTimes") || "{}");
let lastSwipeAt = 0;
let isAnimating = false;
let lastSeenAt = Date.now();
let countdown = 20;
let countdownId = null;
let studiedCount = Number(localStorage.getItem("studiedCount") || 0);
let activeWords = words.filter((word) => !easyWords.has(word.id));
let panelMode = "easy";

const syncStorage = () => {
  localStorage.setItem("favoriteWords", JSON.stringify([...favorites]));
  localStorage.setItem("easyWords", JSON.stringify([...easyWords]));
  localStorage.setItem("studyTimes", JSON.stringify(studyTimes));
  localStorage.setItem("studiedCount", String(studiedCount));
};

const startCountdown = () => {
  clearInterval(countdownId);
  countdown = 20;
  timerEl.textContent = `倒计时 ${countdown}s`;
  lastSeenAt = Date.now();
  countdownId = setInterval(() => {
    countdown -= 1;
    if (countdown <= 0) {
      countdown = 0;
      clearInterval(countdownId);
    }
    timerEl.textContent = `倒计时 ${countdown}s`;
  }, 1000);
};

const recordStudyTime = () => {
  const elapsed = Math.max(0, Math.round((Date.now() - lastSeenAt) / 1000));
  const word = activeWords[index];
  if (!word) return;
  studyTimes[word.id] = (studyTimes[word.id] || 0) + elapsed;
  syncStorage();
};

const showToast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
};

const restoreToActive = (wordId) => {
  const target = words.find((item) => item.id === wordId);
  if (!target) return;
  if (easyWords.has(wordId)) {
    easyWords.delete(wordId);
  }
  if (!activeWords.some((item) => item.id === wordId)) {
    activeWords.push(target);
  }
  syncStorage();
  renderEasyList();
  render();
};

const removeFromFavorites = (wordId) => {
  favorites.delete(wordId);
  syncStorage();
  renderEasyList();
  render();
};

const renderEasyList = () => {
  easyListEl.innerHTML = "";
  const source = panelMode === "easy"
    ? words.filter((word) => easyWords.has(word.id))
    : words.filter((word) => favorites.has(word.id));

  if (source.length === 0) {
    const empty = document.createElement("li");
    empty.className = "panel-item";
    empty.textContent = panelMode === "easy" ? "暂无简单词" : "暂无收藏词";
    easyListEl.appendChild(empty);
    return;
  }

  source.forEach((word) => {
    const item = document.createElement("li");
    item.className = "panel-item";

    const text = document.createElement("div");
    text.className = "panel-text";
    text.textContent = `${word.kanji} ${word.kana} (${word.romaji})`;

    const action = document.createElement("button");
    action.className = "panel-action";
    action.type = "button";
    action.setAttribute("aria-label", "移除");
    action.textContent = "✕";
    action.addEventListener("click", () => {
      if (panelMode === "easy") {
        restoreToActive(word.id);
      } else {
        removeFromFavorites(word.id);
      }
    });

    item.appendChild(text);
    item.appendChild(action);
    easyListEl.appendChild(item);
  });
};

const spawnParticles = () => {
  const rect = cardEl.getBoundingClientRect();
  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    const size = 4 + Math.random() * 6;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 80}px`;
    particle.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * 40}px`;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 120}px`);
    particle.style.setProperty("--y", `${-40 - Math.random() * 80}px`);
    document.body.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove(), {
      once: true,
    });
  }
};

const render = () => {
  const word = activeWords[index];
  if (!word) {
    wordEl.textContent = "已完成";
    readingEl.textContent = "请在更多中查看简单词";
    meaningEl.textContent = "";
    progressEl.textContent = `0/${words.length}`;
    timerEl.textContent = `倒计时 ${countdown}s`;
    favoriteBtn.classList.remove("active");
    easyBtn.classList.remove("active", "easy");
    favoriteBtn.setAttribute("aria-pressed", "false");
    easyBtn.setAttribute("aria-pressed", "false");
    return;
  }

  wordEl.textContent = word.kanji;
  readingEl.textContent = `${word.kana} (${word.romaji})`;
  meaningEl.textContent = word.meaning;
  progressEl.textContent = `${index + 1}/${activeWords.length}`;
  timerEl.textContent = `倒计时 ${countdown}s`;

  favoriteBtn.classList.toggle("active", favorites.has(word.id));
  favoriteBtn.setAttribute("aria-pressed", favorites.has(word.id));

  easyBtn.classList.toggle("active", easyWords.has(word.id));
  easyBtn.classList.toggle("easy", easyWords.has(word.id));
  easyBtn.setAttribute("aria-pressed", easyWords.has(word.id));
};

const canSwipe = () => {
  const now = Date.now();
  if (isAnimating || now - lastSwipeAt < 500) {
    return false;
  }
  lastSwipeAt = now;
  return true;
};

const animateToIndex = (nextIndex, direction) => {
  if (!canSwipe()) return;
  isAnimating = true;
  recordStudyTime();
  studiedCount += 1;
  if (studiedCount % 10 === 0) {
    showToast("已经背诵十个单词，再接再厉🎇");
  }

  const outClass = direction === "down" ? "slide-out-down" : "slide-out-up";
  const inClass = direction === "down" ? "slide-in-down" : "slide-in-up";

  cardEl.classList.remove("slide-in-up", "slide-in-down");
  cardEl.classList.add(outClass);

  const handleOut = () => {
    cardEl.classList.remove(outClass);
    cardEl.removeEventListener("animationend", handleOut);
    index = nextIndex;
    render();
    startCountdown();
    cardEl.classList.add(inClass);
    cardEl.addEventListener(
      "animationend",
      () => {
        cardEl.classList.remove(inClass);
        isAnimating = false;
      },
      { once: true },
    );
  };

  cardEl.addEventListener("animationend", handleOut, { once: true });
};

const nextWord = () => {
  if (activeWords.length === 0) return;
  const nextIndex = (index + 1) % activeWords.length;
  animateToIndex(nextIndex, "up");
};

const prevWord = () => {
  if (activeWords.length === 0) return;
  const prevIndex = (index - 1 + activeWords.length) % activeWords.length;
  animateToIndex(prevIndex, "down");
};

favoriteBtn.addEventListener("click", () => {
  const word = activeWords[index];
  if (!word) return;
  if (favorites.has(word.id)) {
    favorites.delete(word.id);
  } else {
    favorites.add(word.id);
  }
  syncStorage();
  render();
});

easyBtn.addEventListener("click", () => {
  const word = activeWords[index];
  if (!word) return;
  easyWords.add(word.id);
  favorites.delete(word.id);
  activeWords = activeWords.filter((item) => item.id !== word.id);
  spawnParticles();
  if (index >= activeWords.length) {
    index = Math.max(0, activeWords.length - 1);
  }
  syncStorage();
  renderEasyList();
  render();
});

moreBtn.addEventListener("click", () => {
  renderEasyList();
  overlayEl.classList.add("show");
  overlayEl.setAttribute("aria-hidden", "false");
});

closePanel.addEventListener("click", () => {
  overlayEl.classList.remove("show");
  overlayEl.setAttribute("aria-hidden", "true");
});

overlayEl.addEventListener("click", (event) => {
  if (event.target === overlayEl) {
    overlayEl.classList.remove("show");
    overlayEl.setAttribute("aria-hidden", "true");
  }
});

easyTabBtn.addEventListener("click", () => {
  panelMode = "easy";
  easyTabBtn.classList.add("active");
  favoriteTabBtn.classList.remove("active");
  renderEasyList();
});

favoriteTabBtn.addEventListener("click", () => {
  panelMode = "favorite";
  favoriteTabBtn.classList.add("active");
  easyTabBtn.classList.remove("active");
  renderEasyList();
});

let touchStartY = 0;

appEl.addEventListener("touchstart", (event) => {
  touchStartY = event.touches[0].clientY;
});

appEl.addEventListener("touchend", (event) => {
  const touchEndY = event.changedTouches[0].clientY;
  const delta = touchStartY - touchEndY;
  if (Math.abs(delta) < 50) return;
  if (delta > 0) {
    nextWord();
  } else {
    prevWord();
  }
});

appEl.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaY) < 30) return;
  if (event.deltaY > 0) {
    nextWord();
  } else {
    prevWord();
  }
});

render();
renderEasyList();
startCountdown();
