import '@mantine/core/styles.css';
import {createRoot} from "react-dom/client";
import {StrictMode} from "react";
import App from "./App.tsx";
import {MantineProvider} from "@mantine/core";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

const queryClient = new QueryClient();

export const DEBUG_MODE = import.meta.env.VITE_DEBUG_VIEWER === '1'
export const SERVER_TARGET_OVERRIDE = import.meta.env.VITE_SERVER_TARGET_OVERRIDE || '' as string

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);

// void startLegacy()