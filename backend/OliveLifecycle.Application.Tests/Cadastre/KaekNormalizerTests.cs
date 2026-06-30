using OliveLifecycle.Application.Services.Fields;
using Xunit;

namespace OliveLifecycle.Application.Tests.Cadastre;

public class KaekNormalizerTests
{
    private readonly KaekNormalizer _normalizer = new();

    [Theory]
    [InlineData("362621142088/0/0", "362621142088/0/0")]
    [InlineData("362621142088 / 0 / 0", "362621142088/0/0")]
    [InlineData("36 262 11 42 088 / 0 / 0", "362621142088/0/0")]
    public void TryNormalize_ValidFormats_ReturnsExpected(string input, string expected)
    {
        var success = _normalizer.TryNormalize(input, out var normalized);
        Assert.True(success);
        Assert.Equal(expected, normalized);
    }

    [Fact]
    public void IsValidFormat_InvalidInput_ReturnsFalse()
    {
        Assert.False(_normalizer.IsValidFormat("invalid"));
    }
}
