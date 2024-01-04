import express from 'express'

// when hosting with iisnode, it's typical to want to nest the server under a
// virtual directory. this means we need to prefix all of the paths given to
// express to make sure our routing works.
//
// example config: ESP_GIS_URL_PREFIX="/path/to/app"
export const URL_PREFIX = process.env.ESP_GIS_URL_PREFIX ?? process.env.PLANSIGHT_GIS_URL_PREFIX ?? ''

/**
 * @param {express.Request} req
 */
export function getServerUrl (req) {
  const protocol = process.env.ESP_GIS_PROTOCOL ?? process.env.PLANSIGHT_GIS_PROTOCOL ?? req.protocol
  return `${protocol}://${req.get('host')}${URL_PREFIX}`
}

