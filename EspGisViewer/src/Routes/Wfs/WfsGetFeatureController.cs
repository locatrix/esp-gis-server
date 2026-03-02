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
using SQLite;
using System.Reflection;
using Formatting = Newtonsoft.Json.Formatting;
namespace EspGisViewer.Routes.Wfs
{

    public class FeatureRow
    {
        [SQLite.Column("id")]
        public int Id { get; set; }

        [SQLite.Column("address")]
        public string Address { get; set; }

        [SQLite.Column("latitude")]
        public double Latitude { get; set; }

        [SQLite.Column("longitude")]
        public double Longitude { get; set; }

        [SQLite.Column("x")]
        public double X { get; set; }

        [SQLite.Column("y")]
        public double Y { get; set; }

        [SQLite.Column("image_data_url")]
        public string ImageDataUrl { get; set; }

        [SQLite.Column("floorplan_url")]
        public string FloorplanUrl { get; set; }
    }

    public class FeatureCount
    {
        [SQLite.Column("totalCount")]
        public int TotalCount { get; set; }
    }

    public class Column
    {
        [SQLite.Column("name")]
        public string Name { get; set; }
    }

    public class TablePresence
    {
        [SQLite.Column("table_count")]
        public int TableCount { get; set; }
    }

    public class WfsGetFeatureController
    {
        private readonly DataSource _dataSource;
        private readonly string _allowedType;

        public WfsGetFeatureController(DataSource dataSource, string allowedType)
        {
            _dataSource = dataSource;
            _allowedType = allowedType;
        }

        public async Task HandleRequest(HttpContext context, Dictionary<string, string> parameters, Dictionary<string, string> overrideQueries)
        {
            await _dataSource.Refresh(false);

            var tryParse = WfsParams.Parse(context.Request, context.Response, overrideQueries, _allowedType);
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
            var featureId = parsed.FeatureId;

            const int DefaultRealestateCount = 200;

            var featureName = typeNames.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(featureName))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Missing typeNames parameter");
                return;
            }

