// Builds the Express app (but does not start listening), so tests can create one
// with an in-memory database. server.js is the real entry point.

const express = require('express');
const mw = require('./middleware');
const { createAuthRouter } = require('./routes/auth');
const { createApplicationsRouter } = require('./routes/applications');

function createApp({ db, config, log = true }) {
  const app = express();

  // ---- MIDDLEWARE PIPELINE: top to bottom for every request (order matters, like Program.cs) ----
  if (log) app.use(mw.requestLogger);
  app.use(mw.cors(config.corsOrigin));
  app.use(express.json({ limit: '100kb' })); // parse JSON bodies into req.body

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ db, config }));
  app.use('/api/applications', createApplicationsRouter({ db, config }));

  app.use(mw.notFound);      // nothing matched -> 404
  app.use(mw.errorHandler);  // anything threw -> 400/500 JSON (must be LAST)

  return app;
}

module.exports = { createApp };
