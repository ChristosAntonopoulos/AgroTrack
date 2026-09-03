namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>
/// Reads arbitrary byte ranges from a remote or local raster. Cloud-Optimized
/// GeoTIFFs are laid out so that a handful of ranged reads are enough to fetch
/// the header and only the tiles that cover a field, instead of downloading
/// entire 100+ MB scene bands.
/// </summary>
public interface IRangeReader
{
    Task<byte[]> ReadAsync(long offset, int length, CancellationToken cancellationToken = default);
}

/// <summary>
/// Range reader backed by HTTP. The leading bytes of the file are prefetched once
/// because every COG keeps its header and tile index at the front, which removes
/// a request per tag lookup.
/// </summary>
public sealed class HttpRangeReader : IRangeReader
{
    private readonly HttpClient _httpClient;
    private readonly string _url;
    private readonly int _headerPrefetchBytes;
    private byte[]? _header;

    public HttpRangeReader(HttpClient httpClient, string url, int headerPrefetchBytes = 64 * 1024)
    {
        _httpClient = httpClient;
        _url = url;
        _headerPrefetchBytes = headerPrefetchBytes;
    }

    public async Task<byte[]> ReadAsync(long offset, int length, CancellationToken cancellationToken = default)
    {
        if (length <= 0)
        {
            return [];
        }

        _header ??= await FetchAsync(0, _headerPrefetchBytes, cancellationToken);

        if (offset + length <= _header.Length)
        {
            return _header.AsSpan((int)offset, length).ToArray();
        }

        return await FetchAsync(offset, length, cancellationToken);
    }

    private async Task<byte[]> FetchAsync(long offset, int length, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, _url);
        request.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(offset, offset + length - 1);

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        // A server that ignores Range returns the whole object; slice it ourselves so
        // downstream offset maths stays correct.
        if (response.StatusCode != System.Net.HttpStatusCode.PartialContent && payload.Length > length)
        {
            var available = (int)Math.Min(length, Math.Max(0, payload.LongLength - offset));
            return available <= 0 ? [] : payload.AsSpan((int)offset, available).ToArray();
        }

        return payload;
    }
}

/// <summary>Range reader over an in-memory buffer, used for local files and tests.</summary>
public sealed class MemoryRangeReader : IRangeReader
{
    private readonly byte[] _data;

    public MemoryRangeReader(byte[] data) => _data = data;

    public Task<byte[]> ReadAsync(long offset, int length, CancellationToken cancellationToken = default)
    {
        if (offset >= _data.Length || length <= 0)
        {
            return Task.FromResult(Array.Empty<byte>());
        }

        var available = (int)Math.Min(length, _data.Length - offset);
        return Task.FromResult(_data.AsSpan((int)offset, available).ToArray());
    }
}
