/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BRAND = '#3D5AFE'
const PAPER = '#F7F5F0'
const API_TARGET = 'http://localhost:3001'

class CacheNames {
  static readonly WORDS = 'wordmap-words'
  static readonly API = 'wordmap-api'
}

class CachePolicy {
  static readonly WORDS_PATH = /\/api\/content\/(words|credits)$/
  static readonly API_PATH = /\/api\/(state|settings|stats|session|progress|health)/
  static readonly WORDS_URL = '/api/content/words'
  static readonly API_TIMEOUT_S = 4
  static readonly API_ENTRIES = 50
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        additionalManifestEntries: [{ url: CachePolicy.WORDS_URL, revision: null }],
        runtimeCaching: [
          {
            urlPattern: CachePolicy.WORDS_PATH,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: CacheNames.WORDS },
          },
          {
            urlPattern: CachePolicy.API_PATH,
            handler: 'NetworkFirst',
            options: {
              cacheName: CacheNames.API,
              networkTimeoutSeconds: CachePolicy.API_TIMEOUT_S,
              expiration: { maxEntries: CachePolicy.API_ENTRIES },
            },
          },
        ],
      },
      manifest: {
        name: 'WordMap',
        short_name: 'WordMap',
        description: 'Learn English vocabulary with a knowledge map',
        theme_color: BRAND,
        background_color: PAPER,
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  server: { proxy: { '/api': API_TARGET } },
  preview: { proxy: { '/api': API_TARGET } },
  test: { environment: 'node', include: ['src/**/*.test.ts'], env: { VITE_AUTH_MODE: 'none' } },
})
