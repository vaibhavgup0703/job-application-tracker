using System.Globalization;
using System.Security.Claims;
using JobTracker.Api.Dtos;
using JobTracker.Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;

namespace JobTracker.Api.Extensions;

// EXTENSION METHODS: `this` on the first parameter lets you call the function as if it
// were a member:  user.ToDto()  instead of  MappingExtensions.ToDto(user).
// C++ has nothing identical; think of a free function with nicer call syntax.
public static class MappingExtensions
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Name, u.Email);

    public static ApplicationDto ToDto(this JobApplication a) => new(
        a.Id, a.Company, a.Role, a.Status.ToString(), a.Location, a.SalaryLpa, a.JobUrl,
        a.AppliedOn?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        a.Notes,
        DateTime.SpecifyKind(a.CreatedAt, DateTimeKind.Utc),   // SQLite forgets "this is UTC"; restore it
        DateTime.SpecifyKind(a.UpdatedAt, DateTimeKind.Utc));

    // Reads the logged-in user's id from the validated JWT ("sub" claim).
    // ClaimsPrincipal = "the current user" object ASP.NET builds from the token.
    public static int GetUserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}
