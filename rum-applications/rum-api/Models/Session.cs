using System;
using System.Collections.Generic;

namespace Rum.Api.Models
{
    public class Session
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ApplicationId { get; set; }
        public required string SessionGuid { get; set; }
        public required string Browser { get; set; }
        public required string Os { get; set; }
        public required string DeviceType { get; set; }
        public required string Resolution { get; set; }
        public required string Referrer { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Application? Application { get; set; }
        public ICollection<PageView> PageViews { get; set; } = new List<PageView>();
        public ICollection<WebVital> WebVitals { get; set; } = new List<WebVital>();
        public ICollection<NetworkRequest> NetworkRequests { get; set; } = new List<NetworkRequest>();
        public ICollection<ErrorLog> ErrorLogs { get; set; } = new List<ErrorLog>();
        public ICollection<UserEvent> UserEvents { get; set; } = new List<UserEvent>();
    }
}
