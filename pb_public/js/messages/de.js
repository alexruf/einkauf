// Every text the app shows, in German, roughly in the order of the page. The
// keys name what a text is for, not its wording, so rewording a text keeps its
// key. See i18n.js for the placeholders and plural forms a value may use;
// values never hold markup.

export const messages = {
  // Account menu in the header
  'account.signedInAs': 'Angemeldet als {name}',
  'account.logout': 'Abmelden',

  // Add field and its suggestions
  'add.label': 'Neuer Eintrag',
  'add.placeholder': 'Was wird gebraucht?',
  'add.submit': 'Hinzufügen',
  'suggestion.list': 'Vorschläge',
  'suggestion.onList': 'steht schon drauf',

  // Notices at the top of the list
  'notice.offline': 'Offline – Änderungen werden später übertragen.',
  'notice.rejected': 'Eine Änderung wurde vom Server abgelehnt und verworfen.',
  // {text} is an item's text, which the user typed.
  'notice.duplicate': '„{text}“ steht schon drauf.',

  // Login
  'login.title': 'Anmelden',
  'login.email': 'E-Mail',
  'login.password': 'Passwort',
  'login.submit': 'Anmelden',
  'login.error.rateLimited': 'Zu viele Anmeldeversuche. Bitte warte eine Minute.',
  'login.error.offline': 'Keine Verbindung zum Server. Bitte versuche es später erneut.',
  // The same for an unknown email and a wrong password, so the form does not
  // reveal which accounts exist.
  'login.error.credentials': 'E-Mail oder Passwort ist falsch.',
  'session.expired': 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',

  // Install hint on the login screen
  'install.title': 'App installieren',
  'install.intro':
    'Auf dem Smartphone oder Tablet lässt sich die Einkaufsliste wie eine App auf den Home-Bildschirm legen.',
  'install.ios.title': 'iPhone / iPad (Safari)',
  'install.ios.step1': 'Seite in Safari öffnen.',
  'install.ios.step2': 'Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben).',
  'install.ios.step3': '„Zum Home-Bildschirm“ wählen und mit „Hinzufügen“ bestätigen.',
  'install.android.title': 'Android (Chrome)',
  'install.android.step1': 'Seite in Chrome öffnen.',
  'install.android.step2': 'Oben rechts auf das Menü tippen (drei Punkte).',
  'install.android.step3': '„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen und bestätigen.',

  // The list
  'empty.title': 'Alles erledigt.',
  'empty.prompt': 'Was wird als Nächstes gebraucht?',
  'done.toggle': 'Erledigt ({count})',

  // A row of the list
  'item.pending': 'nicht synchronisiert',
  'item.more': 'Mehr',
  'item.claim.take': 'Besorge ich',
  'item.claim.releaseMine': 'Markierung entfernen',
  'item.claim.releaseOther': 'Markierung von {name} entfernen',
  'item.meta.added': 'von {creator}',
  'item.meta.edited': 'von {creator} · zuletzt {editor}',
  'item.meta.claimedByMe': 'Du besorgst das',
  'item.meta.claimedBy': '{name} besorgt das',
  // A user who was deleted since they added, changed or claimed an item.
  'user.unknown': 'Unbekannt',

  // A row in edit mode
  'edit.text': 'Eintrag',
  'edit.note': 'Menge oder Hinweis',
  'edit.delete': 'Löschen',
  'edit.cancel': 'Abbrechen',
  'edit.save': 'Speichern',

  // Status bar
  'status.connection.online': 'Verbunden',
  'status.connection.offline': 'Offline',
  'status.connection.connecting': 'Verbinde …',
  'status.sync.done': 'Synchronisiert',
  'status.sync.sending': { one: 'Sende {count} Änderung', other: 'Sende {count} Änderungen' },
  'status.sync.never': 'Noch nicht synchronisiert',
  // {when} is one of the time.* texts below.
  'status.sync.since': 'Stand {when}',
  'time.today': 'heute, {time}',
  'time.yesterday': 'gestern, {time}',
  'time.date': '{date}, {time}',

  // Logout dialog
  'logout.question': 'Wirklich abmelden?',
  'logout.questionPending': {
    one: '{count} Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?',
    other: '{count} Änderungen sind noch nicht übertragen und gehen beim Abmelden verloren. Trotzdem abmelden?',
  },
  'logout.cancel': 'Abbrechen',
  'logout.confirm': 'Abmelden',
};
