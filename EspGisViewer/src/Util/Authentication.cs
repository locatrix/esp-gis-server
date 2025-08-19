using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Configuration;
namespace EspGisViewer.Util
{
    public static class Authentication
    {
        public static bool AccessTokensEnabled()
        {
            return GetAccessTokens().Count > 0;
        }

        private static ISet<string> GetAccessTokens()
        {
            var tokens = new HashSet<string>();
            
            // EspAuthenticationToken
            if (WebConfigurationManager.AppSettings.Get("EspAuthenticationToken") is string espAuthToken && !string.IsNullOrEmpty(espAuthToken))
            {
                tokens.Add(espAuthToken);
            }
            
            if (Environment.GetEnvironmentVariable("ESP_GIS_ACCESS_TOKEN_1") is string token1 && !string.IsNullOrEmpty(token1))
            {
                tokens.Add(token1);
            }

            if (Environment.GetEnvironmentVariable("ESP_GIS_ACCESS_TOKEN_2") is string token2 && !string.IsNullOrEmpty(token2))
            {
                tokens.Add(token2);
            }

            return tokens;
        }

        public static bool CheckToken(string path)
        {
            return !AccessTokensEnabled() || !string.IsNullOrEmpty(path) && GetAccessTokens().Any(path.Contains);
        }
    }
}
