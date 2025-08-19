using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
namespace EspGisViewer.Routing
{
    public interface IRouter
    {
        /// <summary>
        /// Sets the handler for the current route.
        /// </summary>
        /// <param name="handler">The handler for the given route</param>
        /// <param name="rest">If true, the handler will consume the rest of the route</param>
        void SetHandler(RouteHandler handler, bool rest = false);

        /// <summary>
        /// Creates a router sub-context.
        /// </summary>
        /// <param name="route">The relative route url</param>
        /// <param name="routes">The relative route urls</param>
        IDisposable Route(string route, params string[] routes);

        /// <summary>
        /// Creates a router sub-context with the new parameters.
        /// </summary>
        /// <param name="parameter">The parameter name</param>
        /// <param name="parameters">The parameter names</param>
        IDisposable Param(string parameter, params string[] parameters);
    }

    public static class Routers
    {
        /// <summary>
        /// Creates a root router.
        /// </summary>
        /// <returns>A new IRouter instance</returns>
        public static IHttpAsyncHandler Create(RouterBuilder router)
        {
            var delegateRouter = new DelegateRouter();
            router(delegateRouter);
            return delegateRouter;
        }
    }

    public delegate Task RouteHandler(HttpContext context, Dictionary<string, string> parameters);
    public delegate void RouterBuilder(IRouter router);
}
