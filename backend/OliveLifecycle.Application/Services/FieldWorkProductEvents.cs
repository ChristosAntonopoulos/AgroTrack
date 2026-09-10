using Microsoft.Extensions.Logging;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

/// <summary>
/// Privacy-safe product event stubs. Prefer structured logs over a heavy analytics stack.
/// </summary>
public static class FieldWorkProductEvents
{
    public const string PreferenceChanged = "PreferenceChanged";
    public const string ProposalDismissed = "ProposalDismissed";
    public const string ProfileReviewed = "ProfileReviewed";

    public static void Emit(
        ILogger logger,
        string eventName,
        string fieldId,
        string? userId = null,
        string? templateCode = null,
        string? practiceCategory = null,
        string? detail = null)
    {
        logger.LogInformation(
            "ProductEvent {EventName} FieldId={FieldId} UserId={UserId} TemplateCode={TemplateCode} Practice={Practice} Detail={Detail}",
            eventName,
            fieldId,
            userId ?? string.Empty,
            templateCode ?? string.Empty,
            practiceCategory ?? string.Empty,
            detail ?? string.Empty);
    }
}
