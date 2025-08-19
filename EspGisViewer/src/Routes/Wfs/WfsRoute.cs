using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using EspGisViewer.Data;
using EspGisViewer.Routing;
using EspGisViewer.Util;
namespace EspGisViewer.Routes.Wfs
{

    public class WfsRoute : RouteController
    {

        private readonly DataSource _dataSource;
        private readonly WfsGetFeatureController _wfsGetFeatureController;
        private readonly WfsDescribeFeatureTypeController _wfsDescribeFeatureTypeController;
        private readonly WfsGetCapabilitiesController _wfsGetCapabilitiesController;

        private WfsRoute(IRouter router, DataSource dataSource) : base(router)
        {
            _dataSource = dataSource;
            _wfsGetFeatureController = new WfsGetFeatureController(dataSource);
            _wfsDescribeFeatureTypeController = new WfsDescribeFeatureTypeController(dataSource);
            _wfsGetCapabilitiesController = new WfsGetCapabilitiesController(dataSource);

            using (router.Route("wfs"))
            {
                router.SetHandler(ProxyCalls);
            }
        }

        // /wfs
        private async Task ProxyCalls(HttpContext context, Dictionary<string, string> parameters)
        {
            // wfs shouldn't specify a charset
            context.Response.Charset = string.Empty;

            if (context.Request.HttpMethod == "POST")
            {
                await PostProxyCalls(context, parameters);
                return;
            }

            var queries = HttpUtility.ParseQueryString(context.Request.Url.Query);

            if (queries.Get("request") is string request)
            {
                switch (request)
                {
                    case "GetFeature":
                    case "GetFeatures":
                        await _wfsGetFeatureController.HandleRequest(context, parameters, null);
                        return;
                    case "DescribeFeatureType":
                        await _wfsDescribeFeatureTypeController.HandleRequest(context, parameters, null);
                        return;
                    case "GetCapabilities":
                        await _wfsGetCapabilitiesController.HandleRequest(context, parameters);
                        return;
                }
            }

            // 404
            context.Response.StatusCode = 404;
            context.Response.ContentType = "text/plain";

            context.Response.Write("Not Found");
        }

        private async Task PostProxyCalls(HttpContext context, Dictionary<string, string> parameters)
        {

            var queries = HttpUtility.ParseQueryString(context.Request.Url.Query);

            if (!(queries.Get("request") is string request))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Request missing 'request' parameter");
                return;
            }

            if (request != "GetCapabilities")
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Invalid request can only be 'GetCapabilities' for POST");
                return;
            }

            if (!context.Request.ContentType.StartsWith("text/xml") && !context.Request.ContentType.StartsWith("application/xml"))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Invalid content type, expected 'text/xml' or 'application/xml'");
                return;
            }

            // Deserialize the XML body into a DOM-like structure
            var xmlBodyStream = context.Request.GetBufferedInputStream();

            var xmlDocument = new XmlDocument();
            string xmlString;
            using (var stream = new StreamReader(xmlBodyStream))
            {
                xmlString = await stream.ReadToEndAsync();
            }

            Console.WriteLine($"XML Body: {xmlString}");

            xmlDocument.LoadXml(xmlString);

            XmlNode requestNode = null;
            string requestType = null;
            foreach (XmlNode node in xmlDocument.ChildNodes)
            {
                StringOps.SplitNamespace(node.Name, out _, out var name);

                var validNames = new[] { "GetFeature", "GetCapabilities", "DescribeFeatureType" };

                if (!validNames.Contains(name))
                {
                    continue;
                }

                requestNode = node;
                requestType = name;
                break;
            }

            if (requestNode == null)
            {
                context.Response.StatusCode = 200;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Xml body does not contain request node that matches the \"request\" query parameter");
                return;
            }

            var queryMap = new Dictionary<string, string>();

            if (requestNode.Attributes != null)
            {
                foreach (XmlAttribute attribute in requestNode.Attributes)
                {
                    if (attribute.Name.StartsWith("xmlns"))
                    {
                        continue;
                    }
                    queryMap[attribute.Name.ToLower()] = attribute.Value;
                }
            }

            foreach (XmlNode node in requestNode)
            {
                StringOps.SplitNamespace(node.Name, out _, out var name);

                if (name != "Query")
                {
                    continue;
                }

                if (node.Attributes == null)
                {
                    continue;
                }

                foreach (XmlAttribute attribute in node.Attributes)
                {
                    if (attribute.Name.StartsWith("xmlns"))
                    {
                        continue;
                    }
                    StringOps.SplitNamespace(attribute.Value, out _, out var namePart);
                    queryMap[attribute.Name.ToLower()] = namePart;
                }
            }

            switch (requestType)
            {
                case "GetFeature":
                case "GetFeatures":
                    await _wfsGetFeatureController.HandleRequest(context, parameters, queryMap);
                    return;
                case "DescribeFeatureType":
                    await _wfsDescribeFeatureTypeController.HandleRequest(context, parameters, queryMap);
                    return;
                case "GetCapabilities":
                    await _wfsGetCapabilitiesController.HandleRequest(context, parameters);
                    return;
            }
        }

        /// <summary>
        /// Registers the WFS routes.
        /// </summary>
        public static void Register(IRouter router, DataSource dataSource)
        {
            _ = new WfsRoute(router, dataSource);
        }
    }
}
