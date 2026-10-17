import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "preview" mode = un seul fichier HTML autonome (démo sans Firebase)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'preview' ? 'dist-preview' : 'dist', chunkSizeWarningLimit: 2000 },
}));
