export interface LayerEntry {
  value: string
  label: string
  kind: 'category' | 'level' | 'name'
}

export interface CoverageBounds {
  zoom: number
  minTileCol: number
  minTileRow: number
  maxTileCol: number
  maxTileRow: number
}

// Bounds are geographic; the endpoint takes inclusive XYZ tile-coordinate AABBs.
export function getCoverageBounds(west: number, north: number, east: number, south: number, zoom: number): CoverageBounds[] {
  zoom = Math.max(0, Math.min(30, Math.ceil(zoom)))
  const tileCount = 2 ** zoom
  const clampTile = (tile: number) => Math.max(0, Math.min(tileCount - 1, Math.floor(tile)))
  const latitudeToRow = (latitude: number) => {
    const radians = Math.max(-85.0511287798066, Math.min(85.0511287798066, latitude)) * Math.PI / 180
    return clampTile((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * tileCount)
  }
  const minTileRow = latitudeToRow(north)
  const maxTileRow = latitudeToRow(south)
  const box = (minTileCol: number, maxTileCol: number): CoverageBounds => ({
    zoom, minTileCol, minTileRow, maxTileCol, maxTileRow
  })

  // Map libraries may supply longitudes outside [-180, 180] for world copies.
  let width = east - west
  if (width < 0) width = ((width % 360) + 360) % 360
  if (width >= 360) return [box(0, tileCount - 1)]

  const wrappedWest = ((west + 180) % 360 + 360) % 360
  const minCol = clampTile(wrappedWest / 360 * tileCount)
  const end = wrappedWest + width
  if (end <= 360) return [box(minCol, clampTile(end / 360 * tileCount))]

  // Split at the antimeridian rather than requesting unrelated tiles in between.
  return [box(minCol, tileCount - 1), box(0, clampTile((end - 360) / 360 * tileCount))]
}

export async function fetchCoverage(path: string, bounds: CoverageBounds[], signal?: AbortSignal): Promise<LayerEntry[]> {
  const results = await Promise.all(bounds.map(async box => {
    const { zoom, minTileCol, minTileRow, maxTileCol, maxTileRow } = box
    const response = await fetch(`${path}/${zoom}/${minTileCol}/${minTileRow}/${maxTileCol}/${maxTileRow}`, { signal })
    if (!response.ok) throw new Error(`Failed to load coverage: ${response.status}`)
    return await response.json() as LayerEntry[]
  }))
  const layers = new Map<string, LayerEntry>()
  for (const result of results) {
    for (const layer of result) layers.set(layer.value, layer)
  }
  return [...layers.values()]
}