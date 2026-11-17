using System.Security.Claims;
using System.Text;
using JobTracker.Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace JobTracker.Api.Services;

// Creates JWTs (JSON Web Tokens).
// A JWT is like a signed cinema ticket: it says WHO you are (claims) and WHEN it expires,
// and it carries a signature only the server can produce. The server doesn't need to
// look anything up to trust it; it just checks the signature. That's why JWT auth is "stateless".
// Format: header.payload.signature (three base64 parts joined with dots).
public class TokenService
{
    private readonly IConfiguration _config;   // reads appsettings.json / environment variables

    public TokenService(IConfiguration config) => _config = config;
    // `=>` here = a one-line method body, same as { _config = config; }

    public string CreateToken(User user)
    {
        // Claims = facts stored inside the token. "sub" (subject) = the user id.
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.Name),
        };

        // HMAC-SHA256 signing with a secret key (symmetric: same key signs and verifies).
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        //                                                              the `!` says "trust me, not null"

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_config.GetValue("Jwt:ExpiryMinutes", 120)),
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
