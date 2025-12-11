using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;
namespace EspGisViewer.Routes.Wfs
{
    public class FeatureData
    {
        [SQLite.Column("featureset")]
        public string Feature { get; set; }
    }

    public class WfsGetCapabilitiesController
    {
        private readonly DataSource _dataSource;

        public WfsGetCapabilitiesController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        public async Task HandleRequest(HttpContext context, Dictionary<string, string> parameters)
        {
            await _dataSource.Refresh(true);

            var featureData = await _dataSource.Tiles.Use(db => db.QueryAsync<FeatureData>(@"
                SELECT DISTINCT featureset
                FROM all_features
            ", (Dictionary<string, string>)null));

            var features = featureData.Select(fd => fd.Feature)
                    .Distinct()
                    .OrderBy(f => f)
                    .ToList();

            var featuresXml = "";


            foreach (var feature in features)
            {
                featuresXml += $@"
    <wfs:FeatureType>
      <wfs:Name>{feature}</wfs:Name>
      <wfs:Title>{feature}</wfs:Title>
      <wfs:DefaultCRS>urn:ogc:def:crs:EPSG::3857</wfs:DefaultCRS>
      <ows:WGS84BoundingBox>
        <ows:LowerCorner>113.503234326 -43.280603544</ows:LowerCorner>
        <ows:UpperCorner>153.650786054 -12.274432464</ows:UpperCorner>
      </ows:WGS84BoundingBox>
    </wfs:FeatureType>";
            }

            var xmlContents = $@"<?xml version=""1.0""?>
<wfs:WFS_Capabilities version=""2.0.0"" xmlns:wfs=""http://www.opengis.net/wfs/2.0"" xmlns:ows=""http://www.opengis.net/ows/1.1"" xmlns:xlink=""http://www.w3.org/1999/xlink"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:gml=""http://www.opengis.net/gml"" xsi:schemaLocation=""http://www.opengis.net/wfs/2.0 https://schemas.opengis.net/wfs/2.0/wsdl/wfs.xsd"" xmlns:fes=""http://www.opengis.net/fes/2.0"">
  <ows:ServiceIdentification>
    <ows:Title>Locatrix WFS Server Demo</ows:Title>
    <ows:Abstract>Locatrix Server Demo</ows:Abstract>
    <ows:Keywords>
      <ows:Keyword>WFS</ows:Keyword>
    </ows:Keywords>
    <ows:ServiceType>OGC WFS</ows:ServiceType>
    <ows:ServiceTypeVersion>2.0.0</ows:ServiceTypeVersion>
    <ows:Fees>NONE</ows:Fees>
    <ows:AccessConstraints>NOT FOR PUBLIC USE.</ows:AccessConstraints>
  </ows:ServiceIdentification>
  <ows:ServiceProvider>
    <ows:ProviderName>Locatrix</ows:ProviderName>
    <ows:ProviderSite xlink:href=""https://www.locatrix.com""/>
    <ows:ServiceContact>
      <ows:IndividualName>Matthew Henry</ows:IndividualName>
      <ows:PositionName>Chief Technical Officer</ows:PositionName>
      <ows:ContactInfo>
        <ows:Phone>
          <ows:Voice>+61 1300 738 461</ows:Voice>
        </ows:Phone>
        <ows:Address>
          <ows:DeliveryPoint>Level 1, Unit 12 / 3908 Pacific Highway</ows:DeliveryPoint>
          <ows:City>Loganholme</ows:City>
          <ows:AdministrativeArea>QLD</ows:AdministrativeArea>
          <ows:PostalCode>4129</ows:PostalCode>
          <ows:Country>Australia</ows:Country>
          <ows:ElectronicMailAddress>info@locatrix.com</ows:ElectronicMailAddress>
        </ows:Address>
      </ows:ContactInfo>
    </ows:ServiceContact>
  </ows:ServiceProvider>
  <ows:OperationsMetadata>
    <ows:Operation name=""GetCapabilities"">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs?""/>
          <ows:Post xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs""/>
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name=""AcceptVersions"">
        <ows:AllowedValues>
          <ows:Value>1.0.0</ows:Value>
          <ows:Value>1.1.0</ows:Value>
          <ows:Value>2.0.0</ows:Value>
        </ows:AllowedValues>
      </ows:Parameter>
    </ows:Operation>
    <ows:Operation name=""DescribeFeatureType"">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs?""/>
          <ows:Post xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs""/>
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name=""outputFormat"">
        <ows:AllowedValues>
          <ows:Value>application/gml+xml; version=3.2</ows:Value>
        </ows:AllowedValues>
      </ows:Parameter>
    </ows:Operation>
    <ows:Operation name=""GetFeature"">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs?""/>
          <ows:Post xlink:href=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}wfs""/>
        </ows:HTTP>
      </ows:DCP>
      <ows:Parameter name=""resultType"">
        <ows:AllowedValues>
          <ows:Value>results</ows:Value>
          <ows:Value>hits</ows:Value>
        </ows:AllowedValues>
      </ows:Parameter>
      <ows:Parameter name=""outputFormat"">
        <ows:AllowedValues>
          <ows:Value>application/gml+xml; version=3.2</ows:Value>
          <ows:Value>GML2</ows:Value>
          <ows:Value>text/xml; subtype=gml/3.2</ows:Value>
          <ows:Value>GEOJSON</ows:Value>
        </ows:AllowedValues>
      </ows:Parameter>
    </ows:Operation>
    <ows:Constraint name=""KVPEncoding"">
      <ows:NoValues/>
      <ows:DefaultValue>TRUE</ows:DefaultValue>
    </ows:Constraint>
    <ows:Constraint name=""XMLEncoding"">
      <ows:NoValues/>
      <ows:DefaultValue>TRUE</ows:DefaultValue>
    </ows:Constraint>
    <ows:Constraint name=""SOAPEncoding"">
      <ows:NoValues/>
      <ows:DefaultValue>FALSE</ows:DefaultValue>
    </ows:Constraint>
  </ows:OperationsMetadata>
  <wfs:FeatureTypeList>{featuresXml}
  </wfs:FeatureTypeList>
  <fes:Filter_Capabilities>
    <fes:Conformance>
      <ows:Constraint name=""ImplementsQuery"">
        <ows:NoValues/>
        <ows:DefaultValue>TRUE</ows:DefaultValue>
      </ows:Constraint>
    </fes:Conformance>
    <fes:Spatial_Capabilities>
      <fes:GeometryOperands xmlns:gml32=""http://www.opengis.net/gml"">
        <fesGeometryOperand name=""gml:Box""/>
      </fes:GeometryOperands>
      <fes:SpatialOperators>
        <fes:SpatialOperator name=""BBOX""/>
      </fes:SpatialOperators>
    </fes:Spatial_Capabilities>
  </fes:Filter_Capabilities>
</wfs:WFS_Capabilities>";

            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/xml";

            context.Response.Write(xmlContents);
        }
    }
}
