// DOM wiring. The logic lives in the other modules, which are tested without
// a browser.

import PocketBase from '/vendor/pocketbase.es.mjs';
import { createAppName } from './app-name.js';
import { createHold } from './hold.js';
import { newId } from './ids.js';
import { createOutbox } from './outbox.js';
import { createPrefs } from './prefs.js';
import { createStore } from './storage.js';
import { findOpenItem, suggest } from './suggest.js';
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
  onPurchases: () => updateSuggestions(),
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
// The row pointed at because the user added or saved its text again:
// { id, start, timer }, or null. Kept here, so re-renders keep the highlight.
let highlighted = null;
const HIGHLIGHT_MS = 2000;

// 'connecting' until the realtime connection is established or a request
// fails.
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
  // Someone else may have added or checked off a suggested item meanwhile.
  updateSuggestions();
}

const currentRows = (user) => buildRows(store.get('snapshot'), outbox.list(), user.id, hold.keys());
const openRows = (user) => currentRows(user).filter((row) => !row.checked);

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
  if (highlighted?.id === row.id) {
    li.classList.add('is-highlighted');
    li.style.animationDelay = `${highlighted.start - performance.now()}ms`;
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
  li.querySelector('.edit-delete').addEventListener('click', deleteEdited);
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
  const user = currentUser();
  const edited = currentRows(user).find((row) => row.id === id);
  const existing = edited && !edited.checked && findOpenItem(openRows(user), value, id);
  if (existing) {
    // The edit stays open with the typed text, so the user can change it. The
    // list does not scroll, which would push the field away from the keyboard.
    pointAt(existing, { scroll: false });
    restoreEditField();
    return;
  }
  closeEdit();
  setText(id, value);
  render();
  document.querySelector(`.items [data-id="${CSS.escape(id)}"] .more`)?.focus();
  reloadIfIdle();
}

function deleteEdited() {
  const { id } = editing;
  closeEdit();
  outbox.add({ type: 'delete', id });
  render();
  flush();
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

// Points at an open row whose text the user just added or saved again,
// instead of putting the same item on the list twice.
function pointAt(row, { scroll }) {
  clearTimeout(highlighted?.timer);
  const timer = setTimeout(() => {
    highlighted = null;
    render();
  }, HIGHLIGHT_MS);
  highlighted = { id: row.id, start: performance.now(), timer };
  showNotice(`„${row.text}“ steht schon drauf.`);
  render();
  if (scroll) document.querySelector(`.items [data-id="${CSS.escape(row.id)}"]`)?.scrollIntoView({ block: 'nearest' });
}

// Suggestions

// The suggestions on screen ([{ text, onList }]), the index of the one
// selected by keyboard or -1, and whether Escape hid them until the user
// types again.
let suggestions = [];
let selected = -1;
let suggestionsDismissed = false;

function updateSuggestions() {
  const input = $('new-item');
  const user = currentUser();
  const active = user && !suggestionsDismissed && document.activeElement === input;
  const openTexts = active ? openRows(user).map((row) => row.text) : [];
  const previous = suggestions[selected]?.text;
  suggestions = active ? suggest(store.get('snapshot')?.purchases, input.value, openTexts) : [];
  // Keep the keyboard selection on the same text if it is still selectable.
  selected = suggestions.findIndex((s) => s.text === previous && !s.onList);
  renderSuggestions();
}

function renderSuggestions() {
  const input = $('new-item');
  const list = $('suggestions');
  list.replaceChildren(
    ...suggestions.map((s, index) => {
      const option = document.createElement('div');
      option.className = 'suggestion';
      option.id = `suggestion-${index}`;
      option.dataset.index = String(index);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === selected));
      if (s.onList) option.setAttribute('aria-disabled', 'true');
      // Purchase texts are user input: only ever set them as text.
      const text = document.createElement('span');
      text.className = 'suggestion-text';
      text.textContent = s.text;
      option.append(text);
      if (s.onList) {
        const note = document.createElement('span');
        note.className = 'suggestion-note';
        note.textContent = 'steht schon drauf';
        option.append(' ', note);
      }
      return option;
    }),
  );
  list.hidden = suggestions.length === 0;
  input.setAttribute('aria-expanded', String(suggestions.length > 0));
  if (selected >= 0) input.setAttribute('aria-activedescendant', `suggestion-${selected}`);
  else input.removeAttribute('aria-activedescendant');
}

