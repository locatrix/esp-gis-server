import express from 'express'
import { asyncHandler } from '../util/asyncHandler.js'
import { wfsProxy, wfsPostProxy } from './proxy.js'
import { URL_PREFIX } from '../util/serverUrl.js'

/**
 * @param {express.Express} app
 */
export function registerWfsEndpoints (app, urlPrefix) {
  app.get(URL_PREFIX + '/wfs', asyncHandler(wfsProxy))
  app.post(URL_PREFIX + '/wfs', asyncHandler(wfsPostProxy))
}
