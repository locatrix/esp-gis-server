import express from 'express'
import { asyncHandler } from '../util/asyncHandler.js'
import { wfsProxy, wfsPostProxy } from './proxy.js'
import { ROUTE_PREFIX } from '../util/serverUrl.js'

/**
 * @param {express.Express} app
 */
export function registerWfsEndpoints (app, urlPrefix) {
  app.get(ROUTE_PREFIX + '/wfs', asyncHandler(wfsProxy))
  app.post(ROUTE_PREFIX + '/wfs', asyncHandler(wfsPostProxy))
}
