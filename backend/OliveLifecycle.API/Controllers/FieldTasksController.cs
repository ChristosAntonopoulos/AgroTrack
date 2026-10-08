using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

/// <summary>
/// Legacy field-tasks routes kept for work-profile/phenology-adjacent clients and thin list/get/mutate compat.
/// Lifecycle actions start/pause/block/resume were removed — use /api/v1/tasks instead.
/// </summary>
[Authorize]
[Route("api/v1/field-tasks")]
public class FieldTasksController : BaseApiController
{
    private readonly IFieldTaskService _fieldTasks;

    public FieldTasksController(IFieldTaskService fieldTasks, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _fieldTasks = fieldTasks;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FieldTaskDto>>> List(
        [FromQuery] string? fieldId,
        [FromQuery] int? resultYear,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var items = await _fieldTasks.ListAsync(
            fieldId,
            resultYear,
            status,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FieldTaskDto>> Get(string id, CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.GetByIdAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        if (task is null)
        {
            return NotFound();
        }

        return OkResult(task);
    }

    [HttpPost]
    public async Task<ActionResult<FieldTaskDto>> Create(
        [FromBody] CreateFieldTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.CreateAsync(
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return CreatedResult(nameof(Get), new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FieldTaskDto>> Update(
        string id,
        [FromBody] UpdateFieldTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.UpdateAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<FieldTaskDto>> Complete(
        string id,
        [FromBody] CompleteFieldTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.CompleteAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("executions/{executionId}/undo")]
    public async Task<ActionResult<FieldTaskDto>> UndoCompletion(
        string executionId,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.UndoCompletionAsync(
            executionId,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<FieldTaskDto>> Cancel(string id, CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.CancelAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/reschedule")]
    public async Task<ActionResult<FieldTaskDto>> Reschedule(
        string id,
        [FromBody] RescheduleFieldTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.RescheduleAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/assign")]
    public async Task<ActionResult<FieldTaskDto>> Assign(
        string id,
        [FromBody] AssignFieldTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.AssignAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/checklist/{key}")]
    public async Task<ActionResult<FieldTaskDto>> SetChecklistItem(
        string id,
        string key,
        [FromBody] SetChecklistItemDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.SetChecklistItemAsync(
            id,
            key,
            dto.Completed,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/skip")]
    public async Task<ActionResult<FieldTaskDto>> Skip(
        string id,
        [FromBody] SkipTaskDto? dto,
        CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.SkipAsync(
            id,
            dto?.Reason,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/reopen")]
    public async Task<ActionResult<FieldTaskDto>> Reopen(string id, CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.ReopenAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
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
