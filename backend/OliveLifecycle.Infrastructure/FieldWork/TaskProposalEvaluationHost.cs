using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.Infrastructure.FieldWork;

/// <summary>Daily proposal evaluation for active fields (Phase 2 schedule).</summary>
public class TaskProposalEvaluationHost : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TaskProposalEvaluationHost> _logger;

    public TaskProposalEvaluationHost(
        IServiceScopeFactory scopeFactory,
        ILogger<TaskProposalEvaluationHost> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Stagger startup; then run about once per day.
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
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
                var engine = scope.ServiceProvider.GetRequiredService<ITaskProposalEngine>();
                var created = await engine.EvaluateActiveFieldsAsync(stoppingToken);
                _logger.LogInformation("Field-work proposal evaluation created or refreshed {Count} proposals.", created);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Field-work proposal evaluation failed.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
