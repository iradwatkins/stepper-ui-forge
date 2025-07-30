import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import { imagetools } from 'vite-imagetools';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,  // This binds to both IPv4 and IPv6
    port: 8080,
    middlewareMode: false,
    strictPort: true,
    open: false,
  },
  preview: {
    port: 8080,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
    force: true,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Image optimization
    imagetools({
      defaultDirectives: new URLSearchParams({
        format: 'webp',
        quality: '80',
        w: '1920;1280;640;320',
        as: 'picture'
      })
    }),
    // Compression plugin for better performance
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files larger than 10kb
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
    // Bundle analyzer
    mode === 'production' && visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/bundle-analysis.html'
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Steppers Life - Event Management Platform',
        short_name: 'Steppers Life',
        description: 'Comprehensive event management and ticketing platform for stepping and dance events',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  // Production optimizations
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    // Optimized chunking strategy for better performance
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Payment SDKs - separate chunk for payment flows
          if (id.includes('@square/web-sdk') || id.includes('@paypal')) {
            return 'payment-vendor';
          }
          
          // Icons - separate chunk to optimize loading
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Date utilities
          if (id.includes('date-fns') || id.includes('react-day-picker')) {
            return 'date-vendor';
          }
          
          // Charts and visualizations
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts-vendor';
          }
          
          // UI components
          if (id.includes('@radix-ui') || id.includes('@dnd-kit')) {
            return 'ui-vendor';
          }
          
          // Data layer
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'data-vendor';
          }
          
          // Keep core React in its own chunk to prevent duplication
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          if (id.includes('react') && !id.includes('react-dom')) {
            return 'react';
          }
          
          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize deps
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
}));
