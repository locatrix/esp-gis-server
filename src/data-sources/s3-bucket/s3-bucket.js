import cheerio from 'cheerio'
import { performance } from 'node:perf_hooks'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { DataSource } from '../base.js'
import { HttpDbPool } from '../../sqlite-http/HttpDbPool.js'
import { FEATURES_FILE_REGEX, TILES_FILE_REGEX } from '../../util/patterns.js'
import { MAX_SQLITE_FEATURES_CONNECTIONS, MAX_SQLITE_TILES_CONNECTIONS } from '../../sqlite-http/config.js'

/**
 * Implements a data source that reads data from Amazon S3. Requires the
 * ESP_GIS_S3_URI env vars to be set to identify which bucket/folder
 * within a bucket contains the GeoPackages. Also requires standard AWS env
 * vars to be set to identify the region/access key/secret key.
 */
export class S3BucketDataSource extends DataSource {
  /** @type {string} */
  s3Uri

  /** @type {S3Client} */
  s3Client

  /** @type {HttpDbPool | null} */
  tilesDbPool = null

  /** @type {HttpDbPool | null} */
  featuresDbPool = null

  /** @type {string | null} */
  currTilesFile = null

  /** @type {string | null} */
  currFeaturesFile = null

  /** @type {number | null} */
  currDbCreationTime = 0

  constructor () {
    super()

    this.s3Uri = process.env['ESP_GIS_S3_URI'] ?? process.env['PLANSIGHT_GIS_S3_URI']
    if (this.s3Uri == null) {
      throw new Error(`
        s3-bucket data source doesn't have a URI configured - check
        that ESP_GIS_S3_URI is set
      `)
    }

    const url = new URL(this.s3Uri)
    if (url.protocol !== 's3:') {
      throw new Error(`
        s3-bucket data source doesn't have a valid s3:// URI configured -
        check ESP_GIS_S3_URI
      `) 
    }

    this.s3Client = new S3Client()
  }

  /**
   * @see {@link DataSource.checkForNewData}
   * @returns {Promise<void>}
   */
  async checkForNewData () {
    const { host, pathname } = new URL(this.s3Uri)
    const bucket = host
    const prefix = pathname.slice(1) // drop leading slash
    
    /** @type {import('@aws-sdk/client-s3').ListObjectsV2CommandInput} */
    let commandInput = {
      Bucket: bucket
    }

    if (prefix !== '') {
      commandInput.Prefix = prefix
    }

    const command = new ListObjectsV2Command(commandInput)
    const resp = await this.s3Client.send(command)

    let tilesFiles = []
    let featureFiles = []
    
    for (let obj of resp.Contents) {
      const name = obj.Key

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
      throw new Error(`unable to find tiles GeoPackage in s3 bucket`)
    }

    if (featuresFile == null) {
      throw new Error(`unable to find features GeoPackage in s3 bucket`)
    }

    // we check the curr DB creation time so that we can re-create the AWS
    // signed URLs periodically. these URLs have a maximum lifetime of 7 days
    // so if there's no new files then they would time out. we re-create the
    // URLs/DBs every 1 day.
    if (
      performance.now() < this.currDbCreationTime + 1000 * 60 * 60 * 24 &&
      tilesFile === this.currTilesFile &&
      featuresFile === this.currFeaturesFile
    ) {
      // everything is still current, no need to do anything!
      return
    }

    console.log(`reading tiles from ${tilesFile} & ${featuresFile}`)

    if (this.tilesDbPool != null) {
      this.tilesDbPool.dispose()
      this.tilesDbPool = null
    }

    if (this.featuresDbPool != null) {
      this.featuresDbPool.dispose()
      this.featuresDbPool = null
    }

    const tilesGetCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: tilesFile
    })

    const featuresGetCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: featuresFile
    })

    const tilesUrl = await getSignedUrl(this.s3Client, tilesGetCommand, {
      expiresIn: 60 * 60 * 24 * 2 // two days validity
    })

    const featuresUrl = await getSignedUrl(this.s3Client, featuresGetCommand, {
      expiresIn: 60 * 60 * 24 * 2 // two days validity
    })

    this.tilesDbPool = new HttpDbPool(tilesUrl, MAX_SQLITE_TILES_CONNECTIONS)
    this.featuresDbPool = new HttpDbPool(featuresUrl, MAX_SQLITE_FEATURES_CONNECTIONS)
    this.currTilesUrl = tilesUrl
    this.currFeaturesUrl = featuresUrl
    this.currDbCreationTime = performance.now()
  }

  /**
   * @see {@link DataSource.queryTilesPackage}
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  async queryTilesPackage (sql, params) {
    if (this.tilesDbPool == null) {
      throw new Error('S3BucketDataSource cannot be used before initial refresh')
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
    } catch (err) {
      console.error('DB error', err, sql, params)
      throw err
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
      throw new Error('S3BucketDataSource cannot be used before initial refresh')
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
    } catch (err) {
      console.error('DB error', err, sql, params)
      throw err
    } finally {
      this.featuresDbPool.releaseDbConnection(conn)
    }
  }
}
