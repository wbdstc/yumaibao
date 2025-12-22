import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

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
        bypass: function(req, res, proxyOptions) {
          // 添加调试日志
          console.log(`Proxy request: ${req.method} ${req.url}`);
          console.log(`Proxy target: ${proxyOptions.target}`);
        }
      }
    },
    // 确保正确的MIME类型
    mimeTypes: {
      'application/javascript': ['js', 'mjs'],
      'text/css': ['css'],
      'image/png': ['png'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/gif': ['gif'],
      'image/x-icon': ['ico']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // 确保Web Worker正确处理
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia', 'element-plus'],
          'cad-viewer': ['@mlightcad/cad-viewer']
        }
      },
      // 添加插件确保worker文件被复制到assets目录
      plugins: [
        {
          name: 'copy-worker-files',
          writeBundle(options, bundle) {
            // 复制worker文件从node_modules到dist/assets
            const workerPaths = [
              './node_modules/@mlightcad/cad-simple-viewer/dist',
              './node_modules/@mlightcad/data-model/dist',
              './node_modules/@mlightcad/cad-viewer/dist'
            ];
            const distDir = path.join(__dirname, 'dist', 'assets');
            
            // 确保dist/assets目录存在
            if (!fs.existsSync(distDir)) {
              fs.mkdirSync(distDir, { recursive: true });
            }
            
            workerPaths.forEach(workerDir => {
              if (fs.existsSync(workerDir)) {
                const files = fs.readdirSync(workerDir);
                const workerFiles = files.filter(file => 
                  file.endsWith('-worker.js') || 
                  file.endsWith('worker.js')
                );
                
                for (const file of workerFiles) {
                  const src = path.join(workerDir, file);
                  const dest = path.join(distDir, file);
                  fs.copyFileSync(src, dest);
                  console.log(`Copied worker file: ${file} to assets`);
                }
              }
            });
          }
        }
      ]
    }
  },
  optimizeDeps: {
    include: ['@mlightcad/cad-viewer']
  }
})
