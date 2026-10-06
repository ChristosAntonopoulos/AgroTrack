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
        services.AddScoped<IFieldAccessScopeService, FieldAccessScopeService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFieldService, FieldService>();
        services.AddScoped<IFieldDeletionGuard, FieldDeletionGuard>();
        services.AddScoped<IFieldStatusGuard, FieldStatusGuard>();
        services.AddScoped<IFieldPeopleService, FieldPeopleService>();
        services.AddScoped<IKaekNormalizer, KaekNormalizer>();
        services.AddScoped<IFieldAreaCalculator, FieldAreaCalculator>();
        services.AddScoped<IFieldAreaValidationService, FieldAreaValidationService>();
        services.AddScoped<IGreekCadastrePdfParser, GreekCadastrePdfParser>();
        services.AddScoped<ILifecycleService, LifecycleService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IMinistryNotificationService, MinistryNotificationService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IFinancialAuthorizationService, FinancialAuthorizationService>();
        services.AddScoped<IFinancialTransactionService, FinancialTransactionService>();
        services.AddScoped<IFinancialSummaryService, FinancialSummaryService>();
        services.AddScoped<IFieldYearSummaryService, FieldYearSummaryService>();
        services.AddScoped<IFieldOverviewService, FieldOverviewService>();
        services.AddScoped<IHarvestService, HarvestService>();
        services.AddScoped<IOilStockService, OilStockService>();
        services.AddScoped<IPartnerService, PartnerService>();
        services.AddScoped<ISavedContactService, SavedContactService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IMediaAttachmentService, MediaAttachmentService>();
        services.AddScoped<IFieldGeoMatchService, FieldGeoMatchService>();
        services.AddScoped<IPhotoContentUrlSigner, PhotoContentUrlSigner>();
        services.AddScoped<IPhotoHubService, PhotoHubService>();
        services.AddScoped<IUserNotificationService, UserNotificationService>();
        services.AddScoped<IMeDashboardService, MeDashboardService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<IAdminFeedbackService, AdminFeedbackService>();
        services.AddScoped<IAdminCampaignService, AdminCampaignService>();
        services.AddScoped<IInAppMessageService, InAppMessageService>();
        services.AddScoped<IChronologioService, ChronologioService>();
        services.AddScoped<IFieldWorkAuthorizationService, FieldWorkAuthorizationService>();
        services.AddScoped<IFieldWorkTemplateService, FieldWorkTemplateService>();
        services.AddScoped<ITaskProposalService, TaskProposalService>();
        services.AddScoped<IFieldTaskService, FieldTaskService>();
        services.AddScoped<IFieldPhenologyService, FieldPhenologyService>();
        services.AddScoped<ITaskProposalEngine, TaskProposalEngine>();
        services.AddScoped<IFieldWorkEventSignalCollector, FieldWorkEventSignalCollector>();
        services.AddScoped<IFieldYearTaskPlanService, FieldYearTaskPlanService>();
        services.AddScoped<IFieldTaskWeatherEvaluationService, FieldTaskWeatherEvaluationService>();
        services.AddScoped<IFieldWorkProfileService, FieldWorkProfileService>();
        services.AddScoped<IFieldWorkPlanPreviewService, FieldWorkPlanPreviewService>();
        services.AddScoped<IFieldWorkLearningService, FieldWorkLearningService>();

        return services;
    }
}
