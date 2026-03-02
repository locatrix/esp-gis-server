import { useEffect, useRef, useState } from "react"
import { ActionIcon, Box, Button, Card, Group, Modal, Text } from "@mantine/core"
import mapboxgl, { Map, MercatorCoordinate, type LngLatLike } from "mapbox-gl"
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch"
import "mapbox-gl/dist/mapbox-gl.css"
import { DEBUG_MODE, SERVER_TARGET_OVERRIDE } from "./main"

// Shows entirety of Australia
const INITIAL_CENTER: LngLatLike = [
  133.15429687500003,
  -25.839449402063185
]
const INITIAL_ZOOM = 4

// Apply a zoom offset to account for Leaflet vs Mapbox zoom level differences
const LEAFLET_ZOOM_OFFSET = 1
const REAL_ESTATE_SOURCE_ID = "realestate"
const REAL_ESTATE_LAYER_ID = "realestate-pins"

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
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? null
  if (!mapboxgl.accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not set")
  }

  // Mapbox Container & Map Refs
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const realestateRequestIdRef = useRef(0)
  const realestateViewportRef = useRef<HTMLDivElement | null>(null)
  const realestateTransformRef = useRef<ReactZoomPanPinchRef | null>(null)
  const [selectedRealestate, setSelectedRealestate] = useState<{
    id?: string,
    url: string,
    address?: string,
    lat?: number,
    lng?: number
  } | null>(null)
  const [isRealestateExpanded, setIsRealestateExpanded] = useState(false)
  const [realestateAnchor, setRealestateAnchor] = useState<{ x: number, y: number } | null>(null)
  const [realestateImageSize, setRealestateImageSize] = useState<{ width: number, height: number } | null>(null)

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
      installRealestateLayer(map)
      refreshRealestateLayer(map)
      updateRealestateStyle(map)
    })

    // update hash when camera stops moving
    map.on("moveend", () => {
      if (!mapRef.current) return
      updateHashFromMap(map)

      const currPoint = map.getCenter()
      const currZoom = Math.ceil(map.getZoom() + LEAFLET_ZOOM_OFFSET)

      if (onChangeViewRef.current && currPoint) {
        const world = lngLatToWorldPixel(currPoint, currZoom)
        onChangeViewRef.current(
          Math.floor(world.x / 256),
          Math.floor(world.y / 256),
          currZoom
        )
      }

      refreshRealestateLayer(map)
    })

    map.on("move", () => {
      if (!mapRef.current) return
      updateRealestateAnchor(map)
    })

    // Enable url map control
    window.addEventListener("hashchange", () => applyHashToMap(map))

    // Navigation Controls
    map.addControl(new mapboxgl.NavigationControl())

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  function lngLatToWorldPixel(point: LngLatLike, zoom: number) {
    const TILE_SIZE = 256

    const scale = TILE_SIZE * Math.pow(2, zoom)

    const m = MercatorCoordinate.fromLngLat(point)

    const worldX = m.x * scale
    const worldY = m.y * scale

    return { x: worldX, y: worldY }
  }

  function extractHashParams (): HashParams {
    let params: HashParams = {}
    let fragment = window.location.hash.replace("#", "")
    let parts = fragment.split("&")

    for (let part of parts) {
      const [key, value] = part.split("=")

      if (key === "camera") {
        const vals = value.split(",")
        if (vals.length === 3) {
          const lat = parseFloat(vals[0])
          const lng = parseFloat(vals[1])
          let zoom = vals[2]
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

  function applyHashToMap (map: mapboxgl.Map) {
    const params = extractHashParams()
    if (params.camera) {
      const { lat, lng, zoom } = params.camera
      map.jumpTo({ center: [lng, lat], zoom: zoom - LEAFLET_ZOOM_OFFSET })
    }

    if (params.layer) {
      setSelectedLayerRef.current?.(params.layer)
    }
  }

  function updateHashFromMap (map: mapboxgl.Map) {
    const c = map.getCenter()
    const z = map.getZoom()

    const lat = c.lat.toFixed(8)
    const lng = c.lng.toFixed(8)
    const zoom = (z + LEAFLET_ZOOM_OFFSET).toFixed(2)

    const layer = selectedLayerRef.current

    history.replaceState(
      null,
      "",
      `#camera=${lat},${lng},${zoom}z&layer=${layer}`
    )
    DEBUG_MODE ? console.log("Updated hash:", window.location.hash) : null
  }

  function injectSelectedLayer (map: mapboxgl.Map, layerName: string) {
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

  function getRealestateWfsPath () {
    return SERVER_TARGET_OVERRIDE
      ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/realestate/wfs')
      : location.pathname.replace('/viewer', '/realestate/wfs')
  }

  function installRealestateLayer (map: mapboxgl.Map) {
    if (map.getLayer(REAL_ESTATE_LAYER_ID)) return

    if (!map.getSource(REAL_ESTATE_SOURCE_ID)) {
      map.addSource(REAL_ESTATE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      })
    }

    map.addLayer({
      id: REAL_ESTATE_LAYER_ID,
      source: REAL_ESTATE_SOURCE_ID,
      type: "circle",
      paint: {
        "circle-radius": 6,
        "circle-color": "#e63946",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    })

    map.on("mouseenter", REAL_ESTATE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer"
    })

    map.on("mouseleave", REAL_ESTATE_LAYER_ID, () => {
      map.getCanvas().style.cursor = ""
    })

    map.on("click", REAL_ESTATE_LAYER_ID, (event) => {
      const feature = event.features?.[0] as mapboxgl.MapboxGeoJSONFeature | undefined
      if (!feature) return

      const props = feature.properties as Record<string, any> | undefined
      const geometryCoords = feature.geometry?.type === "Point"
        ? (feature.geometry.coordinates as number[])
        : null
      const gmlId = props?.gmlID ?? props?.gmlId ?? props?.gmlid
      const imageDataUrl = props?.imageDataUrl ?? props?.image_data_url
      const floorplanUrl = props?.floorplanUrl ?? props?.floorplan_url
      const selectedUrl = imageDataUrl ?? floorplanUrl
      if (!selectedUrl) return
      const lng = geometryCoords?.[0]
      const lat = geometryCoords?.[1]

      setSelectedRealestate({
        id: gmlId ? String(gmlId) : undefined,
        url: String(selectedUrl),
        address: props?.address ? String(props.address) : undefined,
        lat: typeof lat === "number" ? lat : undefined,
        lng: typeof lng === "number" ? lng : undefined
      })
      setIsRealestateExpanded(false)
      updateRealestateAnchor(map)
      updateRealestateStyle(map, gmlId ? String(gmlId) : null)
    })

    map.on("click", (event) => {
      const featureHits = map.queryRenderedFeatures(event.point, { layers: [REAL_ESTATE_LAYER_ID] })
      if (featureHits.length > 0) return
      setSelectedRealestate(null)
      setIsRealestateExpanded(false)
      setRealestateAnchor(null)
      updateRealestateStyle(map, null)
    })
  }

  function updateRealestateAnchor (map: mapboxgl.Map) {
    if (!selectedRealestate?.lng || !selectedRealestate?.lat) {
      setRealestateAnchor(null)
      return
    }

    const point = map.project([selectedRealestate.lng, selectedRealestate.lat])
    setRealestateAnchor({ x: point.x, y: point.y })
  }

  function fitRealestateImage (size: { width: number, height: number }) {
    const viewport = realestateViewportRef.current
    const transformApi = realestateTransformRef.current
    if (!viewport || !transformApi) return

    const viewportWidth = viewport.clientWidth
    const viewportHeight = viewport.clientHeight
    if (viewportWidth <= 0 || viewportHeight <= 0) return

    const scale = Math.min(
      viewportWidth / size.width,
      viewportHeight / size.height
    )
    const offsetX = (viewportWidth - size.width * scale) / 2
    const offsetY = (viewportHeight - size.height * scale) / 2

    transformApi.setTransform(offsetX, offsetY, scale)
  }


  function updateRealestateStyle (map: mapboxgl.Map, selectedId?: string | null) {
    if (!map.getLayer(REAL_ESTATE_LAYER_ID)) return

    if (!selectedId) {
      map.setPaintProperty(REAL_ESTATE_LAYER_ID, "circle-color", "#e63946")
      map.setPaintProperty(REAL_ESTATE_LAYER_ID, "circle-radius", 6)
      return
    }

    map.setPaintProperty(REAL_ESTATE_LAYER_ID, "circle-color", [
      "case",
      ["==", ["get", "gmlID"], selectedId],
      "#ffd166",
      "#e63946"
    ])
    map.setPaintProperty(REAL_ESTATE_LAYER_ID, "circle-radius", [
      "case",
      ["==", ["get", "gmlID"], selectedId],
      9,
      6
    ])
  }

  function refreshRealestateLayer (map: mapboxgl.Map) {
    const source = map.getSource(REAL_ESTATE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (!source) return

    const bounds = map.getBounds()
    if (!bounds) return
    const currentZoom = Math.ceil(map.getZoom() + LEAFLET_ZOOM_OFFSET)
    if (currentZoom < 18) {
      source.setData({ type: "FeatureCollection", features: [] })
      return
    }
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ].map(v => v.toFixed(6)).join(",")

    const requestId = ++realestateRequestIdRef.current
    const url = `${getRealestateWfsPath()}?request=GetFeature&outputformat=GEOJSON&typenames=realestate-floorplans&bbox=${bbox}&srsname=EPSG:4326&count=200`

    fetch(url)
      .then(async resp => resp.json())
      .then(data => {
        if (requestId !== realestateRequestIdRef.current) return
        if (!data || !Array.isArray(data.features)) {
          return
        }

        const filtered = data.features.filter((feature: any) => {
          const props = feature?.properties ?? {}
          const floorplanUrl = props.floorplanUrl ?? props.floorplan_url
          const imageDataUrl = props.imageDataUrl ?? props.image_data_url
          if (!floorplanUrl && !imageDataUrl) {
            DEBUG_MODE ? console.error("Real estate pin missing image", feature) : null
            return false
          }
          return true
        })

        source.setData({
          ...data,
          features: filtered
        })
      })
      .catch(err => {
        DEBUG_MODE ? console.warn("realestate WFS fetch failed", err) : null
      })
  }

  // When selectedLayer changes → update raster source
  useEffect(() => {
    if (!mapRef.current) return

    injectSelectedLayer(mapRef.current, props.selectedLayer)
    updateHashFromMap(mapRef.current)
  }, [props.selectedLayer])

  useEffect(() => {
    if (!mapRef.current) return
    updateRealestateStyle(mapRef.current, selectedRealestate?.id ?? null)
    updateRealestateAnchor(mapRef.current)
  }, [selectedRealestate])

  useEffect(() => {
    if (!isRealestateExpanded || !realestateImageSize) return
    fitRealestateImage(realestateImageSize)
  }, [isRealestateExpanded, realestateImageSize])

  useEffect(() => {
    if (!isRealestateExpanded) return
    const viewport = realestateViewportRef.current
    if (!viewport || !realestateImageSize) return

    const observer = new ResizeObserver(() => fitRealestateImage(realestateImageSize))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [isRealestateExpanded, realestateImageSize])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
      {selectedRealestate && !isRealestateExpanded && realestateAnchor && (
        <Card
          shadow="lg"
          radius="md"
          style={{
            position: "absolute",
            left: realestateAnchor.x,
            top: realestateAnchor.y,
            zIndex: 3,
            width: 360,
            maxWidth: "90vw",
            transform: "translate(-50%, calc(-100% - 14px))"
          }}
        >
          <Box
            style={{
              position: "absolute",
              left: "50%",
              bottom: -10,
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid white",
              transform: "translateX(-50%)"
            }}
          />
          <Group justify="space-between" align="center" style={{ marginBottom: 8 }}>
            <Text fw={600}>
              {selectedRealestate.address ?? "Floorplan"}
            </Text>
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Expand"
              onClick={() => setIsRealestateExpanded(true)}
            >
              ⤢
            </ActionIcon>
          </Group>
          {selectedRealestate.url.toLowerCase().endsWith(".pdf") ? (
            <Button
              component="a"
              href={selectedRealestate.url}
              target="_blank"
              rel="noreferrer"
              variant="light"
              fullWidth
            >
              Open floorplan PDF
            </Button>
          ) : (
            <img
              src={selectedRealestate.url}
              alt="Floorplan"
              style={{ width: "100%", borderRadius: 8, display: "block" }}
            />
          )}
        </Card>
      )}
      <Modal
        opened={selectedRealestate != null && isRealestateExpanded}
        onClose={() => setIsRealestateExpanded(false)}
        centered
        size="90%"
        padding={0}
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
        styles={{
          content: { overflow: "hidden" },
          body: { padding: 0, height: "90vh" }
        }}
      >
        {selectedRealestate && (
          <Box style={{ display: "flex", flexDirection: "column", height: "90vh" }}>
            <Group
              justify="space-between"
              align="center"
              style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
            >
              <Text fw={600}>
                {selectedRealestate.address ?? "Floorplan"}
              </Text>
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label="Close"
                onClick={() => setIsRealestateExpanded(false)}
              >
                ×
              </ActionIcon>
            </Group>
            <Box
              style={{
                flex: 1,
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              ref={realestateViewportRef}
            >
              {selectedRealestate.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedRealestate.url}
                  title="Floorplan PDF"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <TransformWrapper
                  ref={realestateTransformRef}
                  minScale={0.5}
                  maxScale={6}
                  centerOnInit
                  centerZoomedOut
                  wheel={{ step: 0.2 }}
                >
                  <TransformComponent
                    wrapperStyle={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    contentStyle={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <img
                      src={selectedRealestate.url}
                      alt="Floorplan"
                      onLoad={(event) => {
                        const target = event.currentTarget
                        const nextSize = { width: target.naturalWidth, height: target.naturalHeight }
                        setRealestateImageSize(nextSize)
                        fitRealestateImage(nextSize)
                      }}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        userSelect: "none",
                        display: "block"
                      }}
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              )}
            </Box>
          </Box>
        )}
      </Modal>
    </div>
  )
}