using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Application.Validators;

namespace OliveLifecycle.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<RegisterDtoValidator>();

        services.AddScoped<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<IFieldAccessService, FieldAccessService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFieldService, FieldService>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ITaskTemplateService, TaskTemplateService>();
        services.AddScoped<IMinistryNotificationService, MinistryNotificationService>();
        services.AddScoped<IReportsService, ReportsService>();

        return services;
    }
}
