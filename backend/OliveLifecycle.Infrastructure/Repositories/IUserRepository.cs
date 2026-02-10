using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Infrastructure.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByEmailAsync(string email);
    Task<User> CreateAsync(User user);
    Task<User> UpdateAsync(User user);
    Task<bool> ExistsByEmailAsync(string email);
    Task<IEnumerable<User>> GetByRoleAsync(string role);
}
