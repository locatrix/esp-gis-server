using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Security;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Routes.Realestate;
using EspGisViewer.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using SQLite;
using Formatting = Newtonsoft.Json.Formatting;

namespace EspGisViewer.Routes.Wfs
{
    public class FeatureRow
    {
        [SQLite.Column("id")]
        public int Id { get; set; }

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
        public double? SquareMeters { get; set; }

        [SQLite.Column("dateUpdated")]
        public string DateUpdated { get; set; }

        [SQLite.Column("address")]
        public string Address { get; set; }

        [SQLite.Column("addressDetailPid")]
        public string AddressDetailPid { get; set; }

        [SQLite.Column("domainLink")]
        public string DomainLink { get; set; }

        [SQLite.Column("reaLink")]
        public string ReaLink { get; set; }

        [SQLite.Column("latitude")]
        public double? Latitude { get; set; }

        [SQLite.Column("longitude")]
        public double? Longitude { get; set; }

        [SQLite.Column("x")]
        public double? X { get; set; }

        [SQLite.Column("y")]
        public double? Y { get; set; }

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
        private const int MinRealestateZoom = 20;
        private const string AllFeaturesTableName = "all_features";
        private readonly DataSource _dataSource;
        private readonly string _allowedType;
        private readonly object _columnNamesLock = new object();
        private Task<HashSet<string>> _columnNamesTask;

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
                return;
            }

            var parsed = tryParse.Value;
            var typeNames = parsed.TypeNames;
            var bbox = parsed.Bbox;
            var outputFormat = parsed.OutputFormat;
            var count = parsed.Count;
            var zoom = parsed.Zoom;
            var srsName = parsed.SrsName;
            var featureId = parsed.FeatureId;

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

            if (string.Equals(_allowedType, RealestateFloorplanController.RealestatePinsFeatureset, StringComparison.OrdinalIgnoreCase))
            {
                if (bbox == null)
                {
                    context.Response.StatusCode = 400;
                    context.Response.ContentType = "text/plain";
                    context.Response.Write("Realestate WFS requests require a bbox parameter.");
                    return;
                }

                if (zoom == null || zoom < MinRealestateZoom)
                {
                    context.Response.StatusCode = 400;
                    context.Response.ContentType = "text/plain";
                    context.Response.Write($"Realestate WFS requests require zoom >= {MinRealestateZoom}.");
                    return;
                }
            }

            var querySource = GetQuerySource();

            if (!await TableExists(querySource.TableName))
            {
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = 200;
                context.Response.Write("{\"type\":\"FeatureCollection\",\"features\":[]}");
                return;
            }

            var columnNames = await GetColumnNames(querySource.TableName);
            var queryParams = new Dictionary<string, string>();

            if (querySource.FeaturesetFilter != null)
            {
                queryParams["$featureset"] = querySource.FeaturesetFilter;
            }

            var queryBbox = GetQueryBbox(bbox, srsName, querySource.UseIndexedMercatorBbox);

            if (queryBbox != null)
            {
                for (var i = 0; i < queryBbox.Length; i++)
                {
                    queryParams[$"$bbox{i}"] = queryBbox[i].ToString(CultureInfo.InvariantCulture);
                }
            }

            if (featureId != null)
            {
                queryParams["$featureId"] = featureId.Value.ToString(CultureInfo.InvariantCulture);
            }

            if (count != null)
            {
                queryParams["$count"] = count.Value.ToString(CultureInfo.InvariantCulture);
            }

            var bboxPredicate = BuildBboxPredicate(queryBbox, srsName, columnNames, querySource.UseIndexedMercatorBbox);
            var idPredicate = featureId != null ? "AND id = $featureId" : string.Empty;
            var limitClause = count != null ? "LIMIT $count" : string.Empty;
            var quotedTable = QuoteIdentifier(querySource.TableName);
            var featuresetPredicate = querySource.FeaturesetFilter != null ? "AND featureset = $featureset" : string.Empty;

            var sql = $@"
                SELECT *
                FROM {quotedTable}
                WHERE 1=1
                {featuresetPredicate}
                {idPredicate}
                {bboxPredicate}
                {limitClause}
            ";

            var features = await _dataSource.TilesAndFeatures.QueryAsync<FeatureRow>(sql, queryParams);
            var numberMatched = features.Count;

            if (count != null && !string.Equals(outputFormat, "GEOJSON", StringComparison.OrdinalIgnoreCase))
            {
                var remainingQueryParams = queryParams
                    .Where(kvp => kvp.Key != "$count")
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                var countSql = $@"
                    SELECT COUNT(*) AS totalCount
                    FROM {quotedTable}
                    WHERE 1=1
                    {featuresetPredicate}
                    {idPredicate}
                    {bboxPredicate}
                ";

                var totalCountResult = await _dataSource.TilesAndFeatures.QueryAsync<FeatureCount>(countSql, remainingQueryParams);
                if (totalCountResult.Count > 0)
                {
                    numberMatched = totalCountResult[0].TotalCount;
                }
            }

