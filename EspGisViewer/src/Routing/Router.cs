using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
namespace EspGisViewer.Routing
{
    class Router
    {

        private readonly Dictionary<string, Router> _routes = new Dictionary<string, Router>();
        private readonly Dictionary<string, Router> _params = new Dictionary<string, Router>();
        public RouteHandler _handler;
        public bool _handlerConsumesRest = false;

        public Router Route(string route)
        {
            if (string.IsNullOrEmpty(route))
            {
                throw new ArgumentException("Route cannot be null or empty", nameof(route));
            }

            if (!_routes.ContainsKey(route))
            {
                _routes[route] = new Router();
            }

            return _routes[route];
        }

        public Router Param(string param)
        {
            if (string.IsNullOrEmpty(param))
            {
                throw new ArgumentException("Param cannot be null or empty", nameof(param));
            }

            if (!_params.ContainsKey(param))
            {
                _params[param] = new Router();
            }

            return _params[param];
        }

        public async Task<bool> TryRoute(HttpContext ctx, string route, Dictionary<string, string> parameters)
        {
            // Check if the route is empty (or only a slash), if so, call the handler
            if (string.IsNullOrEmpty(route) || route.Trim() == "/")
            {
                if (_handler == null)
                {
                    return false;
                }
                await _handler(ctx, parameters);
                return true;
            }

            // If the route doesn't start with a slash, it is invalid
            if (!route.StartsWith("/"))
            {
                return false;
            }
            route = route.Substring(1);

            // Try routes first
            foreach (var routeSegment in _routes)
            {
                if (!route.StartsWith(routeSegment.Key))
                {
                    continue;
                }

                var subRouter = routeSegment.Value;

                var remainingRoute = route.Substring(routeSegment.Key.Length);

                if (await subRouter.TryRoute(ctx, remainingRoute, parameters))
                {
                    return true;
                }
            }

            // Else try params
            foreach (var paramSegment in _params)
            {
                var paramName = paramSegment.Key;
                var paramValue = route.Split('/').FirstOrDefault() ?? route;

                if (string.IsNullOrEmpty(paramValue))
                {
                    continue;
                }

                var subRouter = paramSegment.Value;

                var newParams = new Dictionary<string, string>(parameters);
                newParams[paramName] = paramValue;

                var remainingRoute = route.Substring(paramValue.Length);

                if (await subRouter.TryRoute(ctx, remainingRoute, newParams))
                {
                    return true;
                }
            }
            
            // Only now do we use a restful handler if it exists
            if (_handler != null && _handlerConsumesRest)
            {
                // If the handler consumes the rest, we pass the remaining route
                await _handler(ctx, parameters);
                return true;
            }

            // nothing matches
            return false;
        }
    }
}
