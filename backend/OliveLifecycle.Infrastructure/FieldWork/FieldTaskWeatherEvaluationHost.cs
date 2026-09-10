using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.Infrastructure.FieldWork;

/// <summary>Periodic re-evaluation of open FieldTask weather suitability (Phase 4).</summary>
public class FieldTaskWeatherEvaluationHost : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FieldTaskWeatherEvaluationHost> _logger;

    public FieldTaskWeatherEvaluationHost(
        IServiceScopeFactory scopeFactory,
        ILogger<FieldTaskWeatherEvaluationHost> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IFieldTaskWeatherEvaluationService>();
                await service.EvaluateOpenTasksAsync(stoppingToken);
                _logger.LogInformation("Field-task weather suitability re-evaluation completed.");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Field-task weather suitability re-evaluation failed.");
            }

            try
            {
                // Align with stale threshold (6h): refresh rankings before forecasts age out.
                await Task.Delay(TimeSpan.FromHours(3), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
