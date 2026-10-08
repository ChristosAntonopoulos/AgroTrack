using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/work-records")]
public class WorkRecordsController : BaseApiController
{
    private readonly IWorkRecordService _workRecords;

    public WorkRecordsController(IWorkRecordService workRecords, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _workRecords = workRecords;
    }

    [HttpPost]
    public async Task<ActionResult<WorkRecordDto>> Create(
        [FromBody] CreateWorkRecordDto dto,
        CancellationToken cancellationToken)
    {
        var record = await _workRecords.CreateAsync(
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(record);
    }

    private string ResolveLanguage()
    {
        var header = Request.Headers.AcceptLanguage.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header))
        {
            return "el";
        }

        return header.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? "en" : "el";
    }
}
