import express from 'express'
import { wmtsGetCapabilities } from './getCapabilities.js'
import { wmtsGetTile } from './getTile.js'

/**
 * Acts as a proxy and forwards the incoming HTTP requests to the appropriate endpoint based on the request type.
 * Conforms to OpenGIS Web Map Tile Service Implementation Standard V1.0.0 
 * @param {express.Request} req
 * @param {express.Response} res
 */
export function wmtsProxy (req, res) {
  switch (req.query.request) {
    case 'GetTile':
      return wmtsGetTile(req, res)

    case 'GetCapabilities':
    default:
      return wmtsGetCapabilities(req, res)
  }
}
