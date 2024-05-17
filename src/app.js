import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import path from 'node:path'
import url from 'node:url'
import { getCurrentDataSource } from './data-sources/currentDataSource.js'
import { registerWfsEndpoints } from './wfs/index.js'
import { registerWmtsEndpoints } from './wmts/index.js'
import { asyncHandler } from './util/asyncHandler.js'
import { getCoverage } from './coverage/coverage.js'
import { accessTokensEnabled, checkToken, getServerUrl, ROUTE_PREFIX } from './util/serverUrl.js'

// monkey-patch the global console object to configure log levels.
// the log level hierarchy is:
//
//   debug   (console.debug --> stdout)
//   info    (console.info  --> stdout)
//   log     (console.log   --> stdout)
//   warn    (console.warn  --> stderr)
//   error   (console.error --> stderr)
//
// so if you set ESP_GIS_LOG_LEVEL="debug" then you get all of
// the log levels, but if you set ESP_GIS_LOG_LEVEL="log" then
// you only get console.log/console.warn/console.error logs.
const logLevels = ['debug', 'info', 'log', 'warn', 'error']
const currLogLevel = process.env.ESP_GIS_LOG_LEVEL ?? process.env.PLANSIGHT_GIS_LOG_LEVEL ?? 'log'
if (!logLevels.includes(currLogLevel)) {
  throw new Error(`invalid log level: ${currLogLevel}`)
}

const consoleOrig = console
global.console = {
  ...global.console,
  debug: (...args) => {
    if (logLevels.indexOf(currLogLevel) <= logLevels.indexOf('debug')) {
      consoleOrig.debug(...args)
    }
  },
  info: (...args) => {
    if (logLevels.indexOf(currLogLevel) <= logLevels.indexOf('info')) {
      consoleOrig.info(...args)
    }
  },
  log: (...args) => {
    if (logLevels.indexOf(currLogLevel) <= logLevels.indexOf('log')) {
      consoleOrig.log(...args)
    }
  },
  warn: (...args) => {
    if (logLevels.indexOf(currLogLevel) <= logLevels.indexOf('warn')) {
      consoleOrig.warn(...args)
    }
  },
  error: (...args) => {
    if (logLevels.indexOf(currLogLevel) <= logLevels.indexOf('error')) {
      consoleOrig.error(...args)
    }
  }
};

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const app = express()
const port = process.env.PORT ?? 3000

app.enable('trust proxy')
app.disable('etag')

app.use(cors())
app.use(bodyParser.text({ type: ['text/xml', 'application/xml'] }))

// authentication middleware. we can optionally configure the server to require
// a token to be provided, which if set will be
app.use((req, res, next) => {
  if (!checkToken(req)) {
    res.status(401)
    res.set('Content-Type', 'text/plain')
    res.send('401 Unauthorized')
  } else {
    next()
  }
})

// middleware to normalize all query string params to lowercase
app.use((req, res, next) => {
  const keys = Object.keys(req.query)

  for (let key of keys) {
    const val = req.query[key]
    delete req.query[key]
    req.query[key.toLowerCase()] = val
  }

  next()
})

app.use((req, res, next) => {
  let url = req.originalUrl

  if (accessTokensEnabled()) {
    if (process.env.ESP_GIS_ACCESS_TOKEN_1 != null && process.env.ESP_GIS_ACCESS_TOKEN_1 !== '') {
      url = url.replace(process.env.ESP_GIS_ACCESS_TOKEN_1, '<redacted>')
    }
    
    if (process.env.ESP_GIS_ACCESS_TOKEN_2 != null && process.env.ESP_GIS_ACCESS_TOKEN_2 !== '') {
      url = url.replace(process.env.ESP_GIS_ACCESS_TOKEN_2, '<redacted>')
    }
  }

  console.info(req.method, req.protocol, req.hostname, url, req.body)
  next();
})

registerWmtsEndpoints(app)
registerWfsEndpoints(app)
app.get(ROUTE_PREFIX + '/coverage/:tileMatrix/:tileCol/:tileRow', asyncHandler(getCoverage))

app.get(ROUTE_PREFIX + '/viewer', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'viewer/viewer.html'))
})

app.use(ROUTE_PREFIX + '/viewer-public', express.static(path.join(__dirname, 'viewer/public')))

app.get(ROUTE_PREFIX + '/', (req, res) => {
  res.status(200)
  res.set('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>ESP GIS Server</title>
  </head>
  <body>
    <h1>ESP GIS Server version ${process.env.npm_package_version}</h1>
    <h2><a href="${getServerUrl(req)}/viewer">Online Map Viewer</a></h2>
    <h2><a href="${getServerUrl(req)}/wfs">WFS Endpoint</a></h2>
    <h2><a href="${getServerUrl(req)}/wmts/capabilities.xml">WMTS Endpoint (all layers)</a></h2>
    <p>Per-layer WMTS endpoints can be accessed by visiting the Map Viewer and clicking the "Copy WMTS URL" button.</p>
  </body>
</html>
`)
})

getCurrentDataSource().refresh(true).then(() => {
  app.listen(port, () => {
    console.log(`Listening for HTTP on port ${port}`)

    if (accessTokensEnabled()) {
      console.log(`Access tokens are enabled.`)
    }
  })
})

