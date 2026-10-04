using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.Photos;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Infrastructure.Storage;

public class FilePhotoUploadSessionStore : IPhotoUploadSessionStore
{
    private const int MaxChunkBytes = 1024 * 1024;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> Locks = new();
    private readonly string _root;
    private readonly ILogger<FilePhotoUploadSessionStore> _logger;

    public FilePhotoUploadSessionStore(
        IConfiguration configuration,
        ILogger<FilePhotoUploadSessionStore> logger)
    {
        var uploads = configuration["Storage:LocalPath"];
        var uploadsFull = string.IsNullOrWhiteSpace(uploads)
            ? Path.Combine(Directory.GetCurrentDirectory(), "uploads")
            : Path.GetFullPath(uploads);
        var parent = Directory.GetParent(uploadsFull)?.FullName ?? Path.GetTempPath();
        _root = Path.Combine(parent, "photo-upload-sessions");
        _logger = logger;
        Directory.CreateDirectory(_root);
    }

    public async Task<PhotoUploadSession> CreateAsync(
        string userId,
        string fileName,
        string contentType,
        long totalBytes,
        CancellationToken cancellationToken = default)
    {
        if (totalBytes <= 0 || totalBytes > PhotoHubService.MaxUploadBytes)
        {
            throw new ValidationException("Image exceeds the 10 MB limit.");
        }

        var session = new PhotoUploadSession
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            FileName = Path.GetFileName(string.IsNullOrWhiteSpace(fileName) ? "photo.jpg" : fileName),
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "image/jpeg" : contentType,
            TotalBytes = totalBytes,
            ReceivedBytes = 0
        };
        await WriteMetaAsync(session, cancellationToken);
        _logger.LogInformation("Started resumable photo upload {UploadId}", session.Id);
        return session;
    }

    public async Task<PhotoUploadSession?> GetAsync(
        string uploadId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var meta = MetaPath(uploadId);
        if (!File.Exists(meta))
        {
            return null;
        }

        var session = await ReadMetaAsync(meta, cancellationToken);
        return session.UserId == userId ? session : null;
    }

    public async Task<PhotoChunkAppendResult> AppendAsync(
        string uploadId,
        string userId,
        long offset,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var gate = Locks.GetOrAdd(uploadId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            var session = await GetAsync(uploadId, userId, cancellationToken)
                ?? throw new NotFoundException("Upload session not found.");

            await using var buffer = new MemoryStream();
            var readBuffer = new byte[81920];
            while (buffer.Length <= MaxChunkBytes)
            {
                var read = await content.ReadAsync(readBuffer, cancellationToken);
                if (read == 0)
                {
                    break;
                }

                if (buffer.Length + read > MaxChunkBytes)
                {
                    throw new ValidationException("Upload chunk is too large.");
                }

                await buffer.WriteAsync(readBuffer.AsMemory(0, read), cancellationToken);
            }

            var bytes = buffer.ToArray();
            var plan = PhotoChunkPlan.Plan(session.ReceivedBytes, offset, bytes.Length);
            if (plan.Conflict)
            {
                return new PhotoChunkAppendResult(session, Conflict: true);
            }

            if (plan.Skip < bytes.Length)
            {
                var part = PartPath(uploadId);
                await using var file = new FileStream(part, FileMode.OpenOrCreate, FileAccess.Write, FileShare.Read);
                file.Seek(session.ReceivedBytes, SeekOrigin.Begin);
                await file.WriteAsync(bytes.AsMemory(plan.Skip), cancellationToken);
                session.ReceivedBytes += bytes.Length - plan.Skip;
            }

            if (session.ReceivedBytes > session.TotalBytes)
            {
                throw new ValidationException("Upload exceeded the declared size.");
            }

            await WriteMetaAsync(session, cancellationToken);
            return new PhotoChunkAppendResult(session, Conflict: false);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<Stream?> OpenReadAsync(
        string uploadId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAsync(uploadId, userId, cancellationToken);
        if (session == null)
        {
            return null;
        }

        var part = PartPath(uploadId);
        if (!File.Exists(part))
        {
            return null;
        }

        return new FileStream(part, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
    }

    public Task DeleteAsync(string uploadId, string userId, CancellationToken cancellationToken = default)
    {
        var sessionPath = MetaPath(uploadId);
        if (!File.Exists(sessionPath))
        {
            return Task.CompletedTask;
        }

        return DeleteCoreAsync(uploadId, userId, cancellationToken);
    }

    private async Task DeleteCoreAsync(string uploadId, string userId, CancellationToken cancellationToken)
    {
        var session = await GetAsync(uploadId, userId, cancellationToken);
        if (session == null)
        {
            return;
        }

        TryDelete(MetaPath(uploadId));
        TryDelete(PartPath(uploadId));
        Locks.TryRemove(uploadId, out _);
    }

    private string MetaPath(string uploadId) => Path.Combine(_root, RequireId(uploadId) + ".json");

    private string PartPath(string uploadId) => Path.Combine(_root, RequireId(uploadId) + ".part");

    private static string RequireId(string uploadId)
    {
        if (uploadId.Length != 32 || !uploadId.All(c => Uri.IsHexDigit(c)))
        {
            throw new ValidationException("Upload session is not valid.");
        }

        return uploadId.ToLowerInvariant();
    }

    private async Task WriteMetaAsync(PhotoUploadSession session, CancellationToken cancellationToken)
    {
        var path = MetaPath(session.Id);
        await using var stream = File.Create(path);
        await JsonSerializer.SerializeAsync(stream, session, cancellationToken: cancellationToken);
    }

    private static async Task<PhotoUploadSession> ReadMetaAsync(string path, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<PhotoUploadSession>(stream, cancellationToken: cancellationToken)
            ?? throw new ValidationException("Upload session is not valid.");
    }

    private void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not delete photo upload session file {Path}", path);
        }
    }
}
