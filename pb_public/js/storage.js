// Keeps the last known list and the pending changes on the device. All data
// belongs to one user: it is discarded when someone else logs in or on
// logout, but kept when only the session expired, so the same user can log in
// again and sync.

const KEY = 'einkauf';

// `backend` is anything with the localStorage interface.
export function createStore(backend) {
  const read = () => {
    const raw = backend.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  };
  const write = (data) => backend.setItem(KEY, JSON.stringify(data));

  return {
    // The id of the user the stored data belongs to, or null.
    owner() {
      return read()?.userId ?? null;
    },

    // Makes `userId` the owner. Data of a different user is discarded first.
    claim(userId) {
      const data = read();
      if (data?.userId !== userId) write({ userId });
    },

    get(name) {
      return read()?.[name];
    },

    set(name, value) {
      const data = read();
      if (!data) throw new Error(`Cannot store "${name}" before a user has claimed the storage`);
      write({ ...data, [name]: value });
    },

    clear() {
      backend.removeItem(KEY);
    },
  };
}
