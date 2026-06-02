using System;
using System.Collections.Generic;

namespace Rum.Api.Models
{
    public class Application
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public required string Name { get; set; }
        public required string ApiKey { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public ICollection<Session> Sessions { get; set; } = new List<Session>();
    }
}
