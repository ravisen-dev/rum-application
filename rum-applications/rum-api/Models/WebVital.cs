using System;

namespace Rum.Api.Models
{
    public class WebVital
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public required string MetricName { get; set; } // LCP, FID, CLS, INP, TTFB, FCP
        public double Value { get; set; }
        public required string Rating { get; set; } // good, needs-improvement, poor
        public required string Path { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Session? Session { get; set; }
    }
}
