import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const shared = path.resolve(root, 'shared')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': shared },
  },
  server: {
    /* 3001 by default, but PORT wins when it is set — nothing here depends on
       the exact number, so failing to start is worse than moving. */
    port: Number(process.env.PORT) || 3001,
    open: false,
  },
})
