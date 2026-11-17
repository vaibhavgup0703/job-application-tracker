// All middleware in one file. Each is a function (req, res, next).
// Calling next() passes the request on; calling next(err) jumps to the error handler.
// .NET equivalents are noted on each.

const { verifyToken } = require('../services/tokens');

// Logs "METHOD /path -> status (ms)". (.NET: built-in logging)
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
}

// CORS by hand. (.NET: AddCors + UseCors)
// The browser sends an OPTIONS "preflight" before PUT/DELETE or requests with an
// Authorization header, asking "may I?". We answer yes for our frontend's origin only.
function cors(allowedOrigin) {
  // A function that RETURNS middleware: a factory, so the origin can be configured.
  // C++ view: a lambda capturing `allowedOrigin` by value.
  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

// Protects routes: requires "Authorization: Bearer <jwt>". (.NET: UseAuthentication + [Authorize])
function requireAuth(jwtConfig) {
  return (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    try {
      const payload = verifyToken(token, jwtConfig);
      req.userId = Number(payload.sub); // attach the caller's id for the route handlers
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };
}

// Unknown URL -> 404 JSON.
function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// Error handler: Express recognises it by its FOUR parameters. (.NET: ErrorHandlingMiddleware)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
}

module.exports = { requestLogger, cors, requireAuth, notFound, errorHandler };
