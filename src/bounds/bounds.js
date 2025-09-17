import express from 'express'
import { getDataBounds } from '../util/bounds.js'

/**
 * Returns the bounds of the data hosted by the server.
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function getBounds (req, res) {
  const bounds = await getDataBounds()

  res.status(200)
  res.set('Content-Type', 'application/json')
  res.send(JSON.stringify(bounds, null, 2))
}
