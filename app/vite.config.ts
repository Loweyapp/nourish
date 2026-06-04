import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

// '/nourish/' for GitHub Pages; '/' on Vercel (and any other host at root)
const base = process.env['VERCEL'] ? '/' : '/nourish/'

export default defineConfig({
  plugins: [react()],
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`v${version}`),
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
