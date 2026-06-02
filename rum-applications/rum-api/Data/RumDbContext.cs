using Microsoft.EntityFrameworkCore;
using Rum.Api.Models;

namespace Rum.Api.Data
{
    public class RumDbContext : DbContext
    {
        public RumDbContext(DbContextOptions<RumDbContext> options) : base(options)
        {
        }

        public DbSet<Application> Applications => Set<Application>();
        public DbSet<Session> Sessions => Set<Session>();
        public DbSet<PageView> PageViews => Set<PageView>();
        public DbSet<WebVital> WebVitals => Set<WebVital>();
        public DbSet<NetworkRequest> NetworkRequests => Set<NetworkRequest>();
        public DbSet<ErrorLog> ErrorLogs => Set<ErrorLog>();
        public DbSet<UserEvent> UserEvents => Set<UserEvent>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Indexes for extremely fast analytics and timeline rendering
            
            // Applications Indexing
            modelBuilder.Entity<Application>()
                .HasIndex(a => a.ApiKey)
                .IsUnique();

            // Sessions Indexing
            modelBuilder.Entity<Session>()
                .HasIndex(s => new { s.ApplicationId, s.SessionGuid })
                .IsUnique();
            modelBuilder.Entity<Session>()
                .HasIndex(s => s.CreatedAt);

            // PageViews Indexing
            modelBuilder.Entity<PageView>()
                .HasIndex(pv => pv.SessionId);
            modelBuilder.Entity<PageView>()
                .HasIndex(pv => new { pv.Path, pv.CreatedAt });

            // WebVitals Indexing
            modelBuilder.Entity<WebVital>()
                .HasIndex(wv => wv.SessionId);
            modelBuilder.Entity<WebVital>()
                .HasIndex(wv => new { wv.MetricName, wv.CreatedAt });

            // NetworkRequests Indexing
            modelBuilder.Entity<NetworkRequest>()
                .HasIndex(nr => nr.SessionId);
            modelBuilder.Entity<NetworkRequest>()
                .HasIndex(nr => new { nr.Url, nr.CreatedAt });

            // ErrorLogs Indexing
            modelBuilder.Entity<ErrorLog>()
                .HasIndex(el => el.SessionId);
            modelBuilder.Entity<ErrorLog>()
                .HasIndex(el => el.CreatedAt);

            // UserEvents Indexing
            modelBuilder.Entity<UserEvent>()
                .HasIndex(ue => ue.SessionId);
            modelBuilder.Entity<UserEvent>()
                .HasIndex(ue => ue.CreatedAt);
        }
    }
}
