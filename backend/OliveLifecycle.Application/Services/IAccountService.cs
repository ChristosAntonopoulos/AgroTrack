using OliveLifecycle.Application.DTOs.User;

namespace OliveLifecycle.Application.Services;

public interface IAccountService
{
    Task<UserDto> UpdateProfileAsync(string userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(string userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task<RequestEmailChangeResponseDto> RequestEmailChangeAsync(string userId, RequestEmailChangeDto dto, CancellationToken cancellationToken = default);
    Task<UserDto> ConfirmEmailChangeAsync(string userId, ConfirmEmailChangeDto dto, CancellationToken cancellationToken = default);
    Task<AccountExportDto> ExportAsync(string userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(string userId, DeleteAccountDto dto, CancellationToken cancellationToken = default);
}
