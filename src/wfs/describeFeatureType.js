import express from 'express'
import { convert, create } from 'xmlbuilder2'
import { getCurrentDataSource } from '../data-sources/currentDataSource.js'
import { normalizeQueryParam } from '../util/params.js'
import { EXCLUDED_WFS_COLUMNS } from './excluded.js'
import { parseWfsParams } from './parseParams.js'

/**
 * Maps a set of sql columns into their respective feature properties.
 * 
 * @param {string} type sql column type
 * @param {string} colName sql column name 
 * @returns FeaturePropertyDescription of the column
 */
 function mapSqlTypesIntoFeatures (type, colName) {
  if (type === 'INTEGER' || type === 'REAL') {
      return { name: colName, maxOccurs: 1, minOccurs: 0, nillable: true, type: 'Number'}
  } else if (type == 'TEXT' || type.includes("VARCHAR")) {
      return { name: colName, maxOccurs: 1, minOccurs: 0, nillable: true, type: 'string'}
  } else if (colName == 'geom' && type == 'BLOB') {
      // This is geometric data, it should be returned as a Point type
      return { name: colName, maxOccurs: 1, minOccurs: 0, nillable: true, type: 'gml:PointPropertyType'}
  }
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function wfsDescribeFeatureType (req, res) {
  const dataSource = getCurrentDataSource()
  await dataSource.refresh(true)

  const columns = await dataSource.queryFeaturePackage(/* sql */`
    PRAGMA table_info(all_features)
  `)

  const featureTypes = columns
    .filter(c => !EXCLUDED_WFS_COLUMNS.has(c))
    .map(c => mapSqlTypesIntoFeatures(c.type, c.name))

  featureTypes.unshift(mapSqlTypesIntoFeatures('TEXT', 'viewerUrl'))

  const parsed = parseWfsParams(req, res)
  if (parsed == null) {
    return
  }

  const { typeNames } = parsed
  const mainFeatureType = typeNames[0]

  const obj = {
    'xsd:schema': {
      '@xmlns:wfs': "http://www.opengis.net/wfs/2.0",
      '@xmlns:gml': "http://www.opengis.net/gml/3.2",
      '@xmlns:xsd': "http://www.w3.org/2001/XMLSchema",
      'xsd:import': {
        '@namespace': "http://www.opengis.net/gml/3.2",
        '@schemaLocation': "http://www.opengis.net/gml/3.2", // convention would be for us to host this somewhere
      },
      'xsd:complexType': {
        '@name': `${mainFeatureType}Type`,
        'xsd:complexContent': {
          'xsd:extension': {
            '@base': "gml:AbstractFeatureType",
            'xsd:sequence': {
              '#': [
                ...featureTypes.map(feature => {
                  return {
                    'xsd:element': {
                      '@maxOccurs': feature.maxOccurs,
                      '@minOccurs': feature.minOccurs,
                      '@name': feature.name,
                      '@nillable': feature.nillable,
                      '@type': feature.type
                    }
                  }
                })
              ]
            }
          }
        }
      },
      'xsd:element': {
        '@name': mainFeatureType,
        '@substitutionGroup': 'gml:AbstractFeature',
        '@type': `LOCATRIX:${mainFeatureType}Type`
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


