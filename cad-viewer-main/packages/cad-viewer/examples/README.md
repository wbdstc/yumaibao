# CAD Viewer 组件使用示例

本目录包含了如何在不同场景下使用 CAD Viewer 组件的示例代码。这些示例展示了组件的各种功能和配置选项，帮助开发者快速集成到自己的项目中。

## 示例列表

1. **BasicExample.vue** - 基础使用示例
   - 展示组件的基本导入和使用方法
   - 包含简单的配置和基本功能演示

2. **UrlExample.vue** - 远程文件加载示例
   - 展示如何通过URL加载远程CAD文件
   - 包含URL输入控制、加载状态管理和错误处理

3. **LocalFileExample.vue** - 本地文件上传示例
   - 展示如何通过文件选择器上传本地CAD文件
   - 包含拖放功能、文件验证和状态管理

4. **AdvancedConfigExample.vue** - 高级配置示例
   - 展示组件的高级配置选项和自定义功能
   - 包含主题定制、事件监听和API调用示例

## 如何运行示例

### 方法一：在已有Vue项目中运行

1. 确保您的项目中已经安装了CAD Viewer组件和必要的依赖：

```bash
# 安装CAD Viewer组件
npm install @mlightcad/cad-viewer

# 或使用yarn
# yarn add @mlightcad/cad-viewer

# 或使用pnpm
# pnpm add @mlightcad/cad-viewer

# 安装Element Plus（示例中使用的UI库）
npm install element-plus

# 或使用yarn
# yarn add element-plus

# 或使用pnpm
# pnpm add element-plus
```

2. 将示例文件复制到您的Vue项目的components或views目录下

3. 在您的路由配置中添加示例页面路由

4. 启动开发服务器并访问示例页面

### 方法二：创建一个简单的演示项目

```bash
# 创建一个Vue项目
npm create vite@latest cad-viewer-demo -- --template vue-ts

# 进入项目目录
cd cad-viewer-demo

# 安装依赖
npm install

# 安装CAD Viewer组件和Element Plus
npm install @mlightcad/cad-viewer element-plus

# 将示例文件复制到src/components目录

# 修改App.vue以使用示例组件
```

## 使用示例说明

每个示例文件都包含了详细的注释，解释了代码的功能和使用方法。您可以根据自己的需求修改示例代码。

### 导入和基本配置

所有示例都遵循类似的导入模式：

```typescript
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
```

### 组件属性配置

每个示例展示了不同的属性配置，可以根据实际需求组合使用。请参考README_INTEGRATION.md文件获取完整的属性和事件列表。

### 自定义样式

示例中包含了一些自定义样式，您可以根据自己项目的UI设计进行调整。

## 常见问题

### 问题：组件无法正常显示

**解决方案：**
- 确保正确导入了组件和CSS文件
- 检查是否提供了有效的文件URL或本地文件
- 确保容器元素有明确的高度设置

### 问题：文件加载失败

**解决方案：**
- 检查文件格式是否为支持的DWG或DXF格式
- 对于远程文件，检查URL是否正确且可访问
- 对于本地文件，检查文件是否损坏或过大

### 问题：性能问题

**解决方案：**
- 对于大型CAD文件，考虑降低渲染质量
- 禁用不必要的功能如坐标显示、网格等
- 确保您的设备满足最低硬件要求

## 更多信息

- 完整的使用文档：[README_INTEGRATION.md](../README_INTEGRATION.md)
- 组件API文档：请参考组件的TypeScript类型定义

## 注意事项

- 这些示例仅供参考，实际使用时请根据您的项目需求进行调整
- 示例中使用的URL可能无法访问，请替换为您自己的有效文件URL
- 示例中使用的文件可能不真实存在，仅用于演示功能
- 请确保在生产环境中添加适当的错误处理和用户提示