# Study guide: read this when the interview call comes

Every source file has comments with C++ comparisons. Read in this order (~3–4 hours total).

## Day 1: .NET backend (≈1.5 h)

| # | File | What to learn |
|---|---|---|
| 1 | `backend-dotnet/Program.cs` | DI lifetimes, middleware order, JWT setup |
| 2 | `Models/*.cs`, `Data/AppDbContext.cs` | Entities, EF Core, relationships, indexes |
| 3 | `Dtos/*.cs` | Why DTOs exist (never send `PasswordHash`) |
| 4 | `Controllers/AuthController.cs` | Register/login, hashing, `async/await` |
| 5 | `Controllers/ApplicationsController.cs` | `IQueryable`, filter/sort/paginate, per-user data |
| 6 | `Services/*.cs`, `Middleware/*.cs` | JWT creation, validation, global error handling |

## Day 2: Angular (≈1.5 h)

| # | File | What to learn |
|---|---|---|
| 1 | `app.config.ts`, `app.routes.ts` | Providers, routing, lazy loading, guards |
| 2 | `core/auth.service.ts` | Signals, `computed`, Observables, `tap` |
| 3 | `core/auth.interceptor.ts`, `auth.guard.ts` | Interceptors and guards |
| 4 | `features/auth/login.component.ts` | Reactive forms and validators |
| 5 | `features/applications/application-list.*` | RxJS `debounceTime`, `takeUntilDestroyed`, pagination |
| 6 | `features/applications/application-form.*` | One form for create and edit, server error display |
| 7 | `features/dashboard/dashboard.component.ts` | `forkJoin` (parallel requests) |

## Day 3: Node (≈45 min)

Compare `backend-node/src/app.js` with `Program.cs`, and `routes/applications.js` with `ApplicationsController.cs`. Same logic, with plain SQL instead of an ORM.

## How the pieces map across stacks

| Concept | ASP.NET Core | Express | Angular |
|---|---|---|---|
| Entry point | `Program.cs` | `server.js` / `app.js` | `main.ts` |
| Dependency injection | constructor injection | pass deps into factory | `inject()` |
| Middleware | `app.UseX()` | `app.use(fn)` | HTTP interceptor |
| Auth check | `[Authorize]` | `requireAuth` | route guard |
| Data access | EF Core LINQ | prepared SQL | `HttpClient` service |
| Validation | `ApplicationValidator` | `applicationValidator.js` | `Validators.*` |

## 15 questions you must be able to answer

**.NET**
1. Singleton vs Scoped vs Transient? Why is `DbContext` scoped?
2. What happens, in order, when a request hits `Program.cs`'s pipeline? Why must `UseAuthentication` come before `UseAuthorization`?
3. What is `IQueryable` vs `IEnumerable`? When does the SQL actually run?
4. Why `async`/`await` in controllers? (Thread-pool threads are freed during I/O.)
5. What is a DTO and why not return the entity?
6. How does JWT auth work? What's inside a token, and why can't the client edit it?
7. How are passwords stored? Why hashing with a salt, not encryption?
8. Why does another user's application id return 404, not 403?

**Angular**
9. Component vs service: what goes where?
10. Constructor vs `ngOnInit`?
11. Observable vs Promise? What does `subscribe` do, and why unsubscribe?
12. What are Signals, and how do they differ from RxJS?
13. Reactive vs template-driven forms?
14. What does an interceptor do here? What does a guard do?

**Node**
15. Event loop: why doesn't the Node store need a lock while C# code often does?

## Your 2-minute story

> "I built a job-application tracker with an Angular frontend and the same REST API in both ASP.NET Core and Express, so I could compare the stacks. It has JWT auth, per-user data isolation, search, filters, pagination and a stats dashboard. In .NET I used EF Core with SQLite; in Node I wrote the SQL by hand, which showed me what the ORM generates. One contract test suite runs against both backends to prove they behave identically."

## Make it yours (do at least one before claiming it)

- [ ] Add a `followUpOn` date field end to end (DB → API → form → list column)
- [ ] Add an xUnit test project for `ApplicationValidator`
- [ ] Switch SQLite to PostgreSQL in .NET (`UseNpgsql`)
- [ ] Add a "Follow-ups due" card to the dashboard