// Moves the keyboard selection by `step` over the selectable suggestions.
// Moving up from the first one returns to the typed text.
function moveSelection(step) {
  let index = selected;
  do index += step;
  while (index >= 0 && index < suggestions.length && suggestions[index].onList);
  if (index >= suggestions.length) return;
  selected = Math.max(index, -1);
  renderSuggestions();
}

// The field keeps the focus, so the phone keyboard stays open for the next
// item.
function chooseSuggestion(index) {
  const suggestion = suggestions[index];
  if (!suggestion || suggestion.onList) return;
  $('new-item').value = '';
  addItem(suggestion.text);
  updateSuggestions();
  reloadIfIdle();
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
    // signal that the server is reachable again. The SDK calls it once the
    // server knows all subscriptions, so both are made together: subscribing
    // to the items afterwards would leave a gap between the reload that
    // PB_CONNECT starts and the first item event.
    await Promise.all([
      pb.realtime.subscribe('PB_CONNECT', () => {
        setConnection('online');
        flush();
        checkVersion();
      }),
      pb.collection('items').subscribe('*', (event) => sync.applyEvent(event)),
    ]);
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
  const busy = $('new-item').value.trim() !== '' || editing !== null || document.querySelector('dialog[open]') !== null;
  if (updater.takeReload(busy)) location.reload();
}

// The token refresh on its way, so ending the session can cancel it: the SDK
// stores a successful answer itself, which would log the user back in.
let refreshing = null;

// Refreshes the token and the own record, so an active user stays logged
// in. Offline or with a token that cannot be refreshed, the current one is
// kept until the server rejects it.
async function refreshAuth() {
  refreshing = new AbortController();
  try {
    await pb.collection('users').authRefresh({ signal: refreshing.signal });
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
  stopSession();
  showLogin(hint);
}

// Stops everything that still acts for the session and forgets its token.
function stopSession() {
  refreshing?.abort();
  pb.realtime.unsubscribe().catch(() => {});
  pb.authStore.clear();
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
  stopSession();
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
  const existing = text && findOpenItem(openRows(currentUser()), text);
  if (existing) pointAt(existing, { scroll: true });
  else if (text) addItem(text);
  updateSuggestions();
  reloadIfIdle();
});

$('new-item').addEventListener('input', () => {
  suggestionsDismissed = false;
  selected = -1;
  updateSuggestions();
});
$('new-item').addEventListener('focus', updateSuggestions);
$('new-item').addEventListener('blur', updateSuggestions);
$('new-item').addEventListener('keydown', (event) => {
  if (suggestions.length === 0) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelection(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Enter' && selected >= 0) {
    // Adds the selected suggestion instead of submitting the typed text.
    event.preventDefault();
    chooseSuggestion(selected);
  } else if (event.key === 'Escape') {
    suggestionsDismissed = true;
    updateSuggestions();
  }
});
// Keeps the focus in the field when a suggestion is tapped, so the phone
// keyboard stays open.
$('suggestions').addEventListener('pointerdown', (event) => event.preventDefault());
$('suggestions').addEventListener('click', (event) => {
  const option = event.target.closest('[role="option"]');
  if (option) chooseSuggestion(Number(option.dataset.index));
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
// The edit row handles Escape itself. Some browser extensions use the first
// Escape to leave the field, which leaves nothing focused; the next Escape
// should still cancel. Escape in other controls keeps its own meaning.
document.addEventListener('keydown', (event) => {
  const nothingFocused = !document.activeElement || document.activeElement === document.body;
  if (event.key === 'Escape' && editing && nothingFocused) cancelEdit();
});

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
