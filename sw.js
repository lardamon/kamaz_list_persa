const CACHE = "hero_list_v5";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/background.png",
  "./assets/icons/shield_minus.svg",
  "./assets/icons/shield_plus.svg",
  "./assets/icons/life_bar.svg",
  "./assets/icons/hearts.svg",
  "./assets/icons/eternal_love.svg",
  "./assets/icons/shield.svg",
  "./assets/icons/wingfoot.svg",
  "./assets/icons/mailed_fist.svg",
  "./assets/icons/swords_power.svg",
  "./assets/icons/dice_fire.svg",
  "./assets/icons/biceps.svg",
  "./assets/icons/body_balance.svg",
  "./assets/icons/muscular_torso.svg",
  "./assets/icons/spell_book.svg",
  "./assets/icons/wisdom.svg",
  "./assets/icons/woman_elf.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});