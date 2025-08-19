using EspGisViewer.Routing;

namespace EspGisViewer.Routes.Viewer
{
    public class ViewerRoute : RouteController
    {
	    public ViewerRoute(IRouter router) : base(router)
	    {
		    var controller = new ViewerController();
		    using (router.Route("viewer"))
		    {
			    router.SetHandler(controller.Handle, true);
		    }
	    }

	    /// <summary>
	    /// Registers the Viewer routes.
	    /// </summary>
	    public static void Register(IRouter router)
	    {
		    _ = new ViewerRoute(router);
	    }
    }
}
