# 独立运行CAD查看器指南

## 概述
CAD查看器可以作为独立应用运行，用于查看和测试DWG/DXF文件，而不依赖于完整的预埋宝系统。

## 快速运行步骤

### 方法1：运行官方示例项目（推荐）

1. **进入cad-viewer-example目录**
   ```bash
   cd d:\code\cad-viewer-main\cad-viewer-main\packages\cad-viewer-example
   ```

2. **安装依赖**
   ```bash
   yarn install
   ```
   或
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   yarn dev
   ```
   或
   ```bash
   npm run dev
   ```

4. **访问应用**
   打开浏览器，访问显示的本地地址，通常是 `http://localhost:5173`

### 方法2：运行简化示例项目

1. **进入cad-simple-viewer-example目录**
   ```bash
   cd d:\code\cad-viewer-main\cad-viewer-main\packages\cad-simple-viewer-example
   ```

2. **安装依赖并启动**
   ```bash
   yarn install && yarn dev
   ```

## 核心功能说明

### 1. 文件上传
- 支持拖放文件到上传区域
- 支持选择本地DWG/DXF文件
- 文件大小限制：取决于浏览器和服务器配置

### 2. 查看功能
- **缩放操作**：鼠标滚轮缩放，或使用工具栏缩放按钮
- **平移操作**：鼠标中键拖动，或使用工具栏平移按钮
- **旋转操作**：（仅3D模式）鼠标右键拖动
- **全屏显示**：点击工具栏全屏按钮

### 3. 工具栏功能
- **图层管理**：查看和切换图层显示状态
- **实体属性**：查看选中实体的详细属性
- **点样式设置**：调整点的显示样式
- **语言切换**：支持中英文切换
- **主题切换**：支持深色/浅色主题

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI框架**：Element Plus
- **3D渲染**：Three.js
- **CAD处理**：@mlightcad/cad-viewer核心库

## 项目结构

```
cad-viewer-example/
├── src/
│   ├── components/
│   │   └── SimpleDwgDxfViewer.vue  # 主要查看器组件
│   ├── App.vue                      # 应用入口
│   └── main.ts                      # 应用初始化
├── index.html                       # HTML模板
├── package.json                     # 项目配置
└── vite.config.ts                   # Vite配置
```

## 自定义配置

### 修改基础URL
在 `SimpleDwgDxfViewer.vue` 中修改：
```vue
<MlCadViewer
  base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
  :local-file="selectedFile"
/>
```

### 调整工具栏显示
```typescript
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

AcApSettingManager.instance.isShowCommandLine = false
AcApSettingManager.instance.isShowToolbar = true
AcApSettingManager.instance.isShowCoordinate = true
```

## 常见问题

### 1. 端口被占用
如果端口5173被占用，Vite会自动尝试其他端口，如5174、5175等。

### 2. 文件无法加载
- 确保文件格式正确（DWG或DXF）
- 检查文件大小，避免过大文件
- 查看浏览器控制台是否有错误信息

### 3. 渲染性能问题
- 对于大型文件，建议启用 `:useMainThreadDraw="false"`
- 确保浏览器支持Web Workers
- 升级浏览器到最新版本

## 扩展开发

如果需要扩展CAD查看器功能，可以：
1. 修改 `cad-viewer-main/packages/cad-viewer/src` 中的核心代码
2. 重新构建核心库：`npm run build:lib`
3. 在示例项目中测试修改效果

## 与预埋宝系统集成

CAD查看器已经集成到预埋宝系统中，位于：
- 前端：`yumaobao-frontend/src/views/BIMVisualization.vue`
- 使用：`import { MlCadViewer } from '@mlightcad/cad-viewer'`

您可以直接在该文件中修改CAD查看器的使用方式和配置。

## 总结

CAD查看器可以独立运行，方便进行功能测试和开发。通过运行示例项目，您可以快速了解CAD查看器的核心功能和使用方式。如果需要自定义功能，可以修改核心库代码并重新构建。