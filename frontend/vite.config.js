import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/farmer': 'http://127.0.0.1:8000',
      '/logistics': 'http://127.0.0.1:8000',
      '/cold-storage': 'http://127.0.0.1:8000',
      '/buyer': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/containers': 'http://127.0.0.1:8000',
      '/spoilage': 'http://127.0.0.1:8000',
      '/marine': 'http://127.0.0.1:8000',
      '/disputes': 'http://127.0.0.1:8000',
      '/telemetry': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/shipments': 'http://127.0.0.1:8000',
      '/incidents': 'http://127.0.0.1:8000',
      '/verification': 'http://127.0.0.1:8000',
      '/analytics': 'http://127.0.0.1:8000',
      '/multimodal': 'http://127.0.0.1:8000',
    }
  }
})

