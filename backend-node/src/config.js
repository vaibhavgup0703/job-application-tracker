// Settings, read from environment variables with safe local defaults.
// Same role as appsettings.json in .NET. `??` = "use the right side if the left is null/undefined".
// In production, ALWAYS set JWT_SECRET to a long random value.

module.exports = {
  port: Number(process.env.PORT ?? 5000),
  dbPath: process.env.DB_PATH ?? 'jobtracker.db',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me-it-must-be-at-least-32-bytes-long',
    issuer: 'JobTracker',
    audience: 'JobTracker',
    expiresIn: '2h',
  },
};
