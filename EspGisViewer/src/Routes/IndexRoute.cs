using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Util;

namespace EspGisViewer.Routes
{
    public static class IndexRoute
    {
        private const string IndexTemplateResourceName = "EspGisViewer.Routes.Index.html";
        private static readonly Assembly ApplicationAssembly = typeof(IndexRoute).Assembly;
        private static readonly string IndexTemplate = LoadIndexTemplate();
        private static readonly string ApplicationVersion = GetApplicationVersion();
        private static readonly string BuildDate = GetBuildDate();

        public static Task Handle(HttpContext context, Dictionary<string, string> parameters)
        {
            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/html";

            var serverUrl = ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true);
            var viewerUrl = serverUrl + "viewer";
            var wfsUrl = serverUrl + "wfs";
            var wmtsUrl = serverUrl + "wmts/capabilities.xml";
            var geoJsonUrl = wfsUrl + "?service=WFS&version=2.0.0&request=GetFeature&typeNames=plans&outputFormat=GEOJSON";
            var filteredGeoJsonUrl = geoJsonUrl + "&bbox=151.20,-33.87,151.21,-33.86&count=100";

            var html = IndexTemplate
                .Replace("__HOME_URL__", HttpUtility.HtmlAttributeEncode(serverUrl))
                .Replace("__VIEWER_URL__", HttpUtility.HtmlAttributeEncode(viewerUrl))
                .Replace("__WFS_URL__", HttpUtility.HtmlAttributeEncode(wfsUrl))
                .Replace("__WMTS_URL__", HttpUtility.HtmlAttributeEncode(wmtsUrl))
                .Replace("__GEOJSON_URL__", HttpUtility.HtmlEncode(geoJsonUrl))
                .Replace("__FILTERED_GEOJSON_URL__", HttpUtility.HtmlEncode(filteredGeoJsonUrl))
                .Replace("__VERSION__", HttpUtility.HtmlEncode(ApplicationVersion))
                .Replace("__BUILD_DATE__", HttpUtility.HtmlEncode(BuildDate));

            context.Response.Write(html);
            return Task.CompletedTask;
        }

        private static string LoadIndexTemplate()
        {
            using (var stream = ApplicationAssembly.GetManifestResourceStream(IndexTemplateResourceName))
            {
                if (stream == null)
                {
                    throw new InvalidOperationException($"Embedded resource not found: {IndexTemplateResourceName}");
                }

                using (var reader = new StreamReader(stream, Encoding.UTF8, true))
                {
                    return reader.ReadToEnd();
                }
            }
        }

        private static string GetApplicationVersion()
        {
            var attribute = Attribute.GetCustomAttribute(
                ApplicationAssembly,
                typeof(AssemblyInformationalVersionAttribute)) as AssemblyInformationalVersionAttribute;
            var version = attribute?.InformationalVersion;

            if (string.IsNullOrWhiteSpace(version))
            {
                version = ApplicationAssembly.GetName().Version?.ToString() ?? "unknown";
            }

            return version.StartsWith("v", StringComparison.OrdinalIgnoreCase) ? version : "v" + version;
        }

        private static string GetBuildDate()
        {
            foreach (AssemblyMetadataAttribute attribute in ApplicationAssembly.GetCustomAttributes(typeof(AssemblyMetadataAttribute), false))
            {
                if (string.Equals(attribute.Key, "BuildDate", StringComparison.Ordinal))
                {
                    return attribute.Value;
                }
            }

            return File.GetLastWriteTimeUtc(ApplicationAssembly.Location).ToString("yyyy-MM-dd");
        }
    }
}
