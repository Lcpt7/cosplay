import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // 读取所有环境变量（含无 VITE_ 前缀的，仅用于 Vite 服务端代理，不注入浏览器 bundle）
  const env = loadEnv(mode, process.cwd(), '');

  // 构造 Basic Auth header —— 只在 Vite dev proxy 层使用，不会进入浏览器代码
  const authHeader =
    env.ST_BASIC_USER && env.ST_BASIC_PASS && env.ST_BASIC_USER !== 'your_username'
      ? 'Basic ' + Buffer.from(`${env.ST_BASIC_USER}:${env.ST_BASIC_PASS}`).toString('base64')
      : '';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/st-api': {
          target: 'http://8.217.107.14:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/st-api/, ''),
          headers: authHeader ? { Authorization: authHeader } : {},
          cookieDomainRewrite: 'localhost',
        },
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
          },
        },
      },
    },
  };
});