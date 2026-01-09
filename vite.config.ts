
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Fixed: Defining __dirname for ES modules compatibility.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    // ESSENCIAL: Caminhos relativos para produção no aaPanel
    base: './', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ""),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      cssCodeSplit: false, // Tenta manter o CSS junto se houver arquivos externos
      sourcemap: false,
      minify: 'esbuild',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
