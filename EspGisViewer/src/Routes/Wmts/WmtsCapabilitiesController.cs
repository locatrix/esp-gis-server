using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using EspGisViewer.Data;
using EspGisViewer.Util;
namespace EspGisViewer.Routes.Wmts
{
    public class TileName
    {
        [SQLite.Column("identifier")]
        public string Name { get; set; }

        [SQLite.Column("table_name")]
        public string SafeName { get; set; }
    }

    public class WmtsCapabilitiesController
    {
        private readonly DataSource _dataSource;

        public WmtsCapabilitiesController(DataSource dataSource)
        {
            _dataSource = dataSource;
        }

        public async Task HandleCapabilities(HttpContext context, Dictionary<string, string> parameters)
        {
            await _dataSource.Refresh(true);

            var rows = await _dataSource.Tiles.Use(db => db.QueryAsync<TileName>("" +
                                                                                 "SELECT identifier, table_name " +
                                                                                 "FROM gpkg_contents " +
                                                                                 "WHERE data_type = 'tiles'", (Dictionary<string, string>) null));

            var param = parameters.TryGetValue("layer", out var layerParam) ? layerParam : "LocatrixEspCoverage";
            var renderedLayers = rows.ToList();
            renderedLayers.RemoveAll(x => x.SafeName != param);

            var layers = "";
            foreach (var layer in renderedLayers)
            {
                layers += $@"
    <Layer>
      <ows:Title>Locatrix ESP - {layer.Name}</ows:Title>
      <ows:Identifier>{layer.Name}</ows:Identifier>
      <ows:WGS84BoundingBox>
        <ows:LowerCorner>113.503234326 -43.280603544</ows:LowerCorner>
        <ows:UpperCorner>153.650786054 -12.274432464</ows:UpperCorner>
      </ows:WGS84BoundingBox>
      <Style isDefault=""true"">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>GoogleMapsCompatibleExt:epsg:3857</TileMatrixSet>
      </TileMatrixSetLink>
      <ResourceURL format=""image/png"" resourceType=""tile"" template=""{ServerHost.GetServerUrl(context.Request, parameters.GetValue("accessToken"), true)}{layer.SafeName}/{{TileMatrix}}/{{TileCol}}/{{TileRow}}.png""/>
    </Layer>";
            }

            var xmlContents = @"<?xml version=""1.0""?>
<Capabilities xmlns=""http://www.opengis.net/wmts/1.0"" xmlns:ows=""http://www.opengis.net/ows/1.1"" xmlns:xlink=""http://www.w3.org/1999/xlink"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:gml=""http://www.opengis.net/gml"" xsi:schemaLocation=""http://www.opengis.net/wmts/1.0 http://schemas.opengis.net/wmts/1.0/wmtsGetCapabilities_response.xsd"" version=""1.0.0"">
  <ows:ServiceIdentification>
    <ows:Title>Locatrix WMTS Server Demo</ows:Title>
    <ows:Abstract>Locatrix Server Demo</ows:Abstract>
    <ows:Keywords>
      <ows:Keyword>WMTS</ows:Keyword>
    </ows:Keywords>
    <ows:ServiceType>OGC WMTS</ows:ServiceType>
    <ows:ServiceTypeVersion>1.0.0</ows:ServiceTypeVersion>
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
  <Contents>" + layers + @"
    <TileMatrixSet>
      <ows:Identifier>GoogleMapsCompatibleExt:epsg:3857</ows:Identifier>
      <ows:SupportedCRS>EPSG:3857</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>0</ows:Identifier>
        <ScaleDenominator>559082264.0287177600000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>1</ows:Identifier>
        <ScaleDenominator>279541132.0143588800000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>2</ows:Identifier>
        <ScaleDenominator>139770566.0071794100000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4</MatrixWidth>
        <MatrixHeight>4</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>3</ows:Identifier>
        <ScaleDenominator>69885283.0035897200000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>8</MatrixWidth>
        <MatrixHeight>8</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>4</ows:Identifier>
        <ScaleDenominator>34942641.5017948600000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>16</MatrixWidth>
        <MatrixHeight>16</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>5</ows:Identifier>
        <ScaleDenominator>17471320.7508974300000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>32</MatrixWidth>
        <MatrixHeight>32</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>6</ows:Identifier>
        <ScaleDenominator>8735660.3754487149000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>64</MatrixWidth>
        <MatrixHeight>64</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>7</ows:Identifier>
        <ScaleDenominator>4367830.1877243565000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>128</MatrixWidth>
        <MatrixHeight>128</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>8</ows:Identifier>
        <ScaleDenominator>2183915.0938621792000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>256</MatrixWidth>
        <MatrixHeight>256</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>9</ows:Identifier>
        <ScaleDenominator>1091957.5469310889000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>512</MatrixWidth>
        <MatrixHeight>512</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>10</ows:Identifier>
        <ScaleDenominator>545978.7734655446800</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1024</MatrixWidth>
        <MatrixHeight>1024</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>11</ows:Identifier>
        <ScaleDenominator>272989.3867327722800</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2048</MatrixWidth>
        <MatrixHeight>2048</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>12</ows:Identifier>
        <ScaleDenominator>136494.6933663862000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4096</MatrixWidth>
        <MatrixHeight>4096</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>13</ows:Identifier>
        <ScaleDenominator>68247.3466831930850</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>8192</MatrixWidth>
        <MatrixHeight>8192</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>14</ows:Identifier>
        <ScaleDenominator>34123.6733415965430</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>16384</MatrixWidth>
        <MatrixHeight>16384</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>15</ows:Identifier>
        <ScaleDenominator>17061.8366707982710</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>32768</MatrixWidth>
        <MatrixHeight>32768</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>16</ows:Identifier>
        <ScaleDenominator>8530.9183353991357</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>65536</MatrixWidth>
        <MatrixHeight>65536</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>17</ows:Identifier>
        <ScaleDenominator>4265.4591676995678</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>131072</MatrixWidth>
        <MatrixHeight>131072</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>18</ows:Identifier>
        <ScaleDenominator>2132.7295838497839</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>262144</MatrixWidth>
        <MatrixHeight>262144</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>19</ows:Identifier>
        <ScaleDenominator>1066.3647920000001</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>524288</MatrixWidth>
        <MatrixHeight>524288</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>20</ows:Identifier>
        <ScaleDenominator>533.1823960000000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1048576</MatrixWidth>
        <MatrixHeight>1048576</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>21</ows:Identifier>
        <ScaleDenominator>266.5911980000000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2097152</MatrixWidth>
        <MatrixHeight>2097152</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>22</ows:Identifier>
        <ScaleDenominator>133.2955990000000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4194304</MatrixWidth>
        <MatrixHeight>4194304</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>23</ows:Identifier>
        <ScaleDenominator>66.6477995000000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>8388608</MatrixWidth>
        <MatrixHeight>8388608</MatrixHeight>
      </TileMatrix>
      <TileMatrix>
        <ows:Identifier>24</ows:Identifier>
        <ScaleDenominator>33.3238997500000</ScaleDenominator>
        <TopLeftCorner>-20037508.342790000000 20037508.342790000000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>16777216</MatrixWidth>
        <MatrixHeight>16777216</MatrixHeight>
      </TileMatrix>
    </TileMatrixSet>
  </Contents>
</Capabilities>";

            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/xml";

            context.Response.Write(xmlContents);
        }
    }
}
