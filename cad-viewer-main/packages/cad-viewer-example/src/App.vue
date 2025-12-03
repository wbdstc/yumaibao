<template>
  <div id="app-root">
    <!-- 使用我们实现的DWG/DXF查看器组件 -->
    <SimpleDwgDxfViewer />
  </div>
</template>

<script setup lang="ts">
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import SimpleDwgDxfViewer from './components/SimpleDwgDxfViewer.vue'

// 初始化设置 - 确保工具栏和缩放功能可用
AcApSettingManager.instance.isShowCommandLine = false
AcApSettingManager.instance.isShowToolbar = true  // 启用工具栏
AcApSettingManager.instance.isShowCoordinate = true  // 显示坐标，帮助用户定位
// AcApSettingManager.instance.isShowStats = true  // 可选：显示性能统计
</script>

<style scoped>
#app-root {
  height: 100vh;
  width: 100vw;
  position: fixed;
  overflow: hidden;
}
</style>
