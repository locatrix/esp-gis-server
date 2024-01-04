import express from 'express'
import { convert, create } from 'xmlbuilder2'
import { getCurrentDataSource } from '../data-sources/currentDataSource.js'
import { CONTACT_PERSON, CONTACT_ROLE } from '../util/contactDetails.js'
import { getServerUrl } from '../util/serverUrl.js'

const WFS_SERVER_OPERATIONS = [
  {
    name: "GetCapabilities",
    parameters: [
      { name: "AcceptVersions", values: ['1.0.0', '1.1.0', '2.0.0'] },
    ]
  },
  {
    name: "DescribeFeatureType",
    parameters: [{ name: "outputFormat", values: ['application/gml+xml; version=3.2'] }]

  },
  {
    name: "GetFeature",
    parameters: [
      { name: "resultType", values: ['results', 'hits'] },
      {
        name: "outputFormat", values: [
          'application/gml+xml; version=3.2',
          'GML2',
          'text/xml; subtype=gml/3.2',
          'GEOJSON'
        ]
      }
    ]
  }
]

const WFS_SERVER_CONSTRAINTS = [
  { name: 'KVPEncoding', defaultValue: 'TRUE' },
  { name: 'XMLEncoding', defaultValue: 'TRUE' },
  { name: 'SOAPEncoding', defaultValue: 'FALSE' }
]

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function wfsGetCapabilities(req, res) {
  const dataSource = getCurrentDataSource()
  await dataSource.refresh(true)

  const rows = await dataSource.queryFeaturePackage(/* sql */`
    SELECT DISTINCT featureset
    FROM all_features
  `)

  const featureSets = rows.map(r => r.featureset).sort()

  const obj = {
    'wfs:WFS_Capabilities': {
      '@version': '2.0.0',
      '@xmlns:wfs': 'http://www.opengis.net/wfs/2.0',
      '@xmlns:ows': 'http://www.opengis.net/ows/1.1',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xmlns:gml': 'http://www.opengis.net/gml',
      '@xsi:schemaLocation': 'http://www.opengis.net/wfs/2.0 https://schemas.opengis.net/wfs/2.0/wsdl/wfs.xsd',
      '@xmlns:fes': 'http://www.opengis.net/fes/2.0',

      'ows:ServiceIdentification': {
        'ows:Title': 'Locatrix WFS Server Demo',
        'ows:Abstract': 'Locatrix Server Demo',
        'ows:Keywords': {
          'ows:Keyword': 'WFS',
        },
        'ows:ServiceType': 'OGC WFS',
        'ows:ServiceTypeVersion': '2.0.0',
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

      'ows:OperationsMetadata': {
        '#': [
          ...WFS_SERVER_OPERATIONS.map(operation => {
            return {
              'ows:Operation': {
                '@name': `${operation.name}`,
                'ows:DCP': {
                  'ows:HTTP': {
                    'ows:Get': {
                      '@xlink:href': `${getServerUrl(req)}/wfs?`
                    },
                    'ows:Post': {
                      '@xlink:href': `${getServerUrl(req)}/wfs`
                    }
                  }
                },
                '#': [
                  operation.parameters.map(param => {
                    return {
                      'ows:Parameter': {
                        '@name': `${param.name}`,
                        'ows:AllowedValues': {
                          '#': [
                            param.values.map(value => {
                              return {
                                'ows:Value': `${value}`
                              }
                            })
                          ]
                        }
                      }
                    }
                  })
                ]
              }
            }
          }
          ),
          ...WFS_SERVER_CONSTRAINTS.map(constraint => {
            return {
              'ows:Constraint': {
                '@name': `${constraint.name}`,
                'ows:NoValues': {},
                'ows:DefaultValue': `${constraint.defaultValue}`
              }
            }
          })
        ]
      },

      'wfs:FeatureTypeList': {
        '#': [
          ...featureSets.map(fs => {
            return {
              'wfs:FeatureType': {
                'wfs:Name': fs, // can be used to display graphical names
                'wfs:Title': fs,
                'wfs:DefaultCRS': 'urn:ogc:def:crs:EPSG::3857', // this is just from the example
                'ows:WGS84BoundingBox': {
                  'ows:LowerCorner': '113.503234326 -43.280603544',
                  'ows:UpperCorner': '153.650786054 -12.274432464'
                }
              }
            }
          })
        ]
      },
      'fes:Filter_Capabilities': {
        'fes:Conformance': {
          'ows:Constraint': {
            '@name': `ImplementsQuery`,
            'ows:NoValues': {},
            'ows:DefaultValue': `TRUE`
          }
        },
        'fes:Spatial_Capabilities': {
          'fes:GeometryOperands': {
            '@xmlns:gml': 'http://www.opengis.net/gml',
            '@xmlns:gml32': 'http://www.opengis.net/gml',
            'fesGeometryOperand': {
              '@name': "gml:Box" // note you can add other geometry but we will start with the box
            }
          },
          'fes:SpatialOperators': {
            'fes:SpatialOperator': {
              '@name': 'BBOX'
            }
          }
        }
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


