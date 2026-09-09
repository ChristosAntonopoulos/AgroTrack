namespace OliveLifecycle.Application.DTOs.Reports;

public class FieldSummaryReportDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double AreaHa { get; set; }
    public int TreeCount { get; set; }
    public string? Variety { get; set; }
    public int? TreeAge { get; set; }
    public string? IrrigationType { get; set; }
    public string? SoilType { get; set; }
    public string? LastPruningDate { get; set; }
    public string? LastHarvestDate { get; set; }
    public int TasksCompleted { get; set; }
    public int TasksPending { get; set; }
    public int TasksOverdue { get; set; }
    public decimal TotalCost { get; set; }
    public decimal CostPerHa { get; set; }
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
    public double TotalProductionKg { get; set; }
    public double YieldPerHa { get; set; }
    public double YieldPerTree { get; set; }
    public double? OilProducedKg { get; set; }
    public double? OilYieldPercent { get; set; }
}

public class HarvestRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public DateTime HarvestDate { get; set; }
    public string HarvestMethod { get; set; } = string.Empty;
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public double KgPerHa { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    public double? OilYieldPercent { get; set; }
    public string QualityGrade { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = "posted";
}

public class ProfitLossReportDto
{
    public string Season { get; set; } = string.Empty;
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public List<FieldProfitDto> ProfitByField { get; set; } = new();
    public Dictionary<string, decimal> ExpensesByBucket { get; set; } = new();
    public Dictionary<string, decimal> ExpensesByCategory { get; set; } = new();
}

public class FieldProfitDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
}

public class MonthlyWeatherReportDto
{
    public string Season { get; set; } = string.Empty;
    public int Month { get; set; }
    public List<FieldMonthlyWeatherDto> Fields { get; set; } = new();
}

public class FieldMonthlyWeatherDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double AreaHa { get; set; }
    public int DayCount { get; set; }
    public double RainTotalMm { get; set; }
    public double? AvgMinTemperatureC { get; set; }
    public double? AvgMaxTemperatureC { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public int FrostNights { get; set; }
    public int HeatDays { get; set; }
    public int HeavyRainDays { get; set; }
    public int DryDays { get; set; }
    public int RainyDays { get; set; }
    public int LongestDryStreakDays { get; set; }
    public double? RainVsPreviousPercent { get; set; }
    public double Et0TotalMm { get; set; }
    public double WaterBalanceMm { get; set; }
    public double? NdviMean { get; set; }
    public double? NdviDeltaPercent { get; set; }
    public List<DailyWeatherRowDto> Days { get; set; } = new();
    public List<ReportInsightDto> Insights { get; set; } = new();
}

public class DailyWeatherRowDto
{
    public int Day { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double RainTotalMm { get; set; }
    public double? Et0Mm { get; set; }
}

public class YearlyWeatherReportDto
{
    public string Season { get; set; } = string.Empty;
    public List<FieldYearlyOperationsDto> Fields { get; set; } = new();
}

public class FieldYearlyOperationsDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public double AreaHa { get; set; }
    public double RainTotalMm { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public int FrostNights { get; set; }
    public int HeatDays { get; set; }
    public int HeavyRainDays { get; set; }
    public int LongestDryStreakDays { get; set; }
    public int? WettestMonth { get; set; }
    public double? RainVsPreviousPercent { get; set; }
    public double? NdviMean { get; set; }
    public List<double> MonthlyRainMm { get; set; } = new();
    public decimal TotalCost { get; set; }
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
    public decimal CostPerHa { get; set; }
    public List<decimal> MonthlyCost { get; set; } = new();
    public List<decimal> MonthlyRevenue { get; set; } = new();
    public int TasksCompleted { get; set; }
    public int TasksPending { get; set; }
    public int TasksOverdue { get; set; }
    public List<int> MonthlyTasksCompleted { get; set; } = new();
    public List<TaskTypeCountDto> TasksByType { get; set; } = new();
    public List<ReportInsightDto> Insights { get; set; } = new();
}

public class TaskTypeCountDto
{
    public string Type { get; set; } = string.Empty;
    public int Completed { get; set; }
    public int Total { get; set; }
    public decimal Cost { get; set; }
}

public class ReportInsightDto
{
    public string Code { get; set; } = string.Empty;
    public int? Count { get; set; }
    public double? Value { get; set; }
}
