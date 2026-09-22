import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  root: 'public',
  envDir: '../',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        dashboard: resolve(__dirname, 'public/pages/dashboard.html'),
        dietPlan: resolve(__dirname, 'public/pages/diet-plan.html'),
        injuryPrevention: resolve(__dirname, 'public/pages/injury-prevention.html'),
        mentalHealth: resolve(__dirname, 'public/pages/mental-health.html'),
        yoyoTest: resolve(__dirname, 'public/pages/yoyo-test.html'),
        assessment: resolve(__dirname, 'public/pages/assessment.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
