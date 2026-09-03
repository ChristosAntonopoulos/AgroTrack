namespace OliveLifecycle.Core.Entities.Geospatial;

public class VegetationIndexStats
{
    public double Mean { get; set; }
    public double Median { get; set; }
    public double Minimum { get; set; }
    public double Maximum { get; set; }
    public double StandardDeviation { get; set; }
    public double P10 { get; set; }
    public double P90 { get; set; }

    /// <summary>
    /// Pixels that contributed to these statistics after cloud and boundary masking.
    /// Small counts mean the values describe only a fraction of the field.
    /// </summary>
    public int ValidPixelCount { get; set; }
}
