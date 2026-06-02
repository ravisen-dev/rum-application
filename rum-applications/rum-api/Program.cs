using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Rum.Api.Data;
using Rum.Api.DTOs;
using Rum.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Configure DbContext with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=rum_db;Username=postgres;Password=postgres;Port=5432";

builder.Services.AddDbContext<RumDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure JSON serialization options
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

app.UseCors("AllowAll");

// Auto-run DB migrations on startup to make the application plug-and-play
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RumDbContext>();
    try
    {
        db.Database.EnsureCreated(); // Creates DB and tables automatically
        
        // Seed default application for testing if none exist
        if (!db.Applications.Any())
        {
            db.Applications.Add(new Application
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = "E-Commerce Production",
                ApiKey = "test-app-id-123",
                CreatedAt = DateTime.UtcNow
            });
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while creating or seeding the database.");
    }
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// Root health check
app.MapGet("/", () => Results.Ok(new { Status = "Healthy", Version = "1.0", Service = "RUM Ingestion API" }));

// --- Applications Management ---

app.MapGet("/api/applications", async (RumDbContext db) =>
{
    var apps = await db.Applications
        .Select(a => new { a.Id, a.Name, a.ApiKey, a.CreatedAt })
        .OrderByDescending(a => a.CreatedAt)
        .ToListAsync();
    return Results.Ok(apps);
});

app.MapPost("/api/applications", async (RumDbContext db, ApplicationCreateDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name))
    {
        return Results.BadRequest(new { Message = "Application name is required." });
    }

    var app = new Application
    {
        Name = dto.Name,
        ApiKey = Guid.NewGuid().ToString("N")[..12] // unique 12-char key
    };

    db.Applications.Add(app);
    await db.SaveChangesAsync();

    return Results.Created($"/api/applications/{app.Id}", app);
});

// --- Telemetry Ingestion (Anonymous / CORS enabled) ---

app.MapPost("/api/telemetry/ingest", async (RumDbContext db, TelemetryBatchDto batch) =>
{
    // 1. Verify Application exists by ApiKey/ApplicationId
    var app = await db.Applications.FirstOrDefaultAsync(a => a.ApiKey == batch.ApplicationId);
    if (app == null)
    {
        return Results.NotFound(new { Message = $"Application with ID/Key '{batch.ApplicationId}' not found." });
    }

    // 2. Find or create the Session
    var session = await db.Sessions
        .FirstOrDefaultAsync(s => s.ApplicationId == app.Id && s.SessionGuid == batch.Session.SessionGuid);

    if (session == null)
    {
        session = new Session
        {
            ApplicationId = app.Id,
            SessionGuid = batch.Session.SessionGuid,
            Browser = batch.Session.Browser,
            Os = batch.Session.Os,
            DeviceType = batch.Session.DeviceType,
            Resolution = batch.Session.Resolution,
            Referrer = batch.Session.Referrer,
            CreatedAt = DateTime.UtcNow
        };
        db.Sessions.Add(session);
        await db.SaveChangesAsync(); // save to generate session.Id
    }

    // 3. Process Batch Events
    foreach (var ev in batch.Events)
    {
        // Parse timestamp
        if (!DateTime.TryParse(ev.Timestamp, out var timestamp))
        {
            timestamp = DateTime.UtcNow;
        }

        switch (ev.Type.ToLower())
        {
            case "pageview":
                db.PageViews.Add(new PageView
                {
                    SessionId = session.Id,
                    Path = ev.Path,
                    Title = ev.Title ?? "Unknown Page",
                    DurationMs = ev.DurationMs,
                    CreatedAt = timestamp
                });
                break;

            case "webvital":
                if (ev.MetricName != null && ev.Value.HasValue && ev.Rating != null)
                {
                    db.WebVitals.Add(new WebVital
                    {
                        SessionId = session.Id,
                        MetricName = ev.MetricName,
                        Value = ev.Value.Value,
                        Rating = ev.Rating,
                        Path = ev.Path,
                        CreatedAt = timestamp
                    });
                }
                break;

            case "network":
                if (ev.Url != null && ev.Method != null && ev.StatusCode.HasValue && ev.DurationMs.HasValue)
                {
                    db.NetworkRequests.Add(new NetworkRequest
                    {
                        SessionId = session.Id,
                        Url = ev.Url,
                        Method = ev.Method,
                        StatusCode = ev.StatusCode.Value,
                        DurationMs = ev.DurationMs.Value,
                        Path = ev.Path,
                        CreatedAt = timestamp
                    });
                }
                break;

            case "error":
                if (ev.Message != null)
                {
                    db.ErrorLogs.Add(new ErrorLog
                    {
                        SessionId = session.Id,
                        Message = ev.Message,
                        StackTrace = ev.StackTrace,
                        FileName = ev.FileName,
                        LineNumber = ev.LineNumber,
                        ColumnNumber = ev.ColumnNumber,
                        Path = ev.Path,
                        CreatedAt = timestamp
                    });
                }
                break;

            case "event":
                if (ev.EventType != null)
                {
                    db.UserEvents.Add(new UserEvent
                    {
                        SessionId = session.Id,
                        EventType = ev.EventType,
                        ElementId = ev.ElementId,
                        ElementTag = ev.ElementTag,
                        ElementClass = ev.ElementClass,
                        ElementPath = ev.ElementPath,
                        Metadata = ev.Metadata,
                        Path = ev.Path,
                        CreatedAt = timestamp
                    });
                }
                break;
        }
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { Success = true, Count = batch.Events.Count });
});

