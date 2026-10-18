// DOM wiring. The logic lives in the other modules, which are tested without
// a browser.

import PocketBase from '/vendor/pocketbase.es.mjs';
import { createAppName } from './app-name.js';
import { createHold } from './hold.js';
import { newId } from './ids.js';
import { createOutbox } from './outbox.js';
import { createPrefs } from './prefs.js';
import { createStore } from './storage.js';
import { createSync } from './sync.js';
import { createUpdater, parseVersion } from './update.js';
import { VERSION } from './version.js';
import { buildRows, connectionIndicator, layoutKey, logoutQuestion, syncIndicator } from './view.js';

const $ = (id) => document.getElementById(id);

const pb = new PocketBase('/');
// The SDK cancels a request when an identical one starts, which would turn
// overlapping list reloads into errors.
pb.autoCancellation(false);

const appName = createAppName(localStorage);
const store = createStore(localStorage);
const prefs = createPrefs(localStorage);
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
const updater = createUpdater({ running: VERSION, backend: sessionStorage });
// Rows the user just checked off or un-checked stay in place for a moment.
const hold = createHold({
  setTimeout,
  clearTimeout,
  onRelease: () => {
    strikes.clear();
    render();
  },
});
// When the user checked off each held row, so its strike-through is drawn
// once and continues smoothly when the row is re-rendered meanwhile.
const strikes = new Map();

// 'connecting' until the realtime connection is established or a request
// fails. Deleting is only offered while 'online'.
let connection = 'connecting';
let notice = '';
let noticeTimer;

