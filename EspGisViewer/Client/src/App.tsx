import {useState} from 'react'
import {Button, Flex, Select, Title, useMantineTheme} from "@mantine/core";
import MapView from "./MapView.tsx";
import {useQuery} from "@tanstack/react-query";
import {formatLevel, isNumber, isTileName, type Tileset} from "./formatLevel.ts";
import {useColorScheme, useDidUpdate, useThrottledState} from "@mantine/hooks";
import {usePop} from "./components/Pop.tsx";
import { DEBUG_MODE, SERVER_TARGET_OVERRIDE } from './main.tsx';

export default function App() {
  const theme = useColorScheme()
  const coveragePath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/coverage') : location.pathname.replace('/viewer', '/coverage')
  const wmtsPath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/wmts') : location.pathname.replace('/viewer', '/wmts')
  DEBUG_MODE ? console.log('Coverage Path:', coveragePath) : null
  DEBUG_MODE ? console.log('WMTS Path:', wmtsPath) : null
  
  const [selected, setSelected] = useState<Tileset>('coverage')
  const [tempSelected, setTempSelected] = useThrottledState<Tileset | null>(null, 500)
  
  const [zoom, setZoom] = useState(4)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  const [coverage, setCoverage] = useState<Tileset[]>(['coverage'])
  
  const { popOpen, Pop } = usePop()

  const { isPending, error } = useQuery({
    queryKey: ['coverage', zoom, x, y],
    queryFn: async () => {
      const resp = await fetch(`${coveragePath}/${zoom}/${x}/${y}`)
      const data: Tileset[] = await resp.json()
      setCoverage(data)

      // only apply scoped selection when zoom is not the default value
      if (zoom !== 4 && !data.includes(selected)) {
        setSelected('coverage')
      }
      
      return data
    }
  })
  
  useDidUpdate(() => {
    if (tempSelected != null) {
      setTempSelected(null)
    }
  }, [selected])

  if (!coverage.includes("coverage")) {
    coverage.unshift("coverage")
  }
  
  // remove irrelevant LocatrixESPCoverage
  if (coverage.includes('LocatrixESPCoverage' as any)) {
    const indexToRemove = coverage.findIndex(item => item === 'LocatrixESPCoverage');
    if (indexToRemove !== -1) {
      coverage.splice(indexToRemove, 1);
    }
  }

  if (error) {
    return <Title order={3}>Error: {error.message}</Title>
  }
  
  const coverageItems = coverage.map(item => ({ value: item, label: formatLevel(item) }))

  const categories = coverageItems.filter(item => !isNumber(item.value) && !isTileName(item.value))
  const tileLevels = coverageItems.filter(item => isNumber(item.value))
  const tileNames = coverageItems.filter(item => isTileName(item.value))

  return (
    <>
      <MapView
        selectedLayer={tempSelected ?? selected}
        setSelectedLayer={selected => setSelected(selected as Tileset)}
        onChangeView={(x, y, zoom) => {
          setX(x)
          setY(y)
          setZoom(zoom)
        }}
        style={{ zIndex: 0 }}
      />
      {<Flex style={{zIndex: 1, position: 'fixed', bottom: 32, left: 8}}>
        <Select
          placeholder="Layer Level"
          value={selected}
          data={[
            {group: 'Categories', items: categories},
            {group: 'Levels', items: tileLevels},
            {group: 'Tile Names', items: tileNames}
          ]}
          allowDeselect={false}
          onChange={(value) => {
            if (value != null) {
              setSelected(value as Tileset)
            }
          }}
          checkIconPosition="right"
          comboboxProps={{
            position: 'top',
            middlewares: { flip: false, shift: false },
            offset: 0
          }}
          
          styles={{
            dropdown: {
              zIndex: 1,
              "--mantine-scale": `${Math.max(32, window.innerHeight - 256) / 220}`,
            },
            option: {
              padding: "4px 12px",
            },
            groupLabel: {
              padding: "8px 8px",
            }
          }}
          w="320px"
          size="lg"
          pr={24}
        />
        <Pop
          content={<>Copied</>}
          transitionProps={{
            transition: 'scale',
            duration: 100,
            timingFunction: 'ease'
          }}
          zIndex={1}
        >
          <Button
            size="lg"
            c={`var(--mantine-color-${theme}-1)`}
            bg={`var(--mantine-color-${theme}-6)`}
            onClick={() => {
              if (SERVER_TARGET_OVERRIDE) {
                void navigator.clipboard.writeText(`${wmtsPath}/${selected}/capabilities.xml`)
              } else {
                void navigator.clipboard.writeText(`${location.protocol}//${location.host}${wmtsPath}/${selected}/capabilities.xml`)
              }
              popOpen()
            }}
          >
            Copy WMTS Link
          </Button>
        </Pop>
      </Flex>}
    </>
  )
}
