using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Formatting = Newtonsoft.Json.Formatting;
namespace EspGisViewer.Routes.Wfs
{

    public class Feature
    {
        [SQLite.Column("id")]
        public int Id { get; set; }

        [SQLite.Column("featureset")]
        public string Featureset { get; set; }

        [SQLite.Column("geom")]
        public string Geometry { get; set; }

        [SQLite.Column("partnerName")]
        public string PartnerName { get; set; }

        [SQLite.Column("clientName")]
        public string ClientName { get; set; }

        [SQLite.Column("campusName")]
        public string CampusName { get; set; }

        [SQLite.Column("buildingName")]
        public string BuildingName { get; set; }

        [SQLite.Column("floors")]
        public string Floors { get; set; }

        [SQLite.Column("campusAddress")]
        public string CampusAddress { get; set; }

        [SQLite.Column("buildingAddress")]
        public string BuildingAddress { get; set; }

        [SQLite.Column("partnerCode")]
        public string PartnerCode { get; set; }

        [SQLite.Column("clientCode")]
        public string ClientCode { get; set; }

        [SQLite.Column("campusCode")]
        public string CampusCode { get; set; }

        [SQLite.Column("buildingCode")]
        public string BuildingCode { get; set; }

        [SQLite.Column("squareMeters")]
        public string SquareMeters { get; set; }

        [SQLite.Column("latitude")]
        public double Latitude { get; set; }

        [SQLite.Column("longitude")]
        public double Longitude { get; set; }

        [SQLite.Column("x")]
        public double X { get; set; }

        [SQLite.Column("y")]
        public double Y { get; set; }

        [SQLite.Column("dateUpdated")]
        public string DateUpdated { get; set; }
    }

    public class FeatureCount
    {
        [SQLite.Column("totalCount")]
        public int TotalCount { get; set; }
    }

    public class WfsGetFeatureController
    {
        private readonly DataSource _dataSource;

        public WfsGetFeatureController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        public async Task HandleRequest(HttpContext context, Dictionary<string, string> parameters, Dictionary<string, string> overrideQueries)
        {
            await _dataSource.Refresh(false);

            var tryParse = WfsParams.Parse(context.Request, context.Response, overrideQueries);
            if (!tryParse.HasValue)
            {
                return; // Error already handled in ParseWfsParams
            }
            var parsed = tryParse.Value;

            var typeNames = parsed.TypeNames;
            var bbox = parsed.Bbox;
            var outputFormat = parsed.OutputFormat;
            var count = parsed.Count;
            var srsName = parsed.SrsName;

            // FeatureSet Params
            var queryParams = new Dictionary<string, string>();

            for (var i = 0; i < typeNames.Length; i++)
            {
                queryParams[$"$param{i}"] = typeNames[i];
            }

            var featureSets = string.Join(",", typeNames.Select((t, i) => $"$param{i}"));

            // Bounding Box Params
            if (bbox != null)
            {
                for (var i = 0; i < bbox.Length; i++)
                {
                    queryParams[$"$bbox{i}"] = bbox[i].ToString(CultureInfo.InvariantCulture);
                }
            }

            // Count Param
            if (count != null)
            {
                queryParams["$count"] = count.ToString();
            }

            string sql = $@"
                SELECT *
                FROM all_features
                WHERE featureset IN ({featureSets})
                {(bbox != null ? "AND x > $bbox0 AND y > $bbox1 AND x < $bbox2 AND y < $bbox3" : "")}
                {(count != null ? "LIMIT $count" : "")}
            ";
            var features = await _dataSource.TilesAndFeatures.Use(db => db.QueryAsync<Feature>(sql, queryParams));

            int numberMatched = features.Count;
            if (count != null)
            {
                // The next query doesn't use the $count param, since sqlite can
                // error out if you include params that don't match your sql,
                // so make sure to remove it!
                var remainingQueryParams = queryParams.Where(kvp => kvp.Key != "$count").ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                // It is possible for features matched to differ from the features returned
                // This additional query returns the total number of features which match the request parameters
                string sql1 = $@"
                    SELECT COUNT(*) AS totalCount
                    FROM all_features
                    WHERE featureset IN ({featureSets})
                    {(bbox != null ? "AND x > $bbox0 AND y > $bbox1 AND x < $bbox2 AND y < $bbox3" : "")}
                ";
                var totalCountResult = await _dataSource.TilesAndFeatures.Use(db => db.QueryAsync<FeatureCount>(sql1, remainingQueryParams));
                numberMatched = totalCountResult[0].TotalCount;
            }

            if (outputFormat == "GEOJSON")
            {

                var obj = new Dictionary<string, object>
                {
                    ["type"] = "FeatureCollection"
                };

                obj["features"] = features.Select(feature =>
                {
                    var properties = new Dictionary<string, object>
                    {
                        ["GmlID"] = $"Point.{feature.Id}",
                        ["viewerUrl"] = $"{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}viewer#camera={feature.Latitude},{feature.Longitude},18.00z"
                    };

                    foreach (var key in feature.GetType().GetProperties())
                    {
                        if (key.Name == "Geometry")
                        {
                            continue;
                        }

                        // convert key to camelCase
                        var camelCaseKey = char.ToLowerInvariant(key.Name[0]) + key.Name.Substring(1);
                        properties[camelCaseKey] = $"{key.GetValue(feature) ?? "null"}";
                    }

                    var coordinates = new double[] { feature.X, feature.Y };

                    if (srsName == "EPSG:4326")
                    {
                        coordinates = new double[] { feature.Longitude, feature.Latitude };
                    }

                    return new Dictionary<string, object>
                    {
                        ["type"] = "Feature",
                        ["geometry"] = new Dictionary<string, object>
                        {
                            ["type"] = "Point",
                            ["coordinates"] = coordinates
                        },
                        ["properties"] = properties
                    };
                });

                context.Response.ContentType = "application/json";
                context.Response.StatusCode = 200;


                var contractResolver = new DefaultContractResolver
                {
                    NamingStrategy = new CamelCaseNamingStrategy()
                };
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = contractResolver,
                    Formatting = Formatting.Indented
                };
                context.Response.Write(JsonConvert.SerializeObject(obj, settings));
                return;
            }

