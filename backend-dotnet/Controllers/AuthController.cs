using System.Text.RegularExpressions;
using JobTracker.Api.Data;
using JobTracker.Api.Dtos;
using JobTracker.Api.Extensions;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

// Handles sign-up, login and "who am I".
// FLOW: register/login -> server returns a JWT -> Angular stores it -> Angular sends it
// in the "Authorization: Bearer <token>" header on every later request.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;
    private readonly IPasswordHasher<User> _hasher;

    // Dependency Injection: ASP.NET creates and passes all three (registered in Program.cs).
    public AuthController(AppDbContext db, TokenService tokens, IPasswordHasher<User> hasher)
    {
        _db = db;
        _tokens = tokens;
        _hasher = hasher;
    }

    // POST /api/auth/register  { name, email, password }  -> 201 { token, user }
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        // `async Task<...>` + `await`: while the database works, this thread is released to
        // serve other requests. Like std::future, but the thread isn't blocked waiting.
        var name = req.Name?.Trim() ?? "";        // `??` = "if null, use this instead"
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        var password = req.Password ?? "";

        var errors = new Dictionary<string, string>();
        if (name.Length is < 2 or > 100) errors["name"] = "Name must be 2–100 characters.";
        if (!Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")) errors["email"] = "Enter a valid email.";
        if (password.Length < 8) errors["password"] = "Password must be at least 8 characters.";
        if (errors.Count > 0) return BadRequest(new { error = "Validation failed", details = errors });

        // AnyAsync -> SQL: SELECT EXISTS(SELECT 1 FROM Users WHERE Email = @email)
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { error = "Email is already registered." });   // 409

        var user = new User { Name = name, Email = email };
        // Hashing = one-way scramble with a random salt (PBKDF2 here). Even if the DB leaks,
        // passwords can't be read back. Real-life example: a fingerprint, not a photocopy of your face.
        user.PasswordHash = _hasher.HashPassword(user, password);

        _db.Users.Add(user);           // staged in memory
        await _db.SaveChangesAsync();  // INSERT runs now; user.Id is filled in by the database

        var response = new AuthResponse(_tokens.CreateToken(user), user.ToDto());
        return StatusCode(StatusCodes.Status201Created, response);
    }

    // POST /api/auth/login  { email, password }  -> 200 { token, user } or 401
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        // Same message for "no such user" and "wrong password", so attackers can't
        // discover which emails are registered.
        if (user is null ||
            _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password ?? "") == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        return Ok(new AuthResponse(_tokens.CreateToken(user), user.ToDto()));
    }

    // GET /api/auth/me  (needs a valid token) -> 200 user
    [Authorize]   // without a valid JWT, ASP.NET returns 401 before this method even runs
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _db.Users.FindAsync(User.GetUserId());   // `User` here = the token's ClaimsPrincipal
        return user is null ? Unauthorized(new { error = "User no longer exists." }) : Ok(user.ToDto());
    }
}