const currentUser = () =>
  pb.authStore.isValid && pb.authStore.record?.collectionName === 'users' ? pb.authStore.record : null;

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
  if (editing) closeEdit();
  lastLayout = null;
  $('list-screen').hidden = true;
  $('account').hidden = true;
  $('login-screen').hidden = false;
  $('login-hint').textContent = hint;
  $('login-hint').hidden = !hint;
  $('login-error').hidden = true;
  $('items').replaceChildren();
  $('done-items').replaceChildren();
  $('done').hidden = true;
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
  const pending = outbox.list().length;
  renderIndicator($('connection-indicator'), loggedIn && connectionIndicator({ connection, pending }));
  renderIndicator(
    $('sync-indicator'),
    loggedIn && syncIndicator({ connection, pending, lastSync: store.get('lastSync'), now: new Date() }),
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

// The layout of the last render, so the next one knows whether rows move.
let lastLayout = null;

function render() {
  renderStatus();
  const user = currentUser();
  if (!user || $('list-screen').hidden) return;

  const layout = layoutKey(currentRows(user), prefs.doneOpen());
  const moves = lastLayout !== null && layout !== lastLayout;
  lastLayout = layout;
  // Rows that move slide to their new place, so users see where an item
  // went. The page ignores input while a transition runs, so only renders
  // that move rows are animated.
  if (moves && canAnimate()) document.startViewTransition(renderList);
  else renderList();
}

const currentRows = (user) => buildRows(store.get('snapshot'), outbox.list(), user.id, hold.keys());

const canAnimate = () =>
  typeof document.startViewTransition === 'function' &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches &&
  document.visibilityState === 'visible';

// Draws the list from the current state. An animated render calls it a
// moment later, so it reads everything afresh.
function renderList() {
  const user = currentUser();
  if (!user || $('list-screen').hidden) return;

  const focusedId = document.activeElement?.closest?.('.item')?.dataset.id;
  const focusedClass = document.activeElement?.className;
  rememberEditField();

  const rows = currentRows(user);
  // An item deleted by someone else cannot be edited any more.
  if (editing && !rows.some((row) => row.id === editing.id)) closeEdit();
  const toElement = (row) => (editing?.id === row.id ? editRowElement(row) : rowElement(row));
  const open = rows.filter((row) => row.section === 'open');
  const done = rows.filter((row) => row.section === 'done');
  $('items').replaceChildren(...open.map(toElement));
  $('done-items').replaceChildren(...done.map(toElement));
  $('empty').hidden = open.length > 0;
  $('done').hidden = done.length === 0;
  $('done-label').textContent = `Erledigt (${done.length})`;
  const doneOpen = prefs.doneOpen();
  $('done-toggle').setAttribute('aria-expanded', String(doneOpen));
  $('done-items').hidden = !doneOpen;

  // Re-rendering replaces the rows; keep keyboard focus where it was.
  if (editing?.focused) restoreEditField();
  else if (focusedId) {
    const li = document.querySelector(`.items [data-id="${CSS.escape(focusedId)}"]`);
    const target = li?.querySelector(['claim', 'more'].includes(focusedClass) ? `.${focusedClass}` : 'input');
    target?.focus();
  }
}

function rowElement(row) {
  const li = $('item-template').content.firstElementChild.cloneNode(true);
  li.dataset.id = row.id;
  // Pairs the row before and after an animated render. Set through the
  // style object, which the CSP allows, unlike a style attribute.
  li.style.viewTransitionName = `item-${row.id}`;
  li.classList.toggle('is-checked', row.checked);
  li.classList.toggle('is-pending', row.pending);
  if (row.claim) li.dataset.claim = row.claim;
  // Item text is user input: only ever set it as text, never as HTML.
  const text = li.querySelector('.text');
  text.textContent = row.text;
  if (row.checked && strikes.has(row.id)) {
    li.classList.add('is-striking');
    text.style.animationDelay = `${strikes.get(row.id) - performance.now()}ms`;
  }
  li.querySelector('.meta').textContent = row.meta;
  const checkbox = li.querySelector('input');
  checkbox.checked = row.checked;
  checkbox.addEventListener('change', () => setChecked(row, checkbox.checked));
  li.querySelector('.more').addEventListener('click', () => openEdit(row));
  const claim = li.querySelector('.claim');
  claim.hidden = row.checked;
  const claimLabel = claimButtonLabel(row);
  claim.setAttribute('aria-label', claimLabel);
  claim.title = claimLabel;
  // A tap removes any claim, whoever made it, and claims an unclaimed item.
  claim.addEventListener('click', () => setClaimed(row.id, !row.claim));
  return li;
}

// Edit mode

// The row in edit mode, or null. `draft` and `selection` survive re-renders,
// so typing is not interrupted when the list changes meanwhile.
let editing = null;

function editRowElement(row) {
  const li = $('edit-template').content.firstElementChild.cloneNode(true);
  li.dataset.id = row.id;
  li.style.viewTransitionName = `item-${row.id}`;
  const field = li.querySelector('.edit-text');
  field.value = editing.draft;
  // The sticky add field covers the top of the list; scroll-margin-top keeps
  // the row below it.
  field.addEventListener('focus', () => li.scrollIntoView({ block: 'nearest' }));
  li.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') cancelEdit();
  });
  li.querySelector('.edit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    saveEdit(field.value);
  });
  li.querySelector('.edit-cancel').addEventListener('click', cancelEdit);
  const del = li.querySelector('.edit-delete');
  // An item that has not reached the server yet cannot be deleted there.
  del.disabled = connection !== 'online' || row.pending;
  li.querySelector('.edit-hint').hidden = connection === 'online';
  del.addEventListener('click', () => {
    const { id } = editing;
    closeEdit();
    render();
    deleteItem(id);
  });
  return li;
}

function openEdit(row) {
  if (editing) closeEdit();
  // The field takes focus with the cursor after the text, so the user can
  // type right away. iOS only opens the keyboard for focus set during the
  // tap, which holds because opening never starts an animated render.
  const end = row.text.length;
  editing = { id: row.id, draft: row.text, selection: [end, end], focused: true };
  // The row keeps its place while it is edited, even if someone else checks
  // it off meanwhile.
  hold.pin(row.id, { checked: row.checked, checkedAt: row.checkedAt });
  render();
}

function closeEdit() {
  hold.unpin(editing.id);
  editing = null;
}

function cancelEdit() {
  const { id } = editing;
  closeEdit();
  render();
  document.querySelector(`.items [data-id="${CSS.escape(id)}"] .more`)?.focus();
  reloadIfIdle();
}

function saveEdit(value) {
  const { id } = editing;
  closeEdit();
  setText(id, value);
  render();
  document.querySelector(`.items [data-id="${CSS.escape(id)}"] .more`)?.focus();
  reloadIfIdle();
}

