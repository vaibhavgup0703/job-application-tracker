namespace JobTracker.Api.Models;

// One job you applied to (or plan to). Belongs to exactly one User.
public class JobApplication
{
    public int Id { get; set; }
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    public string? Location { get; set; }          // `?` = optional column (NULL allowed)
    public decimal? SalaryLpa { get; set; }        // decimal = exact money type (no float rounding)
    public string? JobUrl { get; set; }
    public DateOnly? AppliedOn { get; set; }       // a date with no time, like "2026-11-17"
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // FOREIGN KEY: which user owns this row. Every query filters on it,
    // so one user can never see another user's applications.
    public int UserId { get; set; }
    public User? User { get; set; }
}
