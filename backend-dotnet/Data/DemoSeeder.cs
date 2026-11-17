using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Data;

// Creates a demo account with sample applications so the hosted app never looks empty.
// WHY: Render's free tier wipes the SQLite file on every restart/redeploy (ephemeral disk).
// Running this at startup refills the "showroom" each time, like a shop resetting its display every morning.
// Turned on only when the setting Demo:Enabled = true (env var Demo__Enabled=true on Render).
public static class DemoSeeder
{
    public const string Email = "demo@jobtracker.dev";
    public const string Password = "Demo@12345";

    public static void Seed(AppDbContext db, IPasswordHasher<User> hasher)
    {
        // Already seeded (server restarted but the disk survived)? Do nothing. Makes the seed "idempotent":
        // running it twice gives the same result as running it once.
        if (db.Users.Any(u => u.Email == Email)) return;

        var user = new User { Name = "Demo User", Email = Email };
        user.PasswordHash = hasher.HashPassword(user, Password);

        // Dates relative to "today", so the demo always looks recent.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        JobApplication App(string company, string role, ApplicationStatus status, int daysAgo,
                           string? location = null, decimal? salary = null, string? notes = null) =>
            new()   // local function: a small helper defined inside a method (like a lambda with a name)
            {
                Company = company, Role = role, Status = status, Location = location, SalaryLpa = salary,
                AppliedOn = status == ApplicationStatus.Wishlist ? null : today.AddDays(-daysAgo),
                Notes = notes,
                UpdatedAt = DateTime.UtcNow.AddHours(-daysAgo * 6),
            };

        user.Applications.AddRange(new[]
        {
            App("Microsoft", ".NET Developer", ApplicationStatus.Interviewing, 6, "Noida", 18, "Round 2 (system design) scheduled"),
            App("Zoho", "Angular Developer", ApplicationStatus.Applied, 3, "Chennai", 12),
            App("Razorpay", "Backend Engineer (Node.js)", ApplicationStatus.Offer, 21, "Bengaluru", 22, "Offer received, decision due Friday"),
            App("Adobe", "Software Engineer", ApplicationStatus.Rejected, 30, "Noida", 20, "Rejected after DSA round"),
            App("Paytm", "Full Stack Developer", ApplicationStatus.Applied, 2, "Noida", 14),
            App("Infosys", "Senior Systems Engineer (.NET)", ApplicationStatus.Interviewing, 10, "Gurugram", 9),
            App("Swiggy", "SDE 1", ApplicationStatus.Wishlist, 0, "Bengaluru"),
            App("Nagarro", "Angular + .NET Engineer", ApplicationStatus.Applied, 1, "Gurugram", 11),
        });

        db.Users.Add(user);   // EF also inserts the 8 applications, because they hang off user.Applications
        db.SaveChanges();
    }
}
