import { words, type Word } from "./words.ts";
import {
  defaultProductData,
  type CardMode,
  type CardRevealState,
} from "./data_structures.ts";

const getEl = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
};

const wordEl = getEl<HTMLDivElement>("word");
const readingEl = getEl<HTMLDivElement>("reading");
const meaningEl = getEl<HTMLDivElement>("meaning");
const progressEl = getEl<HTMLDivElement>("progress");
const favoriteBtn = getEl<HTMLButtonElement>("favoriteBtn");
const easyBtn = getEl<HTMLButtonElement>("easyBtn");
const appEl = getEl<HTMLElement>("app");
const cardEl = document.querySelector<HTMLElement>(".card");
if (!cardEl) {
  throw new Error("Missing card element");
}
const timerEl = getEl<HTMLDivElement>("timer");
const toastEl = getEl<HTMLDivElement>("toast");
const overlayEl = getEl<HTMLDivElement>("overlay");
const easyListEl = getEl<HTMLUListElement>("easyList");
const closePanel = getEl<HTMLButtonElement>("closePanel");
const easyTabBtn = getEl<HTMLButtonElement>("easyTab");
const favoriteTabBtn = getEl<HTMLButtonElement>("favoriteTab");
const rememberedTabBtn = getEl<HTMLButtonElement>("rememberedTab");
const counterEl = getEl<HTMLButtonElement>("counter");
const installBannerEl = getEl<HTMLDivElement>("installBanner");
const installBtn = getEl<HTMLButtonElement>("installBtn");
const installCloseBtn = getEl<HTMLButtonElement>("installClose");

const GROUP_SIZE = 10;
const REQUIRED_APPEARANCES = 3;
const COOKIE_DAYS = 365;

const getCookie = (name: string) => {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));
  if (!cookie) return "";
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
};