// --- Analytics & Dashboard Endpoints ---

// 1. Overview aggregates
app.MapGet("/api/dashboards/overview", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var totalPageViews = await db.PageViews
        .Where(pv => pv.Session!.ApplicationId == appId && pv.CreatedAt >= cutoff)
        .CountAsync();

    var activeSessions = await db.Sessions
        .Where(s => s.ApplicationId == appId && s.CreatedAt >= cutoff)
        .CountAsync();

    // Average page load duration
    var avgLoadTime = await db.PageViews
        .Where(pv => pv.Session!.ApplicationId == appId && pv.CreatedAt >= cutoff && pv.DurationMs != null)
        .AverageAsync(pv => (double?)pv.DurationMs) ?? 0.0;

    // Error rate = sessions with errors / total sessions
    var totalSessionsWithErrors = await db.ErrorLogs
        .Where(el => el.Session!.ApplicationId == appId && el.CreatedAt >= cutoff)
        .Select(el => el.SessionId)
        .Distinct()
        .CountAsync();

    var errorRate = activeSessions > 0 ? (double)totalSessionsWithErrors / activeSessions * 100.0 : 0.0;

    // Page views over time (grouped by day)
    var viewsOverTime = await db.PageViews
        .Where(pv => pv.Session!.ApplicationId == appId && pv.CreatedAt >= cutoff)
        .GroupBy(pv => pv.CreatedAt.Date)
        .Select(g => new { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
        .OrderBy(x => x.Date)
        .ToListAsync();

    // Error spikes over time
    var errorsOverTime = await db.ErrorLogs
        .Where(el => el.Session!.ApplicationId == appId && el.CreatedAt >= cutoff)
        .GroupBy(el => el.CreatedAt.Date)
        .Select(g => new { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
        .OrderBy(x => x.Date)
        .ToListAsync();

    return Results.Ok(new
    {
        TotalPageViews = totalPageViews,
        ActiveSessions = activeSessions,
        AvgLoadTime = Math.Round(avgLoadTime, 1),
        ErrorRate = Math.Round(errorRate, 2),
        ViewsOverTime = viewsOverTime,
        ErrorsOverTime = errorsOverTime
    });
});

// 2. Web Vitals analytics
app.MapGet("/api/dashboards/web-vitals", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var vitals = await db.WebVitals
        .Where(wv => wv.Session!.ApplicationId == appId && wv.CreatedAt >= cutoff)
        .ToListAsync();

    var grouped = vitals
        .GroupBy(v => v.MetricName)
        .Select(g => {
            var total = g.Count();
            var good = g.Count(v => v.Rating == "good");
            var needsImprovement = g.Count(v => v.Rating == "needs-improvement");
            var poor = g.Count(v => v.Rating == "poor");
            var avg = g.Average(v => v.Value);

            return new {
                MetricName = g.Key,
                AvgValue = Math.Round(avg, 2),
                TotalCount = total,
                GoodCount = good,
                NeedsImprovementCount = needsImprovement,
                PoorCount = poor,
                GoodPercentage = total > 0 ? Math.Round((double)good / total * 100.0, 1) : 0.0,
                NeedsImprovementPercentage = total > 0 ? Math.Round((double)needsImprovement / total * 100.0, 1) : 0.0,
                PoorPercentage = total > 0 ? Math.Round((double)poor / total * 100.0, 1) : 0.0
            };
        })
        .ToList();

    return Results.Ok(grouped);
});

// 3. Pages breakdown
app.MapGet("/api/dashboards/pages", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var pages = await db.PageViews
        .Where(pv => pv.Session!.ApplicationId == appId && pv.CreatedAt >= cutoff)
        .GroupBy(pv => pv.Path)
        .Select(g => new
        {
            Path = g.Key,
            ViewsCount = g.Count(),
            AvgDurationMs = Math.Round(g.Average(pv => pv.DurationMs) ?? 0.0, 1)
        })
        .OrderByDescending(x => x.ViewsCount)
        .ToListAsync();

    return Results.Ok(pages);
});

// 4. Network performance
app.MapGet("/api/dashboards/network", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var requests = await db.NetworkRequests
        .Where(nr => nr.Session!.ApplicationId == appId && nr.CreatedAt >= cutoff)
        .GroupBy(nr => new { nr.Url, nr.Method })
        .Select(g => new
        {
            Url = g.Key.Url,
            Method = g.Key.Method,
            RequestCount = g.Count(),
            AvgDurationMs = Math.Round(g.Average(nr => nr.DurationMs), 1),
            ErrorCount = g.Count(nr => nr.StatusCode >= 400 || nr.StatusCode == 0),
            ErrorRate = Math.Round((double)g.Count(nr => nr.StatusCode >= 400 || nr.StatusCode == 0) / g.Count() * 100.0, 2)
        })
        .OrderByDescending(x => x.AvgDurationMs)
        .Take(50)
        .ToListAsync();

    return Results.Ok(requests);
});

