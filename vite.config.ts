import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { imagetools } from 'vite-imagetools';
import viteCompression from 'vite-plugin-compression';

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
  },
  plugins: [
    react(),
    // mode === 'development' && componentTagger(),
    // Image optimization plugin
    imagetools({
      defaultDirectives: (id) => {
        // Only process images in src directory
        if (id.includes('/src/')) {
          return new URLSearchParams({
            format: 'avif;webp;jpg',
            quality: '85',
            w: '200;400;800;1200',
            as: 'picture'
          });
        }
        return new URLSearchParams();
      }
    }),
    // Compression plugin for production builds
    mode === 'production' && viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    mode === 'production' && viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false
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
    },
  },
  // Production optimizations
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    // Simplified chunking strategy to fix loading issues
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep React in the main bundle to ensure it's always available
          if (id.includes('react') || id.includes('react-dom')) {
            return undefined; // Don't split React - include in main bundle
          }
          
          // Split other vendors
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'data-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  }
}));
