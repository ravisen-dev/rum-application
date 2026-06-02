using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Rum.Api.DTOs
{
    public class TelemetryBatchDto
    {
        public required string ApplicationId { get; set; }
        public required SessionDto Session { get; set; }
        public required List<TelemetryEventDto> Events { get; set; }
    }

    public class SessionDto
    {
        public required string SessionGuid { get; set; }
        public required string Browser { get; set; }
        public required string Os { get; set; }
        public required string DeviceType { get; set; }
        public required string Resolution { get; set; }
        public required string Referrer { get; set; }
    }

    public class TelemetryEventDto
    {
        public required string Type { get; set; } // pageview, webvital, network, error, event
        public required string Timestamp { get; set; }
        public required string Path { get; set; }

        // PageView specifics
        public string? Title { get; set; }
        public string? Referrer { get; set; }
        public int? DurationMs { get; set; }

        // WebVital specifics
        public string? MetricName { get; set; } // FCP, LCP, FID, CLS, INP, TTFB
        public double? Value { get; set; }
        public string? Rating { get; set; } // good, needs-improvement, poor

        // Network specifics
        public string? Url { get; set; }
        public string? Method { get; set; }
        public int? StatusCode { get; set; }

        // Error specifics
        public string? Message { get; set; }
        public string? StackTrace { get; set; }
        public string? FileName { get; set; }
        public int? LineNumber { get; set; }
        public int? ColumnNumber { get; set; }

        // UserEvent specifics
        public string? EventType { get; set; } // click, custom, etc.
        public string? ElementId { get; set; }
        public string? ElementTag { get; set; }
        public string? ElementClass { get; set; }
        public string? ElementPath { get; set; }
        public string? Metadata { get; set; } // JSON format
    }
}
