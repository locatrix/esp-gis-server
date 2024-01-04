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
import { URL_PREFIX } from './util/serverUrl.js'

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
  console.info(req.method, req.protocol, req.hostname, req.originalUrl, req.body)
  next();
})

registerWmtsEndpoints(app)
registerWfsEndpoints(app)
app.get(URL_PREFIX + '/coverage/:tileMatrix/:tileCol/:tileRow', asyncHandler(getCoverage))

app.get(URL_PREFIX + '/viewer', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'viewer/viewer.html'))
})

app.use(URL_PREFIX + '/viewer-public', express.static(path.join(__dirname, 'viewer/public')))

getCurrentDataSource().refresh(true).then(() => {
  app.listen(port, () => {
    console.log(`Listening for HTTP on port ${port}`)
  })
})

