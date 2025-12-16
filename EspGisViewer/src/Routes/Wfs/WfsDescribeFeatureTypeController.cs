using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
namespace EspGisViewer.Routes.Wfs
{
    public class WfsDescribeFeatureTypeController
    {
        private readonly DataSource _dataSource;

        public WfsDescribeFeatureTypeController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        private static readonly string[] ExcludedWfsColumns = {
            "id",
            "featureset"
        };

        private class Column
        {
            public string Name { get; set; }
            public string Type { get; set; }

            public bool IsExcluded()
            {
                return ExcludedWfsColumns.Contains(Name);
            }

            public string GetSqlType()
            {
                switch (Type)
                {
                    case "INTEGER": return "int";
                    case "REAL":    return "float";
                    case "TEXT":    return "string";
                    default:        return Type;
                }
            }
        }

        private static string MapSqlTypesIntoFeatures(Column column)
        {
            if (column.Type == "INTEGER" || column.Type == "REAL")
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""Number""/>";
            }

            if (column.Type == "TEXT" || column.Type.Contains("VARCHAR"))
            {
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""string""/>";
            }

            if (column.Name == "geom" && column.Type == "BLOB")
            {
                // This is geometric data, it should be returned as a Point type
                return $@"<xsd:element maxOccurs=""1"" minOccurs=""0"" name=""{column.Name}"" nillable=""true"" type=""gml:PointPropertyType""/>";
            }

            throw new NotSupportedException($"Unsupported column type: {column.Type}");
        }

        public async Task HandleRequest(HttpContext context, Dictionary<string, string> parameters, Dictionary<string, string> overrideQueries)
        {
            var tryParse = WfsParams.Parse(context.Request, context.Response, overrideQueries);
            if (!tryParse.HasValue)
            {
                return;
            }
            var wfsParams = tryParse.Value;

            await _dataSource.Refresh(true);

            var columns = await _dataSource.TilesAndFeatures.Use(db => db.QueryAsync<Column>("PRAGMA table_info(all_features)", (Dictionary<string, string>)null));

            var featureTypes = columns
                .Where(c => !c.IsExcluded())
                .Select(MapSqlTypesIntoFeatures)
                .ToList();

            featureTypes.Insert(0, MapSqlTypesIntoFeatures(new Column { Type = "TEXT", Name = "viewerUrl" }));

            var mainFeatureType = wfsParams.TypeNames.FirstOrDefault();

            if (mainFeatureType == null)
            {
                context.Response.StatusCode = 400;
                context.Response.ContentType = "text/plain";
                context.Response.Write("Missing typeNames parameter");
                return;
            }

            var xml = $@"<?xml version=""1.0""?>
<xsd:schema xmlns:wfs=""http://www.opengis.net/wfs/2.0"" xmlns:gml=""http://www.opengis.net/gml/3.2"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"">
  <xsd:import namespace=""http://www.opengis.net/gml/3.2"" schemaLocation=""http://www.opengis.net/gml/3.2""/>
  <xsd:complexType name=""{mainFeatureType}Type"">
    <xsd:complexContent>
      <xsd:extension base=""gml:AbstractFeatureType"">
        <xsd:sequence>{featureTypes.Aggregate("", (current, featureType) => current + "\r\n          " + featureType)}
        </xsd:sequence>
      </xsd:extension>
    </xsd:complexContent>
  </xsd:complexType>
  <xsd:element name=""{mainFeatureType}"" substitutionGroup=""gml:AbstractFeature"" type=""LOCATRIX:{mainFeatureType}Type""/>
</xsd:schema>";

            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/xml";
            context.Response.Write(xml);
        }
    }
}