            if (string.Equals(outputFormat, "GEOJSON", StringComparison.OrdinalIgnoreCase))
            {
                WriteGeoJson(context, parameters, srsName, columnNames, features);
                return;
            }

            WriteXml(context, parameters, featureName, srsName, columnNames, features, numberMatched);
        }

        private async Task<bool> TableExists(string tableName)
        {
            var safeTableName = tableName.Replace("'", "''");
            var tablePresence = await _dataSource.TilesAndFeatures.QueryAsync<TablePresence>(
                $"SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name = '{safeTableName}'");
            return tablePresence.Count > 0 && tablePresence[0].TableCount > 0;
        }

        private Task<HashSet<string>> GetColumnNames(string tableName)
        {
            lock (_columnNamesLock)
            {
                if (_columnNamesTask == null)
                {
                    _columnNamesTask = LoadColumnNames(tableName);
                }

                return _columnNamesTask;
            }
        }

        private async Task<HashSet<string>> LoadColumnNames(string tableName)
        {
            var quotedTable = QuoteIdentifier(tableName);
            var columnRows = await _dataSource.TilesAndFeatures.QueryAsync<Column>($"PRAGMA table_info({quotedTable})");
            return new HashSet<string>(columnRows.Select(r => r.Name), StringComparer.OrdinalIgnoreCase);
        }

        private static string BuildBboxPredicate(double[] bbox, string srsName, HashSet<string> columnNames, bool preferMercator)
        {
            if (bbox == null)
            {
                return string.Empty;
            }

            var useWebMercator = preferMercator
                || string.Equals(srsName, "EPSG:3857", StringComparison.OrdinalIgnoreCase)
                || LooksLikeWebMercatorBbox(bbox);

            if (useWebMercator && columnNames.Contains("x") && columnNames.Contains("y"))
            {
                return "AND x > $bbox0 AND y > $bbox1 AND x < $bbox2 AND y < $bbox3";
            }

            if (columnNames.Contains("latitude") && columnNames.Contains("longitude"))
            {
                return "AND longitude > $bbox0 AND latitude > $bbox1 AND longitude < $bbox2 AND latitude < $bbox3";
            }

            return string.Empty;
        }

        private static double[] GetQueryBbox(double[] bbox, string srsName, bool preferMercator)
        {
            if (bbox == null)
            {
                return null;
            }

            if (!preferMercator || LooksLikeWebMercatorBbox(bbox) || string.Equals(srsName, "EPSG:3857", StringComparison.OrdinalIgnoreCase))
            {
                return bbox;
            }

            var southWest = ToWebMercator(bbox[0], bbox[1]);
            var northEast = ToWebMercator(bbox[2], bbox[3]);
            return new[] { southWest[0], southWest[1], northEast[0], northEast[1] };
        }

        private static double[] ToWebMercator(double longitude, double latitude)
        {
            var x = longitude * 20037508.34 / 180.0;
            var clampedLatitude = Math.Max(Math.Min(latitude, 85.05112878), -85.05112878);
            var y = Math.Log(Math.Tan((90.0 + clampedLatitude) * Math.PI / 360.0)) / (Math.PI / 180.0);
            y = y * 20037508.34 / 180.0;
            return new[] { x, y };
        }

        private QuerySource GetQuerySource()
        {
            if (string.Equals(_allowedType, RealestateFloorplanController.RealestatePinsFeatureset, StringComparison.OrdinalIgnoreCase))
            {
                return new QuerySource
                {
                    TableName = AllFeaturesTableName,
                    FeaturesetFilter = RealestateFloorplanController.RealestatePinsFeatureset,
                    UseIndexedMercatorBbox = true,
                };
            }

            return new QuerySource
            {
                TableName = _allowedType,
                FeaturesetFilter = null,
                UseIndexedMercatorBbox = false,
            };
        }

        private class QuerySource
        {
            public string TableName { get; set; }
            public string FeaturesetFilter { get; set; }
            public bool UseIndexedMercatorBbox { get; set; }
        }

        private static bool LooksLikeWebMercatorBbox(double[] bbox)
        {
            return bbox != null && bbox.Length == 4 && (
                Math.Abs(bbox[0]) > 180 ||
                Math.Abs(bbox[2]) > 180 ||
                Math.Abs(bbox[1]) > 90 ||
                Math.Abs(bbox[3]) > 90);
        }

        private void WriteGeoJson(HttpContext context, Dictionary<string, string> parameters, string srsName, HashSet<string> columnNames, List<FeatureRow> features)
        {
            var serverRoot = ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true);
            var obj = new Dictionary<string, object>
            {
                ["type"] = "FeatureCollection",
                ["features"] = features.Select(feature => BuildGeoJsonFeature(serverRoot, srsName, columnNames, feature)).ToList()
            };

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 200;

            var settings = new JsonSerializerSettings
            {
                ContractResolver = new DefaultContractResolver
                {
                    NamingStrategy = new CamelCaseNamingStrategy()
                },
                Formatting = Formatting.None
            };

            context.Response.Write(JsonConvert.SerializeObject(obj, settings));
        }

        private Dictionary<string, object> BuildGeoJsonFeature(string serverRoot, string srsName, HashSet<string> columnNames, FeatureRow feature)
        {
            var properties = new Dictionary<string, object>
            {
                ["GmlID"] = $"Point.{feature.Id}"
            };

            if (feature.Latitude.HasValue && feature.Longitude.HasValue)
            {
                properties["viewerUrl"] = $"{serverRoot}viewer#camera={feature.Latitude.Value.ToString(CultureInfo.InvariantCulture)},{feature.Longitude.Value.ToString(CultureInfo.InvariantCulture)},18.00z";
            }

            if (string.Equals(_allowedType, RealestateFloorplanController.RealestatePinsFeatureset, StringComparison.OrdinalIgnoreCase))
            {
                properties["floorplanUrlEndpoint"] = $"{serverRoot}realestate-floorplan/{feature.Id}";
            }

            foreach (var kvp in GetFeatureProperties(feature))
            {
                var camelCaseKey = char.ToLowerInvariant(kvp.Key[0]) + kvp.Key.Substring(1);
                properties[camelCaseKey] = kvp.Value;
            }

            double[] coordinates = null;
            var useWebMercator = string.Equals(srsName, "EPSG:3857", StringComparison.OrdinalIgnoreCase);
            if (useWebMercator && columnNames.Contains("x") && columnNames.Contains("y") && feature.X.HasValue && feature.Y.HasValue)
            {
                coordinates = new[] { feature.X.Value, feature.Y.Value };
            }
            else if (columnNames.Contains("latitude") && columnNames.Contains("longitude") && feature.Longitude.HasValue && feature.Latitude.HasValue)
            {
                coordinates = new[] { feature.Longitude.Value, feature.Latitude.Value };
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
        }

        private void WriteXml(HttpContext context, Dictionary<string, string> parameters, string featureName, string srsName, HashSet<string> columnNames, List<FeatureRow> features, int numberMatched)
        {
            var serverRoot = ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true);
            var plansXml = new StringBuilder();
            var index = 0;

            foreach (var feature in features)
            {
                index++;
                var geom = BuildXmlGeometry(srsName, feature, index);
                if (geom == null)
                {
                    continue;
                }

                if (index > 1)
                {
                    plansXml.Append("\r\n");
                }

                var propertiesXml = new StringBuilder();
                if (feature.Latitude.HasValue && feature.Longitude.HasValue)
                {
                    propertiesXml.Append($@"      <viewerUrl>{SafeXml($"{serverRoot}viewer#camera={feature.Latitude.Value.ToString(CultureInfo.InvariantCulture)},{feature.Longitude.Value.ToString(CultureInfo.InvariantCulture)},18.00z")}</viewerUrl>");
                    propertiesXml.Append("\r\n");
                }

                if (string.Equals(_allowedType, RealestateFloorplanController.RealestatePinsFeatureset, StringComparison.OrdinalIgnoreCase))
                {
                    propertiesXml.Append($@"      <floorplanUrlEndpoint>{SafeXml($"{serverRoot}realestate-floorplan/{feature.Id}")}</floorplanUrlEndpoint>");
                    propertiesXml.Append("\r\n");
                }

                foreach (var kvp in GetFeatureProperties(feature))
                {
                    propertiesXml.Append($@"      <{kvp.Key}>{SafeXml(kvp.Value)}</{kvp.Key}>");
                    propertiesXml.Append("\r\n");
                }

                plansXml.Append($@"  <wfs:member>
        <{featureName} gml:id=""Point.{SafeXml(index)}"">
            {geom}
{propertiesXml}    </{featureName}>
    </wfs:member>");
            }

            string xml;
            if (plansXml.Length == 0)
            {
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

        private static string BuildXmlGeometry(string srsName, FeatureRow feature, int index)
        {
            if (string.Equals(srsName, "EPSG:3857", StringComparison.OrdinalIgnoreCase) && feature.X.HasValue && feature.Y.HasValue)
            {
                return $@"<geom>
        <gml:Point srsName=""urn:ogc:def:crs:EPSG::3857"" srsDimension=""2"" gml:id=""GmlPoint.{SafeXml(index)}"">
          <gml:pos>{SafeXml(feature.X.Value)} {SafeXml(feature.Y.Value)}</gml:pos>
        </gml:Point>
      </geom>";
            }

            if (feature.Latitude.HasValue && feature.Longitude.HasValue)
            {
                return $@"<geom>
        <gml:Point srsName=""urn:ogc:def:crs:EPSG::4326"" srsDimension=""2"" gml:id=""GmlPoint.{SafeXml(index)}"">
          <gml:pos>{SafeXml(feature.Latitude.Value)} {SafeXml(feature.Longitude.Value)}</gml:pos>
        </gml:Point>
      </geom>";
            }

            return null;
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
                if (value == null || value is byte[])
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

        private static string SafeXml(object contents)
        {
            return contents == null ? "null" : SecurityElement.Escape(contents.ToString());
        }
    }
}
