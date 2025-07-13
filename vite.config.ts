import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
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
        name: 'Steppers - Event Management Platform',
        short_name: 'Steppers',
        description: 'Comprehensive event management and ticketing platform',
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          
          // Supabase and data fetching
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'data-vendor';
          }
          
          // UI components (Radix UI)
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // Payment processing
          if (id.includes('@paypal') || id.includes('@square') || id.includes('payment')) {
            return 'payment-vendor';
          }
          
          // Charts and visualization
          if (id.includes('recharts') || id.includes('framer-motion')) {
            return 'charts-vendor';
          }
          
          // Dashboard pages
          if (id.includes('/dashboard/') && id.includes('.tsx')) {
            return 'dashboard-pages';
          }
          
          // Admin pages
          if (id.includes('/admin/') && id.includes('.tsx')) {
            return 'admin-pages';
          }
          
          // Core pages
          if (id.includes('/pages/') && id.includes('.tsx')) {
            return 'core-pages';
          }
          
          // Utility libraries
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('uuid')) {
            return 'utils-vendor';
          }
          
          // Default vendor chunk for other node_modules
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
