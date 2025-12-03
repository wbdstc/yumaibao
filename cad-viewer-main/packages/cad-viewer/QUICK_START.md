# CAD Viewer 组件快速入门指南

## 🚀 快速开始

本指南将帮助您快速在项目中集成 CAD Viewer 组件，用于查看 DWG/DXF 文件。

## 📦 安装方法

### 方法一：使用安装脚本（推荐）

我们提供了一个便捷的安装脚本，可自动安装组件及其依赖，并创建示例文件：

```bash
# 克隆仓库后在packages/cad-viewer目录下运行
node scripts/install-cad-viewer.js

# 或者直接从npm安装后运行（项目发布后）
# npx install-cad-viewer
```

### 方法二：手动安装

```bash
# 使用npm
npm install @mlightcad/cad-viewer

# 使用yarn
yarn add @mlightcad/cad-viewer

# 使用pnpm
pnpm add @mlightcad/cad-viewer
```

## 📝 基本使用

### 1. 导入组件

```javascript
// 在组件中导入
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
```

### 2. 注册组件

#### 在Vue 3 Composition API中使用

```vue
<script setup>
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

const fileUrl = ref('https://example.com/your-file.dwg')
</script>

<template>
  <div class="cad-viewer-container">
    <MlCadViewer 
      :url="fileUrl"
      locale="zh"
      :is-show-toolbar="true"
    />
  </div>
</template>

<style>
.cad-viewer-container {
  width: 100%;
  height: 600px;
}
</style>
```

#### 在Vue 3 Options API中使用

```vue
<script>
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

export default {
  components: {
    MlCadViewer
  },
  data() {
    return {
      fileUrl: 'https://example.com/your-file.dwg'
    }
  }
}
</script>

<template>
  <div class="cad-viewer-container">
    <MlCadViewer 
      :url="fileUrl"
      locale="zh"
      :is-show-toolbar="true"
    />
  </div>
</template>

<style>
.cad-viewer-container {
  width: 100%;
  height: 600px;
}
</style>
```

## 🎯 关键配置属性

| 属性名 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| `url` | String | null | 远程CAD文件URL |
| `localFile` | File | null | 本地CAD文件对象 |
| `locale` | String | 'zh' | 语言设置 ('zh' 或 'en') |
| `isShowToolbar` | Boolean | true | 是否显示工具栏 |
| `isShowCoordinate` | Boolean | true | 是否显示坐标信息 |
| `autoFit` | Boolean | true | 加载文件后是否自动适应视图 |
| `themeColor` | String | '#409eff' | 主题颜色 |

## 📂 示例代码

查看 `examples/` 目录中的示例：

- **BasicExample.vue** - 基础使用示例
- **UrlExample.vue** - 远程文件加载示例
- **LocalFileExample.vue** - 本地文件上传示例
- **AdvancedConfigExample.vue** - 高级配置示例

## ⚠️ 注意事项

1. 确保容器元素有明确的高度设置
2. 对于大型CAD文件，可能需要增加加载超时时间
3. 远程文件需要正确的CORS设置
4. 本地开发环境中，可能需要配置代理以避免CORS问题

## 📚 更多资源

- **完整文档**：查看 [README_INTEGRATION.md](./README_INTEGRATION.md)
- **示例说明**：查看 [examples/README.md](./examples/README.md)
- **TypeScript类型定义**：可在IDE中查看组件的类型提示

## ❓ 常见问题

### 问题：组件不显示或显示空白

**解决方案：**
- 检查容器元素是否有设置高度
- 确保正确导入了CSS文件
- 验证文件URL是否正确或本地文件是否存在

### 问题：文件加载失败

**解决方案：**
- 检查文件格式是否为DWG或DXF
- 验证文件是否损坏
- 检查网络连接和CORS设置

### 问题：性能较差

**解决方案：**
- 对于大型文件，尝试降低渲染质量
- 禁用不必要的功能如坐标显示
- 确保设备有足够的内存和处理能力

## 🛠️ 开发和调试

如果需要修改组件或开发，可以运行：

```bash
# 进入组件目录
cd packages/cad-viewer

# 安装依赖
pnpm install

# 构建组件库
pnpm build:lib
```

## 📦 发布到npm（维护者指南）

```bash
# 更新版本
npm version [patch|minor|major]

# 发布到npm
npm publish
```

---

祝您使用愉快！如有任何问题，请随时提交issue或联系技术支持。