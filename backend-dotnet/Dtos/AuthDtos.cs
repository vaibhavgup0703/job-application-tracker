namespace JobTracker.Api.Dtos;

// DTO = Data Transfer Object: the exact JSON shape that crosses the network.
// WHY not send the User entity directly? It contains PasswordHash. DTOs decide
// precisely what goes out and what comes in. (Common interview question.)
// `record` = immutable data class with value equality, like a struct with const members.

public record RegisterRequest(string? Name, string? Email, string? Password);

public record LoginRequest(string? Email, string? Password);

public record UserDto(int Id, string Name, string Email);

public record AuthResponse(string Token, UserDto User);
