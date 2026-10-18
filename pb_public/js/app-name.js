// Remembers the application name from the server settings, so the app shows
// it right away on the next start and also offline. The name is not user
// data, so it lives under its own key and survives logout.

const KEY = 'einkauf-app-name';
const FALLBACK = 'Einkauf';

// `backend` is anything with the localStorage interface.
export function createAppName(backend) {
  return {
    get() {
      return backend.getItem(KEY) ?? FALLBACK;
    },

    // Ignores anything that is not a usable name, so a broken server
    // response can never blank out the header.
    remember(name) {
      if (typeof name === 'string' && name.trim()) backend.setItem(KEY, name);
    },
  };
}
