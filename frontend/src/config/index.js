// src/config/index.js

// 应用配置
const config = {
  // 静态资源路径配置
  assets: {
    // 基础路径
    baseUrl: import.meta.env.VITE_APP_BASE_URL || './',
    // 字体文件路径
    fontsUrl: './fonts/',
    // Worker文件路径
    workersUrl: './assets/',
    // 模型文件路径
    modelsUrl: './models/'
  },
  
  // API配置
  api: {
    baseUrl: '/api',
    timeout: 10000
  },
  
  // CAD查看器配置
        cadViewer: {
          // 字体配置
          defaultFont: 'Arial',
          // 字体回退机制
          fontFallbacks: ['Arial', 'Helvetica', 'sans-serif'],
          // 基本配置
          maxEntities: 1000000,
          // UI配置
          showFullUI: false,
          showFileName: false,
          showToolbars: false,
          showStatusBar: false
        },
  
  // 国际化配置
  i18n: {
    defaultLocale: 'zh',
    fallbackLocale: 'zh',
    // 缺失翻译键值的默认消息
    missingTranslationMessage: '翻译缺失',
    // 支持的语言
    supportedLanguages: ['zh', 'en']
  },
  
  // 错误处理配置
  error: {
    // 是否显示详细错误信息
    showDetailedErrors: true,
    // 错误提示持续时间（毫秒）
    messageDuration: 3000
  },
  
  // 日志配置
  logging: {
    // 是否启用详细日志
    verbose: true,
    // 日志级别
    level: 'info' // debug, info, warn, error
  }
}

// 导出配置
export default config
