import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: [
      { find: '@/app', replacement: path.resolve(__dirname, './src') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '~@/app', replacement: path.resolve(__dirname, './src') },
      { find: '~@', replacement: path.resolve(__dirname, './src') },
    ],
  },
})
