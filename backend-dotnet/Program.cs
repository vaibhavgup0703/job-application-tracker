// Program.cs = main(). Two phases: (1) register services, (2) build the request pipeline, then run.

using System.Text;
using JobTracker.Api.Data;
using JobTracker.Api.Middleware;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;   // appsettings.json + environment variables (env wins)

// ================= 1. SERVICES (Dependency Injection container) =================
// Lifetimes:  Singleton = one for the app | Scoped = one per HTTP request | Transient = new each time

builder.Services.AddControllers();

// Database: AddDbContext registers AppDbContext as SCOPED. Each request gets its own
// context, like a fresh DB session per customer, so requests never share half-done changes.
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(config.GetConnectionString("Default")));

builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// Authentication: "how do we know WHO is calling?" -> by validating the JWT.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // keep claim names as-is ("sub"), don't rename them
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = config["Jwt:Audience"],
            ValidateLifetime = true,                  // reject expired tokens
            ValidateIssuerSigningKey = true,          // reject tokens signed with another key
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
// Authorization: "is this caller ALLOWED?" Here: any logged-in user (via [Authorize]).
builder.Services.AddAuthorization();

// CORS: which websites (origins) may call this API from a browser.
// Locally that's the Angular dev server; in production it's the Vercel URL, set through the
// environment variable Cors__AllowedOrigin (comma-separate several). A bare host like
// "myapp.vercel.app" gets "https://" added, and a trailing "/" is removed (browsers send origins without it).
var allowedOrigins = (config["Cors:AllowedOrigin"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(o => (o.StartsWith("http://") || o.StartsWith("https://") ? o : "https://" + o).TrimEnd('/'))
    .Append("http://localhost:4200")
    .Distinct()
    .ToArray();
builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

// Create the SQLite file and tables on first run (no migration tooling needed to start).
// `using var` = the scope object is disposed at the end of the block, exactly like C++ RAII.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Hosted demo only: refill the demo account after Render wipes the disk (see Data/DemoSeeder.cs).
    if (config.GetValue<bool>("Demo:Enabled"))
        DemoSeeder.Seed(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>());
}

// ================= 2. MIDDLEWARE PIPELINE (ORDER MATTERS) =================
// Request goes top -> bottom, response comes back bottom -> top. Like layers of an onion.
app.UseMiddleware<ErrorHandlingMiddleware>();   // outermost: catches errors from everything below
app.UseCors("Frontend");                        // must run before auth so preflight OPTIONS succeed
app.UseAuthentication();                        // reads the token -> sets HttpContext.User
app.UseAuthorization();                         // enforces [Authorize]
app.MapControllers();                           // finally: route to the controller method

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));   // for Docker / uptime checks

// Where to listen:
//   - Render (and most cloud hosts) tell the app its port through the PORT environment variable.
//     0.0.0.0 = accept connections from outside the container, not just from inside it.
//   - Docker Compose sets ASPNETCORE_URLS instead; passing null means "use that".
//   - Otherwise (your laptop): http://localhost:5000.
var port = Environment.GetEnvironmentVariable("PORT");
string? url = port is not null ? $"http://0.0.0.0:{port}"
            : Environment.GetEnvironmentVariable("ASPNETCORE_URLS") is not null ? null
            : "http://localhost:5000";
app.Run(url);
