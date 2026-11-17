// Integration test: starts the real app on a random port with an in-memory database,
// then runs the shared contract test (scripts/contract-test.mjs) against it.
// Run: npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');
const baseConfig = require('../src/config');

test('API satisfies the shared contract', async () => {
  const db = createDb(':memory:');
  const app = createApp({ db, config: baseConfig, log: false });

  // listen(0) = "pick any free port" (the OS chooses).
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();

  try {
    const contractUrl = pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'contract-test.mjs')).href;
    const { runContract } = await import(contractUrl);
    const failures = await runContract(`http://localhost:${port}`, { quiet: true });
    assert.deepEqual(failures, [], `Failed checks: ${failures.join(', ')}`);
  } finally {
    server.close();
  }
});

test('validator rejects impossible dates and bad salaries', () => {
  const { validateApplication } = require('../src/validation/applicationValidator');
  const { errors } = validateApplication({ company: 'A', role: 'B', appliedOn: '2026-13-01', salaryLpa: -1 });
  assert.ok(errors.appliedOn);
  assert.ok(errors.salaryLpa);
  const { value } = validateApplication({ company: ' A ', role: 'B', appliedOn: '2024-02-29' });
  assert.equal(value.company, 'A');
  assert.equal(value.appliedOn, '2024-02-29');
});

test('passwords hash with a random salt and verify', () => {
  const { hashPassword, verifyPassword } = require('../src/services/passwords');
  const h1 = hashPassword('secret123');
  const h2 = hashPassword('secret123');
  assert.notEqual(h1, h2); // different salts
  assert.equal(verifyPassword('secret123', h1), true);
  assert.equal(verifyPassword('wrong', h1), false);
});
