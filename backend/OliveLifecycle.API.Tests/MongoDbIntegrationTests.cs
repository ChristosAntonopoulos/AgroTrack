using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.MongoDb;
using Xunit;

namespace OliveLifecycle.API.Tests;

public class MongoDbIntegrationFixture : IAsyncLifetime
{
    private MongoDbContainer? _mongoContainer;

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public HttpClient Client { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        _mongoContainer = new MongoDbBuilder()
            .WithImage("mongo:7.0")
            .Build();

        await _mongoContainer.StartAsync();

        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("MongoDB:ConnectionString", _mongoContainer.GetConnectionString());
            builder.UseSetting("MongoDB:DatabaseName", $"OliveLifecycleTest_{Guid.NewGuid():N}");
            builder.UseSetting("JWT:SecretKey", "integration-test-secret-key-32-chars-min");
            builder.UseSetting("JWT:Issuer", "OliveLifecycleAPI");
            builder.UseSetting("JWT:Audience", "OliveLifecycleClients");
            builder.UseSetting("Auth:AllowAnonymous", "false");
        });

        Client = Factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();
        if (Factory != null)
        {
            await Factory.DisposeAsync();
        }
        if (_mongoContainer != null)
        {
            await _mongoContainer.DisposeAsync();
        }
    }
}

public class AuthAndFieldIntegrationTests : IClassFixture<MongoDbIntegrationFixture>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthAndFieldIntegrationTests(MongoDbIntegrationFixture fixture)
    {
        _client = fixture.Client;
    }

    [Fact]
    public async Task Register_Login_AndFieldCrud_HappyPath()
    {
        var email = $"owner-{Guid.NewGuid():N}@test.com";
        const string password = "Password123!";

        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password,
            firstName = "Test",
            lastName = "Owner",
            role = "FieldOwner"
        });

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var registerBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(registerBody);
        Assert.False(string.IsNullOrWhiteSpace(registerBody.Token));

        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email,
            password
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(loginBody);
        Assert.False(string.IsNullOrWhiteSpace(loginBody.Token));

        var createFieldRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/fields");
        createFieldRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginBody.Token);
        createFieldRequest.Content = JsonContent.Create(new
        {
            name = "Integration Test Grove",
            area = 4.2,
            irrigationStatus = true,
            variety = "Koroneiki"
        });

        var createFieldResponse = await _client.SendAsync(createFieldRequest);
        Assert.Equal(HttpStatusCode.Created, createFieldResponse.StatusCode);

        var createdField = await createFieldResponse.Content.ReadFromJsonAsync<FieldResponse>(JsonOptions);
        Assert.NotNull(createdField);
        Assert.Equal("Integration Test Grove", createdField.Name);

        var listFieldsRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/fields");
        listFieldsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginBody.Token);
        var listFieldsResponse = await _client.SendAsync(listFieldsRequest);

        Assert.Equal(HttpStatusCode.OK, listFieldsResponse.StatusCode);
        var fields = await listFieldsResponse.Content.ReadFromJsonAsync<List<FieldResponse>>(JsonOptions);
        Assert.NotNull(fields);
        Assert.Contains(fields, f => f.Id == createdField.Id && f.Name == "Integration Test Grove");
    }

    private sealed class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    private sealed class FieldResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public double Area { get; set; }
    }
}