const setCookie = (name: string, value: string, days = COOKIE_DAYS) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/`;
};

const readCookieJSON = <T>(name: string, fallback: T): T => {
  const raw = getCookie(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

let scheduleIndex = 0;
let groupIndex = 0;
let appearanceCounts: Record<string, number> = {};
let currentWordId: string | null = null;
let lastSwipeAt = 0;
let isAnimating = false;
let lastSeenAt = Date.now();
let countdown = 20;
let countdownId: ReturnType<typeof setInterval> | null = null;
let panelMode: "remembered" | "easy" | "favorite" = "remembered";

const favorites = new Set<string>(readCookieJSON<string[]>("favoriteWords", []));
const easyWords = new Set<string>(readCookieJSON<string[]>("easyWords", []));
const rememberedWords = new Set<string>(
  readCookieJSON<string[]>("rememberedWords", []),
);
const studyTimes = readCookieJSON<Record<string, number>>("studyTimes", {});
let cardMode: CardMode = defaultProductData.cardMode;
let cardRevealState: CardRevealState = { ...defaultProductData.cardRevealState };
let activeCardWordId: string | null = null;
let studiedCount = Number(getCookie("studiedCount") || 0);

const getRememberedCount = () =>
  new Set([...easyWords, ...rememberedWords]).size;

if (!Number.isFinite(studiedCount) || studiedCount < getRememberedCount()) {
  studiedCount = getRememberedCount();
}

const initialState = readCookieJSON<{
  groupIndex: number;
  scheduleIndex: number;
  appearanceCounts: Record<string, number>;
}>("learningState", {
  groupIndex: 0,
  scheduleIndex: 0,
  appearanceCounts: {},
});

groupIndex = Number.isFinite(initialState.groupIndex)
  ? initialState.groupIndex
  : 0;

scheduleIndex = Number.isFinite(initialState.scheduleIndex)
  ? initialState.scheduleIndex
  : 0;

appearanceCounts = initialState.appearanceCounts || {};

const getGroupWords = (targetIndex: number) =>
  words.slice(targetIndex * GROUP_SIZE, targetIndex * GROUP_SIZE + GROUP_SIZE);

const buildSchedule = (groupWords: Word[]) => {
  const schedule: Word[] = [];
  for (let round = 0; round < REQUIRED_APPEARANCES; round += 1) {
    groupWords.forEach((word) => schedule.push(word));
  }
  return schedule;
};

let groupWords: Word[] = [];
let schedule: Word[] = [];

const rebuildGroupData = () => {
  groupWords = getGroupWords(groupIndex).filter(
    (word) => !easyWords.has(word.id) && !rememberedWords.has(word.id),
  );
  schedule = buildSchedule(groupWords);
  if (scheduleIndex >= schedule.length) {
    scheduleIndex = 0;
  }
};

rebuildGroupData();

if (scheduleIndex >= schedule.length) {
  scheduleIndex = 0;
}

const syncStorage = () => {
  studiedCount = getRememberedCount();
  setCookie("favoriteWords", JSON.stringify([...favorites]));
  setCookie("easyWords", JSON.stringify([...easyWords]));
  setCookie("rememberedWords", JSON.stringify([...rememberedWords]));
  setCookie("studyTimes", JSON.stringify(studyTimes));
  setCookie("studiedCount", String(studiedCount));
  setCookie(
    "learningState",
    JSON.stringify({ groupIndex, scheduleIndex, appearanceCounts }),
  );
};

const updateCounter = () => {
  if (!counterEl) return;
  studiedCount = getRememberedCount();
  counterEl.textContent = `已记 ${studiedCount}`;
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
  const word = schedule[scheduleIndex];
  if (!word) return;
  studyTimes[word.id] = (studyTimes[word.id] || 0) + elapsed;
  syncStorage();
};

const recordAppearance = (wordId: string) => {
  if (!wordId || currentWordId === wordId) return;
  currentWordId = wordId;
  appearanceCounts[wordId] = (appearanceCounts[wordId] || 0) + 1;
  syncStorage();
};

const showToast = (message: string) => {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
};

const updateRemembered = (wordId: string, remembered: boolean) => {
  if (remembered) {
    rememberedWords.add(wordId);
  } else {
    rememberedWords.delete(wordId);
  }
  updateCounter();
  syncStorage();
};

const restoreToActive = (
  wordId: string,
  type: "remembered" | "easy",
) => {
  if (type === "easy") {
    easyWords.delete(wordId);
    updateCounter();
    syncStorage();
  } else {
    updateRemembered(wordId, false);
  }
  rebuildGroupData();
  renderEasyList();
  render();
};

const removeFromFavorites = (wordId: string) => {
  favorites.delete(wordId);
  syncStorage();
  renderEasyList();
  render();
};

const renderEasyList = () => {
  easyListEl.innerHTML = "";
  let source = [];
  if (panelMode === "remembered") {
    source = words.filter((word) => rememberedWords.has(word.id));
  } else if (panelMode === "easy") {
    source = words.filter((word) => easyWords.has(word.id));
  } else {
    source = words.filter((word) => favorites.has(word.id));
  }

  if (source.length === 0) {
    const empty = document.createElement("li");
    empty.className = "panel-item";
    if (panelMode === "remembered") {
      empty.textContent = "暂无已记词";
    } else if (panelMode === "easy") {
      empty.textContent = "暂无简单词";
    } else {
      empty.textContent = "暂无收藏词";
    }
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
      if (panelMode === "favorite") {
        removeFromFavorites(word.id);
      } else {
        restoreToActive(word.id, panelMode);
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

const advanceGroup = () => {
  if ((groupIndex + 1) * GROUP_SIZE >= words.length) {
    schedule = [];
    groupWords = [];
    syncStorage();
    render();
    showToast("已完成全部分组");
    return;
  }
  groupIndex += 1;
  scheduleIndex = 0;
  appearanceCounts = {};
  rebuildGroupData();
  currentWordId = null;
  syncStorage();
  render();
  startCountdown();
  showToast(`进入第 ${groupIndex + 1} 组`);
  if (groupWords.length === 0) {
    advanceGroup();
  }
};

const checkGroupCompletion = () => {
  if (groupWords.length === 0) {
    advanceGroup();
  }
};

const handleAutoRemember = () => {
  const word = schedule[scheduleIndex];
  if (!word || easyWords.has(word.id) || rememberedWords.has(word.id)) {
    return false;
  }
  const seenCount = appearanceCounts[word.id] || 0;
  if (seenCount < REQUIRED_APPEARANCES) return false;
  updateRemembered(word.id, true);
  favorites.delete(word.id);
  rebuildGroupData();
  checkGroupCompletion();
  return true;
};

const resetCardReveal = (wordId: string) => {
  if (activeCardWordId !== wordId) {
    activeCardWordId = wordId;
    cardRevealState = {
      stage: cardMode === "full" ? "meaning" : "reading",
    };
  }
};

const applyCardReveal = (word: Word) => {
  if (cardRevealState.stage === "reading") {
    wordEl.textContent = "";
    readingEl.textContent = `${word.kana} (${word.romaji})`;
    meaningEl.textContent = "";
    return;
  }
  if (cardRevealState.stage === "kanji") {
    wordEl.textContent = word.kanji;
    readingEl.textContent = `${word.kana} (${word.romaji})`;
    meaningEl.textContent = "";
    return;
  }
  wordEl.textContent = word.kanji;
  readingEl.textContent = `${word.kana} (${word.romaji})`;
  meaningEl.textContent = word.meaning;
};

const advanceCardReveal = () => {
  if (cardMode === "full") return;
  if (cardRevealState.stage === "reading") {
    cardRevealState.stage = "kanji";
  } else if (cardRevealState.stage === "kanji") {
    cardRevealState.stage = "meaning";
  } else {
    cardRevealState.stage = "reading";
  }
  const word = schedule[scheduleIndex];
  if (word) {
    applyCardReveal(word);
  }
};

const render = () => {
  const word = schedule[scheduleIndex];
  if (!word) {
    wordEl.textContent = "已完成";
    readingEl.textContent = "所有分组已学习完成";
    meaningEl.textContent = "";
    progressEl.textContent = "0/0";
    timerEl.textContent = `倒计时 ${countdown}s`;
    favoriteBtn.classList.remove("active");
    easyBtn.classList.remove("active", "easy");
    favoriteBtn.setAttribute("aria-pressed", "false");
    easyBtn.setAttribute("aria-pressed", "false");
    activeCardWordId = null;
    cardRevealState = { stage: "reading" };
    return;
  }

  resetCardReveal(word.id);
  applyCardReveal(word);

  const positionInGroup =
    groupWords.findIndex((item) => item.id === word.id) + 1;
  progressEl.textContent = `第 ${groupIndex + 1} 组 ${positionInGroup}/${groupWords.length}`;
  timerEl.textContent = `倒计时 ${countdown}s`;

  favoriteBtn.classList.toggle("active", favorites.has(word.id));
  favoriteBtn.setAttribute("aria-pressed", favorites.has(word.id));

  easyBtn.classList.toggle("active", easyWords.has(word.id));
  easyBtn.classList.toggle("easy", easyWords.has(word.id));
  easyBtn.setAttribute("aria-pressed", easyWords.has(word.id));

  recordAppearance(word.id);
};

const canSwipe = () => {
  const now = Date.now();
  if (isAnimating || now - lastSwipeAt < 500) {
    return false;
  }
  lastSwipeAt = now;
  return true;
};

const animateToIndex = (direction) => {
  if (!canSwipe()) return;
  isAnimating = true;
  recordStudyTime();
  const removed = handleAutoRemember();
  if (schedule.length === 0) {
    isAnimating = false;
    render();
    return;
  }

  let nextIndex = scheduleIndex;
  if (direction === "up") {
    nextIndex = removed
      ? scheduleIndex % schedule.length
      : (scheduleIndex + 1) % schedule.length;
  } else {
    nextIndex = (scheduleIndex - 1 + schedule.length) % schedule.length;
  }

  const outClass = direction === "down" ? "slide-out-down" : "slide-out-up";
  const inClass = direction === "down" ? "slide-in-down" : "slide-in-up";

  cardEl.classList.remove("slide-in-up", "slide-in-down");
  cardEl.classList.add(outClass);

  const handleOut = () => {
    cardEl.classList.remove(outClass);
    cardEl.removeEventListener("animationend", handleOut);
    scheduleIndex = nextIndex;
    syncStorage();
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
  if (schedule.length === 0) return;
  animateToIndex("up");
};

const prevWord = () => {
  if (schedule.length === 0) return;
  animateToIndex("down");
};

favoriteBtn.addEventListener("click", () => {
  const word = schedule[scheduleIndex];
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
  const word = schedule[scheduleIndex];
  if (!word) return;

  if (easyWords.has(word.id)) {
    easyWords.delete(word.id);
    updateCounter();
    syncStorage();
    rebuildGroupData();
    renderEasyList();
    render();
    return;
  }

  easyWords.add(word.id);
  updateCounter();
  syncStorage();
  favorites.delete(word.id);
  rebuildGroupData();
  spawnParticles();
  renderEasyList();
  render();

  if (studiedCount % 10 === 0) {
    showToast("已经记住十个单词，再接再厉🎇");
  }

  checkGroupCompletion();
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

const setPanelMode = (mode) => {
  panelMode = mode;
  rememberedTabBtn.classList.toggle("active", mode === "remembered");
  easyTabBtn.classList.toggle("active", mode === "easy");
  favoriteTabBtn.classList.toggle("active", mode === "favorite");
  renderEasyList();
};

rememberedTabBtn.addEventListener("click", () => {
  setPanelMode("remembered");
});

easyTabBtn.addEventListener("click", () => {
  setPanelMode("easy");
});

favoriteTabBtn.addEventListener("click", () => {
  setPanelMode("favorite");
});

counterEl.addEventListener("click", () => {
  setPanelMode("remembered");
  overlayEl.classList.add("show");
  overlayEl.setAttribute("aria-hidden", "false");
});

cardEl.addEventListener("click", () => {
  advanceCardReveal();
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

updateCounter();
if (groupWords.length === 0) {
  checkGroupCompletion();
}
render();
renderEasyList();
startCountdown();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.ts");
  });
}

let deferredInstallPrompt = null;
const getTodayKey = () => new Date().toISOString().split("T")[0];

const shouldShowInstallPrompt = () => {
  const lastPrompt = getCookie("installPromptDate");
  const today = getTodayKey();
  if (lastPrompt === today) return false;
  setCookie("installPromptDate", today);
  return true;
};

const showInstallBanner = () => {
  if (!installBannerEl) return;
  installBannerEl.classList.add("show");
};

const hideInstallBanner = () => {
  if (!installBannerEl) return;
  installBannerEl.classList.remove("show");
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (shouldShowInstallPrompt()) {
    showInstallBanner();
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
});

if (installCloseBtn) {
  installCloseBtn.addEventListener("click", () => {
    hideInstallBanner();
  });
}

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("请使用浏览器菜单中的“添加到主屏幕”进行安装");
      hideInstallBanner();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

if (shouldShowInstallPrompt()) {
  showInstallBanner();
}
