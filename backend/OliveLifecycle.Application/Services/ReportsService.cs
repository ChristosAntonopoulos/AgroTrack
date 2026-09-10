using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Reports;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Core.Units;

namespace OliveLifecycle.Application.Services;

public interface IReportsService
{
    Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, string? periodBasis = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecordDto>> GetHarvestRecordsAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, string? periodBasis = null, CancellationToken cancellationToken = default);
    Task<ProfitLossReportDto> GetProfitLossAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, string? periodBasis = null, CancellationToken cancellationToken = default);
    Task<MonthlyWeatherReportDto> GetMonthlyWeatherAsync(string userId, string userRole, string? season = null, int? month = null, CancellationToken cancellationToken = default);
    Task<YearlyWeatherReportDto> GetYearlyWeatherAsync(string userId, string userRole, string? season = null, CancellationToken cancellationToken = default);
}

public class ReportsService : IReportsService
{
    internal const double HeavyRainMm = 20;
    internal const double DryDayMaxMm = 0.5;
    internal const double HeatStressTempC = 35;

    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly IFinancialEntryRepository _financialEntryRepository;
    private readonly IFieldDailyWeatherSnapshotRepository _weatherSnapshots;
    private readonly IFieldWeatherPeriodReviewRepository _weatherReviews;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ReportsService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IHarvestRecordRepository harvestRecordRepository,
        IFinancialEntryRepository financialEntryRepository,
        IFieldDailyWeatherSnapshotRepository weatherSnapshots,
        IFieldWeatherPeriodReviewRepository weatherReviews,
        IDateTimeProvider dateTimeProvider)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _harvestRecordRepository = harvestRecordRepository;
        _financialEntryRepository = financialEntryRepository;
        _weatherSnapshots = weatherSnapshots;
        _weatherReviews = weatherReviews;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        string? periodBasis = null,
        CancellationToken cancellationToken = default)
    {
        var fields = FilterFields(await GetAccessibleFieldsAsync(userId, userRole, cancellationToken), lifecycleYear).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();
        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var harvests = fieldIds.Count == 0
            ? Enumerable.Empty<HarvestRecord>()
            : await _harvestRecordRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var ledger = fieldIds.Count == 0
            ? Enumerable.Empty<FinancialEntry>()
            : await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);

        var now = _dateTimeProvider.UtcNow;
        return fields.Select(field =>
        {
            var fieldTasks = tasks.Where(t => t.FieldId == field.Id).ToList();
            var fieldHarvests = harvests
                .Where(h => h.FieldId == field.Id && MatchesSeason(h.HarvestDate, season, periodBasis) && h.Status != FinancialEntryStatus.Voided)
                .ToList();
            var fieldEntries = ledger
                .Where(e => e.FieldId == field.Id && MatchesSeason(e.OccurredOn, season, periodBasis) && MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
                .ToList();
            var fieldTasksInPeriod = fieldTasks
                .Where(t => MatchesSeason(TaskDate(t), season, periodBasis))
                .ToList();
            var totalProduction = fieldHarvests.Sum(h => h.OliveKg);
            var oilKg = fieldHarvests.Where(h => h.OilKg.HasValue).Sum(h => h.OilKg ?? 0);
            var hasOil = fieldHarvests.Any(h => h.OilKg.HasValue);
            var totalCost = SumFieldCost(fieldEntries, fieldTasksInPeriod);
            var revenue = SumFieldRevenue(fieldEntries);
            var areaHa = RoundHa(field.ResolveAreaHectares() ?? 0);
            var treeCount = field.TreeCount ?? 0;
            var lastHarvest = fieldHarvests.OrderByDescending(h => h.HarvestDate).FirstOrDefault();
            var lastPruning = fieldTasks
                .Where(t => t.Status == WorkTaskStatus.Completed && IsPruning(t))
                .OrderByDescending(t => t.ActualEnd ?? t.ScheduledEnd ?? t.UpdatedAt)
                .FirstOrDefault();

            return new FieldSummaryReportDto
            {
                FieldId = field.Id,
                FieldName = field.Name,
                Location = field.GetApproximateAreaLabel(),
                AreaHa = areaHa,
                TreeCount = treeCount,
                Variety = field.Variety,
                TreeAge = field.TreeAge,
                IrrigationType = field.IrrigationType,
                SoilType = field.SoilType ?? field.GroundType,
                LastPruningDate = FormatDate(lastPruning?.ActualEnd ?? lastPruning?.ScheduledEnd),
                LastHarvestDate = lastHarvest == null ? null : FormatDate(lastHarvest.HarvestDate),
                TasksCompleted = fieldTasksInPeriod.Count(t => t.Status == WorkTaskStatus.Completed),
                TasksPending = fieldTasksInPeriod.Count(t => t.Status is WorkTaskStatus.Pending or WorkTaskStatus.InProgress),
                TasksOverdue = fieldTasksInPeriod.Count(t =>
                    t.Status != WorkTaskStatus.Completed &&
                    t.Status != WorkTaskStatus.Cancelled &&
                    t.ScheduledEnd.HasValue &&
                    t.ScheduledEnd.Value < now),
                TotalCost = RoundMoney(totalCost),
                CostPerHa = areaHa > 0 ? RoundMoney(totalCost / (decimal)areaHa) : 0,
                Revenue = RoundMoney(revenue),
                Profit = RoundMoney(revenue - totalCost),
                TotalProductionKg = RoundKg(totalProduction),
                YieldPerHa = areaHa > 0 ? RoundKg(totalProduction / areaHa) : 0,
                YieldPerTree = treeCount > 0 ? RoundOne(totalProduction / treeCount) : 0,
                OilProducedKg = hasOil ? RoundKg(oilKg) : null,
                OilYieldPercent = hasOil && totalProduction > 0 ? RoundOne(oilKg / totalProduction * 100) : null
            };
        });
    }

    public async Task<IEnumerable<HarvestRecordDto>> GetHarvestRecordsAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        string? periodBasis = null,
        CancellationToken cancellationToken = default)
    {
        var fields = FilterFields(await GetAccessibleFieldsAsync(userId, userRole, cancellationToken), lifecycleYear).ToList();
        var fieldMap = fields.ToDictionary(f => f.Id, f => f);
        var records = fieldMap.Count == 0
            ? Enumerable.Empty<HarvestRecord>()
            : await _harvestRecordRepository.GetByFieldIdsAsync(fieldMap.Keys, cancellationToken);

        return records
            .Where(r => r.Status != FinancialEntryStatus.Voided && MatchesSeason(r.HarvestDate, season, periodBasis))
            .Select(r =>
            {
                fieldMap.TryGetValue(r.FieldId, out var field);
                var areaHa = field?.ResolveAreaHectares() ?? 0;
                return new HarvestRecordDto
                {
                    Id = r.Id,
                    FieldId = r.FieldId,
                    FieldName = field?.Name ?? r.FieldId,
                    HarvestDate = r.HarvestDate,
                    HarvestMethod = r.HarvestMethod,
                    WorkersUsed = r.WorkersUsed,
                    OliveKg = RoundKg(r.OliveKg),
                    KgPerHa = areaHa > 0 ? RoundKg(r.OliveKg / areaHa) : 0,
                    MillName = r.MillName,
                    OilKg = r.OilKg.HasValue ? RoundKg(r.OilKg.Value) : null,
                    OilYieldPercent = r.OilYieldPercent.HasValue ? RoundOne(r.OilYieldPercent.Value) : null,
                    QualityGrade = r.QualityGrade,
                    Notes = r.Notes,
                    Status = r.Status.ToApiString()
                };
            });
    }

    public async Task<ProfitLossReportDto> GetProfitLossAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        string? periodBasis = null,
        CancellationToken cancellationToken = default)
    {
        if (userRole != Roles.FieldOwner && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to view profit and loss reports.");
        }

        var fields = FilterFields(await GetAccessibleFieldsAsync(userId, userRole, cancellationToken), lifecycleYear).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();
        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var ledger = fieldIds.Count == 0
            ? Enumerable.Empty<FinancialEntry>()
            : await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);

        var profitByField = fields.Select(field =>
        {
            var fieldEntries = ledger
                .Where(e => e.FieldId == field.Id && MatchesSeason(e.OccurredOn, season, periodBasis) && MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
                .ToList();
            var fieldTasks = tasks.Where(t => t.FieldId == field.Id && MatchesSeason(TaskDate(t), season, periodBasis));
            var cost = SumFieldCost(fieldEntries, fieldTasks);
            var revenue = SumFieldRevenue(fieldEntries);
            return new FieldProfitDto
            {
                FieldId = field.Id,
                FieldName = field.Name,
                Cost = RoundMoney(cost),
                Revenue = RoundMoney(revenue),
                Profit = RoundMoney(revenue - cost)
            };
        }).ToList();

        var totalExpenses = profitByField.Sum(p => p.Cost);
        var totalIncome = profitByField.Sum(p => p.Revenue);
        var postedExpenses = ledger
            .Where(e =>
                e.Kind == FinancialEntryKind.Expense &&
                e.Status == FinancialEntryStatus.Posted &&
                MatchesSeason(e.OccurredOn, season, periodBasis) &&
                MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
            .ToList();
        var expensesByBucket = postedExpenses
            .GroupBy(e => (e.Bucket ?? FinancialCategoryBucket.Other).ToApiString())
            .ToDictionary(g => g.Key, g => RoundMoney(g.Sum(e => e.Amount)));
        var expensesByCategory = postedExpenses
            .Where(e => e.Category.HasValue)
            .GroupBy(e => e.Category!.Value.ToApiString())
            .ToDictionary(g => g.Key, g => RoundMoney(g.Sum(e => e.Amount)));

        return new ProfitLossReportDto
        {
            Season = ResolveSeason(season),
            TotalIncome = RoundMoney(totalIncome),
            TotalExpenses = RoundMoney(totalExpenses),
            NetProfit = RoundMoney(totalIncome - totalExpenses),
            ProfitByField = profitByField,
            ExpensesByBucket = expensesByBucket,
            ExpensesByCategory = expensesByCategory
        };
    }

    public async Task<MonthlyWeatherReportDto> GetMonthlyWeatherAsync(
        string userId,
        string userRole,
        string? season = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var year = ResolveYear(season, now);
        var monthNumber = month is >= 1 and <= 12 ? month.Value : now.Month;
        var fields = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken)).ToList();
        var daysInMonth = DateTime.DaysInMonth(year, monthNumber);
        var from = new DateOnly(year - 1, monthNumber, 1);
        var to = new DateOnly(year, monthNumber, daysInMonth);
        var periodFrom = new DateTime(year, monthNumber, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodTo = new DateTime(year, monthNumber, daysInMonth, 23, 59, 59, DateTimeKind.Utc);

        var reviews = fields.Count == 0
            ? Array.Empty<FieldWeatherPeriodReview>()
            : await _weatherReviews.GetByFieldIdsAsync(fields.Select(f => f.Id).ToList(), periodFrom, periodTo, cancellationToken);

        var rows = new List<FieldMonthlyWeatherDto>();
        foreach (var field in fields)
        {
            var snapshots = await _weatherSnapshots.GetHistoryAsync(field.Id, from, to, cancellationToken);
            var review = reviews.FirstOrDefault(r =>
                r.FieldId == field.Id &&
                r.Year == year &&
                r.Month == monthNumber &&
                string.Equals(r.PeriodType, WeatherPeriodTypes.Month, StringComparison.OrdinalIgnoreCase));
            rows.Add(BuildMonthlyField(field, snapshots, review, year, monthNumber, daysInMonth));
        }

        return new MonthlyWeatherReportDto
        {
            Season = year.ToString(),
            Month = monthNumber,
            Fields = rows
        };
    }

    public async Task<YearlyWeatherReportDto> GetYearlyWeatherAsync(
        string userId,
        string userRole,
        string? season = null,
        CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var year = ResolveYear(season, now);
        var fields = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken)).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();
        var from = new DateOnly(year - 1, 1, 1);
        var to = new DateOnly(year, 12, 31);
        var periodFrom = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodTo = new DateTime(year, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var ledger = fieldIds.Count == 0
            ? Enumerable.Empty<FinancialEntry>()
            : await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var reviews = fieldIds.Count == 0
            ? Array.Empty<FieldWeatherPeriodReview>()
            : await _weatherReviews.GetByFieldIdsAsync(fieldIds, periodFrom, periodTo, cancellationToken);

        var rows = new List<FieldYearlyOperationsDto>();
        foreach (var field in fields)
        {
            var snapshots = await _weatherSnapshots.GetHistoryAsync(field.Id, from, to, cancellationToken);
            var review = reviews.FirstOrDefault(r =>
                r.FieldId == field.Id &&
                r.Year == year &&
                string.Equals(r.PeriodType, WeatherPeriodTypes.Year, StringComparison.OrdinalIgnoreCase));
            rows.Add(BuildYearlyField(
                field,
                snapshots,
                review,
                tasks.Where(t => t.FieldId == field.Id).ToList(),
                ledger.Where(e => e.FieldId == field.Id).ToList(),
                year,
                now));
        }

        return new YearlyWeatherReportDto
        {
            Season = year.ToString(),
            Fields = rows
        };
    }

    private FieldMonthlyWeatherDto BuildMonthlyField(
        Field field,
        IReadOnlyList<FieldDailyWeatherSnapshot> snapshots,
        FieldWeatherPeriodReview? review,
        int year,
        int month,
        int daysInMonth)
    {
        var days = snapshots
            .Where(s => s.Date.Year == year && s.Date.Month == month)
            .OrderBy(s => s.Date)
            .ToList();
        var previousRain = snapshots
            .Where(s => s.Date.Year == year - 1 && s.Date.Month == month)
            .Sum(s => s.RainTotalMm ?? 0);

        var daily = new List<DailyWeatherRowDto>(daysInMonth);
        for (var d = 1; d <= daysInMonth; d++)
        {
            var snap = days.FirstOrDefault(s => s.Date.Day == d);
            daily.Add(new DailyWeatherRowDto
            {
                Day = d,
                MinTemperatureC = snap?.MinTemperatureC is { } min ? RoundOne(min) : null,
                MaxTemperatureC = snap?.MaxTemperatureC is { } max ? RoundOne(max) : null,
                RainTotalMm = RoundOne(snap?.RainTotalMm ?? 0),
                Et0Mm = snap?.Et0Mm is { } et0 ? RoundOne(et0) : null
            });
        }

        var rainTotal = RoundOne(days.Sum(s => s.RainTotalMm ?? 0));
        var et0Total = RoundOne(days.Sum(s => s.Et0Mm ?? 0));
        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var frost = days.Count(s => s.MinTemperatureC is <= 0);
        var heat = days.Count(s => s.MaxTemperatureC is { } max && max >= HeatStressTempC);
        var heavy = days.Count(s => (s.RainTotalMm ?? 0) >= HeavyRainMm);
        var dry = days.Count(s => (s.RainTotalMm ?? 0) <= DryDayMaxMm);
        var rainy = days.Count(s => (s.RainTotalMm ?? 0) > DryDayMaxMm);
        var dto = new FieldMonthlyWeatherDto
        {
            FieldId = field.Id,
            FieldName = field.Name,
            Location = field.GetApproximateAreaLabel(),
            AreaHa = RoundHa(field.ResolveAreaHectares() ?? 0),
            DayCount = days.Count,
            RainTotalMm = rainTotal,
            AvgMinTemperatureC = mins.Count > 0 ? RoundOne(mins.Average()) : null,
            AvgMaxTemperatureC = maxs.Count > 0 ? RoundOne(maxs.Average()) : null,
            MinTemperatureC = mins.Count > 0 ? RoundOne(mins.Min()) : null,
            MaxTemperatureC = maxs.Count > 0 ? RoundOne(maxs.Max()) : null,
            FrostNights = frost,
            HeatDays = heat,
            HeavyRainDays = heavy,
            DryDays = dry,
            RainyDays = rainy,
            LongestDryStreakDays = LongestDryStreak(days),
            RainVsPreviousPercent = RainChangePercent(rainTotal, previousRain),
            Et0TotalMm = et0Total,
            WaterBalanceMm = RoundOne(rainTotal - et0Total),
            NdviMean = review?.NdviMean is { } ndvi ? Math.Round(ndvi, 3, MidpointRounding.AwayFromZero) : null,
            NdviDeltaPercent = review?.NdviDeltaPercent is { } delta ? RoundOne(delta) : null,
            Days = daily
        };
        dto.Insights = BuildWeatherInsights(dto.FrostNights, dto.HeatDays, dto.HeavyRainDays, dto.LongestDryStreakDays, dto.RainVsPreviousPercent, dto.WaterBalanceMm, dto.DayCount);
        return dto;
    }

    private FieldYearlyOperationsDto BuildYearlyField(
        Field field,
        IReadOnlyList<FieldDailyWeatherSnapshot> snapshots,
        FieldWeatherPeriodReview? review,
        List<TaskItem> fieldTasks,
        List<FinancialEntry> fieldEntries,
        int year,
        DateTime now)
    {
        var days = snapshots.Where(s => s.Date.Year == year).OrderBy(s => s.Date).ToList();
        var previousRain = snapshots.Where(s => s.Date.Year == year - 1).Sum(s => s.RainTotalMm ?? 0);
        var monthlyRain = Enumerable.Range(1, 12)
            .Select(m => RoundOne(days.Where(s => s.Date.Month == m).Sum(s => s.RainTotalMm ?? 0)))
            .ToList();
        var posted = fieldEntries.Where(e => e.Status == FinancialEntryStatus.Posted && e.OccurredOn.Year == year).ToList();
        var monthlyCost = Enumerable.Range(1, 12)
            .Select(m => RoundMoney(posted.Where(e => e.Kind == FinancialEntryKind.Expense && e.OccurredOn.Month == m).Sum(e => e.Amount)))
            .ToList();
        var monthlyRevenue = Enumerable.Range(1, 12)
            .Select(m => RoundMoney(posted.Where(e => e.Kind == FinancialEntryKind.Income && e.OccurredOn.Month == m).Sum(e => e.Amount)))
            .ToList();
        var seasonTasks = fieldTasks.Where(t => TaskInYear(t, year)).ToList();
        var monthlyTasks = Enumerable.Range(1, 12)
            .Select(m => seasonTasks.Count(t => t.Status == WorkTaskStatus.Completed && (t.ActualEnd ?? t.ScheduledEnd ?? t.UpdatedAt).Month == m && (t.ActualEnd ?? t.ScheduledEnd ?? t.UpdatedAt).Year == year))
            .ToList();

        var totalCost = SumFieldCost(posted, seasonTasks);
        var revenue = SumFieldRevenue(posted);
        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var rainTotal = RoundOne(days.Sum(s => s.RainTotalMm ?? 0));
        int? wettest = null;
        var wettestMm = -1.0;
        for (var m = 1; m <= 12; m++)
        {
            if (monthlyRain[m - 1] > wettestMm)
            {
                wettestMm = monthlyRain[m - 1];
                wettest = m;
            }
        }

        if (wettestMm <= 0) wettest = null;

        var tasksByType = seasonTasks
            .GroupBy(t => string.IsNullOrWhiteSpace(t.Type) ? (string.IsNullOrWhiteSpace(t.Title) ? "other" : t.Title) : t.Type)
            .Select(g => new TaskTypeCountDto
            {
                Type = g.Key,
                Completed = g.Count(t => t.Status == WorkTaskStatus.Completed),
                Total = g.Count(),
                Cost = RoundMoney(g.Where(t => t.Status == WorkTaskStatus.Completed).Sum(t => t.Cost ?? 0))
            })
            .OrderByDescending(t => t.Completed)
            .ThenBy(t => t.Type)
            .ToList();

        var dto = new FieldYearlyOperationsDto
        {
            FieldId = field.Id,
            FieldName = field.Name,
            Location = field.GetApproximateAreaLabel(),
            AreaHa = RoundHa(field.ResolveAreaHectares() ?? 0),
            RainTotalMm = rainTotal,
            MinTemperatureC = mins.Count > 0 ? RoundOne(mins.Min()) : null,
            MaxTemperatureC = maxs.Count > 0 ? RoundOne(maxs.Max()) : null,
            FrostNights = days.Count(s => s.MinTemperatureC is <= 0),
            HeatDays = days.Count(s => s.MaxTemperatureC is { } max && max >= HeatStressTempC),
            HeavyRainDays = days.Count(s => (s.RainTotalMm ?? 0) >= HeavyRainMm),
            LongestDryStreakDays = LongestDryStreak(days),
            WettestMonth = wettest,
            RainVsPreviousPercent = RainChangePercent(rainTotal, previousRain),
            NdviMean = review?.NdviMean is { } ndvi ? Math.Round(ndvi, 3, MidpointRounding.AwayFromZero) : null,
            MonthlyRainMm = monthlyRain,
            TotalCost = RoundMoney(totalCost),
            Revenue = RoundMoney(revenue),
            Profit = RoundMoney(revenue - totalCost),
            CostPerHa = (field.ResolveAreaHectares() ?? 0) > 0 ? RoundMoney(totalCost / (decimal)RoundHa(field.ResolveAreaHectares() ?? 0)) : 0,
            MonthlyCost = monthlyCost,
            MonthlyRevenue = monthlyRevenue,
            TasksCompleted = seasonTasks.Count(t => t.Status == WorkTaskStatus.Completed),
            TasksPending = seasonTasks.Count(t => t.Status is WorkTaskStatus.Pending or WorkTaskStatus.InProgress),
            TasksOverdue = seasonTasks.Count(t =>
                t.Status != WorkTaskStatus.Completed &&
                t.Status != WorkTaskStatus.Cancelled &&
                t.ScheduledEnd.HasValue &&
                t.ScheduledEnd.Value < now),
            MonthlyTasksCompleted = monthlyTasks,
            TasksByType = tasksByType
        };
        dto.Insights = BuildWeatherInsights(dto.FrostNights, dto.HeatDays, dto.HeavyRainDays, dto.LongestDryStreakDays, dto.RainVsPreviousPercent, null, days.Count);
        if (dto.TasksOverdue > 0)
        {
            dto.Insights.Add(new ReportInsightDto { Code = "overdueTasks", Count = dto.TasksOverdue });
        }

        if (dto.Profit < 0)
        {
            dto.Insights.Add(new ReportInsightDto { Code = "loss", Value = (double)dto.Profit });
        }
        else if (dto.Profit > 0)
        {
            dto.Insights.Add(new ReportInsightDto { Code = "profit", Value = (double)dto.Profit });
        }

        return dto;
    }

    private static List<ReportInsightDto> BuildWeatherInsights(
        int frost,
        int heat,
        int heavyRain,
        int dryStreak,
        double? rainVsPrevious,
        double? waterBalanceMm,
        int dayCount)
    {
        var insights = new List<ReportInsightDto>();
        if (dayCount == 0)
        {
            insights.Add(new ReportInsightDto { Code = "noData" });
            return insights;
        }

        if (frost > 0) insights.Add(new ReportInsightDto { Code = "frost", Count = frost });
        if (heat > 0) insights.Add(new ReportInsightDto { Code = "heat", Count = heat });
        if (heavyRain > 0) insights.Add(new ReportInsightDto { Code = "heavyRain", Count = heavyRain });
        if (dryStreak >= 10) insights.Add(new ReportInsightDto { Code = "dryStreak", Count = dryStreak });
        if (rainVsPrevious is { } pct && Math.Abs(pct) >= 15)
        {
            insights.Add(new ReportInsightDto { Code = pct > 0 ? "wetter" : "drier", Value = Math.Abs(pct) });
        }

        if (waterBalanceMm is { } balance && Math.Abs(balance) >= 15)
        {
            insights.Add(new ReportInsightDto { Code = balance < 0 ? "waterDeficit" : "waterSurplus", Value = Math.Round(Math.Abs(balance), 0) });
        }

        return insights;
    }

    private static int LongestDryStreak(IReadOnlyList<FieldDailyWeatherSnapshot> days)
    {
        var longest = 0;
        var current = 0;
        foreach (var day in days.OrderBy(d => d.Date))
        {
            if ((day.RainTotalMm ?? 0) <= DryDayMaxMm)
            {
                current++;
                if (current > longest) longest = current;
            }
            else
            {
                current = 0;
            }
        }

        return longest;
    }

    private static double? RainChangePercent(double currentMm, double previousMm)
    {
        if (previousMm < 5) return null;
        return Math.Round((currentMm - previousMm) / previousMm * 100.0, 0, MidpointRounding.AwayFromZero);
    }

    private static DateTime TaskDate(TaskItem task) =>
        task.ActualEnd ?? task.ScheduledEnd ?? task.ScheduledStart ?? task.UpdatedAt;

    private static bool TaskInYear(TaskItem task, int year) =>
        CultivationSeason.MatchesPeriod(TaskDate(task), year, "calendar");

    private static bool IsPruning(TaskItem task) =>
        ContainsIgnoreCase(task.Type, "prun") ||
        ContainsIgnoreCase(task.Title, "prun") ||
        ContainsIgnoreCase(task.Title, "κλάδεμ");

    private static bool ContainsIgnoreCase(string? value, string fragment) =>
        !string.IsNullOrWhiteSpace(value) && value.Contains(fragment, StringComparison.OrdinalIgnoreCase);

    private string ResolveSeason(string? season) =>
        string.IsNullOrWhiteSpace(season) ? _dateTimeProvider.UtcNow.Year.ToString() : season.Trim();

    private static int ResolveYear(string? season, DateTime now) =>
        int.TryParse(season?.Trim(), out var year) ? year : now.Year;

    private static IEnumerable<Field> FilterFields(IEnumerable<Field> fields, string? lifecycleYear)
    {
        if (string.IsNullOrWhiteSpace(lifecycleYear))
        {
            return fields;
        }

        var year = lifecycleYear.Trim().ToLowerInvariant();
        return fields.Where(f => string.Equals(f.CurrentLifecycleYear, year, StringComparison.OrdinalIgnoreCase));
    }

    private static bool MatchesLifecycleYear(string? entryYear, string? filterYear)
    {
        if (string.IsNullOrWhiteSpace(filterYear))
        {
            return true;
        }

        return string.Equals(entryYear, filterYear.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesSeason(DateTime date, string? season, string? periodBasis = null)
    {
        if (string.IsNullOrWhiteSpace(season))
        {
            return true;
        }

        return int.TryParse(season.Trim(), out var year) && CultivationSeason.MatchesPeriod(date, year, periodBasis);
    }

    /// <summary>
    /// Recorded expenses prefer the ledger. Completed task costs are used only when the field
    /// has no posted expense rows, so a linked task+ledger pair is never summed twice.
    /// </summary>
    private static decimal SumFieldCost(IEnumerable<FinancialEntry> entries, IEnumerable<TaskItem> fieldTasks)
    {
        var postedExpenses = entries
            .Where(e => e.Status == FinancialEntryStatus.Posted && e.Kind == FinancialEntryKind.Expense)
            .ToList();
        if (postedExpenses.Count > 0)
        {
            return postedExpenses.Sum(e => e.Amount);
        }

        return fieldTasks.Where(t => t.Status == WorkTaskStatus.Completed).Sum(t => t.Cost ?? 0);
    }

    private static decimal SumFieldRevenue(IEnumerable<FinancialEntry> entries) =>
        entries
            .Where(e => e.Kind == FinancialEntryKind.Income && e.Status == FinancialEntryStatus.Posted)
            .Sum(e => e.Amount);

    private static double RoundHa(double value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static double RoundKg(double value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
    private static double RoundOne(double value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
    private static decimal RoundMoney(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static string? FormatDate(DateTime? value) => value?.ToString("yyyy-MM-dd");

    private async Task<IEnumerable<Field>> GetAccessibleFieldsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (userRole == Roles.FieldOwner || userRole == Roles.Administrator)
        {
            return await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken);
        }

        if (userRole == Roles.Producer)
        {
            return await _fieldRepository.GetByAssignedProducerIdAsync(userId, cancellationToken);
        }

        throw new ForbiddenException("You do not have permission to view reports.");
    }
}
