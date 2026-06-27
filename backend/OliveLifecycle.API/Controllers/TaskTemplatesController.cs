using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/task-templates")]
public class TaskTemplatesController : ControllerBase
{
    private readonly ITaskTemplateService _taskTemplateService;

    public TaskTemplatesController(ITaskTemplateService taskTemplateService)
    {
        _taskTemplateService = taskTemplateService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTemplates(CancellationToken cancellationToken)
    {
        var templates = await _taskTemplateService.GetAllAsync(cancellationToken);
        return Ok(templates);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTemplate(string id, CancellationToken cancellationToken)
    {
        var template = await _taskTemplateService.GetByIdAsync(id, cancellationToken);
        return template == null ? NotFound() : Ok(template);
    }
}
