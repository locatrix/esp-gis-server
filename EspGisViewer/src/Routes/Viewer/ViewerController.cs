using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Util;

namespace EspGisViewer.Routes.Viewer
{
    public class ViewerController
    {
        public ViewerController()
        {
        }

        public Task Handle(HttpContext context, Dictionary<string, string> parameters)
        {

            string filePath = context.Request.Path;

            if (!filePath.Contains("/viewer"))
            {
                throw new ArgumentException("Path must contain /viewer");
            }

            // obtain authtoken
            string token = null;
            var parts = filePath.TrimStart('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2 && parts[1].Equals("viewer", StringComparison.OrdinalIgnoreCase))
            {
                token = parts[0];
            }

            // strip everything up until the first instance of /viewer
            int index = filePath.IndexOf("/viewer", StringComparison.Ordinal);
            filePath = filePath.Substring(index);

            // make the paths relative to the current directory
            var paths = new List<string>();
            paths.Add(filePath);
            paths.Add(StringOps.ReplaceFirstOccurrence(filePath, "/viewer", "/static/viewer"));
            paths.Add(StringOps.ReplaceFirstOccurrence(filePath, "/viewer", "bin/static/viewer"));

            // use windows-style paths
            paths = paths.Select(p => p.TrimStart('/').Replace('/', System.IO.Path.DirectorySeparatorChar)).ToList();

            // convert to physical paths
            paths = paths.Select(p => System.IO.Path.Combine(context.Server.MapPath("~/"), p)).ToList();

            if (paths.Any(path => TryPath(context, path, token)))
            {
                context.Response.StatusCode = 200;
                return Task.CompletedTask;
            }

            context.Response.StatusCode = 500;
            context.Response.ContentType = "text/plain";
            context.Response.Write($"Not Found: {context.Request.Path}");

            return Task.CompletedTask;
        }

        // token may be null. When serving HTML, we inject token into asset URLs
        private static bool TryPath(HttpContext context, string filePath, string token)
        {
            if (Directory.Exists(filePath))
            {
                filePath = Path.Combine(filePath, "index.html");
            }
            if (!File.Exists(filePath))
            {
                return false;
            }

            // extension to mime type mapping
            string extension = Path.GetExtension(filePath).ToLowerInvariant();
            string mimeType = "application/octet-stream";

            switch (extension)
            {
                case ".css":
                    mimeType = "text/css";
                    break;
                case ".js":
                    mimeType = "application/javascript";
                    break;
                case ".html":
                    mimeType = "text/html";
                    break;
                case ".svg":
                    mimeType = "image/svg+xml";
                    break;
                default:
                    Console.WriteLine($"Unknown file type: {extension}");
                    break;
            }

            context.Response.ContentType = mimeType;

            if (extension == ".html" && !string.IsNullOrEmpty(token))
            {
                // token
                string content = File.ReadAllText(filePath);
                content = content.Replace("/viewer/assets/", "/" + token + "/viewer/assets/");
                content = content.Replace("/favicon.ico", "/" + token + "/favicon.ico");

                context.Response.Write(content);
            }
            else
            {
                // no token
                context.Response.WriteFile(filePath);
            }

            return true;
        }
    }
}
