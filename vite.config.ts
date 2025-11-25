import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  base: '/Interface-web-comites/',
  plugins: [react()],
});
