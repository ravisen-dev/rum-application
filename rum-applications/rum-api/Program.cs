using System;
using System.Collections.Generic;
using System.Globalization;
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
    options.AddPolicy("AllowLocalhost4200And4201", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:4201")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure JSON serialization options
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

app.UseCors("AllowLocalhost4200And4201");

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
        // Parse timestamp into UTC; fallback to UTC now for invalid timestamps
        DateTime timestamp;
        if (!DateTimeOffset.TryParse(ev.Timestamp, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var timestampOffset))
        {
            timestamp = DateTime.UtcNow;
        }
        else
        {
            timestamp = timestampOffset.UtcDateTime;
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
    var viewsOverTimeRaw = await db.PageViews
        .Where(pv => pv.Session!.ApplicationId == appId && pv.CreatedAt >= cutoff)
        .GroupBy(pv => pv.CreatedAt.Date)
        .Select(g => new { Date = g.Key, Count = g.Count() })
        .OrderBy(x => x.Date)
        .ToListAsync();

    var viewsOverTime = viewsOverTimeRaw
        .Select(x => new { Date = x.Date.ToString("yyyy-MM-dd"), Count = x.Count })
        .ToList();

    // Error spikes over time
    var errorsOverTimeRaw = await db.ErrorLogs
        .Where(el => el.Session!.ApplicationId == appId && el.CreatedAt >= cutoff)
        .GroupBy(el => el.CreatedAt.Date)
        .Select(g => new { Date = g.Key, Count = g.Count() })
        .OrderBy(x => x.Date)
        .ToListAsync();

    var errorsOverTime = errorsOverTimeRaw
        .Select(x => new { Date = x.Date.ToString("yyyy-MM-dd"), Count = x.Count })
        .ToList();

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

// -------------------------------------------------------------
// Development helper: Seed dummy telemetry for the seeded application
// -------------------------------------------------------------
app.MapPost("/dev/seed", async (RumDbContext db) =>
{
    var appEntity = await db.Applications.FirstOrDefaultAsync(a => a.ApiKey == "test-app-id-123");
    if (appEntity == null)
    {
        return Results.NotFound(new { Message = "Seed application with API key 'test-app-id-123' not found." });
    }

    var rnd = new Random();
    var now = DateTime.UtcNow;
    var seededSessions = 0;
    var seededEvents = 0;

    for (int s = 0; s < 3; s++)
    {
        var session = new Session
        {
            ApplicationId = appEntity.Id,
            SessionGuid = Guid.NewGuid().ToString(),
            Browser = s % 2 == 0 ? "Chrome" : "Firefox",
            Os = "Windows",
            DeviceType = "Desktop",
            Resolution = "1920x1080",
            Referrer = "https://example.com",
            CreatedAt = now.AddDays(-s)
        };

        db.Sessions.Add(session);
        await db.SaveChangesAsync(); // ensure Session.Id is available
        seededSessions++;

        // Add a few page views
        for (int i = 0; i < 3; i++)
        {
            db.PageViews.Add(new PageView
            {
                SessionId = session.Id,
                Path = i == 0 ? "/" : $"/page-{i}",
                Title = i == 0 ? "Home" : $"Page {i}",
                DurationMs = 100 + rnd.Next(1000),
                CreatedAt = session.CreatedAt.AddMinutes(i + 1)
            });
            seededEvents++;
        }

        // Add a web vital
        db.WebVitals.Add(new WebVital
        {
            SessionId = session.Id,
            MetricName = "LCP",
            Value = 1200 + rnd.Next(800),
            Rating = "good",
            Path = "/",
            CreatedAt = session.CreatedAt.AddMinutes(2)
        });
        seededEvents++;

        // Add a network request
        db.NetworkRequests.Add(new NetworkRequest
        {
            SessionId = session.Id,
            Url = "/api/data",
            Method = "GET",
            StatusCode = 200,
            DurationMs = 50 + rnd.Next(500),
            Path = "/",
            CreatedAt = session.CreatedAt.AddMinutes(3)
        });
        seededEvents++;

        // Add an error for one session
        if (s == 1)
        {
            db.ErrorLogs.Add(new ErrorLog
            {
                SessionId = session.Id,
                Message = "TypeError: foo is not a function",
                StackTrace = "at foo (app.js:42:13)",
                FileName = "app.js",
                LineNumber = 42,
                ColumnNumber = 13,
                Path = "/",
                CreatedAt = session.CreatedAt.AddMinutes(4)
            });
            seededEvents++;
        }

        // Add a user event
        db.UserEvents.Add(new UserEvent
        {
            SessionId = session.Id,
            EventType = "click",
            ElementId = "btn-cta",
            ElementTag = "button",
            ElementClass = "btn primary",
            ElementPath = "body > div > button",
            Metadata = "{\"x\":1}",
            Path = "/",
            CreatedAt = session.CreatedAt.AddMinutes(5)
        });
        seededEvents++;

        await db.SaveChangesAsync();
    }

    return Results.Ok(new { Success = true, SeededSessions = seededSessions, SeededEvents = seededEvents });
});

// Development: create a new monitored application and seed telemetry for it
app.MapPost("/dev/seed-app", async (RumDbContext db, CreateAppDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name))
        return Results.BadRequest(new { Message = "Name is required." });

    // create application
    var apiKey = string.IsNullOrWhiteSpace(dto.ApiKey) ? Guid.NewGuid().ToString("N")[..12] : dto.ApiKey;

    var appEntity = new Application
    {
        Id = Guid.NewGuid(),
        Name = dto.Name,
        ApiKey = apiKey,
        CreatedAt = DateTime.UtcNow
    };

    db.Applications.Add(appEntity);
    await db.SaveChangesAsync();

    // seed telemetry similar to /dev/seed but tied to this app
    var rnd = new Random();
    var now = DateTime.UtcNow;
    var seededSessions = 0;
    var seededEvents = 0;

    for (int s = 0; s < (dto.Sessions > 0 ? dto.Sessions : 2); s++)
    {
        var session = new Session
        {
            ApplicationId = appEntity.Id,
            SessionGuid = Guid.NewGuid().ToString(),
            Browser = s % 2 == 0 ? "Chrome" : "Edge",
            Os = "Linux",
            DeviceType = "Desktop",
            Resolution = "1366x768",
            Referrer = "https://demo.example",
            CreatedAt = now.AddDays(-s)
        };

        db.Sessions.Add(session);
        await db.SaveChangesAsync();
        seededSessions++;

        for (int i = 0; i < 2; i++)
        {
            db.PageViews.Add(new PageView
            {
                SessionId = session.Id,
                Path = i == 0 ? "/" : $"/item/{i}",
                Title = i == 0 ? "Home" : $"Item {i}",
                DurationMs = 200 + rnd.Next(800),
                CreatedAt = session.CreatedAt.AddMinutes(i + 1)
            });
            seededEvents++;
        }

        db.WebVitals.Add(new WebVital
        {
            SessionId = session.Id,
            MetricName = "CLS",
            Value = Math.Round(0.01 + rnd.NextDouble() * 0.1, 3),
            Rating = "good",
            Path = "/",
            CreatedAt = session.CreatedAt.AddMinutes(2)
        });
        seededEvents++;

        db.NetworkRequests.Add(new NetworkRequest
        {
            SessionId = session.Id,
            Url = "/api/items",
            Method = "GET",
            StatusCode = 200,
            DurationMs = 30 + rnd.Next(200),
            Path = "/",
            CreatedAt = session.CreatedAt.AddMinutes(3)
        });
        seededEvents++;

        await db.SaveChangesAsync();
    }

    return Results.Ok(new { Success = true, AppId = appEntity.Id, ApiKey = appEntity.ApiKey, SeededSessions = seededSessions, SeededEvents = seededEvents });
});

app.Run();

// --- Simple DTO for registration ---
public class ApplicationCreateDto
{
    public required string Name { get; set; }
}

// DTO for dev seed-app endpoint
public class CreateAppDto
{
    public required string Name { get; set; }
    public string? ApiKey { get; set; }
    public int Sessions { get; set; } = 2;
}
