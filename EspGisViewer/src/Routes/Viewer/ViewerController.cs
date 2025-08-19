using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Routing;
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

            var filePath = context.Request.Path;

            if (!filePath.Contains("/viewer"))
            {
                throw new ArgumentException("Path must contain /viewer");
            }

            // strip everything up until the first instance of /viewer
            int index = filePath.IndexOf("/viewer", StringComparison.Ordinal);
            filePath = filePath.Substring(index);

            // make the path relative to the current directory, and use windows-style paths
            filePath = StringOps.ReplaceFirstOccurrence(filePath, "/viewer", "/static/viewer");
            filePath = filePath.TrimStart('/').Replace('/', '\\');

            // convert to physical path
            // filePath = System.IO.Path.Combine(context.Server.MapPath("~/bin/"), filePath);
            filePath = System.IO.Path.Combine(context.Server.MapPath("~/"), filePath);

            // If the file is a directory, we want to check index.html instead
            if (System.IO.Directory.Exists(filePath))
            {
                filePath = System.IO.Path.Combine(filePath, "index.html");
            }

            if (!System.IO.File.Exists(filePath))
            {
                // 404
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";

                context.Response.Write("Not Found");
                return Task.CompletedTask;
            }

            // extension to mime type mapping
            var extension = System.IO.Path.GetExtension(filePath).ToLowerInvariant();
            var mimeType = "application/octet-stream";

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

            return Task.CompletedTask;
        }
    }
}
