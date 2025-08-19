using System;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Routes.Coverage;
using EspGisViewer.Routes.Viewer;
using EspGisViewer.Routes.Wfs;
using EspGisViewer.Routes.Wmts;
using EspGisViewer.Routing;
using EspGisViewer.Util;
namespace EspGisViewer.Routes
{
    public class RootRoute : IHttpAsyncHandler
    {

        private static readonly IHttpAsyncHandler Router = Routers.Create(router =>
            {
                DataSource dataSource = DataSource.GetDataSource();

                var authParam = Authentication.AccessTokensEnabled() ? router.Param("accessToken") : null;

                // Route: /
                router.SetHandler(IndexRoute.Handle);

                // Route: /viewer
                ViewerRoute.Register(router);

                // Route: /wmts
                WmtsRoute.Register(router, dataSource);

                // Route: /wfs
                WfsRoute.Register(router, dataSource);

                // Route: /coverage
                CoverageRoute.Register(router, dataSource);

                // blank favicon so chrome stops spamming dev tools
                using (router.Route("favicon.ico"))
                {
                    router.SetHandler((context, parameters) =>
                    {
                        context.Response.StatusCode = 200;
                        context.Response.ContentType = "image/gif";

                        context.Response.BinaryWrite(Images.TransparentImage);

                        return Task.CompletedTask;
                    });
                }

                authParam?.Dispose();
            })
            ;

        public IAsyncResult BeginProcessRequest(HttpContext context, AsyncCallback cb, object extraData)
        {
            // Check if the access token is valid
            if (!Authentication.CheckToken(context.Request.Path))
            {
                context.Response.StatusCode = 401;
                try
                {
                    return Task.CompletedTask;
                }
                finally
                {
                    cb(Task.CompletedTask);
                }
            }

            // Dispatch to the router
            return Router.BeginProcessRequest(context, cb, extraData);
        }

        public void EndProcessRequest(IAsyncResult result)
        {
            // Dispatch to the router
            Router.EndProcessRequest(result);
        }

        public void ProcessRequest(HttpContext context)
        {
        }

        public bool IsReusable
        {
            get => true;
        }
    }
}
