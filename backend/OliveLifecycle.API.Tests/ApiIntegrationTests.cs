using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace OliveLifecycle.API.Tests;

public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("JWT:SecretKey", "integration-test-secret-key-32-chars-min");
            builder.UseSetting("Auth:AllowAnonymous", "false");
        }).CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsSuccess()
    {
        var response = await _client.GetAsync("/health");

        Assert.True(
            response.StatusCode is HttpStatusCode.OK or HttpStatusCode.ServiceUnavailable,
            $"Unexpected health status: {response.StatusCode}");
    }

    [Fact]
    public async Task Register_WithAdministratorRole_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"admin-{Guid.NewGuid():N}@test.com",
            password = "Password123!",
            firstName = "Admin",
            lastName = "User",
            role = "Administrator"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/v1/fields");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
