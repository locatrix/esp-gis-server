import { getCurrentDataSource } from '../data-sources/currentDataSource.js'

export async function getDataBounds () {
  const dataSource = getCurrentDataSource()
  dataSource.refresh(false)

  let rows = await dataSource.queryFeaturePackage(/* sql */`
    SELECT
      MIN(latitude) AS min_lat,
      MIN(longitude) AS min_lng,
      MAX(latitude) AS max_lat,
      MAX(longitude) AS max_lng 
    FROM plans
  `, {})

  return {
    minLatitude: rows[0].min_lat,
    minLongitude: rows[0].min_lng,
    maxLatitude: rows[0].max_lat,
    maxLongitude: rows[0].max_lng
  }
}
