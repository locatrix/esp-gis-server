import express from 'express'
import { getCurrentDataSource } from '../data-sources/currentDataSource.js'

// smallest possible transparent PNG
const TRANSPARENT_IMAGE = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
export async function wmtsGetTile (req, res) {
  const dataSource = getCurrentDataSource()
  await dataSource.refresh(false)

  const layer = req.params.layer
  const tileMatrix = req.params.tileMatrix
  const tileRow = req.params.tileRow
  const tileCol = req.params.tileCol

  const rows = await dataSource.queryTilesPackage(/* sql */`
    SELECT tile_data
    FROM all_tiles
    WHERE tileset = $tileset
      AND zoom_level = $zoom
      AND tile_column = $x
      AND tile_row = $y
  `, {
    $tileset: layer,
    $zoom: tileMatrix,
    $x: tileCol,
    $y: tileRow
  })

  let tileData = TRANSPARENT_IMAGE
  if (rows.length > 0) {
    tileData = rows[0].tile_data
  }

  res.status(200)
  res.set('Content-Type', 'image/png')
  res.send(Buffer.from(tileData))
}