function rememberEditField() {
  const field = document.querySelector('.edit-text');
  // The field on screen may still belong to a row that was just closed.
  if (!editing || field?.closest('.item').dataset.id !== editing.id) return;
  editing.draft = field.value;
  editing.selection = [field.selectionStart, field.selectionEnd];
  editing.focused = document.activeElement === field;
}

function restoreEditField() {
  const field = document.querySelector('.edit-text');
  if (!field) return;
  field.focus({ preventScroll: true });
  field.setSelectionRange(...editing.selection);
}

function addItem(text) {
  outbox.add({ type: 'create', id: newId(), text });
  render();
  flush();
}

function setChecked(row, checked) {
  hold.toggle(row.id, { checked: row.checked, checkedAt: row.checkedAt });
  if (checked) strikes.set(row.id, performance.now());
  else strikes.delete(row.id);
  outbox.add({ type: 'setChecked', id: row.id, checked });
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

// Compares with the item as shown now, not when editing started, so that
// saving an unchanged text does not make the user the last editor.
function setText(id, value) {
  const text = value.trim();
  const current = buildRows(store.get('snapshot'), outbox.list(), currentUser().id).find((row) => row.id === id);
  if (!text || !current || current.text === text) return;
  outbox.add({ type: 'setText', id, text });
  render();
  flush();
}

// Deleting does not go through the outbox, so a reload while a delete
// request is running could abort it.
let runningDeletes = 0;

async function deleteItem(id) {
  runningDeletes += 1;
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
  } finally {
    runningDeletes -= 1;
    reloadIfIdle();
  }
  sync.applyEvent({ action: 'delete', record: { id } });
}

// Session

// True when the realtime client gave up: the SDK retries only after a
// connection succeeded once, so an app started offline must start it again.
let realtimeGaveUp = false;

// A failed start is retried after this delay while the browser reports a
// network. Otherwise the next successful sync would be the only trigger, and
// if the failure came right after reconnecting, for example because the server
// was briefly rate limiting, the app would stay "Offline" until the user
// changed something.
const REALTIME_RETRY_MS = 5000;
let realtimeRetryTimer;

async function connectRealtime() {
  realtimeGaveUp = false;
  clearTimeout(realtimeRetryTimer);
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
      checkVersion();
    });
    await pb.collection('items').subscribe('*', (event) => sync.applyEvent(event));
  } catch (error) {
    realtimeGaveUp = true;
    console.warn('Realtime connection failed; retrying later', error);
    if (navigator.onLine) {
      realtimeRetryTimer = setTimeout(() => currentUser() && realtimeGaveUp && connectRealtime(), REALTIME_RETRY_MS);
    }
  }
}

// Updates

// A deployment restarts the server, so every open app reconnects afterwards
// and checks here which version is deployed now. "no-store" makes the Service
// Worker leave the request to the network. A failed check changes nothing;
// the next reconnect checks again.
async function checkVersion() {
  try {
    const response = await fetch('/js/version.js', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const deployed = parseVersion(await response.text());
    if (!deployed) throw new Error('No version in version.js');
    updater.found(deployed);
    reloadIfIdle();
  } catch (error) {
    console.warn('Checking the deployed version failed', error);
  }
}

// Unsent changes survive a reload in the outbox; only an entry in progress
// would be lost, so the reload waits for it.
function reloadIfIdle() {
  const busy =
    $('new-item').value.trim() !== '' ||
    editing !== null ||
    document.querySelector('dialog[open]') !== null ||
    runningDeletes > 0;
  if (updater.takeReload(busy)) location.reload();
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
  // Focus the sheet rather than its first button, so neither choice looks preselected.
  dialog.focus();
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
  reloadIfIdle();
});

$('logout').addEventListener('click', requestLogout);
$('done-toggle').style.viewTransitionName = 'done-toggle';
$('done-toggle').addEventListener('click', () => {
  prefs.setDoneOpen(!prefs.doneOpen());
  render();
});
// These listeners run before the dialog's own close handler; waiting a tick
// lets that handler finish first.
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('close', () => setTimeout(reloadIfIdle, 0));
}

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
  navigator.serviceWorker
    .register('/sw.js')
    .catch((error) => console.error('Service worker registration failed', error));
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
