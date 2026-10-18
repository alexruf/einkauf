// Settings of this device, such as whether the "Erledigt" section is open.
// They are not user data, so they live under their own key and survive
// logout, like the app name.

const KEY = 'einkauf-prefs';

// `backend` is anything with the localStorage interface.
export function createPrefs(backend) {
  const read = () => {
    try {
      return JSON.parse(backend.getItem(KEY)) ?? {};
    } catch (error) {
      // A broken value only costs the remembered settings, so start over.
      console.warn('Ignoring unreadable device settings', error);
      return {};
    }
  };
  const write = (name, value) => backend.setItem(KEY, JSON.stringify({ ...read(), [name]: value }));

  return {
    // Collapsed unless the user opened it on this device.
    doneOpen() {
      return read().doneOpen === true;
    },

    setDoneOpen(open) {
      write('doneOpen', Boolean(open));
    },
  };
}
