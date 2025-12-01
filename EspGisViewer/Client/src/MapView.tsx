import { useEffect, useRef } from "react"
import mapboxgl, { Map, MercatorCoordinate, type LngLatLike } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { DEBUG_MODE, SERVER_TARGET_OVERRIDE } from "./main"

// Shows entirety of Australia
const INITIAL_CENTER: LngLatLike = [
  133.15429687500003,
  -25.839449402063185
]
const INITIAL_ZOOM = 4

// Apply a zoom offset to account for Leaflet vs Mapbox zoom level differences
// https://www.reddit.com/r/explainlikeimfive/comments/5cg778/eli5_control_arms/
const LEAFLET_ZOOM_OFFSET = 1

type HashParams = {
  camera?: {
    lat: number
    lng: number
    zoom: number
  }
  layer?: string
}

export default function MapView(props: {
  selectedLayer: string,
  setSelectedLayer: (layer: string) => void,
  onChangeView?: (x: number, y: number, zoom: number) => void,
  style?: React.CSSProperties
}) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || null
  if (!mapboxgl.accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not set")
  }

  // Mapbox Container & Map Refs
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  // Setup refs to avoid re-creating event handlers
  const selectedLayerRef = useRef(props.selectedLayer)
  const setSelectedLayerRef = useRef(props.setSelectedLayer)
  const onChangeViewRef = useRef(props.onChangeView)
  useEffect(() => { selectedLayerRef.current = props.selectedLayer; }, [props.selectedLayer])
  useEffect(() => { setSelectedLayerRef.current = props.setSelectedLayer; }, [props.setSelectedLayer])
  useEffect(() => { onChangeViewRef.current = props.onChangeView; }, [props.onChangeView])

  // Initialise mapbox viewer on mount
  useEffect(() => {
    if (!containerRef.current) return
    DEBUG_MODE ? console.log('MapView Initialised- mapboxgl version:', mapboxgl.version) : null

    const loadHash = extractHashParams()
    if (loadHash.layer) {
      selectedLayerRef.current = loadHash.layer
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      center: loadHash.camera ? [loadHash.camera.lng,  loadHash.camera.lat] : INITIAL_CENTER,
      zoom: (loadHash.camera ? loadHash.camera.zoom : INITIAL_ZOOM) - LEAFLET_ZOOM_OFFSET,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      projection: 'mercator',
      maxZoom: 22 - LEAFLET_ZOOM_OFFSET,
    })

    mapRef.current = map

    // apply URL hash on load
    map.on("load", () => {
      if (!mapRef.current) return
      applyHashToMap(map)
      injectSelectedLayer(map, selectedLayerRef.current)
    })

    // update hash when camera stops moving
    map.on("moveend", () => {
      if (!mapRef.current) return
      updateHashFromMap(map)

      const currPoint = map.getCenter()
      const currZoom = Math.ceil(map.getZoom() + LEAFLET_ZOOM_OFFSET)

      if (onChangeViewRef.current && currPoint) {
        const world = lngLatToWorldPixel(currPoint, currZoom);
        onChangeViewRef.current(
          Math.floor(world.x / 256),
          Math.floor(world.y / 256),
          currZoom
        )
      }
    })

    // Enable url map control
    window.addEventListener("hashchange", () => applyHashToMap(map))

    // Navigation Controls
    map.addControl(new mapboxgl.NavigationControl())

    return () => {
      map.remove();
      mapRef.current = null
    };
  }, [])

  function lngLatToWorldPixel(point: LngLatLike, zoom: number) {
    const TILE_SIZE = 256;

    const scale = TILE_SIZE * Math.pow(2, zoom);

    const m = MercatorCoordinate.fromLngLat(point);

    const worldX = m.x * scale;
    const worldY = m.y * scale;

    return { x: worldX, y: worldY };
  }

  function extractHashParams(): HashParams {
    let params: HashParams = {}
    let fragment = window.location.hash.replace("#", "")
    let parts = fragment.split("&");

    for (let part of parts) {
      const [key, value] = part.split("=");

      if (key === "camera") {
        const vals = value.split(",")
        if (vals.length === 3) {
          const lat = parseFloat(vals[0])
          const lng = parseFloat(vals[1])
          let zoom = vals[2];
          if (zoom.endsWith("z")) zoom = zoom.slice(0, -1)
          const z = parseFloat(zoom)

          if (!isNaN(lat) && !isNaN(lng) && !isNaN(z)) {
            params.camera = { lat, lng, zoom: z }
          }
        }
      }

      if (key === "layer") {
        params.layer = value
      }
    }
    return params
  }

  function applyHashToMap(map: mapboxgl.Map) {
    const params = extractHashParams()
    if (params.camera) {
      const { lat, lng, zoom } = params.camera
      map.jumpTo({ center: [lng, lat], zoom: zoom - LEAFLET_ZOOM_OFFSET })
    }

    if (params.layer) {
      setSelectedLayerRef.current?.(params.layer)
    }
  }

  function updateHashFromMap(map: mapboxgl.Map) {
    const c = map.getCenter()
    const z = map.getZoom()

    const lat = c.lat.toFixed(8)
    const lng = c.lng.toFixed(8)
    const zoom = (z + LEAFLET_ZOOM_OFFSET).toFixed(2)

    const layer = selectedLayerRef.current;

    history.replaceState(
      null,
      "",
      `#camera=${lat},${lng},${zoom}z&layer=${layer}`
    );
    DEBUG_MODE ? console.log("Updated hash:", window.location.hash) : null
  }

  function injectSelectedLayer(map: mapboxgl.Map, layerName: string) {
    if (!map) return
    const wmtsPath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/wmts') : location.pathname.replace('/viewer', '/wmts')

    const injectLayer = () => {
      // Remove previous ESP layer if present
      if (map.getLayer("esp")) map.removeLayer("esp")
      if (map.getSource("esp")) map.removeSource("esp")

      map.addSource("esp", {
        type: "raster",
        tiles: [`${wmtsPath}/${layerName}/{z}/{x}/{y}.png`],
        tileSize: 256
      })

      map.addLayer({
        id: "esp",
        source: "esp",
        type: "raster",
        minzoom: 0,
        maxzoom: 22
      })
    }
    
    // If style is loaded, inject now; otherwise wait for it
    if (map.isStyleLoaded()) {
      injectLayer()
      return
    }

    console.warn("Map style not loaded yet; waiting to install layer")
    const handler = () => {
      if (map.isStyleLoaded()) {
        map.off("styledata", handler)
        injectLayer()
      }
    }
    map.on("styledata", handler)
  }

  // When selectedLayer changes → update raster source
  useEffect(() => {
    if (!mapRef.current) return

    injectSelectedLayer(mapRef.current, props.selectedLayer)
    updateHashFromMap(mapRef.current)
  }, [props.selectedLayer])

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        overflow: "hidden",
      }}
    />
  )
}