namespace OliveLifecycle.Application.Abstractions.Services;

public interface IKaekNormalizer
{
    bool TryNormalize(string? input, out string normalized);
    bool IsValidFormat(string? input);
}
