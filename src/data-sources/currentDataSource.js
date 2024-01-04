import { DataSource } from './base.js'
import { BlobContainerDataSource } from './blob-container/blob-container.js'
import { FileSystemDataSource } from './filesystem/filesystem.js'
import { S3BucketDataSource } from './s3-bucket/s3-bucket.js'

/** @type {DataSource | null} */
let currentDataSource = null

/** @returns {DataSource} */
function createDataSource () {
  switch (process.env['ESP_GIS_DATA_SOURCE'] ?? process.env['PLANSIGHT_GIS_DATA_SOURCE']) {
    case 'filesystem':
      return new FileSystemDataSource()
    case 'blob-container':
      return new BlobContainerDataSource()
    case 's3-bucket':
      return new S3BucketDataSource()
    default:
      throw new Error(`
        unable to create data source - check the ESP_GIS_DATA_SOURCE
        environment variable (accepted values are: filesystem, blob-container,
        s3-bucket)
      `)
  }
}

/**
 * Returns the current data source for the server, creating it if required.
 * @returns {DataSource}
 */
export function getCurrentDataSource () {
  if (currentDataSource == null) {
    currentDataSource = createDataSource()
  }

  return currentDataSource
}
