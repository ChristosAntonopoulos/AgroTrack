using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using OliveLifecycle.Application.Abstractions.Services;
using UglyToad.PdfPig;

namespace OliveLifecycle.Application.Services.Cadastre;

public class GreekCadastrePdfParser : IGreekCadastrePdfParser
{
    private static readonly Regex KaekRegex = new(
        @"(?:\d{2}\s+\d{3}\s+\d{2}\s+\d{2}\s+\d{3}|\d{12})\s*/\s*\d+\s*/\s*\d+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex OfficialAreaRegex = new(
        @"(?:Εμβαδόν\s+γεωτεμαχίου|ΕΜΒΑΔΟΝ)\s*:?\s*([\d\.,]+)\s*τ\.?\s*μ\.?",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex TitleAreaRegex = new(
        @"ΕΜΒΑΔΟΝ\s+ΤΙΤΛΟΥ\s*:?\s*([\d\.,]+)\s*τ\.?\s*μ\.?",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex ScaleRegex = new(
        @"1\s*:\s*(\d+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex PrintDateFooterRegex = new(
        @"(?:ΗΜΕΡΟΜΗΝΙΑ\s+ΕΚΤΥΠΩΣΗΣ|Ημερομηνία\s+εκτύπωσης|Ημερ/νία\s+εκτύπωσης)\s*:?\s*(\d{1,2})[./](\d{1,2})[./](\d{4})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PostalCodeRegex = new(
        @"(?<!\d)(\d{5})(?!\d)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Dictionary<string, string> KnownMunicipalities = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ΦΙΛΙΑΤΡΩΝ"] = "ΦΙΛΙΑΤΡΩΝ"
    };

    private static readonly Dictionary<string, string> KnownMunicipalityPrefectures = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ΦΙΛΙΑΤΡΩΝ"] = "Μεσσηνίας"
    };

    private static readonly string[] PiiPatterns =
    {
        @"Α\.Φ\.Μ\.?\s*:?\s*\d+",
        @"ΑΦΜ\s*:?\s*\d+",
        @"Α\.Δ\.Τ\.?\s*:?\s*\w+",
        @"ΑΔΤ\s*:?\s*\w+",
        @"Ημερ/νία\s+γέννησης",
        @"Πατρώνυμο",
        @"Μητρώνυμο",
        @"Όνομα\s+πατέρα",
        @"Όνομα\s+μητέρας"
    };

    private readonly IKaekNormalizer _kaekNormalizer;

    public GreekCadastrePdfParser(IKaekNormalizer kaekNormalizer)
    {
        _kaekNormalizer = kaekNormalizer;
    }

    public async Task<GreekCadastreParseResult> ParseAsync(
        Stream kdFile,
        Stream kfFile,
        CancellationToken cancellationToken = default)
    {
        var kdText = await ExtractTextAsync(kdFile, cancellationToken);
        var kfText = await ExtractTextAsync(kfFile, cancellationToken);

        kdText = StripPii(kdText);
        kfText = StripPii(kfText);

        var combined = $"{kdText}\n{kfText}";
        var result = new GreekCadastreParseResult();

        var kaekMatch = KaekRegex.Match(combined);
        if (kaekMatch.Success && _kaekNormalizer.TryNormalize(kaekMatch.Value, out var normalized))
        {
            result.Kaek = kaekMatch.Value.Trim();
            result.NormalizedKaek = normalized;
        }
        else
        {
            result.Warnings.Add("KAEK could not be extracted from the uploaded PDFs.");
        }

        var officialMatch = OfficialAreaRegex.Match(combined);
        if (officialMatch.Success && TryParseGreekArea(officialMatch.Groups[1].Value, out var officialArea))
        {
            result.OfficialAreaSqm = officialArea;
        }
        else
        {
            result.Warnings.Add("Official parcel area could not be extracted.");
        }

        var titleMatch = TitleAreaRegex.Match(combined);
        if (titleMatch.Success)
        {
            result.TitleAreaRaw = titleMatch.Groups[1].Value.Trim();
            if (TryParseGreekArea(titleMatch.Groups[1].Value, out var titleArea))
            {
                result.TitleAreaSqm = titleArea;
            }
            else
            {
                result.Warnings.Add("Title area was found but could not be parsed reliably. Raw value preserved.");
            }
        }

        ParseCadastralMetadata(kdText, kfText, result);
        ParseLocation(kfText, kdText, result);

        if (combined.Contains("EGSA", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("ΕΓΣΑ", StringComparison.OrdinalIgnoreCase))
        {
            result.CoordinateSystem = "EGSA87";
        }

        var scaleMatch = ScaleRegex.Match(kdText);
        if (scaleMatch.Success)
        {
            result.MapScale = $"1:{scaleMatch.Groups[1].Value}";
        }

        if (!TryParsePrintDate(combined, out var printDate))
        {
            TryParsePrintDate(kfText, out printDate);
        }

        if (printDate.HasValue)
        {
            result.ExtractPrintDate = printDate.Value;
        }

        result.Warnings.Add("The uploaded extract is reference data only and not legal proof.");
        result.Warnings.Add("Boundary polygon was not found in the PDF. User must draw or confirm the field boundary manually.");

        return result;
    }

    private static Task<string> ExtractTextAsync(Stream stream, CancellationToken cancellationToken)
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }

        using var document = PdfDocument.Open(stream);
        var builder = new StringBuilder();
        foreach (var page in document.GetPages())
        {
            cancellationToken.ThrowIfCancellationRequested();
            builder.AppendLine(page.Text);
        }

