using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[ApiController]
[Route("api/v1/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(ITaskService taskService, ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks([FromQuery] string? fieldId, [FromQuery] string? assignedTo)
    {
        try
        {
            IEnumerable<TaskDto> tasks;
            
            if (!string.IsNullOrEmpty(assignedTo))
            {
                tasks = await _taskService.GetTasksByAssignedToAsync(assignedTo);
            }
            else if (!string.IsNullOrEmpty(fieldId))
            {
                tasks = await _taskService.GetTasksByFieldIdAsync(fieldId);
            }
            else
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }
                tasks = await _taskService.GetTasksByAssignedToAsync(userId);
            }

            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tasks");
            return StatusCode(500, new { message = "An error occurred while retrieving tasks." });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(string id)
    {
        try
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            if (task == null)
            {
                return NotFound();
            }

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving task {TaskId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the task." });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto createTaskDto)
    {
        try
        {
            var task = await _taskService.CreateTaskAsync(createTaskDto);
            _logger.LogInformation("Task created: {TaskId}", task.Id);
            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return StatusCode(500, new { message = "An error occurred while creating the task." });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<TaskDto>> UpdateTaskStatus(string id, [FromBody] UpdateTaskStatusDto updateDto)
    {
        try
        {
            var task = await _taskService.UpdateTaskStatusAsync(id, updateDto.Status);
            _logger.LogInformation("Task {TaskId} status updated to {Status}", id, updateDto.Status);
            return Ok(task);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task status {TaskId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the task status." });
        }
    }

    [HttpPost("{id}/evidence")]
    public async Task<ActionResult<TaskDto>> AddEvidence(string id, [FromBody] AddEvidenceDto evidenceDto)
    {
        try
        {
            var task = await _taskService.AddEvidenceAsync(id, evidenceDto);
            _logger.LogInformation("Evidence added to task {TaskId}", id);
            return Ok(task);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding evidence to task {TaskId}", id);
            return StatusCode(500, new { message = "An error occurred while adding evidence." });
        }
    }

    [HttpPut("{id}/assign")]
    public async Task<ActionResult<TaskDto>> AssignTask(string id, [FromBody] AssignTaskDto assignDto)
    {
        try
        {
            var task = await _taskService.AssignTaskAsync(id, assignDto.AssignedTo);
            _logger.LogInformation("Task {TaskId} assigned to {AssignedTo}", id, assignDto.AssignedTo);
            return Ok(task);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning task {TaskId}", id);
            return StatusCode(500, new { message = "An error occurred while assigning the task." });
        }
    }
}

public class AssignTaskDto
{
    public string AssignedTo { get; set; } = string.Empty;
}
