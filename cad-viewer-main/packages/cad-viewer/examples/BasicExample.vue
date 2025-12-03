<!--
  基础使用示例
  展示 CAD Viewer 组件的基本用法
-->
<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'

// 组件不需要复杂的逻辑设置，只需正确导入和使用即可
// 此示例展示最基本的使用方式，用户可以通过组件的文件对话框上传文件
</script>

<template>
  <div class="example-container">
    <h2>CAD Viewer 基础示例</h2>
    <p>这是 CAD Viewer 组件的最基础使用方式。您可以点击界面上的文件图标或拖放文件到窗口中来加载 DXF/DWG 文件。</p>
    
    <!-- 基本使用组件，只设置了语言和显示工具栏 -->
    <div class="viewer-wrapper">
      <MlCadViewer 
        locale="zh" 
        :is-show-toolbar="true"
        :is-show-coordinate="true"
      />
    </div>
    
    <div class="usage-hint">
      <h3>使用说明：</h3>
      <ul>
        <li>点击左上角的文件图标上传 CAD 文件</li>
        <li>或直接将 DXF/DWG 文件拖放到查看器区域</li>
        <li>使用工具栏按钮进行缩放、平移等操作</li>
        <li>在图层面板中控制图层的显示/隐藏</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.example-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.viewer-wrapper {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

:deep(.ml-cad-viewer) {
  width: 100%;
  height: 100%;
}

.usage-hint {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.usage-hint h3 {
  margin-top: 0;
  color: #333;
}

.usage-hint ul {
  margin: 10px 0;
  padding-left: 20px;
}
</style>