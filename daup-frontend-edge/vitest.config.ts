import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/hub/**/*.test.ts', 'src/components/**/*.test.ts', 'src/components/**/*.test.tsx'],
    setupFiles: ['./src/test-setup.ts']
  }
});
