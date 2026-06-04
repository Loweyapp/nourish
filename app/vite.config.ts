import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// '/nourish/' for GitHub Pages; '/' on Vercel (and any other host at root)
const base = process.env['VERCEL'] ? '/' : '/nourish/'

const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

export default defineConfig({
  plugins: [react()],
  base,
  define: {
    __APP_VERSION__: JSON.stringify(gitSha),
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
