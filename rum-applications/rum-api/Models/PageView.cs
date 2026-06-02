using System;

namespace Rum.Api.Models
{
    public class PageView
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public required string Path { get; set; }
        public required string Title { get; set; }
        public int? DurationMs { get; set; } // Time spent on page
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Session? Session { get; set; }
    }
}
