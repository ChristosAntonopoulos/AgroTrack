namespace OliveLifecycle.Core.Exceptions;

public class ForbiddenException : DomainException
{
    public string Code { get; }

    public ForbiddenException(string message, string code = "forbidden") : base(message)
    {
        Code = code;
    }
}
