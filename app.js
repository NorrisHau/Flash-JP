const words = [
  { kanji: "桜", kana: "さくら", romaji: "sakura", meaning: "樱花" },
  { kanji: "海", kana: "うみ", romaji: "umi", meaning: "大海" },
  { kanji: "空", kana: "そら", romaji: "sora", meaning: "天空" },
  { kanji: "光", kana: "ひかり", romaji: "hikari", meaning: "光" },
  { kanji: "旅", kana: "たび", romaji: "tabi", meaning: "旅行" },
  { kanji: "星", kana: "ほし", romaji: "hoshi", meaning: "星星" },
];

const wordEl = document.getElementById("word");
const readingEl = document.getElementById("reading");
const meaningEl = document.getElementById("meaning");
const progressEl = document.getElementById("progress");
const favoriteBtn = document.getElementById("favoriteBtn");
const easyBtn = document.getElementById("easyBtn");
const appEl = document.getElementById("app");

let index = 0;
const favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
const easyWords = new Set(JSON.parse(localStorage.getItem("easyWords") || "[]"));

const syncStorage = () => {
  localStorage.setItem("favorites", JSON.stringify([...favorites]));
  localStorage.setItem("easyWords", JSON.stringify([...easyWords]));
};

const render = () => {
  const word = words[index];
  wordEl.textContent = word.kanji;
  readingEl.textContent = `${word.kana} (${word.romaji})`;
  meaningEl.textContent = word.meaning;
  progressEl.textContent = `${index + 1}/${words.length}`;

  const key = String(index);
  favoriteBtn.classList.toggle("active", favorites.has(key));
  favoriteBtn.setAttribute("aria-pressed", favorites.has(key));

  easyBtn.classList.toggle("active", easyWords.has(key));
  easyBtn.classList.toggle("easy", easyWords.has(key));
  easyBtn.setAttribute("aria-pressed", easyWords.has(key));

  appEl.querySelector(".card").style.animation = "none";
  requestAnimationFrame(() => {
    appEl.querySelector(".card").style.animation = "fadeIn 0.4s ease";
  });
};

const nextWord = () => {
  index = (index + 1) % words.length;
  render();
};

const prevWord = () => {
  index = (index - 1 + words.length) % words.length;
  render();
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
