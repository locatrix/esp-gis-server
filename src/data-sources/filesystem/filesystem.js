import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import sqlite3 from 'sqlite3'
import { DataSource } from '../base.js'
import { FEATURES_FILE_REGEX, TILES_FILE_REGEX } from '../../util/patterns.js'
import { Queue } from './Queue.js'

/**
 * Implements a data source that reads data from the filesystem. Requires
 * the ESP_GIS_FOLDER env var to be set to a path pointing at the
 * folder that contains GeoPackages.
 * 
 * Rather than use any connection pooling, local I/O is assumed to be fast
 * enough to allow for DB access to be serialized via a queue per DB.
 */
export class FileSystemDataSource extends DataSource {
  /** @type {string} */
  packagePath

  /** @type {Queue<sqlite3.Database> | null} */
  tilesDbQueue = null

  /** @type {Queue<sqlite3.Database> | null} */
  featuresDbQueue = null

  /** @type {string | null} */
  currTilesPath = null

  /** @type {string | null} */
  currFeaturesPath = null

  constructor () {
    super()

    this.packagePath = process.env['ESP_GIS_FOLDER'] ?? process.env['PLANSIGHT_GIS_FOLDER']
    if (this.packagePath == null) {
      throw new Error(`
        filesystem data source doesn't have a folder path configured - check
        that ESP_GIS_FOLDER is set
      `)
    }

    const pathStats = fsSync.statSync(this.packagePath, { throwIfNoEntry: false })
    if (pathStats == null) {
      throw new Error(`the path pointed to by ESP_GIS_FOLDER does not exist`)
    }

    if (!pathStats.isDirectory()) {
      throw new Error(`the path pointed to by ESP_GIS_FOLDER is not a directory`)
    }
  }

  /**
   * @see {@link DataSource.checkForNewData}
   * @returns {Promise<void>}
   */
  async checkForNewData () {
    const contents = await fs.readdir(this.packagePath)

    let tilesFiles = []
    let featureFiles = []

    for (let fileName of contents) {
      if (TILES_FILE_REGEX.test(fileName)) {
        tilesFiles.push(fileName)
      }

      if (FEATURES_FILE_REGEX.test(fileName)) {
        featureFiles.push(fileName)
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
      throw new Error(`unable to find tiles GeoPackage in ESP_GIS_FOLDER`)
    }

    if (featuresFile == null) {
      throw new Error(`unable to find features GeoPackage in ESP_GIS_FOLDER`)
    }

    const tilesPath = path.join(this.packagePath, tilesFile)
    const featuresPath = path.join(this.packagePath, featuresFile)

    if (tilesPath === this.currTilesPath && featuresPath === this.currFeaturesPath) {
      // everything is still current, no need to do anything!
      return
    }

    console.log(`reading tiles from ${tilesPath} & ${featuresPath}`)

    if (this.tilesDbQueue != null) {
      this.tilesDbQueue.request(async (db) => {
        db.close()
        return db
      })
    }

    if (this.featuresDbQueue != null) {
      this.featuresDbQueue.request(async (db) => {
        db.close()
        return db
      })
    }

    this.tilesDbQueue = new Queue(new sqlite3.Database(tilesPath))
    this.featuresDbQueue = new Queue(new sqlite3.Database(featuresPath))
    this.currTilesPath = tilesPath
    this.currFeaturesPath = featuresPath
  }

  /**
   * @see {@link DataSource.queryTilesPackage}
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  async queryTilesPackage (sql, params) {
    if (this.tilesDbQueue == null) {
      throw new Error('FileSystemDataSource cannot be used before initial refresh')
    }

    let rows = []

    await this.tilesDbQueue.request(db => new Promise((resolve, reject) => {
      db.all(sql, params, (err, results) => {
        if (err) {
          console.error('DB error', err, sql, params)
          reject(err)
          return
        }

        rows = results
        resolve(db)
      })
    }))

    return rows
  }

  /**
   * @see {@link DataSource.queryFeaturePackage}
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  async queryFeaturePackage (sql, params) {
    if (this.featuresDbQueue == null) {
      throw new Error('FileSystemDataSource cannot be used before initial refresh')
    }

    let rows = []

    await this.featuresDbQueue.request(db => new Promise((resolve, reject) => {
      db.all(sql, params, (err, results) => {
        if (err) {
          console.error('DB error', err, sql, params)
          reject(err)
          return
        }

        rows = results
        resolve(db)
      })
    }))

    return rows
  }
}
