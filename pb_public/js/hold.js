// Keeps rows in place for a moment after the user's own check-off or
// un-check, so the next tap does not land on a row that just moved away.
// For each held item it remembers the sort key the item had before the
// first tap; view.js sorts by that key while the item is held. Every toggle
// restarts one shared timer, so a quick series of taps settles together.
// A pinned item (one being edited) stays held until it is unpinned.

// Long enough to tap the next item or undo a mistaken tap, short enough
// that the list settles while the user still looks at it.
const DELAY_MS = 1500;

export function createHold({ setTimeout, clearTimeout, onRelease, delay = DELAY_MS }) {
  const keys = new Map();
  const pinned = new Set();
  let timer = null;

  const restart = () => {
    clearTimeout(timer);
    timer = setTimeout(release, delay);
  };

  function release() {
    timer = null;
    for (const id of keys.keys()) if (!pinned.has(id)) keys.delete(id);
    onRelease();
  }

  return {
    // id: the toggled item; key: { checked, checkedAt } as shown before.
    toggle(id, key) {
      if (!keys.has(id)) keys.set(id, key);
      restart();
    },

    pin(id, key) {
      if (!keys.has(id)) keys.set(id, key);
      pinned.add(id);
    },

    unpin(id) {
      pinned.delete(id);
      restart();
    },

    // The held sort keys by item id, for buildRows.
    keys() {
      return new Map(keys);
    },
  };
}
