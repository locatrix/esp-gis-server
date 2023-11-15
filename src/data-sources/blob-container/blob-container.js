import cheerio from 'cheerio'
import { DataSource } from '../base.js'
import { HttpDbPool } from '../../sqlite-http/HttpDbPool.js'
import { FEATURES_FILE_REGEX, TILES_FILE_REGEX } from '../../util/patterns.js'
import { MAX_SQLITE_FEATURES_CONNECTIONS, MAX_SQLITE_TILES_CONNECTIONS } from '../../sqlite-http/config.js'

/**
 * Implements a data source that reads data from Azure Blob Storage.
 * Requires the PLANSIGHT_GIS_BLOB_SAS_URL env var to be set to a URL
 * pointing at the container (or folder in a hierarchical namespace)
 * that contains GeoPackages.
 */
export class BlobContainerDataSource extends DataSource {
  /** @type {string} */
  sasUrl

  /** @type {HttpDbPool | null} */
  tilesDbPool = null

  /** @type {HttpDbPool | null} */
  featuresDbPool = null

  /** @type {string | null} */
  currTilesUrl = null

  /** @type {string | null} */
  currFeaturesUrl = null

  constructor () {
    super()

    this.sasUrl = process.env['PLANSIGHT_GIS_BLOB_SAS_URL']
    if (this.sasUrl == null) {
      throw new Error(`
        blob-container data source doesn't have a SAS URL configured - check
        that PLANSIGHT_GIS_BLOB_SAS_URL is set
      `)
    }
  }

  /**
   * @see {@link DataSource.checkForNewData}
   * @returns {Promise<void>}
   */
  async checkForNewData () {
    // construct a URL for listing the given container
    let listUrl = new URL(`${this.sasUrl}&restype=container&comp=list`)
    const pathParts = listUrl.pathname.split('/').slice(1)

    // typical containers only have one part of the path, with a URL like
    // https://something.core.windows.net/containername. If there's more than
    // a single part to the path, it means we're dealing with a container that
    // is using a hierarchical namespace.
    if (pathParts.length > 1) {
      // this is a hierarchical blob storage container, and we need to strip
      // the trailing parts and use them as a prefix parameter
      const prefix = pathParts.slice(1).join('/')
      listUrl = new URL(`${listUrl.protocol}//${listUrl.host}/${pathParts[0]}${listUrl.search}&prefix=${prefix}`)
    }

    const listResp = await fetch(listUrl)
    if (listResp.status !== 200) {
      throw new Error('unable to list blob container/directory')
    }

    const listRespXml = await listResp.text()
    const $ = cheerio.load(listRespXml, { xmlMode: true })

    let tilesFiles = []
    let featureFiles = []
    
    for (let blob of $('Blob').toArray()) {
      const name = $('Name', blob).first().text()
      const resourceType = $('ResourceType', blob).first().text()

      if (resourceType !== 'file') {
        continue
      }

      if (TILES_FILE_REGEX.test(name)) {
        tilesFiles.push(name)
      }

      if (FEATURES_FILE_REGEX.test(name)) {
        featureFiles.push(name)
      }
    }

    // this is crude but works - because we enforce YYYYMMDD.gpkg as the ending
    // for files in the regexes, we can slice off the last 13 characters of the
    // filename and sort them and leverage the sorting of the YYYYMMMDD text.
    tilesFiles.sort((a, b) => b.slice(b.length - 13).localeCompare(a.slice(a.length - 13)))
    featureFiles.sort((a, b) => b.slice(b.length - 13).localeCompare(a.slice(a.length - 13)))

    const tilesFile = tilesFiles[0]
    const featuresFile = featureFiles[0]

    if (tilesFile == null) {
      throw new Error(`unable to find tiles GeoPackage in blob container`)
    }

    if (featuresFile == null) {
      throw new Error(`unable to find features GeoPackage in blob container`)
    }

    const baseUrl = new URL(this.sasUrl)
    const container = baseUrl.pathname.split('/')[1]

    const tilesUrl = `${baseUrl.protocol}//${baseUrl.host}/${container}/${tilesFile}${baseUrl.search}`
    const featuresUrl = `${baseUrl.protocol}//${baseUrl.host}/${container}/${featuresFile}${baseUrl.search}`

    if (tilesUrl === this.currTilesUrl && featuresUrl === this.currFeaturesUrl) {
      // everything is still current, no need to do anything!
      return
    }

    console.log(`reading tiles from ${tilesUrl} & ${featuresUrl}`)

    if (this.tilesDbPool != null) {
      this.tilesDbPool.dispose()
      this.tilesDbPool = null
    }

    if (this.featuresDbPool != null) {
      this.featuresDbPool.dispose()
      this.featuresDbPool = null
    }

    this.tilesDbPool = new HttpDbPool(tilesUrl, MAX_SQLITE_TILES_CONNECTIONS)
    this.featuresDbPool = new HttpDbPool(featuresUrl, MAX_SQLITE_FEATURES_CONNECTIONS)
    this.currTilesUrl = tilesUrl
    this.currFeaturesUrl = featuresUrl
  }

  /**
   * @see {@link DataSource.queryTilesPackage}
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  async queryTilesPackage (sql, params) {
    if (this.tilesDbPool == null) {
      throw new Error('BlobContainerDataSource cannot be used before initial refresh')
    }

    const conn = await this.tilesDbPool.retainDbConnection()

    try {
      let rows = []
      await conn.sqlite3.execParams(conn.db, sql, params || {}, (rowArr, columnsArr) => {
        let row = {}
        for (let i = 0; i < columnsArr.length; ++i) {
          row[columnsArr[i]] = rowArr[i]
        }

        rows.push(row)
      })
      return rows
    } finally {
      this.tilesDbPool.releaseDbConnection(conn)
    }
  }

  /**
   * @see {@link DataSource.queryFeaturesPackage}
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  async queryFeaturePackage (sql, params) {
    if (this.featuresDbPool == null) {
      throw new Error('BlobContainerDataSource cannot be used before initial refresh')
    }

    const conn = await this.featuresDbPool.retainDbConnection()

    try {
      let rows = []
      await conn.sqlite3.execParams(conn.db, sql, params || {}, (rowArr, columnsArr) => {
        let row = {}
        for (let i = 0; i < columnsArr.length; ++i) {
          row[columnsArr[i]] = rowArr[i]
        }

        rows.push(row)
      })
      return rows
    } finally {
      this.featuresDbPool.releaseDbConnection(conn)
    }
  }
}
