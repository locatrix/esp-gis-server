import { performance } from 'node:perf_hooks'

const CHECK_INTERVAL_SECONDS = 60

/**
 * Base class for data sources - don't directly instantiate this.
 */
export class DataSource {
  constructor () {
    this.lastRefreshTime = 0
    this.refreshPromise = null
  }

  /**
   * Refreshes the data source's data, ensuring that it has a chance to look
   * for more up-to-date data.
   * 
   * @param {boolean} force whether to force a check for new data. if false,
   *   checks will occur every CHECK_INTERVAL_SECONDS.
   * @returns {Promise<void>}
   */
  refresh (force) {
    // if we're already refreshing, just return that promise
    if (this.refreshPromise != null) {
      return this.refreshPromise
    }

    // we're not refreshing, kick one off if needed
    const timeSinceLastRefreshMs = performance.now() - this.lastRefreshTime
    if (force || timeSinceLastRefreshMs > CHECK_INTERVAL_SECONDS * 1000) {
      this.lastRefreshTime = performance.now()
      this.refreshPromise = this.checkForNewData().then(() => {
        this.refreshPromise = null
      })

      return this.refreshPromise
    }

    // not refreshing and no need to check yet, so just do nothing!
    return Promise.resolve()
  }

  /**
   * To be implemented by subclasses. Called by `refresh()` to check for new
   * data. Returns a promise that should resolve once checking has completed.
   * @returns {Promise<void>}
   */
  checkForNewData () {
    throw new Error('checkForNewData not implemented')
  }

  /**
   * To be implemented by subclasses. Should execute the given SQL query
   * against the current tiles package, including any provided parameters
   * for the query. Results are returned as an array of objects whose keys
   * correspond to selected columns.
   * 
   * Example:
   * 
   *    const rows = await queryTilesPackage(
   *      'SELECT * FROM all_tiles WHERE tileset = $tileSet',
   *      { $tileSet: 'LocatrixESPCoverage' }
   *    )
   * 
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  queryTilesPackage (sql, params) {
    throw new Error('queryTilesPackage not implemented')
  }

  /**
   * To be implemented by subclasses. Should execute the given SQL query
   * against the current features package, including any provided parameters
   * for the query. Results are returned as an array of objects whose keys
   * correspond to selected columns.
   * 
   * Example:
   * 
   *    const rows = await queryFeaturePackage(
   *      'SELECT * FROM all_features WHERE featureset = $featureSet',
   *      { $featureSet: 'plans' }
   *    )
   * 
   * @param {string} sql
   * @param {any} params
   * @returns {Promise<Array<any>>}
   */
  queryFeaturePackage (sql, params) {
    throw new Error('queryFeaturePackage not implemented')
  }
}
