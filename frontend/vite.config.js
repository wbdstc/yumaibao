import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 设置正确的公共路径，确保构建后的资源路径正确
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        // 确保代理正确处理所有请求方法
        bypass: function (req, res, proxyOptions) {
          // 添加调试日志
          console.log(`Proxy request: ${req.method} ${req.url}`);
          console.log(`Proxy target: ${proxyOptions.target}`);
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia', 'element-plus'],
          'three': ['three'],
          'dxf': ['dxf-parser']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'dxf-parser']
  }
})
