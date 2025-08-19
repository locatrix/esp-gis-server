import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../static/viewer",
    emptyOutDir: true,
    copyPublicDir: true,
    chunkSizeWarningLimit: 10000000000 // ignore chunk size warnings
  }
})
