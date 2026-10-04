namespace OliveLifecycle.Application.Photos;

/// <summary>
/// How to apply a resumable chunk. A chunk that starts past the bytes already
/// stored is rejected so the client can query progress and send the gap.
/// </summary>
public static class PhotoChunkPlan
{
    public readonly record struct Result(int Skip, bool Conflict);

    public static Result Plan(long received, long offset, int length)
    {
        if (length < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(length));
        }

        if (offset < 0 || offset > received)
        {
            return new Result(0, Conflict: true);
        }

        var skip = received - offset;
        if (skip >= length)
        {
            return new Result(length, Conflict: false);
        }

        return new Result((int)skip, Conflict: false);
    }
}
