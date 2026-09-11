using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class ChronologioDisplayLabelsTests
{
    [Fact]
    public void PrimaryCategories_NeverLeakEnglishEnumsInGreek()
    {
        Assert.Equal("Εργασίες", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.Work));
        Assert.Equal("Παρατηρήσεις", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.Observation));
        Assert.Equal("Χρήματα", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.Money));
        Assert.Equal("Συγκομιδή", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.Harvest));
        Assert.Equal("Καιρός & προειδοποιήσεις", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.Weather));
        Assert.Equal("Αλλαγές χωραφιού", ChronologioDisplayLabels.PrimaryCategory(ChronologioPrimaryCategory.FieldChange));
        Assert.Equal("Παρατήρηση", ChronologioDisplayLabels.Category(ChronologioCategory.Note));
        Assert.DoesNotContain("Observation", ChronologioDisplayLabels.Category(ChronologioCategory.Note));
        Assert.DoesNotContain("fuel_and_energy", ChronologioDisplayLabels.HarvestSummary(100, null, null, null));
    }

    [Fact]
    public void HarvestSummary_OmitsMissingOilAndUsesGreek()
    {
        var withoutOil = ChronologioDisplayLabels.HarvestSummary(4760, null, null, null);
        Assert.Contains("ελιές", withoutOil);
        Assert.DoesNotContain("λάδι", withoutOil);
        Assert.DoesNotContain("L", withoutOil);

        var withOil = ChronologioDisplayLabels.HarvestSummary(4760, 825, 900, 17.3);
        Assert.Contains("λάδι", withOil);
        Assert.Contains("%", withOil);
    }

    [Fact]
    public void WeatherSummary_OmitsMissingAndZeroFrost()
    {
        var summary = ChronologioDisplayLabels.WeatherReviewSummary(18, 14, 31, frostNights: 0, isMonth: false);
        Assert.Contains("βροχή", summary);
        Assert.DoesNotContain("παγετού", summary);
        Assert.DoesNotContain("frost", summary);
    }

    [Fact]
    public void VegetationNote_IsGreek()
    {
        var note = ChronologioDisplayLabels.VegetationNote(8, isMonth: true);
        Assert.Contains("πράσινα", note);
        Assert.DoesNotContain("Trees", note);
    }
}
