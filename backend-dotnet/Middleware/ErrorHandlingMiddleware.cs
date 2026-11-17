namespace JobTracker.Api.Middleware;

// Global error handler: catches ANY unhandled exception from later middleware/controllers
// and returns a clean JSON 500 instead of crashing or leaking a stack trace to the client.
// C++ view: one try/catch wrapped around the whole request.
// Real-life example: a store manager who handles any complaint the staff couldn't.
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;   // the next step in the pipeline (a function pointer, basically)
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // ASP.NET calls InvokeAsync once per request.
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error on {Method} {Path}", context.Request.Method, context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { error = "Something went wrong." });
        }
    }
}