// 5. JavaScript Errors tracking
app.MapGet("/api/dashboards/errors", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var errors = await db.ErrorLogs
        .Where(el => el.Session!.ApplicationId == appId && el.CreatedAt >= cutoff)
        .GroupBy(el => new { el.Message, el.StackTrace, el.FileName })
        .Select(g => new
        {
            Message = g.Key.Message,
            StackTrace = g.Key.StackTrace ?? "",
            FileName = g.Key.FileName ?? "unknown",
            OccurrenceCount = g.Count(),
            AffectedSessions = g.Select(el => el.SessionId).Distinct().Count(),
            LastSeen = g.Max(el => el.CreatedAt)
        })
        .OrderByDescending(x => x.OccurrenceCount)
        .ToListAsync();

    return Results.Ok(errors);
});

// 6. Sessions explorer listing
app.MapGet("/api/dashboards/sessions", async (RumDbContext db, Guid appId, int rangeDays = 7) =>
{
    var cutoff = DateTime.UtcNow.AddDays(-rangeDays);

    var sessions = await db.Sessions
        .Where(s => s.ApplicationId == appId && s.CreatedAt >= cutoff)
        .Select(s => new
        {
            s.Id,
            s.SessionGuid,
            s.Browser,
            s.Os,
            s.DeviceType,
            s.Resolution,
            s.Referrer,
            s.CreatedAt,
            EventsCount = s.PageViews.Count + s.WebVitals.Count + s.NetworkRequests.Count + s.ErrorLogs.Count + s.UserEvents.Count
        })
        .OrderByDescending(s => s.CreatedAt)
        .ToListAsync();

    return Results.Ok(sessions);
});

// 7. Session Timeline Detailed Drilldown
app.MapGet("/api/dashboards/sessions/{id}", async (RumDbContext db, Guid id) =>
{
    var session = await db.Sessions
        .FirstOrDefaultAsync(s => s.Id == id);

    if (session == null)
    {
        return Results.NotFound(new { Message = "Session not found." });
    }

    // Pull events from all tables
    var pageViews = await db.PageViews
        .Where(pv => pv.SessionId == id)
        .Select(pv => new TelemetryEventDto
        {
            Type = "pageview",
            Timestamp = pv.CreatedAt.ToString("o"),
            Path = pv.Path,
            Title = pv.Title,
            DurationMs = pv.DurationMs
        }).ToListAsync();

    var vitals = await db.WebVitals
        .Where(wv => wv.SessionId == id)
        .Select(wv => new TelemetryEventDto
        {
            Type = "webvital",
            Timestamp = wv.CreatedAt.ToString("o"),
            Path = wv.Path,
            MetricName = wv.MetricName,
            Value = wv.Value,
            Rating = wv.Rating
        }).ToListAsync();

    var network = await db.NetworkRequests
        .Where(nr => nr.SessionId == id)
        .Select(nr => new TelemetryEventDto
        {
            Type = "network",
            Timestamp = nr.CreatedAt.ToString("o"),
            Path = nr.Path,
            Url = nr.Url,
            Method = nr.Method,
            StatusCode = nr.StatusCode,
            DurationMs = nr.DurationMs
        }).ToListAsync();

    var errors = await db.ErrorLogs
        .Where(el => el.SessionId == id)
        .Select(el => new TelemetryEventDto
        {
            Type = "error",
            Timestamp = el.CreatedAt.ToString("o"),
            Path = el.Path,
            Message = el.Message,
            StackTrace = el.StackTrace,
            FileName = el.FileName,
            LineNumber = el.LineNumber,
            ColumnNumber = el.ColumnNumber
        }).ToListAsync();

    var clicks = await db.UserEvents
        .Where(ue => ue.SessionId == id)
        .Select(ue => new TelemetryEventDto
        {
            Type = "event",
            Timestamp = ue.CreatedAt.ToString("o"),
            Path = ue.Path,
            EventType = ue.EventType,
            ElementId = ue.ElementId,
            ElementTag = ue.ElementTag,
            ElementClass = ue.ElementClass,
            ElementPath = ue.ElementPath,
            Metadata = ue.Metadata
        }).ToListAsync();

    // Merge and sort all chronologically
    var timeline = new List<TelemetryEventDto>();
    timeline.AddRange(pageViews);
    timeline.AddRange(vitals);
    timeline.AddRange(network);
    timeline.AddRange(errors);
    timeline.AddRange(clicks);

    var sortedTimeline = timeline
        .OrderBy(t => DateTime.Parse(t.Timestamp))
        .ToList();

    return Results.Ok(new
    {
        Session = session,
        Timeline = sortedTimeline
    });
});

app.Run();

// --- Simple DTO for registration ---
public class ApplicationCreateDto
{
    public required string Name { get; set; }
}
