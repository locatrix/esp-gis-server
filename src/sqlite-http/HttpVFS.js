import * as VFS from './VFS.js'
import { MemoryVFS } from './MemoryVFS.js'
import HttpAgent, { HttpsAgent } from 'agentkeepalive'

export const VFS_DB_NAME = 'db.sqlite3'

// the configurations used for the agents are taken from https://github.com/MicrosoftDocs/azure-docs/issues/29600#issuecomment-607990556
// based on issues with Azure dropping sockets open for > 120 seconds

export function selectHttpAgent (url) {
  if (url.startsWith("https")) {
    return NODE_HTTPS_AGENT
  } else if (url.startsWith("http")) {
    return NODE_HTTP_AGENT 
  } else {
    // Default to HTTPS
    return NODE_HTTPS_AGENT
  }
}

export const NODE_HTTP_AGENT = new HttpAgent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000, // not used if using normal agent
  socketActiveTTL: 110000 // ms lameness
})

export const NODE_HTTPS_AGENT = new HttpsAgent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000, // not used if using normal agent
  socketActiveTTL: 110000 // ms lameness
})

// main DB files are read via HTTP and all others are forwarded to a memory VFS.
// this allows SQLite to stay happy with journaling etc even though the DB is
// readonly

/**
 * @typedef PendingRequest
 * @property {number} id
 * @property {string} name
 * @property {number} offset
 * @property {number} nBytes
 * @property {Promise<Uint8Array>} promise
 */

/**
 * @typedef CacheEntry
 * @property {number} id
 * @property {string} name
 * @property {number} offset
 * @property {number} nBytes
 * @property {Uint8Array} buffer
 */

export class HttpVFSClient {
  url = ''
  maxCacheSizeBytes = 128 * 1024 * 1024
  /** @type {PendingRequest[]} */ pending = []
  nextReqId = 0

  numBytesTransferred = 0
  numRequests = 0
  numSequentialReads = 0
  prevOffset = 0

  /** @type {CacheEntry[]} */ cache = []
  /** @type {Map<string,number>} */ cachedFileSizes = new Map()

  /**
   * @param {string} url
   * @param {number} maxCacheSizeBytes
   */
  constructor (url, maxCacheSizeBytes) {
    this.url = url
    this.maxCacheSizeBytes = maxCacheSizeBytes
  }

  /**
   * @param {string} name
   * @param {number} offset
   * @param {number} nBytes
   */
  async _request (name, offset, nBytes) {
    if (name !== VFS_DB_NAME) {
      throw new Error('unable to request DB other than VFS_DB_NAME')
    }

    console.debug('_request fetching', name, this.url, `bytes=${offset}-${offset + nBytes - 1} RequestNum: ${this.numRequests + 1}`)
    const resp = await fetch(this.url, {
      agent: selectHttpAgent(this.url),
      method: 'GET',
      headers: {
        'Range': `bytes=${offset}-${offset + nBytes - 1}`
      }
    })

    console.debug('_request resp', resp.status, resp.statusText, resp.headers)

    if (!resp.ok) {
      throw new Error(`invalid HTTP response for ${this.url}: ${resp.status} ${resp.statusText}`)
    }

    const data = await resp.arrayBuffer()
    const bytes = new Uint8Array(data)
    this.numBytesTransferred += data.byteLength
    ++this.numRequests

    return bytes
  }
  
  /**
   * @param {number} connId
   * @param {string} name
   * @param {number} offset
   * @param {number} nBytes
   */
  async readData (connId, name, offset, nBytes) {
    if (offset - this.prevOffset === nBytes) {
      this.numSequentialReads += 1
    } else {
      this.numSequentialReads = 0
    }

    this.prevOffset = offset

    // do we have this data in cache?
    for (let i = 0; i < this.cache.length; ++i) {
      const entry = this.cache[i]
      if (entry.name === name && entry.offset <= offset && entry.offset + entry.nBytes >= offset + nBytes) {
        this.cache.splice(i, 1)
        this.cache.unshift(entry)
        const result = new Uint8Array(entry.buffer.buffer, offset - entry.offset, nBytes)
        return Promise.resolve(result)
      }
    }

    // find an existing request for this data and latch onto it to minimize HTTP traffic
    for (let request of this.pending) {
      if (request.name === name && request.offset <= offset && request.offset + request.nBytes >= offset + nBytes) {
        return request.promise.then(data => new Uint8Array(data.buffer, offset - request.offset, nBytes))
      }
    }

    let nBytesToRequest = nBytes

    // if we're making lots of sequential requests for data, optimize
    // by increasing the amount of data being read - this way future requests
    // will already be in cache and we're not losing time to latency
    if (this.numSequentialReads > 0 && this.cachedFileSizes.has(name)) {
      const size = this.cachedFileSizes.get(name)

      let numBytes = Math.min(Math.floor(Math.pow(1.5, this.numSequentialReads) * nBytes), 10 * 1024 * 1024)
      if (offset + numBytes > size) {
        numBytes = size - offset
      }

      nBytesToRequest = numBytes
    }

    const promise = this._request(name, offset, nBytesToRequest)
    const id = this.nextReqId++
    this.pending.push({ id, promise, name, offset, nBytes: nBytesToRequest })

    return promise.then(p => {
      this.cache.unshift({
        id,
        name,
        offset,
        nBytes: nBytesToRequest,
        buffer: p
      })
      while (this.cache.length > 1024 || this.cache.reduce((a, b) => a + b.nBytes, 0) > this.maxCacheSizeBytes) {
        this.cache.pop()
      }

      this.pending = this.pending.filter(r => r.id !== id)

      // we might have requested more data than sqlite wanted, so ensure we clamp the buffer to
      // only what sqlite needs!
      p = new Uint8Array(p.buffer, 0, nBytes)

      return p
    }).catch(err => {
      this.pending = this.pending.filter(r => r.id !== id)
      throw err
    })
  }

