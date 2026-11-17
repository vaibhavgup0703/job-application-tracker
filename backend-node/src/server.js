// Entry point: `npm start`. Same role as Program.cs's app.Run().

const config = require('./config');
const { createDb } = require('./db');
const { createApp } = require('./app');

const db = createDb(config.dbPath);
const app = createApp({ db, config });

app.listen(config.port, () => {
  console.log(`Express JobTracker API on http://localhost:${config.port}`);
});
