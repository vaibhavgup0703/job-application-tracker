// Same endpoints and responses as Controllers/ApplicationsController.cs.
// Every query includes "WHERE user_id = ?" so users only ever see their own data.

const express = require('express');
const { STATUSES } = require('../db');
const { validateApplication } = require('../validation/applicationValidator');
const { requireAuth } = require('../middleware');

// DB row (snake_case columns) -> API JSON (camelCase). (.NET: MappingExtensions.ToDto)
function toDto(r) {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    status: r.status,
    location: r.location,
    salaryLpa: r.salary_lpa,
    jobUrl: r.job_url,
    appliedOn: r.applied_on,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Whitelist for ORDER BY. Column names can't be "?" parameters, so we map user input to
// known-safe column names. Never paste user input into SQL directly.
const SORT_COLUMNS = { company: 'company', appliedon: 'applied_on', updatedat: 'updated_at' };

function createApplicationsRouter({ db, config }) {
  const router = express.Router();
  router.use(requireAuth(config.jwt)); // every route below is protected (= [Authorize] on the class)

  const getOne = db.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?');
  const insert = db.prepare(`
    INSERT INTO applications
      (user_id, company, role, status, location, salary_lpa, job_url, applied_on, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const update = db.prepare(`
    UPDATE applications
       SET company = ?, role = ?, status = ?, location = ?, salary_lpa = ?, job_url = ?,
           applied_on = ?, notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`);
  const remove = db.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?');
  const countByStatus = db.prepare(
    'SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status',
  );

  const parseId = (text) => (/^\d+$/.test(text) ? Number(text) : null);

  // GET /api/applications?status=&search=&sort=&order=&page=&pageSize=
  router.get('/', (req, res) => {
    const q = req.query;
    const where = ['user_id = ?'];
    const params = [req.userId];

    if (q.status) {
      if (!STATUSES.includes(q.status)) return res.status(400).json({ error: 'Invalid status filter.' });
      where.push('status = ?');
      params.push(q.status);
    }

    const search = String(q.search ?? '').trim();
    if (search) {
      where.push('(company LIKE ? OR role LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const column = SORT_COLUMNS[String(q.sort ?? '').toLowerCase()] ?? 'updated_at';
    const direction = String(q.order ?? '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Clamp paging input, same as Math.Max / Math.Clamp in C#.
    const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(q.pageSize, 10) || 10));

    const whereSql = where.join(' AND ');
    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM applications WHERE ${whereSql}`).get(...params);
    //                                                                                     ^ spread: pass array items as separate args
    const rows = db
      .prepare(`SELECT * FROM applications WHERE ${whereSql} ORDER BY ${column} ${direction} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize);

    res.json({ items: rows.map(toDto), page, pageSize, total });
  });

  // GET /api/applications/stats  (defined BEFORE '/:id' so "stats" isn't treated as an id)
  router.get('/stats', (req, res) => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])); // { Wishlist: 0, Applied: 0, ... }
    for (const row of countByStatus.all(req.userId)) byStatus[row.status] = row.count;

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0); // reduce = std::accumulate
    const sent = total - byStatus.Wishlist;
    const responded = byStatus.Interviewing + byStatus.Offer + byStatus.Rejected;
    const responseRatePercent = sent === 0 ? 0 : Math.round((100 * responded) / sent);

    res.json({ total, byStatus, responseRatePercent });
  });

  // GET /api/applications/:id
  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const row = id === null ? undefined : getOne.get(id, req.userId);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    res.json(toDto(row));
  });

  // POST /api/applications
  router.post('/', (req, res) => {
    const { value, errors } = validateApplication(req.body);
    if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });

    const now = new Date().toISOString();
    const v = value;
    const result = insert.run(
      req.userId, v.company, v.role, v.status, v.location, v.salaryLpa, v.jobUrl, v.appliedOn, v.notes, now, now,
    );
    const created = getOne.get(Number(result.lastInsertRowid), req.userId);
    res.status(201).location(`/api/applications/${created.id}`).json(toDto(created));
  });

  // PUT /api/applications/:id
  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null || !getOne.get(id, req.userId)) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const { value, errors } = validateApplication(req.body);
    if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });

    const v = value;
    update.run(
      v.company, v.role, v.status, v.location, v.salaryLpa, v.jobUrl, v.appliedOn, v.notes,
      new Date().toISOString(), id, req.userId,
    );
    res.json(toDto(getOne.get(id, req.userId)));
  });

  // DELETE /api/applications/:id
  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const result = id === null ? { changes: 0 } : remove.run(id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Application not found.' });
    res.sendStatus(204);
  });

  return router;
}

module.exports = { createApplicationsRouter };
