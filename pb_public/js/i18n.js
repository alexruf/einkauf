// Looks up the texts the app shows. Every text lives in one catalog per
// language (messages/de.js), so translating the app means writing another
// catalog, without changing the markup or the other modules.
//
// A catalog value is either a text with named placeholders, such as
// "{name} besorgt das", or, for a text that depends on a number, an object
// with one text per plural category of the language ("one", "other", …),
// picked by the param `count`.
//
// Keys are always written out as string literals, in `t('…')`, `tParts('…')`
// and the data-i18n attributes of index.html, and never put together at
// runtime: a test finds the keys by reading the source and checks them
// against the catalog.

import { messages as de } from './messages/de.js';

export const LOCALE = 'de';

const PLACEHOLDER = /\{(\w+)\}/g;

export function createI18n({ locale, messages }) {
  const plural = new Intl.PluralRules(locale);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const day = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  const dayAndYear = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });

  const lookup = (key) => {
    if (!Object.hasOwn(messages, key)) throw new Error(`No text "${key}" in the "${locale}" catalog`);
    return messages[key];
  };

  // The text for `key`; for plural forms, the one for `params.count`.
  const textOf = (key, value, params) => {
    if (typeof value === 'string') return value;
    if (typeof value?.other !== 'string') throw new Error(`Text "${key}" has no "other" plural form`);
    if (typeof params.count !== 'number') throw new Error(`Text "${key}" needs a numeric count`);
    return value[plural.select(params.count)] ?? value.other;
  };

  return {
    // Placeholders and params must match: a missing value or an unused
    // param is a mistake in the code or the catalog. Only `count` may go
    // unused, since a plural form such as "eine Änderung" can leave it out.
    t(key, params = {}) {
      const value = lookup(key);
      const used = new Set();
      const text = textOf(key, value, params).replace(PLACEHOLDER, (_, name) => {
        if (!Object.hasOwn(params, name)) throw new Error(`Text "${key}" needs a value for {${name}}`);
        used.add(name);
        return String(params[name]);
      });
      for (const name of Object.keys(params)) {
        if (used.has(name) || (name === 'count' && typeof value !== 'string')) continue;
        throw new Error(`Text "${key}" has no placeholder {${name}}`);
      }
      return text;
    },

    // The text split into literal strings and `{ name }` objects for its
    // placeholders, in order, so the caller can put an element where a
    // placeholder is.
    tParts(key) {
      const value = lookup(key);
      if (typeof value !== 'string') throw new Error(`Text "${key}" has plural forms and cannot be split`);
      return value
        .split(/\{(\w+)\}/)
        .map((part, index) => (index % 2 === 1 ? { name: part } : part))
        .filter((part) => part !== '');
    },

    // "09:05" in German.
    formatTime(date) {
      return time.format(date);
    },

    // "05.10." in German, or "05.10.25" with the year.
    formatDate(date, { year = false } = {}) {
      return (year ? dayAndYear : day).format(date);
    },
  };
}

export const { t, tParts, formatTime, formatDate } = createI18n({ locale: LOCALE, messages: de });
