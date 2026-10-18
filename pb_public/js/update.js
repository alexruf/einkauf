// Decides when a running app reloads to pick up a newly deployed version. The
// app fetches version.js fresh from the server and hands its text here; the
// DOM side only says whether an entry is in progress.

// The same line scripts/release.sh writes and reads.
const VERSION_LINE = /^export const VERSION = '([^']+)';$/m;

// The version the app last reloaded for, so a reload that still yields the
// old code is not repeated.
const KEY = 'einkauf-reloaded-for';

// Returns the version in the text of version.js, or null for anything else.
export function parseVersion(text) {
  if (typeof text !== 'string') return null;
  return text.match(VERSION_LINE)?.[1] ?? null;
}

// `running` is the version of the code on the device. `backend` is anything
// with the sessionStorage interface; its lifetime limits the loop guard to
// one tab or app window.
export function createUpdater({ running, backend }) {
  let pending = null;

  return {
    // Called with every version found on the server.
    found(deployed) {
      if (deployed && deployed !== running && deployed !== backend.getItem(KEY)) pending = deployed;
    },

    // True when the app should reload now. `busy` is true while an entry is
    // in progress; the reload then waits for a later call.
    takeReload(busy) {
      if (!pending || busy) return false;
      backend.setItem(KEY, pending);
      pending = null;
      return true;
    },
  };
}
