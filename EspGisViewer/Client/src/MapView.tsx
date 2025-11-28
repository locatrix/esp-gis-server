import {useEffect, useRef, useState} from "react"
import mapboxgl, { Map, type LngLatLike } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

const INITIAL_CENTER: LngLatLike = [
  133.15429687500003,
  -25.839449402063185
]

const INITIAL_ZOOM = 4

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

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const selectedLayerRef = useRef(props.selectedLayer)
  const setSelectedLayerRef = useRef(props.setSelectedLayer)
  const onChangeViewRef = useRef(props.onChangeView)
  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)

  // Setup refs to avoid re-creating event handlers
  useEffect(() => { selectedLayerRef.current = props.selectedLayer; }, [props.selectedLayer])
  useEffect(() => { setSelectedLayerRef.current = props.setSelectedLayer; }, [props.setSelectedLayer])
  useEffect(() => { onChangeViewRef.current = props.onChangeView; }, [props.onChangeView])

  // Initialise mapbox viewer on mount
  useEffect(() => {
    if (!containerRef.current) return
    console.log('MapView Initialised- mapboxgl version:', mapboxgl.version)

    const map = new mapboxgl.Map({
      container: containerRef.current,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false
    })

    // apply URL hash on load
    map.on("load", () => {
      applyHashToMap(map)
      injectSelectedLayer(map, selectedLayerRef.current)
    })

    // update hash when camera stops moving
    map.on("moveend", () => {
      updateHashFromMap(map)

      const currentPoint = map.getCenter()
      const currentZoom = Math.ceil(map.getZoom())
      if (onChangeViewRef.current) {
        const p = map.project(currentPoint, currentZoom)
        onChangeViewRef.current(
          Math.floor(p.x / 256),
          Math.floor(p.y / 256),
          currentZoom
        )
      }
    })

    // Enable url map control
    window.addEventListener("hashchange", () => applyHashToMap(map))

    // Navigation Controls
    map.addControl(new mapboxgl.NavigationControl())

    mapRef.current = map

    return () => {
      map.remove();
      mapRef.current = null
    };
  }, [])

  function applyHashToMap(map: mapboxgl.Map) {
    let fragment = window.location.hash.replace("#", "")
    let parts = fragment.split("&");

    for (let part of parts) {
      const [key, value] = part.split("=");
      console.log("Hash part:", key, value)

      if (key === "camera") {
        const vals = value.split(",")
        if (vals.length === 3) {
          const lat = parseFloat(vals[0])
          const lng = parseFloat(vals[1])
          let zoom = vals[2];
          if (zoom.endsWith("z")) zoom = zoom.slice(0, -1)
          const z = parseFloat(zoom)

          if (!isNaN(lat) && !isNaN(lng) && !isNaN(z)) {
            map.jumpTo({ center: [lng, lat], zoom: z })
          }
        }
      }

      if (key === "layer") {
        setSelectedLayerRef.current?.(value)
      }
    }
  }

  function updateHashFromMap(map: mapboxgl.Map) {
    const c = map.getCenter();
    const z = map.getZoom();

    const lat = c.lat.toFixed(8);
    const lng = c.lng.toFixed(8);
    const zoom = z.toFixed(2);

    const layer = selectedLayerRef.current;

    history.replaceState(
      null,
      "",
      `#camera=${lat},${lng},${zoom}z&layer=${layer}`
    );
    console.log("Updated hash:", window.location.hash)
  }

  function injectSelectedLayer(map: mapboxgl.Map, layerName: string) {
    if (!map) return
    // const wmtsPath = location.pathname.replace("/viewer", "/wmts")
    const wmtsPath = 'https://locatrixesp-sandbox-e9dhdqekbjguhjbf.australiaeast-01.azurewebsites.net/wmts'

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
    
    if (!map.isStyleLoaded()) {
      console.warn("Map style not loaded yet; cannot install layer")
      return
    }

    // If style not ready, wait for it
    if (!map.isStyleLoaded()) {
      const handler = () => {
        if (map.isStyleLoaded()) {
          map.off("styledata", handler)
          injectLayer()
        }
      }
      map.on("styledata", handler)
      return;
    }

    injectLayer()
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