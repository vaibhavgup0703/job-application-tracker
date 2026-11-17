# Multi-stage build: stage 1 has the full SDK (compiler), stage 2 only the small runtime.
# Like compiling with g++ in a build container and shipping just the binary.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY JobTracker.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://0.0.0.0:5000
ENV ConnectionStrings__Default="Data Source=/data/jobtracker.db"
EXPOSE 5000
ENTRYPOINT ["dotnet", "JobTracker.Api.dll"]
