namespace OliveLifecycle.Core.Entities;

/// <summary>Expo push token registered by a mobile client for a user.</summary>
public class DevicePushToken : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string ExpoPushToken { get; set; } = string.Empty;
}
