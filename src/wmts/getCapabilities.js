import express from 'express'
import { convert, create } from 'xmlbuilder2'
import { getCurrentDataSource } from '../data-sources/currentDataSource.js'
import { CONTACT_PERSON, CONTACT_ROLE } from '../util/contactDetails.js'
import { getServerUrl } from '../util/serverUrl.js'

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function wmtsGetCapabilities (req, res) {
  const dataSource = getCurrentDataSource()
  await dataSource.refresh(true)

  const rows = await dataSource.queryTilesPackage(/* sql */`
    SELECT identifier, table_name
    FROM gpkg_contents
    WHERE data_type = 'tiles'
  `)

  let renderedLayers = rows.map(t => { return { name: t.identifier, safeName: t.table_name }}).sort()

  // allow scoping the capabilities down if a layer name is given in the URL,
  // which helps work around issues with some map viewers lagging badly when
  // all layers are included.
  if (req.params.layer !== null) {
    renderedLayers = renderedLayers.filter(l => l.safeName === req.params.layer)
  }

  const googleTileSetMatrixXmlStr = `
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
  `
  const googleTileSetMatrixXml = convert(googleTileSetMatrixXmlStr, { format: 'object' })


  const obj = {
    'Capabilities@http://www.opengis.net/wmts/1.0': {
      '@xmlns:ows': 'http://www.opengis.net/ows/1.1',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xmlns:gml': 'http://www.opengis.net/gml',
      '@xsi:schemaLocation': 'http://www.opengis.net/wmts/1.0 http://schemas.opengis.net/wmts/1.0/wmtsGetCapabilities_response.xsd',
      '@version': '1.0.0',

      'ows:ServiceIdentification': {
        'ows:Title': 'Locatrix WMTS Server Demo',
        'ows:Abstract': 'Locatrix Server Demo',
        'ows:Keywords': {
          'ows:Keyword': 'WMTS',
        },
        'ows:ServiceType': 'OGC WMTS',
        'ows:ServiceTypeVersion': '1.0.0',
        'ows:Fees': 'NONE',
        'ows:AccessConstraints': 'NOT FOR PUBLIC USE.'
      },

      'ows:ServiceProvider': {
        'ows:ProviderName': 'Locatrix',
        'ows:ProviderSite': {
          '@xlink:href': 'https://www.locatrix.com'
        },
        'ows:ServiceContact': {
          'ows:IndividualName': CONTACT_PERSON,
          'ows:PositionName': CONTACT_ROLE,
          'ows:ContactInfo': {
            'ows:Phone': {
              'ows:Voice': '+61 1300 738 461'
            },
            'ows:Address': {
              'ows:DeliveryPoint': 'Level 1, Unit 12 / 3908 Pacific Highway',
              'ows:City': 'Loganholme',
              'ows:AdministrativeArea': 'QLD',
              'ows:PostalCode': '4129',
              'ows:Country': 'Australia',
              'ows:ElectronicMailAddress': 'info@locatrix.com'
            }
          }
        }
      },

      'Contents': {
        '#': [
          ...renderedLayers.map(ts => {
            return {
              'Layer': {
                'ows:Title': `Locatrix ESP - ${ts.name}`,
                'ows:Identifier': ts.name,
                'ows:Keywords': null,
                'ows:WGS84BoundingBox': {
                  'ows:LowerCorner': '113.503234326 -43.280603544',
                  'ows:UpperCorner': '153.650786054 -12.274432464'
                },
                'Style': {
                  '@isDefault': 'true',

                  'ows:Identifier': 'default'
                },
                'Format': 'image/png',
                'TileMatrixSetLink': {
                  'TileMatrixSet': 'GoogleMapsCompatibleExt:epsg:3857'
                },
                'ResourceURL': {
                  '@format': 'image/png',
                  '@resourceType': 'tile',
                  '@template': `${getServerUrl(req)}/${ts.safeName}/{TileMatrix}/{TileCol}/{TileRow}.png`
                }
              }
            }
          }),
          googleTileSetMatrixXml
        ]
      }
    }
  }

  const root = create({ version: '1.0' }).ele(obj)

  // convert the XML tree to string
  const xml = root.end({ prettyPrint: true })

  res.set('Content-Type', 'text/xml')
  res.status(200)
  res.send(xml)
}


