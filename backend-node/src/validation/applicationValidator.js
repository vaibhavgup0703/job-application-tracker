// Mirrors Services/ApplicationValidator.cs: same rules, same error messages, same field names.
// Returns { value } when valid, or { errors } (field -> message) when not.

const { STATUSES } = require('../db');

// "" / "   " / null / undefined -> null; otherwise the trimmed string.
function blank(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  // Reject impossible dates like 2026-02-31 (JS would silently roll them into March).
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

function validateApplication(body = {}) {
  const errors = {};

  const company = typeof body.company === 'string' ? body.company.trim() : '';
  if (!company) errors.company = 'Company is required.';
  else if (company.length > 100) errors.company = 'Max 100 characters.';

  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!role) errors.role = 'Role is required.';
  else if (role.length > 100) errors.role = 'Max 100 characters.';

  let status = 'Applied';
  if (blank(body.status) !== null) {
    if (STATUSES.includes(body.status)) status = body.status;
    else errors.status = `Status must be one of: ${STATUSES.join(', ')}`;
  }

  let salaryLpa = null;
  if (body.salaryLpa !== null && body.salaryLpa !== undefined) {
    if (typeof body.salaryLpa !== 'number' || body.salaryLpa < 0 || body.salaryLpa > 1000) {
      errors.salaryLpa = 'Salary must be between 0 and 1000 LPA.';
    } else {
      salaryLpa = body.salaryLpa;
    }
  }

  const jobUrl = blank(body.jobUrl);
  if (jobUrl !== null) {
    try {
      const u = new URL(jobUrl); // throws on invalid URLs
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      errors.jobUrl = 'Must be a valid http(s) URL.';
    }
  }

  const appliedOn = blank(body.appliedOn);
  if (appliedOn !== null && !isValidDate(appliedOn)) errors.appliedOn = 'Date must be yyyy-MM-dd.';

  const notes = blank(body.notes);
  if (notes !== null && notes.length > 2000) errors.notes = 'Max 2000 characters.';

  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: { company, role, status, location: blank(body.location), salaryLpa, jobUrl, appliedOn, notes },
  };
}

module.exports = { validateApplication };
