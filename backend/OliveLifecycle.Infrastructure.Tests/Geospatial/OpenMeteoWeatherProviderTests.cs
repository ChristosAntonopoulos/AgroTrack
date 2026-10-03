using System.Net;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Providers;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class OpenMeteoWeatherProviderTests
{
    private const string ForecastJson =
        """
        {"hourly":{"time":["2026-10-02T12:00"],"temperature_2m":[21.5]}}
        """;

    [Fact]
    public async Task FetchForecastAsync_RetriesWhenTlsHandshakeIsReset()
    {
        var handler = new ScriptedHandler(
            () => throw new HttpRequestException(
                "The SSL connection could not be established.",
                new IOException(
                    "Unable to read data from the transport connection.",
                    new SocketException(10054))),
            () => JsonResponse(ForecastJson));

        var result = await CreateProvider(handler).FetchForecastAsync(37.19, 21.67);

        Assert.Equal(2, handler.Calls);
        Assert.Equal(21.5, result.HourlyForecast[0].TemperatureC);
    }

    [Fact]
    public async Task FetchForecastAsync_DoesNotRetryClientErrors()
    {
        var handler = new ScriptedHandler(
            () => new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = new StringContent("nope", Encoding.UTF8, "text/plain")
            });

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            CreateProvider(handler).FetchForecastAsync(37.19, 21.67));

        Assert.Equal(1, handler.Calls);
    }

    private static OpenMeteoWeatherProvider CreateProvider(HttpMessageHandler handler)
    {
        var options = Options.Create(new GeospatialOptions
        {
            Weather = new WeatherOptions
            {
                BaseUrl = "https://weather.test/v1",
                ForecastDays = 1,
                PastDays = 0
            }
        });
        return new OpenMeteoWeatherProvider(
            new HttpClient(handler),
            options,
            NullLogger<OpenMeteoWeatherProvider>.Instance);
    }

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Queue<Func<HttpResponseMessage>> _steps;

        public ScriptedHandler(params Func<HttpResponseMessage>[] steps) =>
            _steps = new Queue<Func<HttpResponseMessage>>(steps);

        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(_steps.Dequeue()());
        }
    }
}
