// CONTRACT TEST: proves a backend follows the API contract in README.md.
// Run it against EITHER backend to show they behave identically:
//   1. start a backend on port 5000   (dotnet run   OR   npm start)
//   2. node scripts/contract-test.mjs
// It registers fresh random users each run, so it's safe to repeat.
// The Node backend's `npm test` also imports runContract() and runs it in-process.

export async function runContract(baseUrl = 'http://localhost:5000', { quiet = false } = {}) {
  const failures = [];
  const check = (name, ok) => {
    if (!quiet) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failures.push(name);
  };

  async function call(method, path, { body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  }

  const unique = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const alice = { name: 'Alice Test', email: `alice${unique}@example.com`, password: 'password123' };
  const bob = { name: 'Bob Test', email: `bob${unique}@example.com`, password: 'password123' };

  // ---------- Auth ----------
  const badReg = await call('POST', '/api/auth/register', { body: { name: 'A', email: 'nope', password: '1' } });
  check('register invalid -> 400 with details', badReg.status === 400 && badReg.data?.details?.email && badReg.data?.details?.password);

  const reg = await call('POST', '/api/auth/register', { body: alice });
  check('register -> 201 + token + user', reg.status === 201 && typeof reg.data?.token === 'string' && reg.data?.user?.email === alice.email);

  const dup = await call('POST', '/api/auth/register', { body: { ...alice, email: alice.email.toUpperCase() } });
  check('register duplicate email (any case) -> 409', dup.status === 409);

  check('login wrong password -> 401', (await call('POST', '/api/auth/login', { body: { email: alice.email, password: 'wrongpass1' } })).status === 401);

  const login = await call('POST', '/api/auth/login', { body: { email: alice.email, password: alice.password } });
  check('login -> 200 + token', login.status === 200 && typeof login.data?.token === 'string');
  const token = login.data?.token;

  const me = await call('GET', '/api/auth/me', { token });
  check('me -> 200 + same user', me.status === 200 && me.data?.email === alice.email);
  check('me without token -> 401', (await call('GET', '/api/auth/me')).status === 401);
  check('applications with bad token -> 401', (await call('GET', '/api/applications', { token: 'abc.def.ghi' })).status === 401);

  // ---------- Create + validation ----------
  const bad = await call('POST', '/api/applications', {
    token, body: { company: '', role: 'SDE', status: 'Hired', jobUrl: 'ftp://x', appliedOn: '2026-02-31' },
  });
  const d = bad.data?.details ?? {};
  check('create invalid -> 400 with field errors', bad.status === 400 && d.company && d.status && d.jobUrl && d.appliedOn && !d.role);

  const samples = [
    { company: 'Google', role: 'Software Engineer', status: 'Applied', location: 'Bengaluru', salaryLpa: 45, appliedOn: '2026-11-01' },
    { company: 'Microsoft', role: '.NET Developer', status: 'Interviewing', appliedOn: '2026-11-05' },
    { company: 'Zoho', role: 'Angular Developer', status: 'Rejected', appliedOn: '2026-10-20' },
    { company: 'Razorpay', role: 'Backend Engineer (Node.js)', status: 'Offer', jobUrl: 'https://razorpay.com/jobs', appliedOn: '2026-10-25' },
    { company: 'Swiggy', role: 'SDE 1', status: 'Wishlist' },
  ];
  const created = [];
  for (const s of samples) created.push(await call('POST', '/api/applications', { token, body: s }));
  check('create x5 -> 201 each', created.every((c) => c.status === 201));
  const g = created[0].data;
  check('create returns full object', g?.id > 0 && g.company === 'Google' && g.salaryLpa === 45 && g.appliedOn === '2026-11-01' && g.location === 'Bengaluru' && g.createdAt);

  const defaulted = await call('POST', '/api/applications', { token, body: { company: '  Trimmed Co  ', role: 'Dev' } });
  check('status defaults to Applied, strings trimmed', defaulted.status === 201 && defaulted.data?.status === 'Applied' && defaulted.data?.company === 'Trimmed Co');

  // ---------- List: filter, search, sort, paginate ----------
  const all = await call('GET', '/api/applications', { token });
  check('list -> 200 paged shape', all.status === 200 && Array.isArray(all.data?.items) && all.data.total === 6 && all.data.page === 1 && all.data.pageSize === 10);

  const interviewing = await call('GET', '/api/applications?status=Interviewing', { token });
  check('filter by status', interviewing.data?.total === 1 && interviewing.data.items[0].company === 'Microsoft');
  check('invalid status filter -> 400', (await call('GET', '/api/applications?status=Hired', { token })).status === 400);

  const search = await call('GET', '/api/applications?search=angular', { token });
  check('search role, case-insensitive', search.data?.total === 1 && search.data.items[0].company === 'Zoho');

  const byCompany = await call('GET', '/api/applications?sort=company&order=asc', { token });
  check('sort by company asc', byCompany.data?.items?.[0]?.company === 'Google' && byCompany.data.items[5].company === 'Zoho');

  const page2 = await call('GET', '/api/applications?sort=company&order=asc&page=2&pageSize=4', { token });
  check('pagination page 2', page2.data?.items?.length === 2 && page2.data.total === 6 && page2.data.page === 2);

  const clamped = await call('GET', '/api/applications?page=0&pageSize=500', { token });
  check('pagination input clamped', clamped.data?.page === 1 && clamped.data.pageSize === 50);

  // ---------- Get / isolation ----------
  check('get by id -> 200', (await call('GET', `/api/applications/${g.id}`, { token })).data?.company === 'Google');
  check('get missing -> 404', (await call('GET', '/api/applications/999999', { token })).status === 404);

  const bobReg = await call('POST', '/api/auth/register', { body: bob });
  const bobToken = bobReg.data?.token;
  check("other user can't read it -> 404", (await call('GET', `/api/applications/${g.id}`, { token: bobToken })).status === 404);
  check('other user sees empty list', (await call('GET', '/api/applications', { token: bobToken })).data?.total === 0);
  check("other user can't delete it -> 404", (await call('DELETE', `/api/applications/${g.id}`, { token: bobToken })).status === 404);

  // ---------- Update ----------
  const upd = await call('PUT', `/api/applications/${g.id}`, {
    token, body: { company: 'Google', role: 'Software Engineer II', status: 'Interviewing', salaryLpa: 50, notes: 'Round 1 on Monday' },
  });
  check('update -> 200 + changed', upd.status === 200 && upd.data?.status === 'Interviewing' && upd.data.role === 'Software Engineer II' && upd.data.notes === 'Round 1 on Monday');
  check('update clears omitted optional fields', upd.data?.location === null && upd.data?.appliedOn === null);
  check('update invalid -> 400', (await call('PUT', `/api/applications/${g.id}`, { token, body: { company: 'G', role: '' } })).status === 400);
  check('update missing -> 404', (await call('PUT', '/api/applications/999999', { token, body: { company: 'X', role: 'Y' } })).status === 404);

  // ---------- Stats ----------
  const stats = await call('GET', '/api/applications/stats', { token });
  const b = stats.data?.byStatus ?? {};
  check('stats counts', stats.status === 200 && stats.data.total === 6 && b.Wishlist === 1 && b.Applied === 1 && b.Interviewing === 2 && b.Offer === 1 && b.Rejected === 1);
  // sent = 6 - 1 wishlist = 5; responded = 2 + 1 + 1 = 4 -> 80%
  check('stats response rate', stats.data?.responseRatePercent === 80);

  // ---------- Delete ----------
  check('delete -> 204', (await call('DELETE', `/api/applications/${g.id}`, { token })).status === 204);
  check('delete again -> 404', (await call('DELETE', `/api/applications/${g.id}`, { token })).status === 404);

  if (!quiet) console.log(failures.length === 0 ? '\nAll contract checks passed.' : `\n${failures.length} check(s) failed.`);
  return failures;
}

// Run directly: node scripts/contract-test.mjs [baseUrl]
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('contract-test.mjs')) {
  const failures = await runContract(process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000');
  process.exit(failures.length === 0 ? 0 : 1);
}
