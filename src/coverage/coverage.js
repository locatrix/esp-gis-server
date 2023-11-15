import express from 'express'
import { getCurrentDataSource } from '../data-sources/currentDataSource.js'

/**
 * Returns a JSON array of tilesets that are available at the given tile row/
 * column/zoom provided as parameters to the request.
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function getCoverage (req, res) {
  const dataSource = getCurrentDataSource()
  await dataSource.refresh(false)

  const tileMatrix = parseInt(req.params.tileMatrix, 10)
  const tileRow = parseInt(req.params.tileRow, 10)
  const tileCol = parseInt(req.params.tileCol, 10)

  const rows = await dataSource.queryTilesPackage(/* sql */`
    SELECT DISTINCT tileset
    FROM all_tiles
    WHERE zoom_level = $zoom
      AND tile_column = $x
      AND tile_row = $y
  `, {
    $zoom: tileMatrix,
    $x: tileCol,
    $y: tileRow
  })

  res.status(200)
  res.set('Content-Type', 'application/json')
  res.send(JSON.stringify(rows.map(r => r.tileset), null, 2))
}
