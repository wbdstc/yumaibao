#!/usr/bin/env node

/**
 * CAD Viewer 组件安装脚本
 * 此脚本用于帮助用户快速安装 CAD Viewer 组件及其依赖
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// 打印带颜色的日志
function log(message, type = 'info') {
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    title: colors.magenta
  };
  
  const color = colorMap[type] || colors.reset;
  console.log(`${color}${message}${colors.reset}`);
}

// 检查是否在npm项目目录中
function isNpmProject() {
  return fs.existsSync('./package.json');
}

// 检测包管理器
function detectPackageManager() {
  // 检查lock文件
  if (fs.existsSync('./yarn.lock')) {
    return 'yarn';
  } else if (fs.existsSync('./pnpm-lock.yaml')) {
    return 'pnpm';
  } else if (fs.existsSync('./package-lock.json')) {
    return 'npm';
  } else {
    // 默认使用npm
    return 'npm';
  }
}

// 执行安装命令
function installPackages(packageManager, packages) {
  log(`\n正在使用 ${packageManager} 安装依赖...`, 'title');
  
  try {
    let command = '';
    
    switch (packageManager) {
      case 'npm':
        command = `npm install ${packages.join(' ')}`;
        break;
      case 'yarn':
        command = `yarn add ${packages.join(' ')}`;
        break;
      case 'pnpm':
        command = `pnpm add ${packages.join(' ')}`;
        break;
      default:
        throw new Error(`不支持的包管理器: ${packageManager}`);
    }
    
    log(`执行命令: ${command}`, 'info');
    execSync(command, { stdio: 'inherit' });
    log('依赖安装成功!', 'success');
    return true;
  } catch (error) {
    log(`依赖安装失败: ${error.message}`, 'error');
    return false;
  }
}

// 创建示例组件文件
function createExampleComponent() {
  const examplePath = path.join(process.cwd(), 'src', 'components', 'CadViewerExample.vue');
  
  // 检查目录是否存在
  const componentDir = path.dirname(examplePath);
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
    log(`创建目录: ${componentDir}`, 'info');
  }
  
  // 示例组件内容
  const exampleContent = `
<script setup>
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

// CAD文件URL (可替换为您的文件URL或本地文件)
const fileUrl = ref('')

// 加载状态
const isLoading = ref(false)
const loadError = ref(null)

// 处理文件加载
const handleFileLoaded = () => {
  isLoading.value = false
  loadError.value = null
}

// 处理加载错误
const handleFileLoadError = (error) => {
  isLoading.value = false
  loadError.value = error.message
}

// 加载演示文件
const loadDemoFile = () => {
  // 这里可以设置一个示例文件URL或本地文件
  // fileUrl.value = 'https://example.com/sample.dwg'
  isLoading.value = true
}
</script>

<template>
  <div class="cad-viewer-example">
    <h2>CAD Viewer 示例</h2>
    
    <div class="controls">
      <input 
        type="text" 
        v-model="fileUrl" 
        placeholder="输入DWG/DXF文件URL" 
      />
      <button @click="loadDemoFile" :disabled="isLoading">加载演示文件</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      正在加载CAD文件...
    </div>
    
    <div v-if="loadError" class="error">
      错误: {{ loadError }}
    </div>
    
    <div class="viewer-container">
      <MlCadViewer 
        :url="fileUrl"
        locale="zh"
        :is-show-toolbar="true"
        @file-loaded="handleFileLoaded"
        @file-load-error="handleFileLoadError"
      />
    </div>
  </div>
</template>

<style scoped>
.cad-viewer-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.loading {
  padding: 10px;
  background-color: #f0f9ff;
  color: #409eff;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error {
  padding: 10px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  margin-bottom: 20px;
}

.viewer-container {
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
</style>`;
  
  try {
    fs.writeFileSync(examplePath, exampleContent);
    log(`示例组件已创建: ${examplePath}`, 'success');
    return true;
  } catch (error) {
    log(`创建示例组件失败: ${error.message}`, 'error');
    return false;
  }
}

// 显示使用说明
function showUsageInstructions() {
  log('\nCAD Viewer 组件已成功安装！', 'success');
  log('==================================', 'title');
  log('接下来的步骤:', 'title');
  log('1. 在您的Vue项目中导入组件:', 'info');
  log('   import { MlCadViewer } from \'@mlightcad/cad-viewer\'', 'info');
  log('   import \'@mlightcad/cad-viewer/lib/index.css\'', 'info');
  log('\n2. 在组件中使用:', 'info');
  log('   <MlCadViewer :url="yourFileUrl" locale="zh" />', 'info');
  
  if (fs.existsSync(path.join(process.cwd(), 'src', 'components', 'CadViewerExample.vue'))) {
    log('\n3. 您可以参考示例组件: src/components/CadViewerExample.vue', 'info');
  }
  
  log('\n详细文档:', 'title');
  log('请查看项目中的 README_INTEGRATION.md 文件获取完整的使用指南', 'info');
}

// 主函数
function main() {
  log('==================================', 'title');
  log('CAD Viewer 组件安装助手', 'title');
  log('==================================', 'title');
  
  // 检查是否在npm项目目录中
  if (!isNpmProject()) {
    log('错误: 请在npm/yarn/pnpm项目目录中运行此脚本', 'error');
    log('您可以先创建Vue项目:', 'info');
    log('npm create vite@latest my-project -- --template vue-ts', 'info');
    log('然后进入项目目录再运行此脚本', 'info');
    process.exit(1);
  }
  
  // 检测包管理器
  const packageManager = detectPackageManager();
  log(`检测到包管理器: ${packageManager}`, 'info');
  
  // 定义要安装的包
  const packages = [
    '@mlightcad/cad-viewer',
    'element-plus' // 推荐的UI组件库
  ];
  
  // 安装包
  const installSuccess = installPackages(packageManager, packages);
  
  if (installSuccess) {
    // 创建示例组件
    createExampleComponent();
    
    // 显示使用说明
    showUsageInstructions();
  } else {
    log('\n安装失败，请手动安装依赖:', 'error');
    log(`${packageManager} install ${packages.join(' ')}`, 'info');
  }
}

// 运行主函数
main();