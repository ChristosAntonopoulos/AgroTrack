using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories.Geospatial;

internal static class BsonJson
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static BsonDocument? ToBson<T>(T? obj) where T : class
        => obj == null ? null : BsonDocument.Parse(JsonSerializer.Serialize(obj, Options));

    public static T? FromBson<T>(BsonDocument? doc) where T : class
        => doc == null ? null : JsonSerializer.Deserialize<T>(doc.ToJson(), Options);
}

public class FieldSpatialProfileRepository : IFieldSpatialProfileRepository
{
    private readonly IMongoCollection<FieldSpatialProfileDocument> _collection;

    public FieldSpatialProfileRepository(MongoDbContext context)
        => _collection = context.GetCollection<FieldSpatialProfileDocument>("field_spatial_profiles");

    public async Task<FieldSpatialProfile?> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.FieldId == fieldId).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<FieldSpatialProfile> UpsertAsync(FieldSpatialProfile profile, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(profile);
        await _collection.ReplaceOneAsync(x => x.FieldId == profile.FieldId, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        return profile;
    }

    private static FieldSpatialProfile ToEntity(FieldSpatialProfileDocument d) => new()
    {
        Id = d.Id, FieldId = d.FieldId, Version = d.Version,
        ProcessingStatus = Enum.Parse<GeospatialProcessingStatus>(d.ProcessingStatus, true),
        ProcessingError = d.ProcessingError, CalculatedAt = d.CalculatedAt,
        GeometrySummary = BsonJson.FromBson<GeometrySummary>(d.GeometrySummary),
        TerrainSummary = BsonJson.FromBson<TerrainSummary>(d.TerrainSummary),
        LandCoverSummary = BsonJson.FromBson<LandCoverSummary>(d.LandCoverSummary),
        SoilSummary = BsonJson.FromBson<SoilSummary>(d.SoilSummary),
        EnvironmentalSummary = BsonJson.FromBson<EnvironmentalSummary>(d.EnvironmentalSummary),
        LatestSatelliteSummary = BsonJson.FromBson<SatelliteSummary>(d.LatestSatelliteSummary),
        LatestWeatherSummary = BsonJson.FromBson<WeatherSummary>(d.LatestWeatherSummary),
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static FieldSpatialProfileDocument ToDocument(FieldSpatialProfile e) => new()
    {
        Id = string.IsNullOrEmpty(e.Id) ? e.FieldId : e.Id, FieldId = e.FieldId, Version = e.Version,
        ProcessingStatus = e.ProcessingStatus.ToString(),
        ProcessingError = e.ProcessingError, CalculatedAt = e.CalculatedAt,
        GeometrySummary = BsonJson.ToBson(e.GeometrySummary),
        TerrainSummary = BsonJson.ToBson(e.TerrainSummary),
        LandCoverSummary = BsonJson.ToBson(e.LandCoverSummary),
        SoilSummary = BsonJson.ToBson(e.SoilSummary),
        EnvironmentalSummary = BsonJson.ToBson(e.EnvironmentalSummary),
        LatestSatelliteSummary = BsonJson.ToBson(e.LatestSatelliteSummary),
        LatestWeatherSummary = BsonJson.ToBson(e.LatestWeatherSummary),
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}

public class WeatherCacheRepository : IWeatherCacheRepository
{
    private readonly IMongoCollection<WeatherCacheLocationDocument> _collection;

    public WeatherCacheRepository(MongoDbContext context)
        => _collection = context.GetCollection<WeatherCacheLocationDocument>("weather_cache_locations");

    public async Task<WeatherCacheLocation?> GetByGridKeyAsync(string gridKey, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.GridKey == gridKey).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<WeatherCacheLocation> UpsertAsync(WeatherCacheLocation location, CancellationToken cancellationToken = default)
    {
        // Key the document by grid cell so two concurrent refreshes of the same
        // location cannot fight over different _id values (Mongo forbids changing _id).
        location.Id = location.GridKey;
        var doc = ToDocument(location);
        await _collection.DeleteManyAsync(x => x.GridKey == location.GridKey && x.Id != doc.Id, cancellationToken);
        await _collection.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        return location;
    }

    public async Task<IReadOnlyList<WeatherCacheLocation>> GetStaleLocationsAsync(DateTime olderThan, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.FetchedAt < olderThan).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    private static WeatherCacheLocation ToEntity(WeatherCacheLocationDocument d) => new()
    {
        Id = d.Id, GridKey = d.GridKey, Latitude = d.Latitude, Longitude = d.Longitude,
        Provider = d.Provider, Model = d.Model, FetchedAt = d.FetchedAt,
        ValidFrom = d.ValidFrom, ValidTo = d.ValidTo,
        HourlyForecast = d.HourlyForecast.Select(h => BsonJson.FromBson<HourlyForecastEntry>(h)!).ToList(),
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static WeatherCacheLocationDocument ToDocument(WeatherCacheLocation e) => new()
    {
        Id = e.Id, GridKey = e.GridKey, Latitude = e.Latitude, Longitude = e.Longitude,
        Provider = e.Provider, Model = e.Model, FetchedAt = e.FetchedAt,
        ValidFrom = e.ValidFrom, ValidTo = e.ValidTo,
        HourlyForecast = e.HourlyForecast.Select(h => BsonJson.ToBson(h)!).ToList(),
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}

public class FieldDailyWeatherSnapshotRepository : IFieldDailyWeatherSnapshotRepository
{
    private readonly IMongoCollection<FieldDailyWeatherSnapshotDocument> _collection;

    public FieldDailyWeatherSnapshotRepository(MongoDbContext context)
        => _collection = context.GetCollection<FieldDailyWeatherSnapshotDocument>("field_daily_weather_snapshots");

    public async Task<FieldDailyWeatherSnapshot?> GetByFieldAndDateAsync(string fieldId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.FieldId == fieldId && x.Date == date.ToDateTime(TimeOnly.MinValue)).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<IReadOnlyList<FieldDailyWeatherSnapshot>> GetHistoryAsync(string fieldId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.FieldId == fieldId && x.Date >= from.ToDateTime(TimeOnly.MinValue) && x.Date <= to.ToDateTime(TimeOnly.MinValue))
            .SortBy(x => x.Date).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<FieldDailyWeatherSnapshot> UpsertAsync(FieldDailyWeatherSnapshot snapshot, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(snapshot);
        await _collection.ReplaceOneAsync(x => x.Id == snapshot.Id, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        return snapshot;
    }

    public async Task<int> UpsertManyAsync(IReadOnlyList<FieldDailyWeatherSnapshot> snapshots, CancellationToken cancellationToken = default)
    {
        if (snapshots.Count == 0) return 0;

        var models = snapshots.Select(snapshot =>
        {
            var doc = ToDocument(snapshot);
            return new ReplaceOneModel<FieldDailyWeatherSnapshotDocument>(
                Builders<FieldDailyWeatherSnapshotDocument>.Filter.Eq(x => x.Id, snapshot.Id),
                doc)
            {
                IsUpsert = true
            };
        }).ToList();

        var result = await _collection.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false }, cancellationToken);
        return (int)(result.InsertedCount + result.ModifiedCount + result.Upserts.Count);
    }

    private static FieldDailyWeatherSnapshot ToEntity(FieldDailyWeatherSnapshotDocument d) => new()
    {
        Id = d.Id, FieldId = d.FieldId, Date = DateOnly.FromDateTime(d.Date),
        MinTemperatureC = d.MinTemperatureC, MaxTemperatureC = d.MaxTemperatureC, AverageTemperatureC = d.AverageTemperatureC,
        MinHumidityPercent = d.MinHumidityPercent, MaxHumidityPercent = d.MaxHumidityPercent, AverageHumidityPercent = d.AverageHumidityPercent,
        RainTotalMm = d.RainTotalMm, MaximumWindSpeedKmh = d.MaximumWindSpeedKmh,
        AverageWindSpeedKmh = d.AverageWindSpeedKmh, MaximumWindGustKmh = d.MaximumWindGustKmh,
        Et0Mm = d.Et0Mm, SolarRadiationWm2 = d.SolarRadiationWm2,
        Provider = d.Provider, Model = d.Model, SourceResolution = d.SourceResolution,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static FieldDailyWeatherSnapshotDocument ToDocument(FieldDailyWeatherSnapshot e) => new()
    {
        Id = e.Id, FieldId = e.FieldId, Date = e.Date.ToDateTime(TimeOnly.MinValue),
        MinTemperatureC = e.MinTemperatureC, MaxTemperatureC = e.MaxTemperatureC, AverageTemperatureC = e.AverageTemperatureC,
        MinHumidityPercent = e.MinHumidityPercent, MaxHumidityPercent = e.MaxHumidityPercent, AverageHumidityPercent = e.AverageHumidityPercent,
        RainTotalMm = e.RainTotalMm, MaximumWindSpeedKmh = e.MaximumWindSpeedKmh,
        AverageWindSpeedKmh = e.AverageWindSpeedKmh, MaximumWindGustKmh = e.MaximumWindGustKmh,
        Et0Mm = e.Et0Mm, SolarRadiationWm2 = e.SolarRadiationWm2,
        Provider = e.Provider, Model = e.Model, SourceResolution = e.SourceResolution,
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}

public class FieldWeatherPeriodReviewRepository : IFieldWeatherPeriodReviewRepository
{
    private readonly IMongoCollection<FieldWeatherPeriodReviewDocument> _collection;

    public FieldWeatherPeriodReviewRepository(MongoDbContext context)
        => _collection = context.GetCollection<FieldWeatherPeriodReviewDocument>("field_weather_period_reviews");

    public async Task<IReadOnlyList<FieldWeatherPeriodReview>> GetByFieldIdsAsync(
        IReadOnlyList<string> fieldIds,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        if (fieldIds.Count == 0) return Array.Empty<FieldWeatherPeriodReview>();

        var filter = Builders<FieldWeatherPeriodReviewDocument>.Filter.In(x => x.FieldId, fieldIds);
        if (from.HasValue)
        {
            filter &= Builders<FieldWeatherPeriodReviewDocument>.Filter.Gte(x => x.OccurredAt, from.Value);
        }

        if (to.HasValue)
        {
            filter &= Builders<FieldWeatherPeriodReviewDocument>.Filter.Lte(x => x.OccurredAt, to.Value);
        }

        var docs = await _collection.Find(filter).SortByDescending(x => x.OccurredAt).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<FieldWeatherPeriodReview?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<FieldWeatherPeriodReview> UpsertAsync(FieldWeatherPeriodReview review, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(review);
        await _collection.ReplaceOneAsync(x => x.Id == review.Id, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        return review;
    }

    public async Task<int> UpsertManyAsync(IReadOnlyList<FieldWeatherPeriodReview> reviews, CancellationToken cancellationToken = default)
    {
        if (reviews.Count == 0) return 0;

        var models = reviews.Select(review =>
        {
            var doc = ToDocument(review);
            return new ReplaceOneModel<FieldWeatherPeriodReviewDocument>(
                Builders<FieldWeatherPeriodReviewDocument>.Filter.Eq(x => x.Id, review.Id),
                doc)
            {
                IsUpsert = true
            };
        }).ToList();

        var result = await _collection.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false }, cancellationToken);
        return (int)(result.InsertedCount + result.ModifiedCount + result.Upserts.Count);
    }

    private static FieldWeatherPeriodReview ToEntity(FieldWeatherPeriodReviewDocument d) => new()
    {
        Id = d.Id,
        FieldId = d.FieldId,
        PeriodType = d.PeriodType,
        Year = d.Year,
        Month = d.Month,
        OccurredAt = d.OccurredAt,
        RainTotalMm = d.RainTotalMm,
        MinTemperatureC = d.MinTemperatureC,
        MaxTemperatureC = d.MaxTemperatureC,
        AverageTemperatureC = d.AverageTemperatureC,
        FrostNights = d.FrostNights,
        HeatDays = d.HeatDays,
        HeavyRainDays = d.HeavyRainDays,
        LongestDryStreakDays = d.LongestDryStreakDays,
        RainyDays = d.RainyDays,
        DryDays = d.DryDays,
        Et0TotalMm = d.Et0TotalMm,
        WaterBalanceMm = d.WaterBalanceMm,
        AverageHumidityPercent = d.AverageHumidityPercent,
        MaxWindGustKmh = d.MaxWindGustKmh,
        RainVsPreviousPercent = d.RainVsPreviousPercent,
        WettestMonth = d.WettestMonth,
        NdviMean = d.NdviMean,
        NdviDeltaPercent = d.NdviDeltaPercent,
        NdviStartEndDeltaPercent = d.NdviStartEndDeltaPercent,
        NdmiMean = d.NdmiMean,
        NdreMean = d.NdreMean,
        NdwiMean = d.NdwiMean,
        SaviMean = d.SaviMean,
        OpeningScene = d.OpeningScene,
        ClosingScene = d.ClosingScene,
        Insights = d.Insights ?? new List<WeatherPeriodInsight>(),
        RainSeries = d.RainSeries ?? new List<double>(),
        RainLabels = d.RainLabels ?? new List<string>(),
        TemperatureMinSeries = d.TemperatureMinSeries ?? new List<double?>(),
        TemperatureMaxSeries = d.TemperatureMaxSeries ?? new List<double?>(),
        DayCount = d.DayCount,
        ExpectedDays = d.ExpectedDays,
        DaysWithRainData = d.DaysWithRainData,
        IncludesForecast = d.IncludesForecast,
        UsableSatelliteCount = d.UsableSatelliteCount,
        WeatherProvider = d.WeatherProvider,
        SatelliteSource = d.SatelliteSource,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    private static FieldWeatherPeriodReviewDocument ToDocument(FieldWeatherPeriodReview e) => new()
    {
        Id = e.Id,
        FieldId = e.FieldId,
        PeriodType = e.PeriodType,
        Year = e.Year,
        Month = e.Month,
        OccurredAt = e.OccurredAt,
        RainTotalMm = e.RainTotalMm,
        MinTemperatureC = e.MinTemperatureC,
        MaxTemperatureC = e.MaxTemperatureC,
        AverageTemperatureC = e.AverageTemperatureC,
        FrostNights = e.FrostNights,
        HeatDays = e.HeatDays,
        HeavyRainDays = e.HeavyRainDays,
        LongestDryStreakDays = e.LongestDryStreakDays,
        RainyDays = e.RainyDays,
        DryDays = e.DryDays,
        Et0TotalMm = e.Et0TotalMm,
        WaterBalanceMm = e.WaterBalanceMm,
        AverageHumidityPercent = e.AverageHumidityPercent,
        MaxWindGustKmh = e.MaxWindGustKmh,
        RainVsPreviousPercent = e.RainVsPreviousPercent,
        WettestMonth = e.WettestMonth,
        NdviMean = e.NdviMean,
        NdviDeltaPercent = e.NdviDeltaPercent,
        NdviStartEndDeltaPercent = e.NdviStartEndDeltaPercent,
        NdmiMean = e.NdmiMean,
        NdreMean = e.NdreMean,
        NdwiMean = e.NdwiMean,
        SaviMean = e.SaviMean,
        OpeningScene = e.OpeningScene,
        ClosingScene = e.ClosingScene,
        Insights = e.Insights?.ToList() ?? new List<WeatherPeriodInsight>(),
        RainSeries = e.RainSeries?.ToList() ?? new List<double>(),
        RainLabels = e.RainLabels?.ToList() ?? new List<string>(),
        TemperatureMinSeries = e.TemperatureMinSeries?.ToList() ?? new List<double?>(),
        TemperatureMaxSeries = e.TemperatureMaxSeries?.ToList() ?? new List<double?>(),
        DayCount = e.DayCount,
        ExpectedDays = e.ExpectedDays,
        DaysWithRainData = e.DaysWithRainData,
        IncludesForecast = e.IncludesForecast,
        UsableSatelliteCount = e.UsableSatelliteCount,
        WeatherProvider = e.WeatherProvider,
        SatelliteSource = e.SatelliteSource,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };
}

public class FieldSatelliteObservationRepository : IFieldSatelliteObservationRepository
{
    private readonly IMongoCollection<FieldSatelliteObservationDocument> _collection;

    public FieldSatelliteObservationRepository(MongoDbContext context)
        => _collection = context.GetCollection<FieldSatelliteObservationDocument>("field_satellite_observations");

    public async Task<FieldSatelliteObservation?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<IReadOnlyList<FieldSatelliteObservation>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.FieldId == fieldId).SortByDescending(x => x.ObservationDate).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<FieldSatelliteObservation?> GetLatestUsableAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.FieldId == fieldId && x.IsUsable)
            .SortByDescending(x => x.ObservationDate).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<FieldSatelliteObservation?> GetPreviousUsableAsync(string fieldId, DateTime beforeDate, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.FieldId == fieldId && x.IsUsable && x.ObservationDate < beforeDate)
            .SortByDescending(x => x.ObservationDate).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<FieldSatelliteObservation?> GetByCatalogItemAsync(string fieldId, string catalogItemId, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.FieldId == fieldId && x.CatalogItemId == catalogItemId)
            .FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<IReadOnlyList<FieldSatelliteObservation>> GetUsableInRangeAsync(string fieldId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var docs = await _collection
            .Find(x => x.FieldId == fieldId && x.IsUsable && x.ObservationDate >= from && x.ObservationDate <= to)
            .SortBy(x => x.ObservationDate)
            .ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<FieldSatelliteObservation> CreateAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(observation);
        await _collection.InsertOneAsync(doc, cancellationToken: cancellationToken);
        return observation;
    }

    public async Task<FieldSatelliteObservation> UpdateAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken = default)
    {
        await _collection.ReplaceOneAsync(x => x.Id == observation.Id, ToDocument(observation), cancellationToken: cancellationToken);
        return observation;
    }

    public async Task<IReadOnlyList<FieldSatelliteObservation>> DeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken = default)
    {
        // Read before deleting so the caller can remove the matching rasters.
        var docs = await _collection.Find(x => x.ObservationDate < cutoff).ToListAsync(cancellationToken);
        if (docs.Count == 0)
        {
            return [];
        }

        await _collection.DeleteManyAsync(x => x.ObservationDate < cutoff, cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    private static FieldSatelliteObservation ToEntity(FieldSatelliteObservationDocument d) => new()
    {
        Id = d.Id, FieldId = d.FieldId, CatalogItemId = d.CatalogItemId, ObservationDate = d.ObservationDate,
        CloudCoverPercent = d.CloudCoverPercent, FieldCloudCoverPercent = d.FieldCloudCoverPercent,
        UsablePixelPercent = d.UsablePixelPercent, IsUsable = d.IsUsable,
        Source = d.Source, Resolution = d.Resolution,
        TrueColorStoragePath = d.TrueColorStoragePath, NdviStoragePath = d.NdviStoragePath,
        NdmiStoragePath = d.NdmiStoragePath, NdreStoragePath = d.NdreStoragePath,
        NdwiStoragePath = d.NdwiStoragePath, SaviStoragePath = d.SaviStoragePath,
        NdviChangeStoragePath = d.NdviChangeStoragePath, OverlayBounds = d.OverlayBounds,
        NdviStats = BsonJson.FromBson<VegetationIndexStats>(d.NdviStats),
        NdmiStats = BsonJson.FromBson<VegetationIndexStats>(d.NdmiStats),
        NdreStats = BsonJson.FromBson<VegetationIndexStats>(d.NdreStats),
        NdwiStats = BsonJson.FromBson<VegetationIndexStats>(d.NdwiStats),
        SaviStats = BsonJson.FromBson<VegetationIndexStats>(d.SaviStats),
        NdviChangePercent = d.NdviChangePercent,
        ComparedToObservationId = d.ComparedToObservationId, ComparedToObservationDate = d.ComparedToObservationDate,
        AreaDeclinePercent = d.AreaDeclinePercent, AreaIncreasePercent = d.AreaIncreasePercent,
        AreaBelowBaselinePercent = d.AreaBelowBaselinePercent,
        Metadata = BsonJson.FromBson<DataSourceMetadata>(d.Metadata) ?? new DataSourceMetadata(),
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static FieldSatelliteObservationDocument ToDocument(FieldSatelliteObservation e) => new()
    {
        Id = e.Id, FieldId = e.FieldId, CatalogItemId = e.CatalogItemId, ObservationDate = e.ObservationDate,
        CloudCoverPercent = e.CloudCoverPercent, FieldCloudCoverPercent = e.FieldCloudCoverPercent,
        UsablePixelPercent = e.UsablePixelPercent, IsUsable = e.IsUsable,
        Source = e.Source, Resolution = e.Resolution,
        TrueColorStoragePath = e.TrueColorStoragePath, NdviStoragePath = e.NdviStoragePath,
        NdmiStoragePath = e.NdmiStoragePath, NdreStoragePath = e.NdreStoragePath,
        NdwiStoragePath = e.NdwiStoragePath, SaviStoragePath = e.SaviStoragePath,
        NdviChangeStoragePath = e.NdviChangeStoragePath, OverlayBounds = e.OverlayBounds,
        NdviStats = BsonJson.ToBson(e.NdviStats), NdmiStats = BsonJson.ToBson(e.NdmiStats),
        NdreStats = BsonJson.ToBson(e.NdreStats), NdwiStats = BsonJson.ToBson(e.NdwiStats),
        SaviStats = BsonJson.ToBson(e.SaviStats),
        NdviChangePercent = e.NdviChangePercent,
        ComparedToObservationId = e.ComparedToObservationId, ComparedToObservationDate = e.ComparedToObservationDate,
        AreaDeclinePercent = e.AreaDeclinePercent, AreaIncreasePercent = e.AreaIncreasePercent,
        AreaBelowBaselinePercent = e.AreaBelowBaselinePercent,
        Metadata = BsonJson.ToBson(e.Metadata),
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}

public class FieldEnvironmentalAlertRepository : IFieldEnvironmentalAlertRepository
{
    private readonly IMongoCollection<FieldEnvironmentalAlertDocument> _collection;

    public FieldEnvironmentalAlertRepository(MongoDbContext context)
        => _collection = context.GetCollection<FieldEnvironmentalAlertDocument>("field_environmental_alerts");

    public async Task<IReadOnlyList<FieldEnvironmentalAlert>> GetActiveByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.FieldId == fieldId && x.IsActive).SortByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<FieldEnvironmentalAlert?> GetByDedupKeyAsync(string dedupKey, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.DedupKey == dedupKey).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<FieldEnvironmentalAlert> UpsertAsync(FieldEnvironmentalAlert alert, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(alert);
        await _collection.ReplaceOneAsync(x => x.DedupKey == alert.DedupKey, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
        return alert;
    }

    public async Task DeactivateAsync(string alertId, CancellationToken cancellationToken = default)
    {
        await _collection.UpdateOneAsync(x => x.Id == alertId,
            Builders<FieldEnvironmentalAlertDocument>.Update.Set(x => x.IsActive, false), cancellationToken: cancellationToken);
    }

    public async Task DeactivateExpiredAsync(DateTime now, CancellationToken cancellationToken = default)
    {
        await _collection.UpdateManyAsync(x => x.IsActive && x.ValidTo != null && x.ValidTo < now,
            Builders<FieldEnvironmentalAlertDocument>.Update.Set(x => x.IsActive, false), cancellationToken: cancellationToken);
    }

    private static FieldEnvironmentalAlert ToEntity(FieldEnvironmentalAlertDocument d) => new()
    {
        Id = d.Id, FieldId = d.FieldId, DedupKey = d.DedupKey,
        AlertType = Enum.Parse<EnvironmentalAlertType>(d.AlertType, true),
        Severity = d.Severity, Title = d.Title, Message = d.Message,
        ValidFrom = d.ValidFrom, ValidTo = d.ValidTo,
        Confidence = Enum.Parse<DataConfidenceLevel>(d.Confidence, true),
        IsActive = d.IsActive, RelatedTaskId = d.RelatedTaskId,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static FieldEnvironmentalAlertDocument ToDocument(FieldEnvironmentalAlert e) => new()
    {
        Id = e.Id, FieldId = e.FieldId, DedupKey = e.DedupKey,
        AlertType = e.AlertType.ToString(), Severity = e.Severity, Title = e.Title, Message = e.Message,
        ValidFrom = e.ValidFrom, ValidTo = e.ValidTo, Confidence = e.Confidence.ToString(),
        IsActive = e.IsActive, RelatedTaskId = e.RelatedTaskId,
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}

public class FireDetectionRepository : IFireDetectionRepository
{
    private readonly IMongoCollection<FireDetectionDocument> _collection;

    public FireDetectionRepository(MongoDbContext context)
        => _collection = context.GetCollection<FireDetectionDocument>("fire_detections");

    /// <summary>
    /// Detections carry deterministic ids, so an upsert per detection keeps the
    /// collection correct without emptying it first (a delete-then-insert would
    /// briefly report "no active fires" to anyone reading concurrently).
    /// </summary>
    public async Task ReplaceAllAsync(IReadOnlyList<FireDetection> detections, CancellationToken cancellationToken = default)
    {
        if (detections.Count > 0)
        {
            var writes = detections.Select(d => new ReplaceOneModel<FireDetectionDocument>(
                Builders<FireDetectionDocument>.Filter.Eq(x => x.Id, d.Id),
                ToDocument(d)) { IsUpsert = true });
            await _collection.BulkWriteAsync(writes, cancellationToken: cancellationToken);
        }

        // FIRMS only publishes recent activity; older rows are no longer "active".
        var cutoff = DateTime.UtcNow.AddDays(-10);
        await _collection.DeleteManyAsync(x => x.DetectedAt < cutoff, cancellationToken);
    }

    public async Task<IReadOnlyList<FireDetection>> GetRecentAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.DetectedAt >= since).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    private static FireDetection ToEntity(FireDetectionDocument d) => new()
    {
        Id = d.Id, Latitude = d.Latitude, Longitude = d.Longitude,
        DetectedAt = d.DetectedAt, Confidence = d.Confidence, Source = d.Source,
        BrightnessKelvin = d.BrightnessKelvin, FireRadiativePowerMw = d.FireRadiativePowerMw,
        Satellite = d.Satellite, DayNight = d.DayNight,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static FireDetectionDocument ToDocument(FireDetection d) => new()
    {
        Id = d.Id, Latitude = d.Latitude, Longitude = d.Longitude,
        DetectedAt = d.DetectedAt, Confidence = d.Confidence, Source = d.Source,
        BrightnessKelvin = d.BrightnessKelvin, FireRadiativePowerMw = d.FireRadiativePowerMw,
        Satellite = d.Satellite, DayNight = d.DayNight,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };
}

public class NaturaSiteRepository : INaturaSiteRepository
{
    private readonly IMongoCollection<NaturaSiteDocument> _collection;

    public NaturaSiteRepository(MongoDbContext context)
        => _collection = context.GetCollection<NaturaSiteDocument>("natura_sites");

    public async Task<IReadOnlyList<NaturaSite>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(FilterDefinition<NaturaSiteDocument>.Empty).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<NaturaSite> UpsertAsync(NaturaSite site, CancellationToken cancellationToken = default)
    {
        var doc = ToDocument(site);
        await _collection.ReplaceOneAsync(
            x => x.SiteCode == site.SiteCode,
            doc,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
        return site;
    }

    public async Task ReplaceAllAsync(IReadOnlyList<NaturaSite> sites, CancellationToken cancellationToken = default)
    {
        await _collection.DeleteManyAsync(FilterDefinition<NaturaSiteDocument>.Empty, cancellationToken);
        if (sites.Count == 0) return;
        await _collection.InsertManyAsync(sites.Select(ToDocument).ToList(), cancellationToken: cancellationToken);
    }

    public async Task<long> CountAsync(CancellationToken cancellationToken = default)
        => await _collection.CountDocumentsAsync(FilterDefinition<NaturaSiteDocument>.Empty, cancellationToken: cancellationToken);

    private static NaturaSite ToEntity(NaturaSiteDocument d) => new()
    {
        Id = d.Id, SiteCode = d.SiteCode, Name = d.Name, SiteType = d.SiteType,
        CentroidLat = d.CentroidLat, CentroidLng = d.CentroidLng,
        Bbox = d.Bbox, Rings = d.Rings, AreaHectares = d.AreaHectares,
        Source = d.Source, SourceDate = d.SourceDate,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static NaturaSiteDocument ToDocument(NaturaSite s) => new()
    {
        Id = string.IsNullOrEmpty(s.Id) ? s.SiteCode : s.Id,
        SiteCode = s.SiteCode, Name = s.Name, SiteType = s.SiteType,
        CentroidLat = s.CentroidLat, CentroidLng = s.CentroidLng,
        Bbox = s.Bbox, Rings = s.Rings, AreaHectares = s.AreaHectares,
        Source = s.Source, SourceDate = s.SourceDate,
        CreatedAt = s.CreatedAt, UpdatedAt = s.UpdatedAt
    };
}

public class DataSourceHealthRepository : IDataSourceHealthRepository
{
    private readonly IMongoCollection<DataSourceHealthDocument> _collection;

    public DataSourceHealthRepository(MongoDbContext context)
        => _collection = context.GetCollection<DataSourceHealthDocument>("data_source_health");

    public async Task<IReadOnlyList<DataSourceHealth>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(FilterDefinition<DataSourceHealthDocument>.Empty).ToListAsync(cancellationToken);
        return docs.Select(d => new DataSourceHealth
        {
            Id = d.Id, SourceId = d.SourceId, DisplayName = d.DisplayName, Status = d.Status,
            LastSuccessfulUpdate = d.LastSuccessfulUpdate, LastError = d.LastError, Details = d.Details,
            CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
        }).ToList();
    }

    public async Task UpsertAsync(DataSourceHealth health, CancellationToken cancellationToken = default)
    {
        var doc = new DataSourceHealthDocument
        {
            Id = health.Id, SourceId = health.SourceId, DisplayName = health.DisplayName, Status = health.Status,
            LastSuccessfulUpdate = health.LastSuccessfulUpdate, LastError = health.LastError, Details = health.Details,
            CreatedAt = health.CreatedAt, UpdatedAt = health.UpdatedAt
        };
        await _collection.ReplaceOneAsync(x => x.SourceId == health.SourceId, doc, new ReplaceOptions { IsUpsert = true }, cancellationToken);
    }
}

public class GeospatialProcessingJobRepository : IGeospatialProcessingJobRepository
{
    private readonly IMongoCollection<GeospatialProcessingJobDocument> _collection;

    public GeospatialProcessingJobRepository(MongoDbContext context)
        => _collection = context.GetCollection<GeospatialProcessingJobDocument>("geospatial_processing_jobs");

    public async Task<GeospatialProcessingJob?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<GeospatialProcessingJob?> GetByIdempotencyKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        var doc = await _collection.Find(x => x.IdempotencyKey == key).FirstOrDefaultAsync(cancellationToken);
        return doc == null ? null : ToEntity(doc);
    }

    public async Task<GeospatialProcessingJob> CreateAsync(GeospatialProcessingJob job, CancellationToken cancellationToken = default)
    {
        await _collection.InsertOneAsync(ToDocument(job), cancellationToken: cancellationToken);
        return job;
    }

    public async Task UpdateAsync(GeospatialProcessingJob job, CancellationToken cancellationToken = default)
    {
        await _collection.ReplaceOneAsync(x => x.Id == job.Id, ToDocument(job), cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<GeospatialProcessingJob>> GetPendingAsync(int limit, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.Status == GeospatialProcessingStatus.Pending.ToString())
            .Limit(limit).ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyDictionary<GeospatialProcessingStatus, long>> CountByStatusAsync(CancellationToken cancellationToken = default)
    {
        var grouped = await _collection.Aggregate()
            .Group(x => x.Status, g => new { Status = g.Key, Count = (long)g.Count() })
            .ToListAsync(cancellationToken);

        return grouped
            .Where(g => Enum.TryParse<GeospatialProcessingStatus>(g.Status, true, out _))
            .ToDictionary(g => Enum.Parse<GeospatialProcessingStatus>(g.Status, true), g => g.Count);
    }

    public async Task<IReadOnlyList<GeospatialProcessingJob>> GetRecentFailuresAsync(int limit, CancellationToken cancellationToken = default)
    {
        var docs = await _collection.Find(x => x.Status == GeospatialProcessingStatus.Failed.ToString())
            .SortByDescending(x => x.UpdatedAt)
            .Limit(limit)
            .ToListAsync(cancellationToken);
        return docs.Select(ToEntity).ToList();
    }

    private static GeospatialProcessingJob ToEntity(GeospatialProcessingJobDocument d) => new()
    {
        Id = d.Id, FieldId = d.FieldId, JobType = d.JobType,
        Status = Enum.Parse<GeospatialProcessingStatus>(d.Status, true),
        IdempotencyKey = d.IdempotencyKey, Attempts = d.Attempts, LastError = d.LastError,
        StartedAt = d.StartedAt, CompletedAt = d.CompletedAt,
        CreatedAt = d.CreatedAt, UpdatedAt = d.UpdatedAt
    };

    private static GeospatialProcessingJobDocument ToDocument(GeospatialProcessingJob e) => new()
    {
        Id = e.Id, FieldId = e.FieldId, JobType = e.JobType, Status = e.Status.ToString(),
        IdempotencyKey = e.IdempotencyKey, Attempts = e.Attempts, LastError = e.LastError,
        StartedAt = e.StartedAt, CompletedAt = e.CompletedAt,
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };
}
