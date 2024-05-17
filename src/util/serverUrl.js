import express from 'express'

// when hosting with iisnode, it's typical to want to nest the server under a
// virtual directory. this means we need to prefix all of the paths given to
// express to make sure our routing works.
//
// example config: ESP_GIS_URL_PREFIX="/path/to/app"
const URL_PREFIX = process.env.ESP_GIS_URL_PREFIX ?? process.env.PLANSIGHT_GIS_URL_PREFIX ?? ''

export function accessTokensEnabled () {
  return (process.env.ESP_GIS_ACCESS_TOKEN_1 != null && process.env.ESP_GIS_ACCESS_TOKEN_1 !== '') ||
    (process.env.ESP_GIS_ACCESS_TOKEN_2 != null && process.env.ESP_GIS_ACCESS_TOKEN_2 !== '')
}

export const ROUTE_PREFIX = accessTokensEnabled() ? `${URL_PREFIX}/:accessToken` : URL_PREFIX

/**
 * @param {express.Request} req
 */
export function getServerUrl (req) {
  const protocol = process.env.ESP_GIS_PROTOCOL ?? process.env.PLANSIGHT_GIS_PROTOCOL ?? req.protocol

  let serverUrl = `${protocol}://${req.get('host')}${URL_PREFIX}`
  if (accessTokensEnabled()) {
    serverUrl += `/${req.params.accessToken}`
  }

  return serverUrl
}

/**
 * @param {express.Request} req
 */
export function checkToken (req) {
  if (!accessTokensEnabled()) {
    return true
  }

  return (process.env.ESP_GIS_ACCESS_TOKEN_1 != null && process.env.ESP_GIS_ACCESS_TOKEN_1 !== '' && req.url.includes(process.env.ESP_GIS_ACCESS_TOKEN_1)) ||
    (process.env.ESP_GIS_ACCESS_TOKEN_2 != null && process.env.ESP_GIS_ACCESS_TOKEN_2 !== '' && req.url.includes(process.env.ESP_GIS_ACCESS_TOKEN_2))
}

