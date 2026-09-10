using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkTemplateService
{
    Task<IReadOnlyList<FieldWorkTemplateDto>> ListActiveAsync(string language = "el", CancellationToken cancellationToken = default);
    Task<FieldWorkTemplateDto?> GetByCodeAsync(string code, string language = "el", CancellationToken cancellationToken = default);
}

public class FieldWorkTemplateService : IFieldWorkTemplateService
{
    private readonly IFieldWorkTaskTemplateRepository _templates;

    public FieldWorkTemplateService(IFieldWorkTaskTemplateRepository templates)
    {
        _templates = templates;
    }

    public async Task<IReadOnlyList<FieldWorkTemplateDto>> ListActiveAsync(
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var templates = await _templates.GetActiveAsync(cancellationToken);
        return templates.Select(t => FieldWorkMapper.ToDto(t, language)).ToList();
    }

    public async Task<FieldWorkTemplateDto?> GetByCodeAsync(
        string code,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var template = await _templates.GetByCodeAsync(code, cancellationToken);
        return template is null ? null : FieldWorkMapper.ToDto(template, language);
    }
}
