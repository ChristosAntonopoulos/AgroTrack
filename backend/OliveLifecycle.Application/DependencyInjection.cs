using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Application.Services.Cadastre;
using OliveLifecycle.Application.Services.Fields;
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
        services.AddScoped<IFieldPeopleService, FieldPeopleService>();
        services.AddScoped<IKaekNormalizer, KaekNormalizer>();
        services.AddScoped<IFieldAreaCalculator, FieldAreaCalculator>();
        services.AddScoped<IFieldAreaValidationService, FieldAreaValidationService>();
        services.AddScoped<IGreekCadastrePdfParser, GreekCadastrePdfParser>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ITaskTemplateService, TaskTemplateService>();
        services.AddScoped<IMinistryNotificationService, MinistryNotificationService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IFinancialEntryService, FinancialEntryService>();
        services.AddScoped<IHarvestService, HarvestService>();

        return services;
    }
}