            var index = 0;
            var plansXml = new StringBuilder();
            foreach (var feature in features)
            {
                index++;

                // NOTE: We assume all features (regardless of they are) have an id and featureset property.
                // NOTE: the id & featureset properties will be omitted because they appear to be reserved properties from other namespaces.
                string geom;
                switch (srsName)
                {
                    case "EPSG:3857":
                        geom = $@"<geom>
        <gml:Point srsName=""urn:ogc:def:crs:EPSG::3857"" srsDimension=""2"" gml:id=""GmlPoint.{SafeXml(index)}"">
          <gml:pos>{SafeXml(feature.X)} {SafeXml(feature.Y)}</gml:pos>
        </gml:Point>
      </geom>";
                        break;
                    case "EPSG:4326":
                        geom = $@"<geom>
        <gml:Point srsName=""urn:ogc:def:crs:EPSG::4326"" srsDimension=""2"" gml:id=""GmlPoint.{SafeXml(index)}"">
          <gml:pos>{SafeXml(feature.Latitude)} {SafeXml(feature.Longitude)}</gml:pos>
        </gml:Point>
      </geom>";
                        break;
                    default:
                        throw new NotImplementedException("unsupported SRS");
                }

                if (index > 1)
                {
                    plansXml.Append("\r\n");
                }

                plansXml.Append($@"  <wfs:member>
    <plans gml:id=""Point.{SafeXml(index)}"">
      <viewerUrl>{SafeXml(ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true))}viewer#camera={SafeXml(feature.Latitude)},{SafeXml(feature.Longitude)},18.00z</viewerUrl>
      " + geom + $@"
      <partnerName>{SafeXml(feature.PartnerName)}</partnerName>
      <clientName>{SafeXml(feature.ClientName)}</clientName>
      <campusName>{SafeXml(feature.CampusName)}</campusName>
      <buildingName>{SafeXml(feature.BuildingName)}</buildingName>
      <floors>{SafeXml(feature.Floors)}</floors>
      <campusAddress>{SafeXml(feature.CampusAddress)}</campusAddress>
      <buildingAddress>{SafeXml(feature.BuildingAddress)}</buildingAddress>
      <partnerCode>{SafeXml(feature.PartnerCode)}</partnerCode>
      <clientCode>{SafeXml(feature.ClientCode)}</clientCode>
      <campusCode>{SafeXml(feature.CampusCode)}</campusCode>
      <buildingCode>{SafeXml(feature.BuildingCode)}</buildingCode>
      <squareMeters>{SafeXml(feature.SquareMeters)}</squareMeters>
      <latitude>{SafeXml(feature.Latitude)}</latitude>
      <longitude>{SafeXml(feature.Longitude)}</longitude>
      <x>{SafeXml(feature.X)}</x>
      <y>{SafeXml(feature.Y)}</y>
      <dateUpdated>{SafeXml(feature.DateUpdated)}</dateUpdated>
    </plans>
  </wfs:member>");
            }

            string xml;
            if (index == 0)
            {
                // no features
                xml = $@"<?xml version=""1.0""?>
<wfs:FeatureCollection xmlns:wfs=""http://www.opengis.net/wfs/2.0"" xmlns:gml=""http://www.opengis.net/gml/3.2"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" numberReturned=""{features.Count}"" numberMatched=""{numberMatched}""/>";
            }
            else
            {
                xml = $@"<?xml version=""1.0""?>
<wfs:FeatureCollection xmlns:wfs=""http://www.opengis.net/wfs/2.0"" xmlns:gml=""http://www.opengis.net/gml/3.2"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" numberReturned=""{features.Count}"" numberMatched=""{numberMatched}"">
{plansXml}
</wfs:FeatureCollection>";
            }

            context.Response.ContentType = "text/xml";
            context.Response.StatusCode = 200;
            context.Response.Write(xml);
        }

        /// <summary>
        /// Escapes xml special characters in a string.
        /// </summary>
        private static string SafeXml(object contents)
        {
            return contents == null ? "null" : SecurityElement.Escape(contents.ToString());
        }
    }
}
