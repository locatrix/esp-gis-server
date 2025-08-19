using EspGisViewer.Routing;

namespace EspGisViewer.Routes
{
    public abstract class RouteController
    {

        protected RouteController(IRouter router)
        {
            // constructor used to ensure access to router on construction, not after
        }
    }
}
