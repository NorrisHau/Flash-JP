const words = [
  { kanji: "桜", kana: "さくら", romaji: "sakura", meaning: "樱花" },
  { kanji: "海", kana: "うみ", romaji: "umi", meaning: "大海" },
  { kanji: "空", kana: "そら", romaji: "sora", meaning: "天空" },
  { kanji: "光", kana: "ひかり", romaji: "hikari", meaning: "光" },
  { kanji: "旅", kana: "たび", romaji: "tabi", meaning: "旅行" },
  { kanji: "星", kana: "ほし", romaji: "hoshi", meaning: "星星" },
  { kanji: "風", kana: "かぜ", romaji: "kaze", meaning: "风" },
  { kanji: "雨", kana: "あめ", romaji: "ame", meaning: "雨" },
  { kanji: "雪", kana: "ゆき", romaji: "yuki", meaning: "雪" },
  { kanji: "森", kana: "もり", romaji: "mori", meaning: "森林" },
  { kanji: "花火", kana: "はなび", romaji: "hanabi", meaning: "烟花" },
  { kanji: "夜", kana: "よる", romaji: "yoru", meaning: "夜晚" },
  { kanji: "朝", kana: "あさ", romaji: "asa", meaning: "清晨" },
  { kanji: "山", kana: "やま", romaji: "yama", meaning: "山" },
  { kanji: "川", kana: "かわ", romaji: "kawa", meaning: "河流" },
  { kanji: "道", kana: "みち", romaji: "michi", meaning: "道路" },
  { kanji: "友達", kana: "ともだち", romaji: "tomodachi", meaning: "朋友" },
  { kanji: "笑顔", kana: "えがお", romaji: "egao", meaning: "笑脸" },
  { kanji: "希望", kana: "きぼう", romaji: "kibou", meaning: "希望" },
  { kanji: "未来", kana: "みらい", romaji: "mirai", meaning: "未来" },
];

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

let index = 0;
const favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
const easyWords = new Set(JSON.parse(localStorage.getItem("easyWords") || "[]"));
const studyTimes = JSON.parse(localStorage.getItem("studyTimes") || "{}");
let lastSwipeAt = 0;
let isAnimating = false;
let lastSeenAt = Date.now();
let countdown = 20;
let countdownId = null;
let studiedCount = Number(localStorage.getItem("studiedCount") || 0);

const syncStorage = () => {
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
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
  const key = String(index);
  studyTimes[key] = (studyTimes[key] || 0) + elapsed;
  syncStorage();
};

const showToast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
};

const render = () => {
  const word = words[index];
  wordEl.textContent = word.kanji;
  readingEl.textContent = `${word.kana} (${word.romaji})`;
  meaningEl.textContent = word.meaning;
  progressEl.textContent = `${index + 1}/${words.length}`;
  timerEl.textContent = `倒计时 ${countdown}s`;

  const key = String(index);
  favoriteBtn.classList.toggle("active", favorites.has(key));
  favoriteBtn.setAttribute("aria-pressed", favorites.has(key));

  easyBtn.classList.toggle("active", easyWords.has(key));
  easyBtn.classList.toggle("easy", easyWords.has(key));
  easyBtn.setAttribute("aria-pressed", easyWords.has(key));
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
  const nextIndex = (index + 1) % words.length;
  animateToIndex(nextIndex, "up");
};

const prevWord = () => {
  const prevIndex = (index - 1 + words.length) % words.length;
  animateToIndex(prevIndex, "down");
};

favoriteBtn.addEventListener("click", () => {
  const key = String(index);
  if (favorites.has(key)) {
    favorites.delete(key);
  } else {
    favorites.add(key);
  }
  syncStorage();
  render();
});

easyBtn.addEventListener("click", () => {
  const key = String(index);
  if (easyWords.has(key)) {
    easyWords.delete(key);
  } else {
    easyWords.add(key);
  }
  syncStorage();
  render();
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
startCountdown();
