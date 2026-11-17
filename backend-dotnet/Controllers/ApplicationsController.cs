using JobTracker.Api.Data;
using JobTracker.Api.Dtos;
using JobTracker.Api.Extensions;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

// CRUD + search + stats for the logged-in user's job applications.
// [Authorize] on the class = EVERY endpoint here needs a valid JWT.
[ApiController]
[Authorize]
[Route("api/applications")]
public class ApplicationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ApplicationsController(AppDbContext db) => _db = db;

    // Every query starts here: "only rows that belong to the caller".
    // IQueryable = a query that is BUILT up step by step and only runs as SQL at the end
    // (ToListAsync/CountAsync). Like composing a std::ranges pipeline that is evaluated lazily.
    private IQueryable<JobApplication> MyApplications()
    {
        var userId = User.GetUserId();   // read once into a local so EF sends it as a SQL parameter
        return _db.Applications.Where(a => a.UserId == userId);
    }

    // GET /api/applications?status=Applied&search=goo&sort=company&order=asc&page=1&pageSize=10
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ApplicationQuery q)
    {
        var query = MyApplications();

        if (!string.IsNullOrWhiteSpace(q.Status))
        {
            if (!q.Status.All(char.IsLetter) || !Enum.TryParse<ApplicationStatus>(q.Status, out var status))
                return BadRequest(new { error = "Invalid status filter." });
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            // LIKE '%term%' on company OR role. SQLite's LIKE ignores case for English letters.
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(a => EF.Functions.Like(a.Company, term) || EF.Functions.Like(a.Role, term));
        }

        var asc = q.Order.Equals("asc", StringComparison.OrdinalIgnoreCase);
        // switch expression: like a C++ switch that returns a value.
        query = (q.Sort.ToLowerInvariant(), asc) switch
        {
            ("company", true) => query.OrderBy(a => a.Company),
            ("company", false) => query.OrderByDescending(a => a.Company),
            ("appliedon", true) => query.OrderBy(a => a.AppliedOn),
            ("appliedon", false) => query.OrderByDescending(a => a.AppliedOn),
            (_, true) => query.OrderBy(a => a.UpdatedAt),            // `_` = default case
            (_, false) => query.OrderByDescending(a => a.UpdatedAt),
        };

        // Pagination: clamp bad input instead of failing (page 0 -> 1, pageSize 500 -> 50).
        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 50);

        var total = await query.CountAsync();               // SELECT COUNT(*) ...
        var rows = await query
            .Skip((page - 1) * pageSize)                    // OFFSET
            .Take(pageSize)                                 // LIMIT
            .ToListAsync();

        return Ok(new PagedResult<ApplicationDto>(rows.Select(a => a.ToDto()).ToList(), page, pageSize, total));
    }

    // GET /api/applications/stats -> counts per status for the dashboard
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        // GROUP BY Status -> [{ Status, Count }]
        var counts = await MyApplications()
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        // Start every status at 0 so the UI always gets all five keys.
        var byStatus = Enum.GetNames<ApplicationStatus>().ToDictionary(n => n, _ => 0);
        foreach (var c in counts) byStatus[c.Status.ToString()] = c.Count;

        var total = byStatus.Values.Sum();
        var sent = total - byStatus["Wishlist"];   // actually applied
        var responded = byStatus["Interviewing"] + byStatus["Offer"] + byStatus["Rejected"];
        var rate = sent == 0 ? 0 : (int)Math.Round(100.0 * responded / sent);

        return Ok(new StatsDto(total, byStatus, rate));
    }

    // GET /api/applications/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var app = await MyApplications().FirstOrDefaultAsync(a => a.Id == id);
        // Someone else's id also gives 404, not 403, so we don't reveal that it exists.
        return app is null ? NotFound(new { error = "Application not found." }) : Ok(app.ToDto());
    }

    // POST /api/applications
    [HttpPost]
    public async Task<IActionResult> Create(ApplicationRequest req)
    {
        var (clean, errors) = ApplicationValidator.Validate(req);
        //  ^ tuple deconstruction, like C++17 structured bindings: auto [clean, errors] = ...
        if (errors is not null) return BadRequest(new { error = "Validation failed", details = errors });

        var app = new JobApplication { UserId = User.GetUserId() };
        Apply(app, clean!);
        _db.Applications.Add(app);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = app.Id }, app.ToDto());
    }

    // PUT /api/applications/5  (full replace of the editable fields)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ApplicationRequest req)
    {
        var app = await MyApplications().FirstOrDefaultAsync(a => a.Id == id);
        if (app is null) return NotFound(new { error = "Application not found." });

        var (clean, errors) = ApplicationValidator.Validate(req);
        if (errors is not null) return BadRequest(new { error = "Validation failed", details = errors });

        Apply(app, clean!);
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();   // EF tracked the changes and sends only an UPDATE for changed columns

        return Ok(app.ToDto());
    }

    // DELETE /api/applications/5 -> 204
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var app = await MyApplications().FirstOrDefaultAsync(a => a.Id == id);
        if (app is null) return NotFound(new { error = "Application not found." });

        _db.Applications.Remove(app);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Copy validated values onto the entity (shared by Create and Update).
    private static void Apply(JobApplication app, ApplicationValidator.Clean c)
    {
        app.Company = c.Company;
        app.Role = c.Role;
        app.Status = c.Status;
        app.Location = c.Location;
        app.SalaryLpa = c.SalaryLpa;
        app.JobUrl = c.JobUrl;
        app.AppliedOn = c.AppliedOn;
        app.Notes = c.Notes;
    }
}
