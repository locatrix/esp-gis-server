import { useEffect, useRef } from "react"
import mapboxgl, { MercatorCoordinate, type LngLatLike } from "mapbox-gl"
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
const REAL_ESTATE_SOURCE_ID = 'realestate-pins'
const REAL_ESTATE_CLUSTER_LAYER_ID = 'realestate-pins-clusters'
const REAL_ESTATE_CLUSTER_COUNT_LAYER_ID = 'realestate-pins-cluster-count'
const REAL_ESTATE_LOADING_LAYER_ID = 'realestate-pins-loading'
const REAL_ESTATE_POINT_LAYER_ID = 'realestate-pins-points'
const REAL_ESTATE_LOADING_IMAGE_ID = 'realestate-pins-loading-spinner'
const REAL_ESTATE_FEATURESET = 'realestate_pins'
const MAX_REAL_ESTATE_FEATURES = 10000
const MIN_REAL_ESTATE_ZOOM = 20
const REAL_ESTATE_PIN_STATE_LOADING = 'loading'
const REAL_ESTATE_PIN_STATE_READY = 'ready'
const FLOORPLAN_HIT_CACHE_DURATION_MS = 30 * 60 * 1000
const FLOORPLAN_MISS_CACHE_DURATION_MS = 10 * 60 * 1000

type RealestateFeature = {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[]
  }
  properties: Record<string, unknown>
}

type RealestateFeatureCollection = {
  type: 'FeatureCollection'
  features: RealestateFeature[]
}

type FloorplanCacheEntry = {
  floorplanUrl: string | null
  expiresAtMs: number
}

