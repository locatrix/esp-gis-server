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
                // This is geometric data, it should be returned as a Point type
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
            var tryParse = WfsParams.Parse(context.Request, context.Response, overrideQueries);
            if (!tryParse.HasValue)
            {
                return;
            }
            var wfsParams = tryParse.Value;

            await _dataSource.Refresh(true);

            var columns = await _dataSource.TilesAndFeatures.QueryAsync<Column>("PRAGMA table_info(all_features)");

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

            var targetNamespace = "http://www.locatrix.com";
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
    }
}
