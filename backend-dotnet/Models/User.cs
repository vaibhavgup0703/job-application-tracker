namespace JobTracker.Api.Models;

// ENTITY = a class EF Core maps to a table. Each property becomes a column.
// C++ view: a struct whose instances are rows in the "Users" table.
public class User
{
    public int Id { get; set; }                       // "Id" is the primary key by convention
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";           // unique index set in AppDbContext
    public string PasswordHash { get; set; } = "";    // NEVER store the plain password
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property: one user has many applications (a 1-to-many relationship).
    public List<JobApplication> Applications { get; set; } = new();
}
