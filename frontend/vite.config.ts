import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Pointing the Vite proxy to your live EC2 servers avoids all CORS headers 
        // issues by masking it as a local request in your browser
        target: 'http://13.233.111.228', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
