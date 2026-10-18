// DOM wiring. The logic lives in the other modules, which are tested without
// a browser.

import PocketBase from '/vendor/pocketbase.es.mjs';
import { newId } from './ids.js';
import { createStore } from './storage.js';
import { createAppName } from './app-name.js';
import { createOutbox } from './outbox.js';
import { buildRows, connectionIndicator, logoutQuestion, syncIndicator } from './view.js';
import { createSync } from './sync.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);

const pb = new PocketBase('/');
// The SDK cancels a request when an identical one starts, which would turn
// overlapping list reloads into errors.
pb.autoCancellation(false);

const appName = createAppName(localStorage);
const store = createStore(localStorage);
const outbox = createOutbox(store);
const sync = createSync({
  pb,
  store,
  outbox,
  onChange: render,
  onOffline: () => setConnection('offline'),
  onAuthError: () => endSession('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'),
  onRejected: () => showNotice('Eine Änderung wurde vom Server abgelehnt und verworfen.'),
});

// 'connecting' until the realtime connection is established or a request
// fails. Deleting is only offered while 'online'.
let connection = 'connecting';
let notice = '';
let noticeTimer;

const currentUser = () => (pb.authStore.isValid && pb.authStore.record?.collectionName === 'users' ? pb.authStore.record : null);

// Screens

function showAppName() {
  $('app-name').textContent = appName.get();
  document.title = appName.get();
}

// Without a connection the remembered name stays. That is not worth a
// message, because the connection state is already shown.
async function loadAppName() {
  try {
    const { name } = await pb.send('/api/einkauf/app-name', {});
    appName.remember(name);
    showAppName();
  } catch (error) {
    console.warn('Loading the app name failed', error);
  }
}

function showLogin(hint = '') {
  closeAccountMenu();
  $('list-screen').hidden = true;
  $('account').hidden = true;
  $('login-screen').hidden = false;
  $('login-hint').textContent = hint;
  $('login-hint').hidden = !hint;
  $('login-error').hidden = true;
  $('items').replaceChildren();
  renderStatus();
}

function showList(user) {
  $('login-screen').hidden = true;
  $('list-screen').hidden = false;
  $('account').hidden = false;
  showUserName(user);
  render();
}

// In the header and in the account menu.
function showUserName(user) {
  $('user-name').textContent = user.name;
  $('menu-user-name').textContent = user.name;
}

function setConnection(state) {
  // Realtime kept the list current until now, so it counts as synced.
  if (connection === 'online' && state !== 'online' && currentUser()) sync.markSynced();
  connection = state;
  render();
}

// A short network loss does not always break the realtime stream, so no new
// PB_CONNECT arrives afterwards. A flush that reached the server while the
// stream is still up shows that the app is online again.
async function flush() {
  const outcome = await sync.flush();
  if (outcome !== 'done' || !currentUser()) return;
  if (pb.realtime.isConnected) setConnection('online');
  else if (realtimeGaveUp) connectRealtime();
}

function showNotice(text) {
  notice = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice = '';
    renderStatus();
  }, 6000);
  renderStatus();
}

function renderStatus() {
  const loggedIn = !$('list-screen').hidden;
  const text = notice || (loggedIn && connection === 'offline' ? 'Offline – Änderungen werden später übertragen.' : '');
  $('status').textContent = text;
  $('status').hidden = !text;
  renderIndicator($('connection-indicator'), loggedIn && connectionIndicator(connection));
  renderIndicator(
    $('sync-indicator'),
    loggedIn && syncIndicator({ connection, pending: outbox.list().length, lastSync: store.get('lastSync'), now: new Date() }),
  );
}

// `indicator` is { state, text }, or false to hide the element.
function renderIndicator(element, indicator) {
  element.hidden = !indicator;
  if (!indicator) return;
  element.dataset.state = indicator.state;
  element.querySelector('.indicator-text').textContent = indicator.text;
}

// List

