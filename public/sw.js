const CACHE = "rent-room-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/file.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Never let the cache serve navigations or API/cross-origin requests.
  // Navigation (page shell) should be network-first so the report always
  // gets the latest build/data, falling back to cache only when offline.
  const isNavigation = request.mode === "navigate";
  const isCrossOrigin = url.origin !== location.origin;

  if (isCrossOrigin) {
    // Pass Supabase/Auth/analytics straight through — don't cache.
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (isNavigation) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: stale-while-revalidate so the shell stays fast but fresh.
  e.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});