namespace JobTracker.Api.Dtos;

// Body for POST and PUT. Everything is nullable/string so WE validate it
// (ApplicationValidator) and return the same error format as the Express backend.
public record ApplicationRequest(
    string? Company,
    string? Role,
    string? Status,
    string? Location,
    decimal? SalaryLpa,
    string? JobUrl,
    string? AppliedOn,     // "yyyy-MM-dd"
    string? Notes);

// What we send back for one application.
public record ApplicationDto(
    int Id,
    string Company,
    string Role,
    string Status,
    string? Location,
    decimal? SalaryLpa,
    string? JobUrl,
    string? AppliedOn,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

// Query string for the list endpoint: /api/applications?status=Applied&search=goo&page=2
// Default values are used when the client leaves a parameter out.
public class ApplicationQuery
{
    public string? Status { get; set; }
    public string? Search { get; set; }
    public string Sort { get; set; } = "updatedAt";   // updatedAt | appliedOn | company
    public string Order { get; set; } = "desc";       // asc | desc
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

// A page of results + totals, so the UI can draw "Page 2 of 5".
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);
//                       ^ generic record, like template<typename T> struct PagedResult

public record StatsDto(int Total, Dictionary<string, int> ByStatus, int ResponseRatePercent);
