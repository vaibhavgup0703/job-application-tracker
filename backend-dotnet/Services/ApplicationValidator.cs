using System.Globalization;
using JobTracker.Api.Dtos;
using JobTracker.Api.Models;

namespace JobTracker.Api.Services;

// Validates an ApplicationRequest and turns it into clean, typed values.
// `static class` = only static members, like a C++ namespace full of free functions.
public static class ApplicationValidator
{
    // The validated, typed result. Only produced when there are no errors.
    public record Clean(
        string Company, string Role, ApplicationStatus Status, string? Location,
        decimal? SalaryLpa, string? JobUrl, DateOnly? AppliedOn, string? Notes);

    // Returns (result, errors). Exactly one of them is non-null.
    // A tuple return is like std::pair / a struct with two fields.
    public static (Clean? Result, Dictionary<string, string>? Errors) Validate(ApplicationRequest r)
    {
        var errors = new Dictionary<string, string>();   // std::map<std::string, std::string>

        var company = r.Company?.Trim();
        if (string.IsNullOrEmpty(company)) errors["company"] = "Company is required.";
        else if (company.Length > 100) errors["company"] = "Max 100 characters.";

        var role = r.Role?.Trim();
        if (string.IsNullOrEmpty(role)) errors["role"] = "Role is required.";
        else if (role.Length > 100) errors["role"] = "Max 100 characters.";

        // Enum.TryParse: string -> enum, returns false instead of throwing on bad input.
        // `out var status` = an output parameter, like passing a reference (ApplicationStatus&).
        ApplicationStatus status = ApplicationStatus.Applied;
        if (!string.IsNullOrWhiteSpace(r.Status) &&
            (!r.Status.All(char.IsLetter)   // reject "1": TryParse would accept numbers
             || !Enum.TryParse(r.Status, ignoreCase: false, out status)))
        {
            errors["status"] = "Status must be one of: " + string.Join(", ", Enum.GetNames<ApplicationStatus>());
        }

        if (r.SalaryLpa is < 0 or > 1000) errors["salaryLpa"] = "Salary must be between 0 and 1000 LPA.";
        //            ^ pattern matching: "is less than 0 OR greater than 1000"

        var jobUrl = Blank(r.JobUrl);
        if (jobUrl is not null &&
            !(Uri.TryCreate(jobUrl, UriKind.Absolute, out var uri) && (uri.Scheme == "http" || uri.Scheme == "https")))
        {
            errors["jobUrl"] = "Must be a valid http(s) URL.";
        }

        DateOnly? appliedOn = null;
        var appliedText = Blank(r.AppliedOn);
        if (appliedText is not null)
        {
            if (DateOnly.TryParseExact(appliedText, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                appliedOn = d;
            else
                errors["appliedOn"] = "Date must be yyyy-MM-dd.";
        }

        var notes = Blank(r.Notes);
        if (notes is { Length: > 2000 }) errors["notes"] = "Max 2000 characters.";

        if (errors.Count > 0) return (null, errors);

        return (new Clean(company!, role!, status, Blank(r.Location), r.SalaryLpa, jobUrl, appliedOn, notes), null);
    }

    // "" or "   " -> null; otherwise the trimmed text.
    private static string? Blank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
