using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Jobs;
using OliveLifecycle.Infrastructure.Geospatial.Processing;
using OliveLifecycle.Infrastructure.Geospatial.Providers;
using OliveLifecycle.Infrastructure.Geospatial.Storage;
using OliveLifecycle.Infrastructure.Persistence.Repositories.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial;

public static class GeospatialDependencyInjection
{
    public static IServiceCollection AddGeospatial(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<GeospatialOptions>(configuration.GetSection(GeospatialOptions.SectionName));

        // Typed HTTP clients keep provider handler rotation under HttpClientFactory control.
        services.AddHttpClient<IWeatherProvider, OpenMeteoWeatherProvider>();
        services.AddHttpClient<IElevationProvider, CopernicusElevationProvider>();
        services.AddHttpClient<ISoilProvider, SoilGridsProvider>();
        services.AddHttpClient<ISatelliteCatalogProvider, CopernicusStacProvider>();
        services.AddHttpClient<IFireDetectionProvider, NasaFirmsProvider>();

        services.AddHttpClient<ILandCoverProvider, EsaWorldCoverProvider>();

        // Raster reads are many small ranged requests against multi-hundred-megabyte
        // COGs, so they get their own client with a longer timeout and no automatic
        // decompression, which would corrupt byte ranges.
        services.AddHttpClient(GeospatialHttpClients.Raster, client =>
        {
            client.Timeout = TimeSpan.FromMinutes(5);
            client.DefaultRequestHeaders.AcceptEncoding.Clear();
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
        {
            AutomaticDecompression = System.Net.DecompressionMethods.None
        });

        services.AddScoped<IProtectedAreaProvider, Natura2000Provider>();
        services.AddSingleton<IMapLayerCatalog, MapLayerCatalog>();
        services.AddSingleton<IGeospatialStorageService, GeospatialStorageService>();

        services.AddScoped<IFieldSpatialProfileRepository, FieldSpatialProfileRepository>();
        services.AddScoped<IWeatherCacheRepository, WeatherCacheRepository>();
        services.AddScoped<IFieldDailyWeatherSnapshotRepository, FieldDailyWeatherSnapshotRepository>();
        services.AddScoped<IFieldWeatherPeriodReviewRepository, FieldWeatherPeriodReviewRepository>();
        services.AddScoped<IFieldSatelliteObservationRepository, FieldSatelliteObservationRepository>();
        services.AddScoped<IFieldEnvironmentalAlertRepository, FieldEnvironmentalAlertRepository>();
        services.AddScoped<IFireDetectionRepository, FireDetectionRepository>();
        services.AddScoped<INaturaSiteRepository, NaturaSiteRepository>();
        services.AddScoped<IDataSourceHealthRepository, DataSourceHealthRepository>();
        services.AddScoped<IGeospatialProcessingJobRepository, GeospatialProcessingJobRepository>();

        services.AddSingleton<GeospatialJobQueue>();
        services.AddSingleton<IGeospatialJobQueue>(sp => sp.GetRequiredService<GeospatialJobQueue>());
        services.AddHostedService<GeospatialJobHost>();

        services.AddScoped<IWeatherIntelligenceService, WeatherIntelligenceService>();
        services.AddScoped<IWeatherReviewCompiler, WeatherReviewCompiler>();
        services.AddScoped<IFieldSpatialProfileService, FieldSpatialProfileService>();
        services.AddScoped<IFieldMapDataService, FieldMapDataService>();
        services.AddScoped<IFieldEnvironmentalAlertEvaluator, FieldEnvironmentalAlertEvaluator>();
        services.AddScoped<ISatelliteProcessingService, SatelliteProcessingService>();
        services.AddScoped<INaturaSiteImportService, NaturaSiteImportService>();

        return services;
    }
}
