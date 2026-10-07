namespace OliveLifecycle.Core.Exceptions;

public class ConflictException : DomainException
{
    public string Code { get; }

    public ConflictException(string message, string code = "conflict") : base(message)
    {
        Code = code;
    }
}
