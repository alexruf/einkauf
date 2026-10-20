// Lets the app open without a connection. Every request for the app's own
// files goes to the network first, so an online user always gets the latest
// deployed version without anyone bumping a cache version. The cached copy
// is only used when the network fails or takes too long.
//
// List data never passes through here: /api/ is not handled, and the page
// keeps the list in localStorage.
//
// Requests with cache mode "no-store" are not handled either. The app uses
// that mode to check which version is deployed: the answer must come from
// the server, and storing it would put a new version.js next to the old
// code, so the next offline start would run mixed versions.

const CACHE = 'einkauf-shell';
const NETWORK_TIMEOUT_MS = 3000;

const SHELL = [
  '/',
  '/app.css',
  '/manifest.webmanifest',
  '/js/app.js',
  '/js/app-name.js',
  '/js/entry.js',
  '/js/hold.js',
  '/js/ids.js',
  '/js/outbox.js',
  '/js/prefs.js',
  '/js/storage.js',
  '/js/suggest.js',
  '/js/sync.js',
  '/js/update.js',
  '/js/version.js',
  '/js/view.js',
  '/vendor/atkinson-hyperlegible-next.woff2',
  '/vendor/atkinson-hyperlegible-next-OFL.txt',
  '/vendor/pocketbase.es.mjs',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map((path) => new Request(path, { cache: 'reload' })));
      // Safe because nothing is versioned: the new worker serves the same
      // cache, and every file is fetched fresh anyway.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    request.cache === 'no-store' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_/')
  ) {
    return;
  }
  event.respondWith(networkFirst(event, request));
});

async function networkFirst(event, request) {
  const cache = await caches.open(CACHE);
  // The cache is keyed by URL alone, never by the request object. PocketBase
  // answers with "Vary: Origin", so a cached file only matches requests with
  // the same Origin header. The install stores files without one, but the
  // browser sends one for module scripts and fonts, so those would miss the
  // install's copy, and an app opened offline after its first visit would
  // not start.
  const key = request.url;
  // "no-cache" revalidates with the server instead of trusting the browser's
  // HTTP cache, which could otherwise hand out an old file.
  const network = fetch(request, { cache: 'no-cache' }).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(cache.put(key, copy));
    }
    return response;
  });

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, 'timeout'));
  const first = await Promise.race([network.catch(() => 'failed'), timeout]);
  if (first instanceof Response) return first;

  // Navigations to any path show the app, like PocketBase's index fallback.
  const cached =
    (await cache.match(key, { ignoreSearch: true })) ??
    (request.mode === 'navigate' ? await cache.match('/') : undefined);
  if (cached) return cached;
  // Nothing cached: keep waiting for the network, or fail like it does.
  return network;
}
