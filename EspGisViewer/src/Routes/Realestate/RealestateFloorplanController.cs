using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.Caching;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;
using Newtonsoft.Json.Linq;

namespace EspGisViewer.Routes.Realestate
{
    public class RealestateFloorplanController
    {
        public const string RealestatePinsFeatureset = "realestate_pins";

        private const int RequestTimeoutMs = 20000;
        private static readonly TimeSpan FloorplanHitCacheDuration = TimeSpan.FromMinutes(30);
        private static readonly TimeSpan FloorplanMissCacheDuration = TimeSpan.FromMinutes(10);
        private const string FloorplanFetcherScriptRelativePath = @"scripts\fetch-domain-floorplan.mjs";
        private const string FloorplanCacheKeyPrefix = "realestate-floorplan:";
        private const string DomainLinkColumnName = "domainLink";
        private static readonly ObjectCache FloorplanCache = MemoryCache.Default;

        private static readonly Regex NextDataRegex = new Regex(
            @"<script id=""__NEXT_DATA__""[^>]*>([\s\S]*?)</script>",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex ResolutionRegex = new Regex(
            @"""resolution"":\{""height"":(\d+),""width"":(\d+)\}",
            RegexOptions.Compiled);

        private static readonly Regex FitInRegex = new Regex(
            @"/fit-in/(\d+)x(\d+)/",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex BaseSizeRegex = new Regex(
            @"-w(\d+)-h(\d+)(?:$|[^\d])",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private readonly DataSource _dataSource;
        private static readonly object AllFeaturesSchemaLock = new object();
        private static bool? _hasDomainLinkColumn;

        public RealestateFloorplanController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        private class FloorplanLookup
        {
            [SQLite.Column("domainLink")]
            public string DomainLink { get; set; }
        }

        public async Task Handle(HttpContext context, Dictionary<string, string> parameters)
        {
            if (!int.TryParse(parameters.GetValue("featureId"), out var featureId))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Invalid feature id");
                return;
            }

            await _dataSource.Refresh(false);

            if (!await HasAllFeaturesColumn(DomainLinkColumnName))
            {
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Floorplan not found");
                return;
            }

            var records = await _dataSource.TilesAndFeatures.QueryAsync<FloorplanLookup>(/* sql */ @"
                SELECT domainLink
                FROM all_features
                WHERE featureset = $featureset AND id = $featureId
                LIMIT 1
            ", new Dictionary<string, string>
            {
                ["$featureset"] = RealestatePinsFeatureset,
                ["$featureId"] = featureId.ToString()
            });

            var domainLink = records.Count > 0 ? records[0].DomainLink : null;
            if (string.IsNullOrWhiteSpace(domainLink))
            {
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Floorplan not found");
                return;
            }

            FloorplanResult floorplanResult;
            try
            {
                floorplanResult = await GetCachedFloorplanResult(domainLink);
                if (!string.IsNullOrWhiteSpace(floorplanResult.Error))
                {
                    context.Response.StatusCode = floorplanResult.StatusCode == 404 ? 404 : 502;
                    context.Response.ContentType = "text/plain";
                    context.Response.Write(floorplanResult.Error);
                    return;
                }
            }
            catch (WebException ex)
            {
                context.Response.StatusCode = 502;
                context.Response.ContentType = "text/plain";
                context.Response.Write(ex.Message);
                return;
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "text/plain";
                context.Response.Write(ex.Message);
                return;
            }

            if (floorplanResult.Urls.Count == 0)
            {
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Floorplan not found");
                return;
            }

            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/plain";
            context.Response.Write(floorplanResult.Urls[0]);
        }

        private static async Task<FloorplanResult> GetCachedFloorplanResult(string domainUrl)
        {
            var cacheKey = BuildFloorplanCacheKey(domainUrl);
            var cachedValue = FloorplanCache.Get(cacheKey) as FloorplanResult;
            if (cachedValue != null)
            {
                return cachedValue;
            }

            var floorplanResult = await FetchDomainFloorplans(domainUrl);
            if (!string.IsNullOrWhiteSpace(floorplanResult.Error) && floorplanResult.StatusCode != 404)
            {
                return floorplanResult;
            }

            var cacheDuration = floorplanResult.Urls.Count > 0
                ? FloorplanHitCacheDuration
                : FloorplanMissCacheDuration;

            FloorplanCache.Set(cacheKey, floorplanResult, new CacheItemPolicy
            {
                AbsoluteExpiration = DateTimeOffset.UtcNow.Add(cacheDuration)
            });

            return floorplanResult;
        }

        private static string BuildFloorplanCacheKey(string domainUrl)
        {
            return FloorplanCacheKeyPrefix + domainUrl.Trim();
        }

        private async Task<bool> HasAllFeaturesColumn(string columnName)
        {
            lock (AllFeaturesSchemaLock)
            {
                if (_hasDomainLinkColumn.HasValue)
                {
                    return _hasDomainLinkColumn.Value;
                }
            }

            var columns = await _dataSource.TilesAndFeatures.QueryAsync<AllFeaturesColumn>("PRAGMA table_info(all_features);");
            var hasColumn = false;
            foreach (var column in columns)
            {
                if (string.Equals(column.Name, columnName, StringComparison.OrdinalIgnoreCase))
                {
                    hasColumn = true;
                    break;
                }
            }

            lock (AllFeaturesSchemaLock)
            {
                _hasDomainLinkColumn = hasColumn;
            }

            return hasColumn;
        }

        private static async Task<FloorplanResult> FetchDomainFloorplans(string domainUrl)
        {
            var appBasePath = AppDomain.CurrentDomain.BaseDirectory;
            var scriptPath = Path.Combine(appBasePath, FloorplanFetcherScriptRelativePath);
            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Floorplan fetcher script not found: {scriptPath}");
            }

            var psi = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"\"{scriptPath}\" \"{domainUrl}\"",
                WorkingDirectory = appBasePath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };

            using (var process = Process.Start(psi))
            {
                if (process == null)
                {
                    throw new InvalidOperationException("Failed to start the floorplan fetcher process.");
                }

                var stdoutTask = process.StandardOutput.ReadToEndAsync();
                var stderrTask = process.StandardError.ReadToEndAsync();
                var didExit = await Task.Run(() => process.WaitForExit(RequestTimeoutMs));

                if (!didExit)
                {
                    try
                    {
                        process.Kill();
                    }
                    catch
                    {
                    }

                    throw new TimeoutException("Timed out while fetching Domain floorplans.");
                }

                var stdout = await stdoutTask;
                var stderr = await stderrTask;

                if (process.ExitCode != 0)
                {
                    throw new InvalidOperationException(string.IsNullOrWhiteSpace(stderr)
                        ? $"Floorplan fetcher exited with code {process.ExitCode}."
                        : stderr.Trim());
                }

                var payload = stdout.Trim();
                if (payload.Length == 0)
                {
                    throw new InvalidOperationException("Floorplan fetcher returned an empty response.");
                }

                var parsed = JObject.Parse(payload);
                return new FloorplanResult
                {
                    Error = parsed.Value<string>("error"),
                    StatusCode = parsed.Value<int?>("statusCode"),
                    Urls = parsed["urls"]?.ToObject<List<string>>() ?? new List<string>()
                };
            }
        }

        private static JObject ParseNextDataPayload(string html)
        {
            var match = NextDataRegex.Match(html);
            if (!match.Success)
            {
                throw new InvalidOperationException("Could not find __NEXT_DATA__ in the Domain property page.");
            }

            return JObject.Parse(match.Groups[1].Value);
        }

        private static List<string> ExtractFloorplanUrls(JObject nextData)
        {
            var apolloState = nextData["props"]?["pageProps"]?["__APOLLO_STATE__"] as JObject;
            if (apolloState == null)
            {
                return new List<string>();
            }

            var urls = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var entity in apolloState.Properties())
            {
                var entityObject = entity.Value as JObject;
                if (entityObject == null)
                {
                    continue;
                }

                foreach (var field in entityObject.Properties())
                {
                    if (!field.Name.StartsWith("media(", StringComparison.Ordinal) || !(field.Value is JArray mediaItems))
                    {
                        continue;
                    }

                    foreach (var mediaToken in mediaItems)
                    {
                        var mediaObject = mediaToken as JObject;
                        if (mediaObject == null)
                        {
                            continue;
                        }

                        if (!string.Equals(mediaObject.Value<string>("type"), "floorplan", StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        var selectedUrl = SelectFloorplanUrl(mediaObject);
                        if (string.IsNullOrWhiteSpace(selectedUrl) || !seen.Add(selectedUrl))
                        {
                            continue;
                        }

                        urls.Add(selectedUrl);
                    }
                }
            }

            return urls;
        }

        private static string SelectFloorplanUrl(JObject mediaItem)
        {
            var candidates = new List<FloorplanCandidate>();

            var primaryUrl = mediaItem.Value<string>("url");
            if (!string.IsNullOrWhiteSpace(primaryUrl))
            {
                candidates.Add(new FloorplanCandidate
                {
                    Url = primaryUrl,
                    Score = ScoreFloorplanVariant("url", primaryUrl)
                });
            }

            foreach (var property in mediaItem.Properties())
            {
                if (!property.Name.StartsWith("url(", StringComparison.Ordinal))
                {
                    continue;
                }

                var value = property.Value.Type == JTokenType.String ? property.Value.Value<string>() : null;
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                candidates.Add(new FloorplanCandidate
                {
                    Url = value,
                    Score = ScoreFloorplanVariant(property.Name, value)
                });
            }

            if (candidates.Count == 0)
            {
                return null;
            }

            candidates.Sort((left, right) => right.Score.CompareTo(left.Score));
            return candidates[0].Url;
        }

        private static int ScoreFloorplanVariant(string key, string url)
        {
            var resolutionMatch = ResolutionRegex.Match(key);
            if (resolutionMatch.Success &&
                int.TryParse(resolutionMatch.Groups[1].Value, out var resolutionHeight) &&
                int.TryParse(resolutionMatch.Groups[2].Value, out var resolutionWidth))
            {
                return resolutionHeight * resolutionWidth;
            }

            var fitInMatch = FitInRegex.Match(url);
            if (fitInMatch.Success &&
                int.TryParse(fitInMatch.Groups[1].Value, out var fitInWidth) &&
                int.TryParse(fitInMatch.Groups[2].Value, out var fitInHeight))
            {
                return fitInWidth * fitInHeight;
            }

            var baseSizeMatch = BaseSizeRegex.Match(url);
            if (baseSizeMatch.Success &&
                int.TryParse(baseSizeMatch.Groups[1].Value, out var baseWidth) &&
                int.TryParse(baseSizeMatch.Groups[2].Value, out var baseHeight))
            {
                return baseWidth * baseHeight;
            }

            return 0;
        }

        private class FloorplanCandidate
        {
            public string Url { get; set; }
            public int Score { get; set; }
        }

        private class FloorplanResult
        {
            public List<string> Urls { get; set; } = new List<string>();
            public string Error { get; set; }
            public int? StatusCode { get; set; }
        }

        private class AllFeaturesColumn
        {
            [SQLite.Column("name")]
            public string Name { get; set; }
        }
    }
}