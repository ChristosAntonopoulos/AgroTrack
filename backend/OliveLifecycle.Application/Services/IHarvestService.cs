using OliveLifecycle.Application.DTOs.Harvest;

namespace OliveLifecycle.Application.Services;

public interface IHarvestService
{
    Task<HarvestRecordDetailDto> CreateAsync(CreateHarvestRecordDto dto, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecordDetailDto>> GetByFieldIdAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<HarvestRecordDetailDto> VoidAsync(string id, VoidHarvestRecordDto dto, string userId, string userRole, CancellationToken cancellationToken = default);
}
