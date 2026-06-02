using System;

namespace Rum.Api.Models
{
    public class NetworkRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public required string Url { get; set; }
        public required string Method { get; set; }
        public int StatusCode { get; set; }
        public int DurationMs { get; set; }
        public required string Path { get; set; } // Page path where request was triggered
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Session? Session { get; set; }
    }
}
