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
    },
    // 添加中间件确保worker文件被正确提供
    middleware: [
      function (req, res, next) {
        // 如果请求的是worker文件，确保从node_modules目录提供
        if (req.url.includes('mtext-renderer-worker.js') || req.url.includes('libredwg-parser-worker.js') || req.url.includes('dxf-parser-worker.js')) {
          const fs = require('fs');
          const path = require('path');
          
          // 构建worker文件的完整路径
          let workerPath;
          if (req.url.includes('mtext-renderer-worker.js')) {
            workerPath = path.join(__dirname, 'node_modules', '@mlightcad', 'cad-simple-viewer', 'dist', 'mtext-renderer-worker.js');
          } else if (req.url.includes('libredwg-parser-worker.js')) {
            workerPath = path.join(__dirname, 'node_modules', '@mlightcad', 'cad-simple-viewer', 'dist', 'libredwg-parser-worker.js');
          } else if (req.url.includes('dxf-parser-worker.js')) {
            workerPath = path.join(__dirname, 'node_modules', '@mlightcad', 'data-model', 'dist', 'dxf-parser-worker.js');
          }
          
          if (workerPath && fs.existsSync(workerPath)) {
            // 设置正确的MIME类型
            res.setHeader('Content-Type', 'application/javascript');
            // 读取并返回文件内容
            const content = fs.readFileSync(workerPath);
            res.end(content);
            return;
          }
        }
        next();
      }
    ]
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
              './node_modules/@mlightcad/cad-viewer/dist',
              './node_modules/@mlightcad/mtext-renderer/dist',
              './node_modules/@mlightcad/three-renderer/dist'
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
