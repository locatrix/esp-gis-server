using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Util;
namespace EspGisViewer.Routes
{
    public static class IndexRoute
    {
        public static Task Handle(HttpContext context, Dictionary<string, string> parameters)
        {
            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/html";

            context.Response.Write($@"<!DOCTYPE html>
<html>
  <head>
    <title>ESP GIS Server</title>
  </head>
  <body>
    <h1>ESP GIS Server version 0.6.0</h1>
    <h2><a href=""viewer"">Online Map Viewer</a></h2>
    <h2><a href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs"">WFS Endpoint</a></h2>
    <h2><a href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wmts/capabilities.xml"">WMTS Endpoint (all layers)</a></h2>
    <p>Per-layer WMTS endpoints can be accessed by visiting the Map Viewer and clicking the ""Copy WMTS URL"" button.</p>
  </body>
</html>
");
            return Task.CompletedTask;
        }
    }
}
