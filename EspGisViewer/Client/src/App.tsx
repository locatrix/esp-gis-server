import {useEffect, useState} from 'react'
import {Button, Flex, Select, Title} from "@mantine/core";
import MapView from "./MapView.tsx";
import {useQuery} from "@tanstack/react-query";
import {useColorScheme, useDidUpdate, useThrottledState} from "@mantine/hooks";
import {usePop} from "./components/Pop.tsx";
import { DEBUG_MODE, SERVER_TARGET_OVERRIDE } from './main.tsx';

import {fetchCoverage, type CoverageBounds, type LayerEntry} from './coverage.ts';

export default function App() {
  const theme = useColorScheme()
  const coveragePath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/coverage') : location.pathname.replace('/viewer', '/coverage')
  const wmtsPath = SERVER_TARGET_OVERRIDE ? SERVER_TARGET_OVERRIDE.replace('/viewer', '/wmts') : location.pathname.replace('/viewer', '/wmts')

  useEffect(() => {
    DEBUG_MODE ? console.log('Coverage Path:', coveragePath) : null
    DEBUG_MODE ? console.log('WMTS Path:', wmtsPath) : null
  }, [])

  const [selected, setSelected] = useState<string>('coverage')
  const [tempSelected, setTempSelected] = useThrottledState<string | null>(null, 500)

  const [bounds, setBounds] = useState<CoverageBounds[] | null>(null)

  const { popOpen, Pop } = usePop()

  const { data, error } = useQuery({
    queryKey: ['coverage', coveragePath, bounds],
    enabled: bounds != null,
    queryFn: ({signal}) => fetchCoverage(coveragePath, bounds!, signal)
  })

  const coverage: LayerEntry[] = data ?? [{ value: 'coverage', label: 'Coverage', kind: 'category' }]

  useEffect(() => {
    if (data && bounds?.[0]?.zoom !== 4 && !data.some(e => e.value === selected)) {
      setSelected('coverage')
    }
  }, [data, bounds, selected])
  
  useDidUpdate(() => {
    if (tempSelected != null) {
      setTempSelected(null)
    }
  }, [selected])

  if (error) {
    return <Title order={3}>Error: {error.message}</Title>
  }

  const normalizedCoverage = coverage
    .filter(item => item.value !== 'LocatrixESPCoverage')
  if (!normalizedCoverage.some(e => e.value === 'coverage')) {
    normalizedCoverage.unshift({ value: 'coverage', label: 'Coverage', kind: 'category' })
  }

  const categories = normalizedCoverage.filter(item => item.kind === 'category')
  const tileLevels = normalizedCoverage.filter(item => item.kind === 'level')
  const tileNames = normalizedCoverage.filter(item => item.kind === 'name')

  return (
    <>
      <MapView
        selectedLayer={tempSelected ?? selected}
        setSelectedLayer={setSelected}
        onChangeView={setBounds}
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
              setSelected(value)
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
