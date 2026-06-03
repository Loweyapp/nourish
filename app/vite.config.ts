import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// '/nourish/' for GitHub Pages; '/' on Vercel (and any other host at root)
const base = process.env['VERCEL'] ? '/' : '/nourish/'

export default defineConfig({
  plugins: [react()],
  base,
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
