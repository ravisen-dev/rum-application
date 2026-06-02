using System;

namespace Rum.Api.Models
{
    public class ErrorLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SessionId { get; set; }
        public required string Message { get; set; }
        public string? StackTrace { get; set; }
        public string? FileName { get; set; }
        public int? LineNumber { get; set; }
        public int? ColumnNumber { get; set; }
        public required string Path { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Session? Session { get; set; }
    }
}