function render() {
  renderStatus();
  const user = currentUser();
  if (!user || $('list-screen').hidden) return;

  const focusedId = document.activeElement?.closest?.('.item')?.dataset.id;
  const focusedClass = document.activeElement?.className;

  const rows = buildRows(store.get('snapshot'), outbox.list(), user.id);
  const template = $('item-template').content;
  const elements = rows.map((row) => {
    const li = template.firstElementChild.cloneNode(true);
    li.dataset.id = row.id;
    li.classList.toggle('is-checked', row.checked);
    li.classList.toggle('is-pending', row.pending);
    if (row.claim) li.dataset.claim = row.claim;
    // Item text is user input: only ever set it as text, never as HTML.
    li.querySelector('.text').textContent = row.text;
    li.querySelector('.meta').textContent = row.meta;
    const checkbox = li.querySelector('input');
    checkbox.checked = row.checked;
    checkbox.addEventListener('change', () => setChecked(row.id, checkbox.checked));
    const del = li.querySelector('.delete');
    del.disabled = connection !== 'online' || row.pending;
    del.title = connection === 'online' ? 'Löschen' : 'Löschen ist nur online möglich';
    del.addEventListener('click', () => requestDelete(row));
    li.querySelector('.edit').addEventListener('click', () => requestEdit(row));
    const claim = li.querySelector('.claim');
    claim.hidden = row.checked;
    const claimLabel = claimButtonLabel(row);
    claim.setAttribute('aria-label', claimLabel);
    claim.title = claimLabel;
    // A tap removes any claim, whoever made it, and claims an unclaimed item.
    claim.addEventListener('click', () => setClaimed(row.id, !row.claim));
    return li;
  });
  $('items').replaceChildren(...elements);
  $('empty').hidden = rows.length > 0;

  // An item deleted by someone else cannot be edited any more.
  const editDialog = $('edit-item');
  if (editDialog.open && !rows.some((row) => row.id === editDialog.dataset.id)) editDialog.close();

  // Re-rendering replaces the rows; keep keyboard focus where it was.
  if (focusedId) {
    const li = $('items').querySelector(`[data-id="${CSS.escape(focusedId)}"]`);
    const target = li?.querySelector(['claim', 'edit', 'delete'].includes(focusedClass) ? `.${focusedClass}` : 'input');
    target?.focus();
  }
}

function addItem(text) {
  outbox.add({ type: 'create', id: newId(), text });
  render();
  flush();
}

function setChecked(id, checked) {
  outbox.add({ type: 'setChecked', id, checked });
  render();
  flush();
}

function setClaimed(id, claimed) {
  outbox.add({ type: 'setClaimed', id, claimed });
  render();
  flush();
}

// Says what a tap on the claim button does.
function claimButtonLabel(row) {
  if (row.claim === 'mine') return 'Markierung entfernen';
  if (row.claim === 'other') return `Markierung von ${row.claimant} entfernen`;
  return 'Besorge ich';
}

function requestEdit(row) {
  const dialog = $('edit-item');
  const input = $('edit-text');
  input.value = row.text;
  dialog.dataset.id = row.id;
  dialog.returnValue = '';
  dialog.addEventListener(
    'close',
    () => {
      if (dialog.returnValue === 'save') setText(row.id, input.value);
    },
    { once: true },
  );
  dialog.showModal();
}

// Compares with the item as shown now, not when the dialog opened, so that
// saving an unchanged text does not make the user the last editor.
function setText(id, value) {
  const text = value.trim();
  const current = buildRows(store.get('snapshot'), outbox.list(), currentUser().id).find((row) => row.id === id);
  if (!text || !current || current.text === text) return;
  outbox.add({ type: 'setText', id, text });
  render();
  flush();
}

function requestDelete(row) {
  if (row.checked) {
    deleteItem(row.id);
    return;
  }
  const dialog = $('confirm-delete');
  $('confirm-text').textContent = row.text;
  dialog.returnValue = '';
  dialog.addEventListener(
    'close',
    () => {
      if (dialog.returnValue === 'delete') deleteItem(row.id);
    },
    { once: true },
  );
  dialog.showModal();
}

