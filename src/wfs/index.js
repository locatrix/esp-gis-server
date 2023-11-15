import express from 'express'
import { asyncHandler } from '../util/asyncHandler.js'
import { wfsProxy, wfsPostProxy } from './proxy.js'

/** @param {express.Express} app */
export function registerWfsEndpoints (app) {
  app.get('/wfs', asyncHandler(wfsProxy))
  app.post('/wfs', asyncHandler(wfsPostProxy))
}
