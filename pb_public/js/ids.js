// Record ids created on the device, so an item has its final id before it
// reaches the server and a repeated create can be recognised.

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = 15;
// Largest multiple of the alphabet size below 256. Bytes at or above it are
// skipped, so every character is equally likely.
const LIMIT = 256 - (256 % ALPHABET.length);

const cryptoBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

// Returns 15 random characters from a-z0-9, PocketBase's default id pattern.
export function newId(randomBytes = cryptoBytes) {
  let id = '';
  while (id.length < LENGTH) {
    for (const byte of randomBytes(LENGTH)) {
      if (byte < LIMIT && id.length < LENGTH) id += ALPHABET[byte % ALPHABET.length];
    }
  }
  return id;
}
