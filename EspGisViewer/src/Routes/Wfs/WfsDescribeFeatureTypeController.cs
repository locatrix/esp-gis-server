using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using SQLite;

namespace EspGisViewer.Routes.Wfs
{
    public class WfsDescribeFeatureTypeController
    {
        private readonly DataSource _dataSource;
        private readonly string _allowedType;

        public WfsDescribeFeatureTypeController(DataSource dataSource, string allowedType)
        {
            _dataSource = dataSource;
            _allowedType = allowedType;
        }

        private static readonly string[] ExcludedWfsColumns = {
            "id",
            "featureset",
            "domainLink",
            "reaLink"
        };

        private class Column
        {
            [SQLite.Column("name")]
            public string Name { get; set; }

            [SQLite.Column("type")]
            public string Type { get; set; }

            public bool IsExcluded()
            {
                return ExcludedWfsColumns.Contains(Name);
            }
        }

        private static string MapSqlTypesIntoFeatures(Column column)
        {
            // Integer Types
            if (column.Type == "INTEGER" || column.Type == "INT")
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""xsd:int""/>";
            }

            // Floating Point Types
            if (column.Type == "REAL" || column.Type == "FLOAT" || column.Type == "DOUBLE")
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""xsd:double""/>";
            }

            // String Types
            if (column.Type == "TEXT" || column.Type.Contains("VARCHAR"))
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""xsd:string""/>";
            }

            // Geometry Column (Specific BLOB)
            if (column.Name == "geom" && column.Type == "BLOB")
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""gml:PointPropertyType""/>";
            }

            // 5. Image/Binary Column (Generic BLOB)
            if (column.Type == "BLOB")
            {
                // Correct OGC/XML type for binary images
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""xsd:base64Binary""/>";
            }

            // Fallback for unknown types (treat as string to prevent crash)
            return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""xsd:string""/>";
        }

        public async Task HandleRequest(HttpContext context, Dictionary<string, string> parameters, Dictionary<string, string> overrideQueries)
        {
            var tryParse = WfsParams.Parse(context.Request, context.Response, overrideQueries, _allowedType);
            if (!tryParse.HasValue)
            {
                return;
            }
            var wfsParams = tryParse.Value;

            await _dataSource.Refresh(true);

            var mainFeatureType = wfsParams.TypeNames.FirstOrDefault();

            if (string.IsNullOrEmpty(mainFeatureType))
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Missing typeNames parameter");
                return;
            }

            if (!string.Equals(mainFeatureType, _allowedType, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 404;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Unknown feature type");
                return;
            }

            var quotedTable = QuoteIdentifier(_allowedType);

            // PRAGMA table_info returns columns: cid, name, type, notnull, dflt_value, pk
            var columns = await _dataSource.TilesAndFeatures.QueryAsync<Column>($"PRAGMA table_info({quotedTable})");

            var featureTypes = columns
                .Where(c => !c.IsExcluded())
                .Select(MapSqlTypesIntoFeatures)
                .ToList();

            // Inject geometry + viewerUrl + floorplanUrlEndpoint
            featureTypes.Insert(0, MapSqlTypesIntoFeatures(new Column { Type = "TEXT", Name = "viewerUrl" }));
            featureTypes.Insert(0, MapSqlTypesIntoFeatures(new Column { Type = "BLOB", Name = "geom" }));
            featureTypes.Add(MapSqlTypesIntoFeatures(new Column { Type = "TEXT", Name = "floorplanUrlEndpoint" }));

            // Define the Target Namespace (tns / LOCATRIX)
            string targetNamespace = "http://www.locatrix.com"; 

            var xml = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<xsd:schema 
    xmlns:xsd=""http://www.w3.org/2001/XMLSchema""
    xmlns:gml=""http://www.opengis.net/gml/3.2""
    xmlns:wfs=""http://www.opengis.net/wfs/2.0""
    xmlns:LOCATRIX=""{targetNamespace}""
    targetNamespace=""{targetNamespace}""
    elementFormDefault=""qualified"">

  <xsd:import namespace=""http://www.opengis.net/gml/3.2"" schemaLocation=""http://schemas.opengis.net/gml/3.2.1/gml.xsd""/>

  <xsd:element name=""{mainFeatureType}"" type=""LOCATRIX:{mainFeatureType}Type"" substitutionGroup=""gml:AbstractFeature""/>

  <xsd:complexType name=""{mainFeatureType}Type"">
    <xsd:complexContent>
      <xsd:extension base=""gml:AbstractFeatureType"">
        <xsd:sequence>{featureTypes.Aggregate("", (current, featureType) => current + "\r\n          " + featureType)}
        </xsd:sequence>
      </xsd:extension>
    </xsd:complexContent>
  </xsd:complexType>
</xsd:schema>";

            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/xml";
            context.Response.Write(xml);
        }

        private static string QuoteIdentifier(string identifier)
        {
            return "\"" + identifier.Replace("\"", "\"\"") + "\"";
        }
    }
}
