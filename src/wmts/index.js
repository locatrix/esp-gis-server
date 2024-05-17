import express from 'express'
import { asyncHandler } from '../util/asyncHandler.js'
import { wmtsGetCapabilities } from './getCapabilities.js'
import { wmtsGetTile } from './getTile.js'
import { wmtsProxy } from './proxy.js'
import { ROUTE_PREFIX } from '../util/serverUrl.js'

/**
 * @param {express.Express} app
 */
export function registerWmtsEndpoints (app) {
  app.get(ROUTE_PREFIX + '/wmts', asyncHandler(wmtsProxy))
  app.get(ROUTE_PREFIX + '/wmts/capabilities.xml', asyncHandler(wmtsGetCapabilities))
  app.get(ROUTE_PREFIX + '/wmts/:layer/capabilities.xml', asyncHandler(wmtsGetCapabilities))
  app.get(ROUTE_PREFIX + '/wmts/:layer/:tileMatrix/:tileCol/:tileRow.png', asyncHandler(wmtsGetTile))
}