        return Task.FromResult(builder.ToString());
    }

    private static string StripPii(string text)
    {
        var cleaned = text;
        foreach (var pattern in PiiPatterns)
        {
            cleaned = Regex.Replace(cleaned, pattern, string.Empty, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }

        return cleaned;
    }

    private static void ParseLocation(string kfText, string kdText, GreekCadastreParseResult result)
    {
        var combined = $"{kfText}\n{kdText}";

        foreach (var (marker, label) in KnownMunicipalities)
        {
            if (combined.Contains(marker, StringComparison.OrdinalIgnoreCase))
            {
                result.Municipality = label;
                break;
            }
        }

        var normalizedKaekDigits = Regex.Replace(result.NormalizedKaek ?? string.Empty, @"\D", string.Empty);
        foreach (Match match in PostalCodeRegex.Matches(combined))
        {
            var candidate = match.Groups[1].Value;
            if (normalizedKaekDigits.Contains(candidate, StringComparison.Ordinal))
            {
                continue;
            }

            // Prefer postal codes that appear near a year reference in cadastre descriptive text.
            var contextStart = Math.Max(0, match.Index - 40);
            var contextEnd = Math.Min(combined.Length, match.Index + candidate.Length + 40);
            var context = combined[contextStart..contextEnd];
            if (context.Contains("2021", StringComparison.Ordinal) ||
                context.Contains("2020", StringComparison.Ordinal) ||
                context.Contains("2022", StringComparison.Ordinal) ||
                context.Contains("2023", StringComparison.Ordinal) ||
                context.Contains("2024", StringComparison.Ordinal) ||
                context.Contains("2025", StringComparison.Ordinal) ||
                context.Contains("2026", StringComparison.Ordinal))
            {
                result.PostalCode = candidate;
                break;
            }
        }

        result.PostalCode ??= PostalCodeRegex.Matches(combined)
            .Select(m => m.Groups[1].Value)
            .FirstOrDefault(code => !normalizedKaekDigits.Contains(code, StringComparison.Ordinal));

        if (string.IsNullOrWhiteSpace(result.Prefecture) &&
            !string.IsNullOrWhiteSpace(result.Municipality) &&
            KnownMunicipalityPrefectures.TryGetValue(result.Municipality, out var inferredPrefecture))
        {
            result.Prefecture = inferredPrefecture;
        }

        result.LocationText = BuildLocationText(result);
    }

    private static string? BuildLocationText(GreekCadastreParseResult result)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(result.Municipality))
        {
            parts.Add(result.Municipality);
        }

        if (!string.IsNullOrWhiteSpace(result.PostalCode))
        {
            parts.Add(result.PostalCode);
        }

        if (!string.IsNullOrWhiteSpace(result.Prefecture))
        {
            parts.Add(result.Prefecture);
        }

        return parts.Count == 0 ? null : string.Join(", ", parts);
    }

    private static bool TryParsePrintDate(string text, out DateTime? value)
    {
        value = null;
        var footerMatch = PrintDateFooterRegex.Match(text);
        if (footerMatch.Success && TryParseDateParts(footerMatch, out var footerDate))
        {
            value = footerDate;
            return true;
        }

        DateTime? latest = null;
        foreach (Match match in Regex.Matches(text, @"(\d{1,2})[./](\d{1,2})[./](\d{4})", RegexOptions.CultureInvariant))
        {
            if (!TryParseDateParts(match, out var candidate))
            {
                continue;
            }

            if (latest == null || candidate > latest)
            {
                latest = candidate;
            }
        }

        value = latest;
        return latest.HasValue;
    }

    private static bool TryParseDateParts(Match match, out DateTime date)
    {
        date = default;
        return int.TryParse(match.Groups[1].Value, out var day) &&
               int.TryParse(match.Groups[2].Value, out var month) &&
               int.TryParse(match.Groups[3].Value, out var year) &&
               TryCreateUtcDate(year, month, day, out date);
    }

    private static bool TryCreateUtcDate(int year, int month, int day, out DateTime date)
    {
        date = default;
        if (year < 1990 || year > 2100 || month is < 1 or > 12 || day is < 1 or > 31)
        {
            return false;
        }

        try
        {
            date = new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            return false;
        }
    }

    private static void ParseCadastralMetadata(string kdText, string kfText, GreekCadastreParseResult result)
    {
        var combined = $"{kdText}\n{kfText}";
        if (combined.Contains("Πελοποννήσου", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("ΠΕΛΟΠΟΝΝΗΣΟΥ", StringComparison.OrdinalIgnoreCase))
        {
            result.CadastralOffice = "Κτηματολογικό Γραφείο Πελοποννήσου";
        }

        if (combined.Contains("Μεσσηνίας", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("ΜΕΣΣΗΝΙΑΣ", StringComparison.OrdinalIgnoreCase))
        {
            result.Prefecture = "Μεσσηνίας";
        }
    }

    private static bool TryParseGreekArea(string raw, out double value)
    {
        value = 0;
        var normalized = raw.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        // Greek cadastre often uses comma as thousands separator and dot as decimal, or vice versa.
        if (normalized.Contains(',') && normalized.Contains('.'))
        {
            normalized = normalized.Replace(".", string.Empty).Replace(',', '.');
        }
        else if (normalized.Contains(','))
        {
            var parts = normalized.Split(',');
            normalized = parts.Length == 2 && parts[1].Length <= 3
                ? $"{parts[0]}.{parts[1]}"
                : normalized.Replace(",", string.Empty);
        }

        return double.TryParse(normalized, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }
}
