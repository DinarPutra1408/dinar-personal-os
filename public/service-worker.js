const CACHE = "dinar-os-v2";

const SHELL = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Jangan cache chrome-extension, browser extension, dll
  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    return;
  }

  // Jangan cache API
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Jangan cache request dari domain lain
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Hanya cache response yang valid
        if (
          !response ||
          response.status !== 200 ||
          response.type === "opaque"
        ) {
          return response;
        }

        const responseClone = response.clone();

        caches
          .open(CACHE)
          .then((cache) => {
            cache.put(
              request,
              responseClone
            );
          })
          .catch(() => {});

        return response;
      })
      .catch(async () => {
        const cached =
          await caches.match(
            request
          );

        if (cached) {
          return cached;
        }

        throw new Error(
          "Network unavailable"
        );
      })
  );
});