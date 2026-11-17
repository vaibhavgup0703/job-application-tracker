// JWT create/verify. Same claims and settings as TokenService.cs, so a token works the same way
// in both backends' logic (not across them, unless you give both the same secret).

const jwt = require('jsonwebtoken');

function createToken(user, jwtConfig) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, name: user.name }, // payload ("claims")
    jwtConfig.secret,
    {
      algorithm: 'HS256',
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  );
}

// Throws if the token is invalid, expired, or signed with another key.
function verifyToken(token, jwtConfig) {
  return jwt.verify(token, jwtConfig.secret, {
    algorithms: ['HS256'], // pin the algorithm: never trust the token's own header for this
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
}

module.exports = { createToken, verifyToken };
