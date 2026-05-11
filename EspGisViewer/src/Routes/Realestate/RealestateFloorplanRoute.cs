using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Routing;

namespace EspGisViewer.Routes.Realestate
{
    public class RealestateFloorplanRoute : RouteController
    {
        private readonly RealestateFloorplanController _controller;

        private RealestateFloorplanRoute(IRouter router, DataSource dataSource) : base(router)
        {
            _controller = new RealestateFloorplanController(dataSource);

            using (router.Route("realestate-floorplan"))
            {
                using (router.Param("featureId"))
                {
                    router.SetHandler(Handle);
                }
            }
        }

        private Task Handle(HttpContext context, Dictionary<string, string> parameters)
        {
            return _controller.Handle(context, parameters);
        }

        public static void Register(IRouter router, DataSource dataSource)
        {
            _ = new RealestateFloorplanRoute(router, dataSource);
        }
    }
}