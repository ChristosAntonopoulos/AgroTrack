using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/tasks")]
public class TasksController : BaseApiController
{
    private readonly ITaskService _tasks;

    public TasksController(ITaskService tasks, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _tasks = tasks;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskDto>>> List(
        [FromQuery] string? view,
        [FromQuery] string? fieldId,
        CancellationToken cancellationToken)
    {
        var items = await _tasks.ListAsync(
            view,
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> Get(string id, CancellationToken cancellationToken)
    {
        var task = await _tasks.GetByIdAsync(
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
    public async Task<ActionResult<TaskDto>> Create(
        [FromBody] CreateTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _tasks.CreateAsync(
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return CreatedResult(nameof(Get), new { id = task.Id }, task);
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<TaskDto>> Patch(
        string id,
        [FromBody] PatchTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _tasks.PatchAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<TaskDto>> Complete(string id, CancellationToken cancellationToken)
    {
        var task = await _tasks.CompleteAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/skip")]
    public async Task<ActionResult<TaskDto>> Skip(
        string id,
        [FromBody] SkipTaskDto? dto,
        CancellationToken cancellationToken)
    {
        var task = await _tasks.SkipAsync(
            id,
            dto ?? new SkipTaskDto(),
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/link-work-record")]
    public async Task<ActionResult<TaskDto>> LinkWorkRecord(
        string id,
        [FromBody] LinkWorkRecordDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _tasks.LinkWorkRecordAsync(
            id,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/undo-complete")]
    public async Task<ActionResult<TaskDto>> UndoComplete(string id, CancellationToken cancellationToken)
    {
        var task = await _tasks.UndoCompleteAsync(
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
