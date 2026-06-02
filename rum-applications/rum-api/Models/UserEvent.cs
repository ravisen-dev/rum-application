using System;

namespace Rum.Api.Models
{
    public class UserEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public required string EventType { get; set; } // click, custom, etc.
        public string? ElementId { get; set; }
        public string? ElementTag { get; set; }
        public string? ElementClass { get; set; }
        public string? ElementPath { get; set; }
        public string? Metadata { get; set; } // JSON format
        public required string Path { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Session? Session { get; set; }
    }
}
