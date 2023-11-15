
(async function () {
    const getCoverage = async (zoom, x, y) => {
        const resp = await fetch(`/coverage/${zoom}/${x}/${y}`)
        const tilesets = await resp.json()
        return tilesets
    }

    const L = window['L'] // global leaflet instance

    const map = L.map('map').setView([-25.839449402063185,133.15429687500003], 4);
    window['map'] = map

    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 22,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        opacity: 0.5
    }).addTo(map);

    let selectedLayer = `LocatrixESPCoverage`
    let packageLayer = new L.TileLayer(`/wmts/${selectedLayer}/{z}/{x}/{y}.png`, { maxNativeZoom: 22, maxZoom: 22 }).addTo(map)

	document.getElementById('layer-select').addEventListener('change', e => {
		selectedLayer = e.target.value
		packageLayer.remove()
        packageLayer = new L.TileLayer(`/wmts/${selectedLayer}/{z}/{x}/{y}.png`, { maxNativeZoom: 22, maxZoom: 22 }).addTo(map)
	})

    document.getElementById('copy-wmts-url-btn').addEventListener('click', e => {
		navigator.clipboard.writeText(`${location.protocol}//${location.host}/wmts/${selectedLayer}/capabilities.xml`)
	})

	const onUpdateLayerSelector = async () => {
		const currZoom = Math.ceil(map.getZoom())
		const currPoint = map.project(map.getCenter(), currZoom)
		const tx = Math.floor(currPoint.x / 256)
		const ty = Math.floor(currPoint.y / 256)

        let layers = []

        if (currZoom >= 16) {
            layers = await getCoverage(currZoom, tx, ty)
            layers = layers.filter(l => l !== 'LocatrixESPCoverage') 
        }

        layers.unshift('LocatrixESPCoverage')

        const selectElem = document.getElementById('layer-select')
        selectElem.innerHTML = ''

        let didSelect = false
        for (let layer of layers) {
            let option = document.createElement('option')
            if (layer === selectedLayer) {
                option.selected = true
                didSelect = true
            }

            option.value = layer
            option.textContent = layer
            selectElem.appendChild(option)
        }

        if (!didSelect) {
            selectElem.value = 'LocatrixESPCoverage'
            selectedLayer = 'LocatrixESPCoverage'

            packageLayer.remove()
            packageLayer = new L.TileLayer(`/wmts/${selectedLayer}/{z}/{x}/{y}.png`, { maxNativeZoom: 22, maxZoom: 22 }).addTo(map)
        }
	}

    // wait till we're idle to update the layer select
    let timeout = null
    const onMapMoved = e => {
        if (timeout != null) {
            clearTimeout(timeout)
            timeout = null
        }

        timeout = setTimeout(() => {
            timeout = null
            onUpdateLayerSelector()
        }, 300)
    }

	map.on('zoomend moveend', onMapMoved)

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
                selectedLayer = value
                selectElem.value = value
                packageLayer.remove()
                packageLayer = new L.TileLayer(`/wmts/${selectedLayer}/{z}/{x}/{y}.png`, { maxNativeZoom: 22, maxZoom: 22 }).addTo(map)
            }
        }
    }

    onHashChanged()

    window.addEventListener('hashchange', onHashChanged)

    map.on('zoomend moveend layeradd', e => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        history.replaceState(null, null, `#camera=${center.lat.toFixed(8)},${center.lng.toFixed(8)},${zoom.toFixed(2)}z&layer=${selectedLayer}`)
    })
})();
