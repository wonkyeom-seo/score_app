self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/manifest.webmanifest" || url.pathname === "/service-worker.js") return;

  event.respondWith(
    fetch(request).catch(() => {
      return new Response("", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Cache-Control": "no-store" }
      });
    })
  );
});