async function deleteItem(id) {
  try {
    await pb.collection('items').delete(id);
  } catch (error) {
    if (error?.status === 0) {
      setConnection('offline');
      showNotice('Löschen ist nur online möglich.');
      return;
    }
    if (error?.status === 401) {
      endSession('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      return;
    }
    // 404: someone else deleted it already, which is the wanted result.
    if (error?.status !== 404) {
      console.error('Deleting item failed', id, error);
      showNotice('Der Eintrag konnte nicht gelöscht werden.');
      return;
    }
  }
  sync.applyEvent({ action: 'delete', record: { id } });
}

// Session

// True when the realtime client gave up: the SDK retries only after a
// connection succeeded once, so an app started offline must start it again.
let realtimeGaveUp = false;

async function connectRealtime() {
  realtimeGaveUp = false;
  // Start from a clean state, so a second start does not add listeners twice.
  await pb.realtime.unsubscribe().catch(() => {});
  pb.realtime.onDisconnect = (activeSubscriptions) => {
    if (activeSubscriptions.length > 0) setConnection('offline');
  };
  try {
    // PB_CONNECT fires on every (re)connect, which makes it the reliable
    // signal that the server is reachable again.
    await pb.realtime.subscribe('PB_CONNECT', () => {
      setConnection('online');
      flush();
    });
    await pb.collection('items').subscribe('*', (event) => sync.applyEvent(event));
  } catch (error) {
    realtimeGaveUp = true;
    console.warn('Realtime connection failed; retrying after the next successful sync', error);
  }
}

// Refreshes the token and the own record, so an active user stays logged
// in. Offline or with a token that cannot be refreshed, the current one is
// kept until the server rejects it.
async function refreshAuth() {
  try {
    await pb.collection('users').authRefresh();
    const user = currentUser();
    if (user) showUserName(user);
  } catch (error) {
    if (error?.status === 401) endSession('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
  }
}

function startSession(user) {
  // Data on the device that belongs to someone else is discarded here, so
  // their pending changes are never sent under this user's name.
  store.claim(user.id);
  connection = 'connecting';
  showList(user);
  connectRealtime();
  flush();
}

// Ends the session but keeps the stored data, so the same user can log in
// again and sync pending changes.
function endSession(hint) {
  pb.realtime.unsubscribe().catch(() => {});
  pb.authStore.clear();
  showLogin(hint);
}

// Browsers without popover support show the menu inline, so there is
// nothing to close.
function closeAccountMenu() {
  const menu = $('account-menu');
  if (typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) menu.hidePopover();
}

function requestLogout() {
  closeAccountMenu();
  const dialog = $('confirm-logout');
  $('logout-question').textContent = logoutQuestion(outbox.list().length);
  dialog.returnValue = '';
  dialog.addEventListener(
    'close',
    () => {
      if (dialog.returnValue === 'logout') logout();
    },
    { once: true },
  );
  dialog.showModal();
}

function logout() {
  pb.realtime.unsubscribe().catch(() => {});
  pb.authStore.clear();
  store.clear();
  showLogin();
}

async function login(email, password) {
  const error = $('login-error');
  error.hidden = true;
  try {
    const { record } = await pb.collection('users').authWithPassword(email, password);
    startSession(record);
  } catch (err) {
    if (err?.status === 429) {
      error.textContent = 'Zu viele Anmeldeversuche. Bitte warte eine Minute.';
    } else if (err?.status === 0) {
      error.textContent = 'Keine Verbindung zum Server. Bitte versuche es später erneut.';
    } else {
      // Deliberately the same message for an unknown email and a wrong
      // password, so the form does not reveal which accounts exist.
      error.textContent = 'E-Mail oder Passwort ist falsch.';
    }
    error.hidden = false;
  }
}

// Wiring

$('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  login(form.email.value.trim(), form.password.value).then(() => {
    if (currentUser()) form.reset();
  });
});

$('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('new-item');
  const text = input.value.trim();
  input.value = '';
  if (text) addItem(text);
});

$('logout').addEventListener('click', requestLogout);
$('edit-cancel').addEventListener('click', () => $('edit-item').close());

window.addEventListener('online', () => currentUser() && flush());
// The browser knowing it is offline is reliable; it claiming to be online
// is not, so that only triggers a flush.
window.addEventListener('offline', () => currentUser() && setConnection('offline'));
document.addEventListener('visibilitychange', () => {
  if (!currentUser()) return;
  if (document.visibilityState === 'visible') flush();
  // The app may be closed or frozen in the background; up to here the list
  // was current.
  else if (connection === 'online') sync.markSynced();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => console.error('Service worker registration failed', error));
}

$('app-version').textContent = VERSION;
showAppName();
loadAppName();

const user = currentUser();
if (user) {
  startSession(user);
  refreshAuth();
} else {
  showLogin();
}
