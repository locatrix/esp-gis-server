using EspGisViewer.Data;
using EspGisViewer.Routing;

namespace EspGisViewer.Routes.Coverage
{

    public class CoverageRoute : RouteController
    {

        private readonly DataSource _dataSource;

        private CoverageRoute(IRouter router, DataSource dataSource) : base(router)
        {
            _dataSource = dataSource;

            var controller = new CoverageController(dataSource);
            using (router.Route("coverage"))
            {
                using (router.Param("tileMatrix"))
                {
                    using (router.Param("minTileCol"))
                    {
                        using (router.Param("minTileRow"))
                        using (router.Param("maxTileCol"))
                        using (router.Param("maxTileRow"))
                        {
                            router.SetHandler(controller.HandleCoverage);
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Registers the coverage routes.
        /// </summary>
        public static void Register(IRouter router, DataSource dataSource)
        {
            _ = new CoverageRoute(router, dataSource);
        }
    }
}
