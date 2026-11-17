// Password hashing with scrypt (built into Node's crypto module, no package needed).
// scrypt is deliberately SLOW and memory-hungry, so brute-forcing a leaked hash is expensive.
// A random SALT per user means two people with the same password get different hashes.
// Real-life example: a fingerprint. You can check a finger against it, but you can't rebuild the finger.
// (.NET uses PasswordHasher<User> with PBKDF2: same idea, different algorithm.)

const crypto = require('node:crypto');

const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${hash}`; // store algorithm + salt + hash together in one column
}

function verifyPassword(password, stored) {
  const [algo, salt, hashHex] = stored.split('$'); // array destructuring, like C++17 structured bindings
  if (algo !== 'scrypt' || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  // timingSafeEqual compares in constant time, so an attacker can't learn
  // "how many bytes matched" by measuring response time.
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
