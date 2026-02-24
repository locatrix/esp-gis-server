using System;
using System.Web;
namespace EspGisViewer.Util
{
    public static class ServerHost
    {

        public static string GetServerUrl(HttpRequest req, string accessToken = null, bool requireSlash = false)
        {
            var protocol = Environment.GetEnvironmentVariable("ESP_GIS_PROTOCOL") ?? Environment.GetEnvironmentVariable("PLANSIGHT_GIS_PROTOCOL") ?? req.Url.Scheme;

            var serverUrl = $"{protocol}://{req.Url.Host}:{req.Url.Port}{req.ApplicationPath}";
            // if (accessTokensEnabled()) {
            //     serverUrl += $"/{req.params.accessToken}"
            // }
            if (Authentication.AccessTokensEnabled())
            {
                serverUrl += $"{accessToken}";
            }

            if (requireSlash && !serverUrl.EndsWith("/"))
            {
                serverUrl += "/";
            }

            return serverUrl;
        }

    }
}
