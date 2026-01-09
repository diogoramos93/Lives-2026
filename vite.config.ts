
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis do arquivo .env
  // Fix: Use project root '.' instead of process.cwd() to resolve typing error in certain environments
  const env = loadEnv(mode, '.', '');
  
  return {
    // ESSENCIAL: Garante que os caminhos no index.html sejam ./assets/... em vez de /assets/...
    base: './', 
    plugins: [react()],
    define: {
      // Injeta a API KEY para que o SDK do Google funcione corretamente
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ""),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