const EMPTY_FEATURE_COLLECTION: RealestateFeatureCollection = {
  type: 'FeatureCollection',
  features: []
}

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
  const popupRef = useRef<mapboxgl.Popup | null>(null)

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

    const wfsPath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/rea-wfs') : location.pathname.replace('/viewer', '/rea-wfs')

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

    let pinsAbortController: AbortController | null = null
    let floorplanAbortController: AbortController | null = null
    let realestateLoadGeneration = 0
    const floorplanCache = new Map<string, FloorplanCacheEntry>()

    const setRealestatePinsData = (featureCollection: RealestateFeatureCollection) => {
      const source = map.getSource(REAL_ESTATE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      if (source == null) {
        return
      }

      source.setData(featureCollection as any)
    }

    const cancelRealestateLoading = () => {
      pinsAbortController?.abort()
      pinsAbortController = null
      floorplanAbortController?.abort()
      floorplanAbortController = null
      realestateLoadGeneration += 1
    }

    const createLoadingSpinnerImage = () => {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')

      return {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
        onAdd() {
        },
        render() {
          if (context == null) {
            return false
          }

          const center = size / 2
          const radius = size * 0.24
          const strokeWidth = size * 0.1
          const start = (performance.now() / 1000) * Math.PI * 1.8

          context.clearRect(0, 0, size, size)
          context.lineCap = 'round'

          context.beginPath()
          context.strokeStyle = 'rgba(15, 118, 110, 0.2)'
          context.lineWidth = strokeWidth
          context.arc(center, center, radius, 0, Math.PI * 2)
          context.stroke()

          context.beginPath()
          context.strokeStyle = '#0f766e'
          context.lineWidth = strokeWidth
          context.arc(center, center, radius, start, start + Math.PI * 1.2)
          context.stroke()

          const imageData = context.getImageData(0, 0, size, size)
          this.data = imageData.data
          map.triggerRepaint()
          return true
        }
      } as mapboxgl.StyleImageInterface
    }

    const cloneFeatureCollection = (features: RealestateFeature[]): RealestateFeatureCollection => ({
      type: 'FeatureCollection',
      features: features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [...feature.geometry.coordinates]
        },
        properties: { ...feature.properties }
      }))
    })

    const normaliseRealestatePins = (featureCollection: unknown): RealestateFeatureCollection => {
      const features = Array.isArray((featureCollection as RealestateFeatureCollection | null)?.features)
        ? (featureCollection as RealestateFeatureCollection).features
        : []

      return {
        type: 'FeatureCollection',
        features: features.map((feature, index) => ({
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            realestatePinKey: String(feature.properties?.id ?? index),
            pinState: REAL_ESTATE_PIN_STATE_LOADING,
            floorplanUrl: ''
          }
        }))
      }
    }

    const renderFloorplanPopup = (lngLat: mapboxgl.LngLat, floorplanUrl: string) => {
      const root = document.createElement('div')
      root.style.maxWidth = '320px'

      const image = document.createElement('img')
      image.src = floorplanUrl
      image.alt = 'Floorplan'
      image.style.display = 'block'
      image.style.width = '100%'
      image.style.borderRadius = '8px'
      image.style.marginBottom = '8px'

      root.appendChild(image)
      showPopupContent(lngLat, root)
    }

    const fetchFloorplanUrl = async (endpoint: string, signal?: AbortSignal) => {
      const now = Date.now()
      const cached = floorplanCache.get(endpoint)
      if (cached != null) {
        if (cached.expiresAtMs > now) {
          return cached.floorplanUrl
        }

        floorplanCache.delete(endpoint)
      }

      const response = await fetch(endpoint, signal == null ? undefined : { signal })
      if (response.status === 404) {
        floorplanCache.set(endpoint, {
          floorplanUrl: null,
          expiresAtMs: now + FLOORPLAN_MISS_CACHE_DURATION_MS
        })
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to load floorplan URL: ${response.status}`)
      }

      const floorplanUrl = (await response.text()).trim()
      if (floorplanUrl === '') {
        floorplanCache.set(endpoint, {
          floorplanUrl: null,
          expiresAtMs: now + FLOORPLAN_MISS_CACHE_DURATION_MS
        })
        return null
      }

      floorplanCache.set(endpoint, {
        floorplanUrl,
        expiresAtMs: now + FLOORPLAN_HIT_CACHE_DURATION_MS
      })

      return floorplanUrl
    }

    const resolveRealestateFloorplans = async (featureCollection: RealestateFeatureCollection, generation: number) => {
      const activeFeatures = featureCollection.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [...feature.geometry.coordinates]
        },
        properties: { ...feature.properties }
      }))

      const requestAbortController = new AbortController()
      floorplanAbortController = requestAbortController

      for (const feature of [...activeFeatures]) {
        if (generation !== realestateLoadGeneration || requestAbortController.signal.aborted) {
          return
        }

        const pinKey = String(feature.properties.realestatePinKey ?? '')
        const endpoint = typeof feature.properties.floorplanUrlEndpoint === 'string'
          ? feature.properties.floorplanUrlEndpoint
          : ''

        const activeIndex = activeFeatures.findIndex(candidate => String(candidate.properties.realestatePinKey ?? '') === pinKey)
        if (activeIndex === -1) {
          continue
        }

        if (endpoint === '') {
          activeFeatures.splice(activeIndex, 1)
          setRealestatePinsData(cloneFeatureCollection(activeFeatures))
          continue
        }

        try {
          const floorplanUrl = await fetchFloorplanUrl(endpoint, requestAbortController.signal)
          if (generation !== realestateLoadGeneration || requestAbortController.signal.aborted) {
            return
          }

          const resolvedIndex = activeFeatures.findIndex(candidate => String(candidate.properties.realestatePinKey ?? '') === pinKey)
          if (resolvedIndex === -1) {
            continue
          }

          if (floorplanUrl == null) {
            activeFeatures.splice(resolvedIndex, 1)
          } else {
            activeFeatures[resolvedIndex] = {
              ...activeFeatures[resolvedIndex],
              properties: {
                ...activeFeatures[resolvedIndex].properties,
                pinState: REAL_ESTATE_PIN_STATE_READY,
                floorplanUrl
              }
            }
          }

          setRealestatePinsData(cloneFeatureCollection(activeFeatures))
        } catch (error) {
          if (requestAbortController.signal.aborted) {
            return
          }

          console.error('Failed to preload floorplan URL', error)
          activeFeatures.splice(activeIndex, 1)
          setRealestatePinsData(cloneFeatureCollection(activeFeatures))
        }
      }

      if (generation === realestateLoadGeneration) {
        floorplanAbortController = null
      }
    }

    const installRealestatePinsLayers = () => {
      if (map.getSource(REAL_ESTATE_SOURCE_ID) == null) {
        map.addSource(REAL_ESTATE_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION as any,
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14
        })
      }

      if (!map.hasImage(REAL_ESTATE_LOADING_IMAGE_ID)) {
        map.addImage(REAL_ESTATE_LOADING_IMAGE_ID, createLoadingSpinnerImage(), { pixelRatio: 2 })
      }

      if (map.getLayer(REAL_ESTATE_CLUSTER_LAYER_ID) == null) {
        map.addLayer({
          id: REAL_ESTATE_CLUSTER_LAYER_ID,
          type: 'circle',
          source: REAL_ESTATE_SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0f766e',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              16,
              25,
              20,
              100,
              26
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f8fafc'
          }
        })
      }

      if (map.getLayer(REAL_ESTATE_CLUSTER_COUNT_LAYER_ID) == null) {
        map.addLayer({
          id: REAL_ESTATE_CLUSTER_COUNT_LAYER_ID,
          type: 'symbol',
          source: REAL_ESTATE_SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold']
          },
          paint: {
            'text-color': '#f8fafc'
          }
        })
      }

      if (map.getLayer(REAL_ESTATE_LOADING_LAYER_ID) == null) {
        map.addLayer({
          id: REAL_ESTATE_LOADING_LAYER_ID,
          type: 'symbol',
          source: REAL_ESTATE_SOURCE_ID,
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'pinState'], REAL_ESTATE_PIN_STATE_LOADING]],
          layout: {
            'icon-image': REAL_ESTATE_LOADING_IMAGE_ID,
            'icon-size': 0.8,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        })
      }

      if (map.getLayer(REAL_ESTATE_POINT_LAYER_ID) == null) {
        map.addLayer({
          id: REAL_ESTATE_POINT_LAYER_ID,
          type: 'circle',
          source: REAL_ESTATE_SOURCE_ID,
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'pinState'], REAL_ESTATE_PIN_STATE_READY]],
          paint: {
            'circle-color': '#ea580c',
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff7ed'
          }
        })
      }
    }

    const fetchRealestatePins = async () => {
      if (!map.isStyleLoaded()) {
        return
      }

      installRealestatePinsLayers()

      const zoom = Math.ceil(map.getZoom() + LEAFLET_ZOOM_OFFSET)
      if (zoom < MIN_REAL_ESTATE_ZOOM) {
        cancelRealestateLoading()
        setRealestatePinsData(EMPTY_FEATURE_COLLECTION)
        return
      }

      cancelRealestateLoading()
      const requestGeneration = realestateLoadGeneration
      const requestAbortController = new AbortController()
      pinsAbortController = requestAbortController

      const bounds = map.getBounds()
      if (bounds == null) {
        setRealestatePinsData(EMPTY_FEATURE_COLLECTION)
        return
      }

      const west = bounds.getWest()
      const south = bounds.getSouth()
      const east = bounds.getEast()
      const north = bounds.getNorth()
      if (![west, south, east, north].every(Number.isFinite)) {
        setRealestatePinsData(EMPTY_FEATURE_COLLECTION)
        return
      }

      const bbox = `${west},${south},${east},${north}`
      const query = new URLSearchParams({
        service: 'WFS',
        request: 'GetFeature',
        version: '2.0.0',
        typeNames: REAL_ESTATE_FEATURESET,
        outputFormat: 'GEOJSON',
        srsName: 'EPSG:4326',
        bbox,
        zoom: String(zoom),
        count: String(MAX_REAL_ESTATE_FEATURES)
      })

      try {
        const response = await fetch(`${wfsPath}?${query.toString()}`, {
          signal: requestAbortController.signal
        })

        if (!response.ok) {
          setRealestatePinsData(EMPTY_FEATURE_COLLECTION)
          return
        }

        const featureCollection = normaliseRealestatePins(await response.json())
        if (requestGeneration !== realestateLoadGeneration || requestAbortController.signal.aborted) {
          return
        }

        setRealestatePinsData(cloneFeatureCollection(featureCollection.features))
        void resolveRealestateFloorplans(featureCollection, requestGeneration)
      } catch (error) {
        if (requestAbortController.signal.aborted) {
          return
        }

        console.error('Failed to load realestate pins', error)
        setRealestatePinsData(EMPTY_FEATURE_COLLECTION)
      }
    }

    const showPopupContent = (lngLat: mapboxgl.LngLat, content: HTMLElement) => {
      popupRef.current?.remove()
      popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '360px' })
        .setLngLat(lngLat)
        .setDOMContent(content)
        .addTo(map)
    }

    const buildPopupMessage = (message: string) => {
      const root = document.createElement('div')
      root.style.maxWidth = '320px'
      root.style.fontSize = '13px'
      root.textContent = message
      return root
    }

    const showFloorplanForFeature = async (feature: mapboxgl.MapboxGeoJSONFeature, lngLat: mapboxgl.LngLat) => {
      const endpoint = typeof feature.properties?.floorplanUrlEndpoint === 'string'
        ? feature.properties.floorplanUrlEndpoint
        : ''

      if (endpoint === '') {
        showPopupContent(lngLat, buildPopupMessage('No floorplan endpoint is available for this pin.'))
        return
      }

      const preloadedFloorplanUrl = typeof feature.properties?.floorplanUrl === 'string'
        ? feature.properties.floorplanUrl.trim()
        : ''

      if (preloadedFloorplanUrl !== '') {
        renderFloorplanPopup(lngLat, preloadedFloorplanUrl)
        return
      }

      showPopupContent(lngLat, buildPopupMessage('Loading floorplan...'))

      try {
        const floorplanUrl = await fetchFloorplanUrl(endpoint)
        if (floorplanUrl === '') {
          showPopupContent(lngLat, buildPopupMessage('No floorplan found for this address.'))
          return
        }

        if (floorplanUrl == null) {
          showPopupContent(lngLat, buildPopupMessage('No floorplan found for this address.'))
          return
        }

        renderFloorplanPopup(lngLat, floorplanUrl)
      } catch (error) {
        console.error('Failed to fetch floorplan', error)
        showPopupContent(lngLat, buildPopupMessage('Failed to load the floorplan.'))
      }
    }

    // apply URL hash on load

    map.on("load", () => {
      if (!mapRef.current) return
      applyHashToMap(map)
      injectSelectedLayer(map, selectedLayerRef.current)
      installRealestatePinsLayers()
      void fetchRealestatePins()
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

      void fetchRealestatePins()
    })

    map.on('click', REAL_ESTATE_CLUSTER_LAYER_ID, event => {
      const feature = event.features?.[0]
      const clusterId = feature?.properties?.cluster_id
      const source = map.getSource(REAL_ESTATE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      if (source == null || typeof clusterId !== 'number') {
        return
      }

      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error != null || typeof zoom !== 'number') {
          return
        }

        map.easeTo({ center: event.lngLat, zoom })
      })
    })

    map.on('click', REAL_ESTATE_POINT_LAYER_ID, event => {
      const feature = event.features?.[0]
      if (feature == null) {
        return
      }

      void showFloorplanForFeature(feature, event.lngLat)
    })

    for (const layerId of [REAL_ESTATE_CLUSTER_LAYER_ID, REAL_ESTATE_POINT_LAYER_ID]) {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    // Enable url map control
    const hashChangeHandler = () => applyHashToMap(map)
    window.addEventListener("hashchange", hashChangeHandler)

    // Navigation Controls
    map.addControl(new mapboxgl.NavigationControl())

    return () => {
      cancelRealestateLoading()
      popupRef.current?.remove()
      window.removeEventListener('hashchange', hashChangeHandler)
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