  /**
   * @param {string} name
   */
  async getFileSize (name) {
    if (this.cachedFileSizes.has(name)) {
      return this.cachedFileSizes.get(name)
    }

    // Append sas token to url before making the request. We make a GET
    // request with a range of 0 bytes to simulate a HEAD, as it's possible
    // we might have been given a signed URL that's only OK for GET requests.
    console.debug('getFileSize fetching', name, this.url)
    const resp = await fetch(this.url, {
      agent: selectHttpAgent(this.url),
      method: 'GET',
      headers: {
        'Range': `bytes=0-0`
      }
    })

    console.debug('getFileSize resp', resp.status, resp.statusText, resp.headers)

    if (!resp.ok) {
      throw new Error(`invalid HTTP response for ${this.url}: ${resp.status} ${resp.statusText}`)
    }

    const contentRange = resp.headers.get('Content-Range')
    if (contentRange == null) {
      throw new Error(`missing content range for ${this.url}`)
    }

    const contentLengthStr = contentRange.split('/')[1]
    const size = parseInt(contentLengthStr, 10)

    if (Number.isNaN(size)) {
      throw new Error(`invalid size`)
    }

    this.cachedFileSizes.set(name, size)

    ++this.numRequests

    return size
  }
}

/**
 * @typedef OpenedFileEntry
 * @property {string} filename
 * @property {boolean} inMemory
 */

let nextConnId = 0

// @ts-ignore
export class HttpVFS extends VFS.Base {
  get name() { return 'httpvfs' }

  /** @type {HttpVFSClient} */ client
  /** @type {Map<number,OpenedFileEntry>} */ fileMapping = new Map()
  /** @type {MemoryVFS} */ memoryVfs = new MemoryVFS()

  constructor (client) {
    super()
    this.client = client
    this.connId = nextConnId++
  }

  /**
   * @param {string?} name 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number}
   */
  xOpen(name, fileId, flags, pOutFlags) {
    return this.handleAsync(async () => {
      if (name === null) {
        name = `null_${fileId}`
      }

      if (!(flags & VFS.SQLITE_OPEN_MAIN_DB)) {
        this.fileMapping.set(fileId, {
          filename: name,
          inMemory: true
        })

        return this.memoryVfs.xOpen(name, fileId, flags, pOutFlags)
      } else {
        if (name !== VFS_DB_NAME) {
          throw new Error('VFS unable to open main db with invalid name')
        }

        this.fileMapping.set(fileId, {
          filename: name,
          inMemory: false
        })
        pOutFlags.setInt32(0, flags, true);
        return VFS.SQLITE_OK;
      }
    })
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  xClose(fileId) {
    const file = this.fileMapping.get(fileId)
    this.fileMapping.delete(fileId)

    if (file.inMemory) {
      return this.memoryVfs.xClose(fileId)
    } else {
      return VFS.SQLITE_OK
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  xRead(fileId, pData, iOffset) {
    if (this.fileMapping.get(fileId).inMemory) {
      return this.memoryVfs.xRead(fileId, pData, iOffset)
    }

    return this.handleAsync(async () => {
      const name = this.fileMapping.get(fileId).filename
      if (name == null) {
        throw new Error(`unable to read file id: ${fileId}`)
      }

      const bytes = await this.client.readData(this.connId, name, iOffset, pData.byteLength)

      pData.set(bytes)

      if (bytes.byteLength < pData.byteLength) {
        return VFS.SQLITE_IOERR_SHORT_READ
      }

      return VFS.SQLITE_OK;
    })
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  xWrite(fileId, pData, iOffset) {
    if (this.fileMapping.get(fileId).inMemory) {
      return this.memoryVfs.xWrite(fileId, pData, iOffset)
    }

    return VFS.SQLITE_IOERR
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {number}
   */
  xTruncate(fileId, iSize) {
    if (this.fileMapping.get(fileId).inMemory) {
      return this.memoryVfs.xTruncate(fileId, iSize)
    }

    return VFS.SQLITE_IOERR
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number}
   */
  xFileSize(fileId, pSize64) {
    if (this.fileMapping.get(fileId).inMemory) {
      return this.memoryVfs.xFileSize(fileId, pSize64)
    }

    return this.handleAsync(async () => {
      const name = this.fileMapping.get(fileId).filename
      if (name == null) {
        throw new Error(`unable to read file id: ${fileId}`)
      }

      const fileSize = await this.client.getFileSize(name)

      pSize64.setBigInt64(0, BigInt(fileSize), true)
      return VFS.SQLITE_OK
    })
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  xSectorSize(fileId) {
    return 4096
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  xDeviceCharacteristics(fileId) {
    return VFS.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN
  }

  /**
   * @param {string} name 
   * @param {number} syncDir 
   * @returns {number}
   */
  xDelete(name, syncDir) {
    return this.memoryVfs.xDelete(name, syncDir)
  }

  /**
   * @param {string} name 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  xAccess(name, flags, pResOut) {
    return this.memoryVfs.xAccess(name, flags, pResOut)
  }
}