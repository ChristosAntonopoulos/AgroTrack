using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/tasks")]
public class TasksController : BaseApiController
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks(
        [FromQuery] string? fieldId,
        [FromQuery] string? assignedTo,
        CancellationToken cancellationToken)
    {
        IEnumerable<TaskDto> tasks;

        if (!string.IsNullOrEmpty(assignedTo))
        {
            if (assignedTo != UserContext.UserId &&
                UserContext.Role != Roles.FieldOwner &&
                UserContext.Role != Roles.Administrator)
            {
                return Forbid();
            }

            tasks = await _taskService.GetTasksByAssignedToAsync(assignedTo, cancellationToken);
        }
        else if (!string.IsNullOrEmpty(fieldId))
        {
            tasks = await _taskService.GetTasksByFieldIdAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        }
        else
        {
            tasks = await _taskService.GetTasksForUserAsync(UserContext.UserId, UserContext.Role, cancellationToken);
        }

        return OkResult(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(string id, CancellationToken cancellationToken)
    {
        var task = await _taskService.GetTaskByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (task == null)
        {
            return NotFound();
        }

        return OkResult(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto createTaskDto, CancellationToken cancellationToken)
    {
        var task = await _taskService.CreateTaskAsync(createTaskDto, UserContext.UserId, UserContext.Role, cancellationToken);
        return CreatedResult(nameof(GetTask), new { id = task.Id }, task);
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<TaskDto>> UpdateTaskStatus(string id, [FromBody] UpdateTaskStatusDto updateDto, CancellationToken cancellationToken)
    {
        var task = await _taskService.UpdateTaskStatusAsync(id, updateDto.Status, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/evidence")]
    public async Task<ActionResult<TaskDto>> AddEvidence(string id, [FromBody] AddEvidenceDto evidenceDto, CancellationToken cancellationToken)
    {
        var task = await _taskService.AddEvidenceAsync(id, evidenceDto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(task);
    }

    [HttpPut("{id}/assign")]
    public async Task<ActionResult<TaskDto>> AssignTask(string id, [FromBody] AssignTaskDto assignDto, CancellationToken cancellationToken)
    {
        var task = await _taskService.AssignTaskAsync(id, assignDto.AssignedTo, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<TaskDto>> ApproveTask(string id, [FromBody] TaskApprovalDto dto, CancellationToken cancellationToken)
    {
        var task = await _taskService.ApproveTaskAsync(id, dto.Note, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(task);
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<TaskDto>> RejectTask(string id, [FromBody] TaskApprovalDto dto, CancellationToken cancellationToken)
    {
        var task = await _taskService.RejectTaskAsync(id, dto.Note, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(task);
    }
}
