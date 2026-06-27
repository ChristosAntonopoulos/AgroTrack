# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY OliveLifecycle.sln ./
COPY OliveLifecycle.API/OliveLifecycle.API.csproj OliveLifecycle.API/
COPY OliveLifecycle.Application/OliveLifecycle.Application.csproj OliveLifecycle.Application/
COPY OliveLifecycle.Infrastructure/OliveLifecycle.Infrastructure.csproj OliveLifecycle.Infrastructure/
COPY OliveLifecycle.Core/OliveLifecycle.Core.csproj OliveLifecycle.Core/
COPY OliveLifecycle.Common/OliveLifecycle.Common.csproj OliveLifecycle.Common/

RUN dotnet restore OliveLifecycle.API/OliveLifecycle.API.csproj

COPY . .
RUN dotnet publish OliveLifecycle.API/OliveLifecycle.API.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "OliveLifecycle.API.dll"]
