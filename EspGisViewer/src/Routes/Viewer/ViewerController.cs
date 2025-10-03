using System;
using System.Collections.Generic;
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

            // strip everything up until the first instance of /viewer
            int index = filePath.IndexOf("/viewer", StringComparison.Ordinal);
            filePath = filePath.Substring(index);

            // make the paths relative to the current directory
            var paths = new List<string>();
            paths.Add(filePath);
            paths.Add(StringOps.ReplaceFirstOccurrence(filePath, "/viewer", "/static/viewer"));

            // use windows-style paths
            paths = paths.Select(p => p.TrimStart('/').Replace('/', System.IO.Path.DirectorySeparatorChar)).ToList();

            // convert to physical paths
            paths = paths.Select(p => System.IO.Path.Combine(context.Server.MapPath("~/"), p)).ToList();

            if (paths.Any(path => TryPath(context, path)))
            {
                context.Response.StatusCode = 200;
                return Task.CompletedTask;
            }

            // 404
            context.Response.StatusCode = 404;
            context.Response.ContentType = "text/plain";
            context.Response.Write("Not Found");

            return Task.CompletedTask;
        }

        private static bool TryPath(HttpContext context, string filePath)
        {
            if (System.IO.Directory.Exists(filePath))
            {
                filePath = System.IO.Path.Combine(filePath, "index.html");
            }
            if (!System.IO.File.Exists(filePath))
            {
                return false;
            }

            // extension to mime type mapping
            string extension = System.IO.Path.GetExtension(filePath).ToLowerInvariant();
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
            context.Response.WriteFile(filePath);

            return true;
        }
    }
}
