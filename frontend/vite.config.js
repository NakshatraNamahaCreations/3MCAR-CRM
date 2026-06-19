import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Backend runs on 5003 (ports 5000/5001 taken by other local projects).
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
});
