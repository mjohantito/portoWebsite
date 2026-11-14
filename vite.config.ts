import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import projectPhotos from './scripts/photo-plugin.mjs'

export default defineConfig({
  plugins: [projectPhotos(), react()],
})
