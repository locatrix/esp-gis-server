using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
namespace EspGisViewer.Routing
{
    class DelegateRouter : IRouter, IHttpAsyncHandler
    {

        private Router _currentRouter = new Router();

        public void SetHandler(RouteHandler handler, bool rest = false)
        {
            _currentRouter._handler = handler ?? throw new ArgumentNullException(nameof(handler));
            _currentRouter._handlerConsumesRest = rest;
        }

        public IDisposable Route(string route, params string[] routes)
        {
            return Apply((router, someRoute) => router.Route(someRoute), route, routes);
        }

        public IDisposable Param(string parameter, params string[] parameters)
        {
            return Apply((router, someParameter) => router.Param(someParameter), parameter, parameters);
        }

        /// <summary>
        /// Applies the given function to the current router for each element.
        /// </summary>
        private IDisposable Apply(Func<Router, string, Router> apply, string first, params string[] rest)
        {
            var previousRouter = _currentRouter;
            var onFinish = new OnFinish(() =>
            {
                _currentRouter = previousRouter;
            });
            var list = new List<string> { first };
            if (rest != null && rest.Length > 0)
            {
                list.AddRange(rest);
            }
            foreach (var element in list)
            {
                _currentRouter = apply(_currentRouter, element);
            }
            return onFinish;
        }

        public IAsyncResult BeginProcessRequest(HttpContext context, AsyncCallback cb, object extraData)
        {
            return Task.Run(async () =>
            {
                var parameters = new Dictionary<string, string>();
                var path = GetApplicationRelativePath(context.Request);

                try
                {
                    if (await _currentRouter.TryRoute(context, path, parameters))
                    {
                        return;
                    }
                }
                catch (Exception ex)
                {
                    // Log the exception
                    Console.WriteLine(ex);
                    context.Response.StatusCode = 500;
                    context.Response.ContentType = "text/plain";

                    context.Response.Write("Internal Server Error");
                    return;
                }

                // 404
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";

                context.Response.Write("Not Found");
            }).ContinueWith(task => cb(task));
        }

        public void EndProcessRequest(IAsyncResult result)
        {
        }

        public void ProcessRequest(HttpContext context)
        {
        }

        public bool IsReusable
        {
            get => true;
        }

        private static string GetApplicationRelativePath(HttpRequest request)
        {
            var path = request.AppRelativeCurrentExecutionFilePath;

            if (!string.IsNullOrEmpty(path))
            {
                if (path.StartsWith("~", StringComparison.Ordinal))
                {
                    path = path.Substring(1);
                }

                if (!string.IsNullOrEmpty(request.PathInfo))
                {
                    path += request.PathInfo;
                }

                return NormalizeRoutePath(path);
            }

            return GetApplicationRelativePath(request.Url.AbsolutePath, request.ApplicationPath);
        }

        private static string GetApplicationRelativePath(string path, string applicationPath)
        {
            if (string.IsNullOrEmpty(path))
            {
                return "/";
            }

            if (!string.IsNullOrEmpty(applicationPath) && applicationPath != "/")
            {
                applicationPath = applicationPath.TrimEnd('/');

                if (path.Equals(applicationPath, StringComparison.OrdinalIgnoreCase))
                {
                    return "/";
                }

                if (path.StartsWith(applicationPath + "/", StringComparison.OrdinalIgnoreCase))
                {
                    path = path.Substring(applicationPath.Length);
                }
            }

            return NormalizeRoutePath(path);
        }

        private static string NormalizeRoutePath(string path)
        {
            if (string.IsNullOrEmpty(path))
            {
                return "/";
            }

            return path.StartsWith("/") ? path : "/" + path;
        }
    }

    class OnFinish : IDisposable
    {
        private readonly Action _onFinish;

        public OnFinish(Action onFinish)
        {
            _onFinish = onFinish;
        }

        public void Dispose()
        {
            _onFinish();
        }
    }
}
