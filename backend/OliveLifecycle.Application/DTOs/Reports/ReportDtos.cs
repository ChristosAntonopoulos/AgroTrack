namespace OliveLifecycle.Application.DTOs.Reports;

public class FieldSummaryReportDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public double AreaHa { get; set; }
    public string? Variety { get; set; }
    public int? TreeAge { get; set; }
    public int TasksCompleted { get; set; }
    public int TasksPending { get; set; }
    public int TasksOverdue { get; set; }
    public decimal TotalCost { get; set; }
    public double TotalProductionKg { get; set; }
    public double YieldPerHa { get; set; }
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
}

public class ProfitLossReportDto
{
    public string Season { get; set; } = string.Empty;
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public List<FieldProfitDto> ProfitByField { get; set; } = new();
}

public class FieldProfitDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
}
