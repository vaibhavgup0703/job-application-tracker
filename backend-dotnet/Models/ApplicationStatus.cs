namespace JobTracker.Api.Models;

// The pipeline a job application moves through.
// Same as a C++ `enum class`. Stored as TEXT in the database (see AppDbContext)
// so the data stays readable and both backends share one format.
public enum ApplicationStatus
{
    Wishlist,
    Applied,
    Interviewing,
    Offer,
    Rejected
}
