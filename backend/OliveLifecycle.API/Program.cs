using System.Text;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OliveLifecycle.API.Infrastructure;
using OliveLifecycle.API.Middleware;
using OliveLifecycle.Application;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Infrastructure;
using OliveLifecycle.Infrastructure.MongoDB;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddFluentValidationClientsideAdapters();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Olive Lifecycle Platform API",
        Version = "v1",
        Description = "API for managing olive cultivation lifecycle"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddApplication();
builder.Services.Configure<SubscriptionOptions>(
    builder.Configuration.GetSection(SubscriptionOptions.SectionName));
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var corsAllowedHost = builder.Configuration["Cors:AllowedHost"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod();

        if (corsOrigins.Length > 0 || !string.IsNullOrWhiteSpace(corsAllowedHost))
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                if (corsOrigins.Any(o => string.Equals(o, origin, StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }

                return !string.IsNullOrWhiteSpace(corsAllowedHost)
                    && string.Equals(uri.Host, corsAllowedHost, StringComparison.OrdinalIgnoreCase);
            });
        }
        else
        {
            policy.AllowAnyOrigin();
        }
    });
});

var mongoDatabaseName = builder.Configuration["MongoDB:DatabaseName"] ?? "OliveLifecycle";
builder.Services.AddHealthChecks()
    .AddMongoDb(
        databaseNameFactory: _ => mongoDatabaseName,
        name: "mongodb");

var jwtSecretKey = builder.Configuration["JWT:SecretKey"];
var jwtIssuer = builder.Configuration["JWT:Issuer"];
var jwtAudience = builder.Configuration["JWT:Audience"];

if (string.IsNullOrEmpty(jwtSecretKey))
{
    throw new InvalidOperationException("JWT secret key is not configured. Set JWT__SecretKey environment variable.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(PolicyNames.RequireFieldOwner, policy =>
        policy.RequireRole(Roles.FieldOwner, Roles.Administrator));

    options.AddPolicy(PolicyNames.RequireAdministrator, policy =>
        policy.RequireRole(Roles.Administrator));

    options.AddPolicy(PolicyNames.CanManageUsers, policy =>
        policy.RequireRole(Roles.FieldOwner, Roles.Administrator));
});

var app = builder.Build();

// CLI: migrate-tasks (dry-run default; --confirm for writes)
if (args.Any(a => string.Equals(a, "migrate-tasks", StringComparison.OrdinalIgnoreCase)))
{
    var confirm = args.Any(a => string.Equals(a, "--confirm", StringComparison.OrdinalIgnoreCase));
    using var scope = app.Services.CreateScope();
    var migrator = scope.ServiceProvider.GetRequiredService<OliveLifecycle.Application.Services.ITasksDomainMigrationService>();
    var report = await migrator.RunAsync(confirm);
    Console.WriteLine("=== Tasks Domain Migration ===");
    Console.WriteLine($"Mode: {(confirm ? "CONFIRM (writes)" : "DRY-RUN")}");
    Console.WriteLine($"Tasks scanned: {report.TasksScanned}");
    Console.WriteLine($"Executions scanned: {report.ExecutionsScanned}");
    Console.WriteLine("Status counts (before → after):");
    foreach (var key in report.StatusCountsBefore.Keys.Union(report.StatusCountsAfter.Keys).OrderBy(k => k))
    {
        var before = report.StatusCountsBefore.GetValueOrDefault(key);
        var after = report.StatusCountsAfter.GetValueOrDefault(key);
        Console.WriteLine($"  {key}: {before} → {after}");
    }

    Console.WriteLine("Owner counts:");
    foreach (var (owner, count) in report.OwnerCounts.OrderByDescending(kv => kv.Value))
    {
        Console.WriteLine($"  {owner}: {count}");
    }

    Console.WriteLine($"Open proposals {(confirm ? "deleted" : "to delete")}: {report.OpenProposalsDeleted}");
    Console.WriteLine($"Tasks updated: {report.TasksUpdated}");
    Console.WriteLine($"Executions linked: {report.ExecutionsLinked}");
    foreach (var message in report.Messages)
    {
        Console.WriteLine(message);
    }

    return;
}

app.UseCors("Frontend");

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

var uploadPathSetting = builder.Configuration["Storage:LocalPath"] ?? "uploads";
var uploadPath = Path.IsPathRooted(uploadPathSetting)
    ? uploadPathSetting
    : Path.Combine(app.Environment.ContentRootPath, uploadPathSetting);
Directory.CreateDirectory(uploadPath);

// Photo Hub originals/thumbs must use signed /api/v1/photos/{id}/content URLs — block anonymous static access.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    if (path.Contains("/uploads/photos/", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/uploads/photos", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadPath),
    // PublicBasePath may be an absolute URL for clients; the HTTP path stays /uploads.
    RequestPath = GetUploadsRequestPath(builder.Configuration["Storage:PublicBasePath"])
});

app.UseAuthentication();
app.UseMiddleware<AnonymousAuthBypassMiddleware>();
app.UseAuthorization();
app.UseMiddleware<UserActivityMiddleware>();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

static PathString GetUploadsRequestPath(string? publicBasePath)
{
    var value = string.IsNullOrWhiteSpace(publicBasePath) ? "/uploads" : publicBasePath.Trim();
    if (Uri.TryCreate(value, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.Host))
    {
        value = uri.AbsolutePath;
    }

    if (!value.StartsWith('/'))
    {
        value = "/" + value;
    }

    var cut = value.IndexOfAny(['?', '#']);
    if (cut >= 0)
    {
        value = value[..cut];
    }

    value = value.TrimEnd('/');
    return string.IsNullOrEmpty(value) ? "/uploads" : value;
}

public partial class Program;
