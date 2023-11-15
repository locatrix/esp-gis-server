import express from 'express'
import { asyncHandler } from '../util/asyncHandler.js'
import { wmtsGetCapabilities } from './getCapabilities.js'
import { wmtsGetTile } from './getTile.js'
import { wmtsProxy } from './proxy.js'

/** @param {express.Express} app */
export function registerWmtsEndpoints (app) {
  app.get('/wmts', asyncHandler(wmtsProxy))
  app.get('/wmts/capabilities.xml', asyncHandler(wmtsGetCapabilities))
  app.get('/wmts/:layer/capabilities.xml', asyncHandler(wmtsGetCapabilities))
  app.get('/wmts/:layer/:tileMatrix/:tileCol/:tileRow.png', asyncHandler(wmtsGetTile))
}
