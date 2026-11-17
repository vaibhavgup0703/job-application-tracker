using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Data;

// DbContext = your session with the database. Each DbSet<T> is a table you can query with LINQ.
// Real-life example: a bank teller window. You hand over requests (queries/changes),
// and SaveChanges() is the moment the teller actually commits them to the ledger.
public class AppDbContext : DbContext
{
    // Constructor receives options (connection string, provider) from DI in Program.cs.
    // `: base(options)` = calling the base-class constructor, like C++'s member-init list.
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<JobApplication> Applications => Set<JobApplication>();

    // Fine-tune how classes map to tables (Fluent API).
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();        // DB rejects duplicate emails
            e.Property(u => u.Email).HasMaxLength(200);
            e.Property(u => u.Name).HasMaxLength(100);
        });

        model.Entity<JobApplication>(e =>
        {
            e.Property(a => a.Company).HasMaxLength(100);
            e.Property(a => a.Role).HasMaxLength(100);
            e.Property(a => a.Status).HasConversion<string>();   // store "Applied", not 1
            e.Property(a => a.SalaryLpa).HasConversion<double?>(); // SQLite has no decimal type
            e.HasIndex(a => new { a.UserId, a.Status });         // speeds up "my apps by status"

            // Delete a user -> delete their applications too.
            e.HasOne(a => a.User)
             .WithMany(u => u.Applications)
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
