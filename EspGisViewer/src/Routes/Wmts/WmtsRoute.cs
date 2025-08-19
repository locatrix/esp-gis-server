using System.Collections.Generic;
using EspGisViewer.Data;
using EspGisViewer.Routing;

// ReSharper disable MemberCanBeMadeStatic.Local
namespace EspGisViewer.Routes.Wmts
{

    public class WmtsRoute : RouteController
    {
        private readonly DataSource _dataSource;

        private WmtsRoute(IRouter router, DataSource dataSource) : base(router)
        {
            _dataSource = dataSource;
            var capabilitiesController = new WmtsCapabilitiesController(dataSource);
            var tilesController = new WmtsTileController(dataSource, dataSource.Tiles);
            
            using (router.Route("wmts"))
            {
                router.SetHandler(capabilitiesController.HandleCapabilities);

                using (router.Route("capabilities.xml"))
                {
                    router.SetHandler(capabilitiesController.HandleCapabilities);
                }

                using (router.Param("tiles"))
                {
                    using (router.Route("capabilities.xml"))
                    {
                        router.SetHandler(capabilitiesController.HandleCapabilities);
                    }

                    using (router.Param("tileZoom", "tileCol", "tileRow"))
                    {
                        router.SetHandler(tilesController.HandleTile);
                    }
                }
            }
        }

        /// <summary>
        /// Registers the WMTS routes.
        /// </summary>
        public static void Register(IRouter router, DataSource dataSource)
        {
            _ = new WmtsRoute(router, dataSource);
        }
    }
}
