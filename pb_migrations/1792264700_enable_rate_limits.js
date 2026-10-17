/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const settings = app.settings();

  // A strict limit on password, OTP and OAuth2 logins slows down password
  // guessing. Everything else gets one generous limit that a family never
  // reaches. There is deliberately no separate limit for creating records,
  // because syncing a long offline session sends many creates at once.
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = [
    { label: "*:auth", audience: "", duration: 60, maxRequests: 10 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
  ];

  // Behind Traefik every request comes from Traefik's address. Traefik
  // appends the real client address as the rightmost X-Forwarded-For entry;
  // entries left of it are sent by the client and can be forged.
  settings.trustedProxy.headers = ["X-Forwarded-For"];
  settings.trustedProxy.useLeftmostIP = false;

  app.save(settings);
}, (app) => {
  // Restore the defaults of PocketBase 0.40.5.
  const settings = app.settings();
  settings.rateLimits.enabled = false;
  settings.rateLimits.rules = [
    { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
    { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
    { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
  ];
  settings.trustedProxy.headers = [];
  settings.trustedProxy.useLeftmostIP = false;
  app.save(settings);
});
