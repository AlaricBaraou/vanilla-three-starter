import path from 'path';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps:{
    esbuildOptions:{
      target: ['es2022', 'chrome90', 'firefox90', 'safari15'],
    }
  },
  server: {
    port: 4000,
  },
  plugins: [glsl()],
});
