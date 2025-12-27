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
      { find: 'next/link', replacement: path.resolve(__dirname, './src/shims/next/link.tsx') },
      { find: 'next/image', replacement: path.resolve(__dirname, './src/shims/next/image.tsx') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, './src/shims/next/navigation.tsx') },
      { find: 'next/dynamic', replacement: path.resolve(__dirname, './src/shims/next/dynamic.tsx') },
      { find: 'next/headers', replacement: path.resolve(__dirname, './src/shims/next/headers.tsx') },
      { find: 'next/script', replacement: path.resolve(__dirname, './src/shims/next/script.tsx') },
    ],
  },
})