            if (!string.Equals(featureName, _allowedType, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Unknown feature type");
                return;
            }

            var quotedTable = QuoteIdentifier(_allowedType);

            if (string.Equals(_allowedType, "realestate-floorplans", StringComparison.OrdinalIgnoreCase))
            {
                var safeTableName = _allowedType.Replace("'", "''");
                var tablePresence = await _dataSource.TilesAndFeatures.QueryAsync<TablePresence>(
                    $"SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name = '{safeTableName}'");
                if (tablePresence.Count == 0 || tablePresence[0].TableCount == 0)
                {
                    context.Response.ContentType = "application/json";
                    context.Response.StatusCode = 200;
                    context.Response.Write("{\"type\":\"FeatureCollection\",\"features\":[]}");
                    return;
                }
            }

            var columnRows = await _dataSource.TilesAndFeatures.QueryAsync<Column>($"PRAGMA table_info({quotedTable})");
            var columnNames = new HashSet<string>(columnRows.Select(r => r.Name), StringComparer.OrdinalIgnoreCase);

            // Feature Params
            var queryParams = new Dictionary<string, string>();

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
            else if (string.Equals(_allowedType, "realestate-floorplans", StringComparison.OrdinalIgnoreCase)
                && string.Equals(outputFormat, "GEOJSON", StringComparison.OrdinalIgnoreCase))
            {
                count = DefaultRealestateCount;
                queryParams["$count"] = count.ToString();
            }

            var bboxPredicate = "";
            if (bbox != null)
            {
                if (srsName == "EPSG:4326" && columnNames.Contains("latitude") && columnNames.Contains("longitude"))
                {
                    // BBOX is minLon, minLat, maxLon, maxLat
                    bboxPredicate = "AND longitude > $bbox0 AND latitude > $bbox1 AND longitude < $bbox2 AND latitude < $bbox3";
                }
                else if (srsName == "EPSG:3857" && columnNames.Contains("x") && columnNames.Contains("y"))
                {
                    bboxPredicate = "AND x > $bbox0 AND y > $bbox1 AND x < $bbox2 AND y < $bbox3";
                }
            }

            var idPredicate = "";
            if (featureId != null)
            {
                idPredicate = "AND id = $featureId";
                queryParams["$featureId"] = featureId.Value.ToString();
            }

            string sql = $@"
                SELECT *
                FROM {quotedTable}
                WHERE 1=1
                {idPredicate}
                {bboxPredicate}
                {(count != null ? "LIMIT $count" : "")}
            ";

            List<FeatureRow> features;
            try
            {
                features = await _dataSource.TilesAndFeatures.QueryAsync<FeatureRow>(sql, queryParams);
            }
            catch (Exception error)
            {
                Console.WriteLine(error.Message);
                throw;
            }

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
                    FROM {quotedTable}
                    WHERE 1=1
                    {bboxPredicate}
                ";
                var totalCountResult = await _dataSource.TilesAndFeatures.QueryAsync<FeatureCount>(sql1, remainingQueryParams);
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

                    foreach (var kvp in GetFeatureProperties(feature))
                    {
                        // convert key to camelCase
                        var camelCaseKey = char.ToLowerInvariant(kvp.Key[0]) + kvp.Key.Substring(1);
                        properties[camelCaseKey] = kvp.Value;
                    }

                    var coordinates = (double[])null;

                    if (srsName == "EPSG:4326" && columnNames.Contains("latitude") && columnNames.Contains("longitude"))
                    {
                        coordinates = new double[] { feature.Longitude, feature.Latitude };
                    }
                    else if (srsName == "EPSG:3857" && columnNames.Contains("x") && columnNames.Contains("y"))
                    {
                        coordinates = new double[] { feature.X, feature.Y };
                    }

                    return new Dictionary<string, object>
                    {
                        ["type"] = "Feature",
                        ["geometry"] = coordinates == null ? null : new Dictionary<string, object>
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
                    Formatting = Formatting.None
                };
                context.Response.Write(JsonConvert.SerializeObject(obj, settings));
                return;
            }

            var index = 0;
            var plansXml = new StringBuilder();
            foreach (var feature in features)
            {
                index++;

                // NOTE: We assume all features have an id and latitude/longitude (or x/y) for geometry.
                string geom;
                switch (srsName)
                {
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

                                var propertiesXml = new StringBuilder();
                                foreach (var kvp in GetFeatureProperties(feature))
                                {
                                        propertiesXml.Append($@"      <{kvp.Key}>{SafeXml(kvp.Value)}</{kvp.Key}>");
                                        propertiesXml.Append("\r\n");
                                }

                                plansXml.Append($@"  <wfs:member>
        <{featureName} gml:id=""Point.{SafeXml(index)}"">
            " + geom + $@"
{propertiesXml}    </{featureName}>
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

        private static IEnumerable<KeyValuePair<string, object>> GetFeatureProperties(FeatureRow feature)
        {
            foreach (var property in typeof(FeatureRow).GetProperties())
            {
                if (property.Name == nameof(FeatureRow.Id))
                {
                    continue;
                }

                var value = property.GetValue(feature);
                if (value == null)
                {
                    continue;
                }

                if (value is byte[])
                {
                    continue;
                }

                yield return new KeyValuePair<string, object>(GetColumnName(property), value);
            }
        }

        private static string GetColumnName(PropertyInfo property)
        {
            var attribute = property.GetCustomAttributes(typeof(SQLite.ColumnAttribute), true)
                .FirstOrDefault() as SQLite.ColumnAttribute;
            return attribute?.Name ?? property.Name;
        }

        private static string QuoteIdentifier(string identifier)
        {
            return "\"" + identifier.Replace("\"", "\"\"") + "\"";
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
