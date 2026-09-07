import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/chart.js/') || id.includes('/node_modules/react-chartjs-2/')) {
            return 'charts'
          }
          if (id.includes('/node_modules/html2canvas/')) {
            return 'html2canvas'
          }
          if (id.includes('/node_modules/jspdf/') || id.includes('/node_modules/jspdf-autotable/')) {
            return 'documents'
          }
          if (id.includes('/node_modules/fflate/') || id.includes('/node_modules/file-saver/')) {
            return 'spreadsheets'
          }
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react'
          }
          if (id.includes('/node_modules/react-router/') || id.includes('/node_modules/react-router-dom/')) {
            return 'router'
          }
          if (id.includes('/node_modules/axios/')) {
            return 'network'
          }
          if (id.includes('/node_modules/')) {
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
