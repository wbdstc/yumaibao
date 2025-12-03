# CAD Viewer 组件集成指南

本文档详细介绍如何将 `@mlightcad/cad-viewer` 组件集成到您的 Vue 项目中，用于查看和交互 DXF/DWG 格式的 CAD 文件。

## 目录

- [特性](#特性)
- [安装](#安装)
- [依赖要求](#依赖要求)
- [快速开始](#快速开始)
  - [在 Vue 应用中注册](#在-vue-应用中注册)
  - [基础用法](#基础用法)
- [组件属性](#组件属性)
- [事件处理](#事件处理)
- [高级配置](#高级配置)
- [国际化](#国际化)
- [主题定制](#主题定制)
- [常见问题](#常见问题)

## 特性

- 支持 DXF 和 DWG 文件格式的查看和交互
- 完整的工具栏支持（缩放、平移、选择等操作）
- 图层管理功能
- 命令行界面
- 多语言支持
- 深色/浅色主题切换
- 响应式设计，支持桌面和移动设备

## 安装

### 通过 npm/pnpm/yarn 安装

```bash
# 使用 pnpm
pnpm add @mlightcad/cad-viewer

# 使用 npm
npm install @mlightcad/cad-viewer

# 使用 yarn
yarn add @mlightcad/cad-viewer
```

### 安装依赖项

请确保安装以下必要的依赖项：

```bash
# 安装 Vue 3 相关依赖
pnpm add vue@^3.4.21 vue-i18n@^10.0.1 @vueuse/core@^11.1.0

# 安装 Element Plus UI 库
pnpm add element-plus@^2.9.1 @element-plus/icons-vue

# 安装 CAD 核心依赖
pnpm add @mlightcad/cad-simple-viewer @mlightcad/data-model
```

## 快速开始

### 在 Vue 应用中注册

#### 全局注册（在 main.ts 中）

```typescript
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

// 导入 CAD Viewer 组件和样式
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

const app = createApp(App)

// 注册 Element Plus
app.use(ElementPlus)

// 全局注册 CAD Viewer 组件
app.component('MlCadViewer', MlCadViewer)

app.mount('#app')
```

#### 局部注册（在组件中）

```vue
<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
</script>

<template>
  <MlCadViewer />
</template>
```

### 基础用法

#### 从 URL 加载 CAD 文件

```vue
<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
</script>

<template>
  <div class="cad-container">
    <h1>CAD 查看器示例</h1>
    <MlCadViewer 
      locale="zh" 
      :url="'https://example.com/drawing.dwg'"
      :is-show-toolbar="true"
      :is-show-coordinate="true"
    />
  </div>
</template>

<style scoped>
.cad-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

:deep(.ml-cad-viewer) {
  flex: 1;
  min-height: 0;
}
</style>
```

#### 从本地文件加载

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

const localFile = ref<File | null>(null)

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    localFile.value = target.files[0]
  }
}
</script>

<template>
  <div class="cad-container">
    <div class="file-upload">
      <input type="file" accept=".dwg,.dxf" @change="handleFileChange" />
      <span v-if="localFile">{{ localFile.name }}</span>
    </div>
    <MlCadViewer 
      locale="zh" 
      :local-file="localFile"
      :is-show-toolbar="true"
    />
  </div>
</template>
```

## 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `locale` | `string` | `'en'` | 语言设置，可选值：'en'（英文），'zh'（中文） |
| `url` | `string` | `null` | 远程 CAD 文件的 URL 地址 |
| `local-file` | `File` | `null` | 本地 CAD 文件对象 |
| `base-url` | `string` | `''` | 基础 URL，用于加载字体、模板等资源 |
| `is-show-toolbar` | `boolean` | `true` | 是否显示工具栏 |
| `is-show-coordinate` | `boolean` | `true` | 是否显示坐标信息 |
| `is-show-layer-panel` | `boolean` | `true` | 是否显示图层面板 |
| `is-show-command-line` | `boolean` | `true` | 是否显示命令行 |
| `is-show-status-bar` | `boolean` | `true` | 是否显示状态栏 |
| `dark-mode` | `boolean` | `false` | 是否启用深色模式 |

## 事件处理

组件提供了多种事件，可以用来处理文件加载状态、错误等：

```vue
<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
import { ElMessage } from 'element-plus'

const handleFileLoaded = () => {
  ElMessage.success('CAD 文件加载成功！')
}

const handleFileLoadError = (error: Error) => {
  ElMessage.error(`文件加载失败: ${error.message}`)
}

const handleMessage = (message: string) => {
  console.log('CAD Viewer 消息:', message)
}
</script>

<template>
  <MlCadViewer 
    locale="zh" 
    :url="'https://example.com/drawing.dwg'"
    @file-loaded="handleFileLoaded"
    @file-load-error="handleFileLoadError"
    @message="handleMessage"
  />
</template>
```

## 高级配置

### 自定义工具栏

您可以通过配置自定义工具栏中的按钮：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

// 自定义工具栏按钮配置
const toolbarConfig = ref({
  showZoomIn: true,
  showZoomOut: true,
  showPan: true,
  showSelect: true,
  showZoomToExtent: true,
  showZoomToBox: true,
  // 更多配置...
})
</script>

<template>
  <MlCadViewer 
    locale="zh" 
    :url="'https://example.com/drawing.dwg'"
    :toolbar-config="toolbarConfig"
  />
</template>
```

### 使用 Composition API

组件提供了多个 Composable 函数，方便在应用中使用 CAD 相关功能：

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { MlCadViewer, useLayers, useLayouts } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

// 使用图层管理
const { layers, setLayerVisible } = useLayers()

// 使用布局管理
const { layouts, setCurrentLayout } = useLayouts()

onMounted(() => {
  // 在组件挂载后操作图层
  setTimeout(() => {
    // 隐藏第一个图层
    if (layers.value.length > 0) {
      setLayerVisible(layers.value[0].name, false)
    }
  }, 2000)
})
</script>

<template>
  <MlCadViewer 
    locale="zh" 
    :url="'https://example.com/drawing.dwg'"
  />
</template>
```

## 国际化

组件支持英语和中文两种语言：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

const locale = ref('zh') // 'en' 或 'zh'

const toggleLocale = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}
</script>

<template>
  <div>
    <button @click="toggleLocale">切换语言</button>
    <MlCadViewer 
      :locale="locale"
      :url="'https://example.com/drawing.dwg'"
    />
  </div>
</template>
```

## 主题定制

支持深色和浅色主题切换：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

const darkMode = ref(false)

const toggleTheme = () => {
  darkMode.value = !darkMode.value
}
</script>

<template>
  <div>
    <button @click="toggleTheme">切换主题</button>
    <MlCadViewer 
      locale="zh"
      :dark-mode="darkMode"
      :url="'https://example.com/drawing.dwg'"
    />
  </div>
</template>
```

## 常见问题

### 1. 文件加载失败

- 检查文件 URL 是否正确
- 确保文件格式为 DWG 或 DXF
- 验证服务器是否设置了正确的 CORS 头（对于远程文件）
- 检查浏览器控制台是否有错误信息

### 2. 工具栏不显示

- 确保设置了 `is-show-toolbar="true"`
- 检查是否正确导入了样式文件 `@mlightcad/cad-viewer/lib/index.css`

### 3. 缩放功能不工作

- 确保工具栏已启用 `is-show-toolbar="true"`
- 尝试使用鼠标滚轮或触摸屏双指捏合进行缩放
- 检查浏览器是否阻止了鼠标事件

### 4. 组件尺寸问题

- 确保为组件容器设置了合适的宽度和高度
- 对于响应式布局，使用 CSS flex 或 grid 布局
- 避免在小屏幕上同时显示所有面板

## 开发和调试

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer

# 安装依赖
pnpm install

# 构建组件库
pnpm build:lib
```

### 调试技巧

- 使用浏览器开发工具检查组件结构和样式
- 启用 `sourcemap` 以获得更好的调试体验
- 监听 `message` 事件以获取组件内部消息

## 许可证

本组件基于 MIT 许可证开源。

---

更多详细信息，请参考 [GitHub 仓库](https://github.com/mlightcad/cad-viewer)。