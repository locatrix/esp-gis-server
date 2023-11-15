import * as SQLite from './sqlite-api.js'
import { makePromiseHelper } from './promiseHelper.js'
import { HttpVFS, HttpVFSClient, VFS_DB_NAME } from './HttpVFS.js'
import { MAX_SQLITE_CONNECTION_CACHE_SIZE_MB } from './config.js'

export class HttpDbPool {
  /**
   * @param {string} dbUrl
   * @param {number} maxConnections
   */
  constructor(dbUrl, maxConnections) {
    this.dbUrl = dbUrl
    this.maxConnections = maxConnections
    this.freeConnections = []
    this.pendingRequests = []
    this.numConnections = 0
    this.client = new HttpVFSClient(
      dbUrl,
      MAX_SQLITE_CONNECTION_CACHE_SIZE_MB * 1024 * 1024
    )
  }

  async dispose () {
    while (this.numConnections > 0) {
      const conn = await this.retainDbConnection()
      conn.sqlite3.close()
      --this.numConnections
    }

    this.dbUrl = null
    this.maxConnections = 0
    this.freeConnections = []
    this.pendingRequests = []
    this.numConnections = 0
    this.client = null
  }

  async retainDbConnection() {
    if (this.freeConnections.length > 0) {
      return this.freeConnections.pop()
    }

    if (this.numConnections < this.maxConnections) {
      const { default: SQLiteESMFactory } = (await import('./wa-sqlite-async.js'))
      const module = await SQLiteESMFactory({})

      const sqlite3 = SQLite.Factory(module)
      ++this.numConnections
      sqlite3.vfs_register(new HttpVFS(this.client))

      // the db name here is completely fake, it's just to keep sqlite happy internally.
      // we'll be feeding it the contents of the sqlite DB contained at the URL provided.
      const db = await sqlite3.open_v2(VFS_DB_NAME, SQLite.SQLITE_OPEN_READONLY | SQLite.SQLITE_OPEN_URI, 'httpvfs')
      return { db, sqlite3 }
    }

    const { promise, helper } = makePromiseHelper()
    this.pendingRequests.push(helper)
    const conn = await promise
    return conn
  }

  releaseDbConnection (conn) {
    if (this.pendingRequests.length > 0) {
      const req = this.pendingRequests.shift()
      req.resolve(conn)
    } else {
      this.freeConnections.push(conn)
    }
  }
}
