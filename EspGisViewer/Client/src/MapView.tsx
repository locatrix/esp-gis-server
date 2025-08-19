import {useMap, useMapEvents} from "react-leaflet/hooks";
import {useDidUpdate, useIsFirstRender} from "@mantine/hooks";
import {TileLayer} from "react-leaflet/TileLayer";
import {MapContainer} from "react-leaflet/MapContainer";
import {useEffect} from "react";

export default function MapView(props: {
  selectedLayer: string,
  setSelectedLayer: (layer: string) => void,
  onChangeView?: (x: number, y: number, zoom: number) => void,
  style?: React.CSSProperties
}) {
  return <MapContainer style={{ width: '100%', height: '100%', ...(props.style ?? {}) }}>
    <TilesView selectedLayer={props.selectedLayer} onChangeView={props.onChangeView} />
    <HandleWindowHash selectedLayer={props.selectedLayer} setSelectedLayer={props.setSelectedLayer} />
  </MapContainer>
}

let selectedLayer: string | null = null;
function HandleWindowHash(props: { selectedLayer: string, setSelectedLayer: (layer: string) => void }) {
  const map = useMap();
  selectedLayer = props.selectedLayer;

  const mapChanged = () => {
    const center = map.getCenter()
    const zoom = map.getZoom()
    history.replaceState(null, "", `#camera=${center.lat.toFixed(8)},${center.lng.toFixed(8)},${zoom.toFixed(2)}z&layer=${selectedLayer!}`)
  }

  if (useIsFirstRender()) {
    const onHashChanged = () => {

      // parse fragment in URL and auto pan/zoom to the desired location
      let fragment = window.location.hash
      if (fragment.startsWith('#')) {
        fragment = fragment.slice(1)
      }

      const parts = fragment.split('&')
      for (let part of parts) {
        const [name, value] = part.split('=')
        if (name === 'camera') {
          const valueParts = value.split(',')
          if (valueParts.length !== 3) {
            console.error('invalid camera parameter - expected 3 values (lat,long,zoom)')
            continue
          }

          let [latStr, lngStr, zoomStr] = valueParts
          if (zoomStr.endsWith('z')) {
            zoomStr = zoomStr.slice(0, zoomStr.length - 1)
          }

          const lat = parseFloat(latStr)
          const lng = parseFloat(lngStr)
          const zoom = parseFloat(zoomStr)

          if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(zoom)) {
            console.error('invalid camera parameter - unable to parse number')
            continue
          }

          map.setView({ lat, lng }, zoom)
        } else if (name === 'layer') {
          props.setSelectedLayer(value)
        }
      }
    }

    onHashChanged();

    window.addEventListener('hashchange', onHashChanged)

    map.on('zoomend moveend layeradd', mapChanged)
  }

  useEffect(mapChanged, [props.selectedLayer])

  return <></>
}

let timeout: number | null = null

function TilesView(props: { selectedLayer: string, onChangeView?: (x: number, y: number, zoom: number) => void }) {
  const { selectedLayer, onChangeView } = props;
  const map = useMap();

  const onUpdateLayerSelector = async () => {
    let currZoom = Math.ceil(map.getZoom())
    
    // TODO: Remove this workaround:
    currZoom = Math.max(1, currZoom - 1) // zoom out a bit to get more tile coverage
    
    const currPoint = map.project(map.getCenter(), currZoom)
    const tx = Math.floor(currPoint.x / 256)
    const ty = Math.floor(currPoint.y / 256)

    if (onChangeView != null) {
      onChangeView(tx, ty, currZoom);
    }
  }

  const onMapMoved = () => {
    if (timeout != null) {
      clearTimeout(timeout)
      timeout = null
    }

    timeout = setTimeout(() => {
      timeout = null
      void onUpdateLayerSelector()
    }, 300)
  }
  
  useMapEvents({
    moveend: () => onMapMoved(),
    zoomend: () => onMapMoved(),
  })

  if (useIsFirstRender()) {
    map.setView([-25.839449402063185, 133.15429687500003], 4);
  }
  
  // handles situations when the esp-gis-server is hosted within a folder
  const wmtsPath = location.pathname.replace('/viewer', '/wmts')

  return <>
    <TileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxNativeZoom={19}
      maxZoom={22}
      attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    />
    <TileLayer
      url={`${wmtsPath}/${selectedLayer}/{z}/{x}/{y}.png`}
      maxNativeZoom={22}
      maxZoom={22}
    />
  </>
}