import express from 'express'
import cheerio from 'cheerio'
import { wfsDescribeFeatureType } from './describeFeatureType.js'
import { wfsGetCapabilities } from './getCapabilities.js'
import { wfsGetFeature } from './getFeature.js'

/**
 * Acts as a proxy and forwards the incoming HTTP requests to the appropriate endpoint based on the request type.
 * @param {express.Request} req
 * @param {express.Response} res
 */
export function wfsProxy (req, res) {
  switch (req.query.request) {
    case 'GetFeature':
      return wfsGetFeature(req, res)

    case 'DescribeFeatureType':
      return wfsDescribeFeatureType(req, res)

    case 'GetCapabilities':
    default:
      return wfsGetCapabilities(req, res)
  }
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export function wfsPostProxy (req, res) {
  if (
    typeof req.body !== 'string' ||
    (req.headers['content-type'] !== 'text/xml' && req.headers['content-type'] !== 'application/xml')
  ) {
    res.status(200)
    res.set('Content-Type', 'text/plain')
    res.send('Invalid body')
    return
  }

  const $ = cheerio.load(req.body, { xmlMode: true })

  const getFeature = $('GetFeature')[0]
  if (getFeature != null) {
    // pretend this is a GET request by editing the request
    // object's query string
    for (let key of Object.keys(getFeature.attribs)) {
      if (key.startsWith('xmlns')) {
        continue
      }

      req.query[key.toLowerCase()] = getFeature.attribs[key]
    }

    const query = $('Query', getFeature)[0]
    if (query != null) {  
      for (let key of Object.keys(query.attribs)) {
        req.query[key.toLowerCase()] = query.attribs[key]
      }

      // and now hand this over to the GetFeature handler
      return wfsGetFeature(req, res)
    }
  }

  res.status(404)
  res.set('Content-Type', 'text/plain')
  res.send('Unable to parse body into a valid request')
  return Promise.resolve()
}
