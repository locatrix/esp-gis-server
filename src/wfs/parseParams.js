import express from 'express'
import { normalizeQueryParam } from '../util/params.js'

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export function parseWfsParams (req, res) {
  /** @type {string[]} */
  let typeNames = []
  if (req.query.typenames != null) {
    const normalizedTypenames = normalizeQueryParam(req.query.typenames)
    typeNames = normalizedTypenames.includes(',') ? normalizedTypenames.split(',') : [normalizedTypenames]
  } else if (req.query.typename != null) {
    typeNames = [normalizeQueryParam(req.query.typename)]
  }

  typeNames = typeNames.map(tn => {
    // ESRI likes to include a colon for a global namespace, which we need to omit
    if (tn.startsWith(':')) {
      tn = tn.slice(1)
    }

    return tn
  })

  if (typeNames.length === 0) {
    res.status(400)
    res.set('Content-Type', 'text/plain')
    res.send('Invalid/missing typename or typenames parameter')
    return null
  }

  let bbox = null
  if (req.query.bbox != null) {
    const bboxParam = normalizeQueryParam(req.query.bbox)
    if (!bboxParam.includes(',')) {
      res.status(400)
      res.set('Content-Type', 'text/plain')
      res.send('Invalid bbox parameter')
      return null
    }

    const bboxParts = bboxParam.split(',')
    if (bboxParts.length === 5) {
      if (bboxParts[4] !== 'urn:ogc:def:crs:EPSG::3857') {
        res.status(400)
        res.set('Content-Type', 'text/plain')
        res.send('Unsupported bbox CRS')
        return null 
      }

      bboxParts.pop()
    }

    bbox = bboxParts.map(p => parseFloat(p))
    if (bbox.length !== 4) {
      res.status(400)
      res.set('Content-Type', 'text/plain')
      res.send('Invalid bbox parameter (too many values)')
      return null
    }
    
    if (bbox.find(b => Number.isNaN(b)) != null) {
      res.status(400)
      res.set('Content-Type', 'text/plain')
      res.send('Invalid bbox parameter (unable to parse value)')
      return null
    }
  }

  let outputFormat = null
  if (req.query.outputformat != null) {
    outputFormat = req.query.outputformat

    if (outputFormat !== 'GEOJSON') {
      res.status(400)
      res.set('Content-Type', 'text/plain')
      res.send('Invalid outputformat')
      return null
    }
  }

  let count = null
  if (req.query.count != null) {
    count = parseInt(req.query.count.toString())
    if (count < 0 || Number.isNaN(count)) {
      res.status(400)
      res.set('Content-Type', 'text/plain')
      res.send('Invalid count')
      return null
    }
  }

  return {
    typeNames,
    bbox,
    outputFormat,
    count
  }
}
