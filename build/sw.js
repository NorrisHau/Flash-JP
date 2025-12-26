"use strict";
/// <reference lib="webworker" />
const CACHE_NAME = "flash-jp-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./build/app.js",
    "./build/words.js",
    "./build/data_structures.js",
    "./manifest.json",
];
const sw = self;
sw.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
sw.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)))));
});
sw.addEventListener("fetch", (event) => {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
