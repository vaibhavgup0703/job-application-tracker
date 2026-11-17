// Same endpoints and responses as Controllers/AuthController.cs.

const express = require('express');
const { hashPassword, verifyPassword } = require('../services/passwords');
const { createToken } = require('../services/tokens');
const { requireAuth } = require('../middleware');

const toUserDto = (u) => ({ id: u.id, name: u.name, email: u.email });

// Factory: receives its dependencies (db, config). This is manual dependency injection;
// .NET's container does the same thing automatically through constructors.
function createAuthRouter({ db, config }) {
  const router = express.Router();

  // Prepared statements: SQL compiled once and reused. The `?` placeholders are filled
  // safely by SQLite, which prevents SQL injection (never build SQL by string concatenation).
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const findById = db.prepare('SELECT * FROM users WHERE id = ?');
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
  );

  // POST /api/auth/register
  router.post('/register', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const errors = {};
    if (name.length < 2 || name.length > 100) errors.name = 'Name must be 2–100 characters.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Enter a valid email.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    if (findByEmail.get(email)) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const result = insertUser.run(name, email, hashPassword(password), new Date().toISOString());
    const user = { id: Number(result.lastInsertRowid), name, email };
    res.status(201).json({ token: createToken(user, config.jwt), user });
  });

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const user = findByEmail.get(email);

    // Same message whether the email or the password is wrong (don't leak which emails exist).
    if (!user || !verifyPassword(String(req.body?.password ?? ''), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ token: createToken(user, config.jwt), user: toUserDto(user) });
  });

  // GET /api/auth/me  (protected: requireAuth runs first, then this handler)
  router.get('/me', requireAuth(config.jwt), (req, res) => {
    const user = findById.get(req.userId);
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    res.json(toUserDto(user));
  });

  return router;
}

module.exports = { createAuthRouter };
