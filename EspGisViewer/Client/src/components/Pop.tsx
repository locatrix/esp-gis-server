import {Popover} from "@mantine/core";
import * as React from "react";
import {type ComponentProps, useState} from "react";
import {useDidUpdate, useTimeout} from "@mantine/hooks";

export function usePop() {
  const [opened, setOpened] = useState(false);
  const { start, clear } = useTimeout(() => setOpened(false), 750);
  
  useDidUpdate(() => {
    if (opened) {
      start();
    } else {
      clear();
    }
  }, [opened])
  
  const Pop = (props: { children?: React.ReactNode, content: React.ReactNode } & ComponentProps<typeof Popover>) => {
    return <Popover
      opened={opened}
      position="top"
      {...props}
    >
      <Popover.Target>
        {props.children}
      </Popover.Target>
      <Popover.Dropdown>
        {props.content}
      </Popover.Dropdown>
    </Popover>
  };
  
  const popOpen = () => {
    setOpened(true);
  }
  
  return { popOpen, Pop };
}