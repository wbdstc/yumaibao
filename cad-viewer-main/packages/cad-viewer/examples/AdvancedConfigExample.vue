<!--
  高级配置示例
  展示CAD查看器的高级配置选项和自定义功能
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
import { ElMessage, ElSwitch, ElSelect, ElOption, ElColorPicker } from 'element-plus'

// 查看器配置选项
const viewerOptions = ref({
  // 基本配置
  locale: 'zh',
  theme: 'light',
  themeColor: '#409eff',
  
  // 工具栏配置
  isShowToolbar: true,
  toolbarPosition: 'top',
  
  // 坐标信息配置
  isShowCoordinate: true,
  coordinatePosition: 'bottom-left',
  
  // 测量工具配置
  isShowMeasurementTools: true,
  
  // 性能配置
  autoFit: true,
  renderQuality: 'high',
  
  // 功能配置
  allowZoom: true,
  allowPan: true,
  allowRotation: true,
  
  // 信息面板配置
  isShowInfoPanel: false,
  infoPanelPosition: 'right',
  
  // 默认比例
  defaultScale: 100,
  
  // 网格配置
  isShowGrid: false,
  gridSize: 50
})

// 演示URL
const demoUrl = ref('https://example.com/sample.dwg')

// 加载状态
const isLoading = ref(false)
const loadError = ref<string | null>(null)

// 事件处理函数
const handleViewerReady = () => {
  ElMessage.success('CAD查看器已成功初始化')
  isLoading.value = false
}

const handleFileLoaded = (event: { fileName: string; filePath: string; fileSize: number }) => {
  ElMessage.success(`文件加载成功: ${event.fileName}`)
}

const handleFileLoadError = (error: Error) => {
  loadError.value = error.message
  ElMessage.error(`文件加载失败: ${error.message}`)
  isLoading.value = false
}

const handleZoomChanged = (zoom: number) => {
  // 可以在这里处理缩放变化事件
  console.log('缩放级别变更:', zoom)
}

const handlePositionChanged = (position: { x: number; y: number; z: number }) => {
  // 可以在这里处理位置变化事件
  console.log('位置变更:', position)
}

const handleMeasurement = (result: { type: string; value: number; unit: string }) => {
  // 可以在这里处理测量结果
  ElMessage.info(`测量结果: ${result.value} ${result.unit} (${result.type})`)
}

// 自定义操作方法
const viewerRef = ref<InstanceType<typeof MlCadViewer> | null>(null)

const resetView = () => {
  if (viewerRef.value) {
    viewerRef.value.resetView()
    ElMessage.success('视图已重置')
  }
}

const zoomIn = () => {
  if (viewerRef.value) {
    viewerRef.value.zoomIn()
  }
}

const zoomOut = () => {
  if (viewerRef.value) {
    viewerRef.value.zoomOut()
  }
}

const fitToView = () => {
  if (viewerRef.value) {
    viewerRef.value.fitToView()
    ElMessage.success('已适应视图')
  }
}

const exportAsImage = async () => {
  if (viewerRef.value) {
    try {
      // 假设组件提供了导出图片的方法
      // const dataUrl = await viewerRef.value.exportAsPNG()
      // console.log('导出图片:', dataUrl)
      ElMessage.success('图片导出功能演示（实际项目中需根据组件API实现）')
    } catch (error) {
      ElMessage.error('图片导出失败')
    }
  }
}

// 组件挂载后初始化
onMounted(() => {
  isLoading.value = true
})

// 切换主题颜色
const handleThemeChange = () => {
  // 更新主题相关样式
  document.body.style.setProperty('--primary-color', viewerOptions.value.themeColor)
  ElMessage.info(`主题颜色已更新为 ${viewerOptions.value.themeColor}`)
}

// 模拟加载
const simulateLoad = () => {
  isLoading.value = true
  loadError.value = null
  
  // 模拟加载延迟
  setTimeout(() => {
    isLoading.value = false
    ElMessage.success('演示加载完成')
  }, 1000)
}
</script>

<template>
  <div class="example-container">
    <h2>高级配置示例</h2>
    <p>此示例展示如何通过各种配置选项自定义CAD查看器的外观和行为。</p>
    
    <!-- 配置面板 -->
    <div class="config-panel">
      <h3>查看器配置</h3>
      
      <div class="config-row">
        <span class="config-label">主题颜色:</span>
        <el-color-picker
          v-model="viewerOptions.themeColor"
          show-alpha
          size="small"
          @change="handleThemeChange"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">工具栏:</span>
        <el-switch
          v-model="viewerOptions.isShowToolbar"
          active-text="显示"
          inactive-text="隐藏"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row" v-if="viewerOptions.isShowToolbar">
        <span class="config-label">工具栏位置:</span>
        <el-select
          v-model="viewerOptions.toolbarPosition"
          size="small"
          style="width: 120px"
        >
          <el-option label="顶部" value="top" />
          <el-option label="底部" value="bottom" />
          <el-option label="左侧" value="left" />
          <el-option label="右侧" value="right" />
        </el-select>
      </div>
      
      <div class="config-row">
        <span class="config-label">坐标信息:</span>
        <el-switch
          v-model="viewerOptions.isShowCoordinate"
          active-text="显示"
          inactive-text="隐藏"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">测量工具:</span>
        <el-switch
          v-model="viewerOptions.isShowMeasurementTools"
          active-text="显示"
          inactive-text="隐藏"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">自动适应:</span>
        <el-switch
          v-model="viewerOptions.autoFit"
          active-text="开启"
          inactive-text="关闭"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">渲染质量:</span>
        <el-select
          v-model="viewerOptions.renderQuality"
          size="small"
          style="width: 120px"
        >
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
        </el-select>
      </div>
      
      <div class="config-row">
        <span class="config-label">允许缩放:</span>
        <el-switch
          v-model="viewerOptions.allowZoom"
          active-text="允许"
          inactive-text="禁止"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">允许平移:</span>
        <el-switch
          v-model="viewerOptions.allowPan"
          active-text="允许"
          inactive-text="禁止"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">允许旋转:</span>
        <el-switch
          v-model="viewerOptions.allowRotation"
          active-text="允许"
          inactive-text="禁止"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="config-row">
        <span class="config-label">显示网格:</span>
        <el-switch
          v-model="viewerOptions.isShowGrid"
          active-text="显示"
          inactive-text="隐藏"
          inline-prompt
          size="small"
        />
      </div>
      
      <div class="action-buttons">
        <button @click="simulateLoad" :disabled="isLoading">模拟加载</button>
        <button @click="resetView">重置视图</button>
        <button @click="zoomIn">放大</button>
        <button @click="zoomOut">缩小</button>
        <button @click="fitToView">适应视图</button>
        <button @click="exportAsImage">导出图片</button>
      </div>
    </div>
    
    <!-- 加载状态和错误信息 -->
    <div v-if="isLoading" class="loading-message">
      正在初始化查看器，请稍候...
    </div>
    
    <div v-if="loadError" class="error-message">
      <strong>错误：</strong>{{ loadError }}
    </div>
    
    <!-- CAD查看器 -->
    <div class="viewer-wrapper">
      <MlCadViewer
        ref="viewerRef"
        :locale="viewerOptions.locale"
        :url="demoUrl"
        :is-show-toolbar="viewerOptions.isShowToolbar"
        :toolbar-position="viewerOptions.toolbarPosition"
        :is-show-coordinate="viewerOptions.isShowCoordinate"
        :coordinate-position="viewerOptions.coordinatePosition"
        :is-show-measurement-tools="viewerOptions.isShowMeasurementTools"
        :auto-fit="viewerOptions.autoFit"
        :allow-zoom="viewerOptions.allowZoom"
        :allow-pan="viewerOptions.allowPan"
        :allow-rotation="viewerOptions.allowRotation"
        :is-show-grid="viewerOptions.isShowGrid"
        :grid-size="viewerOptions.gridSize"
        @ready="handleViewerReady"
        @file-loaded="handleFileLoaded"
        @file-load-error="handleFileLoadError"
        @zoom-changed="handleZoomChanged"
        @position-changed="handlePositionChanged"
        @measurement="handleMeasurement"
      />
    </div>
    
    <div class="usage-hint">
      <h3>高级功能说明：</h3>
      <ul>
        <li><strong>事件监听：</strong>示例中展示了如何监听查看器的各种事件，如文件加载、缩放变化等</li>
        <li><strong>API调用：</strong>通过组件引用调用内置方法，如重置视图、放大缩小等</li>
        <li><strong>自定义配置：</strong>演示了查看器的各种配置选项，可根据实际需求调整</li>
        <li><strong>主题定制：</strong>展示如何自定义主题颜色，与项目样式保持一致</li>
        <li><strong>权限控制：</strong>可控制用户是否能执行缩放、平移、旋转等操作</li>
      </ul>
      
      <h3>集成提示：</h3>
      <ul>
        <li>在实际项目中，可以将这些配置选项保存在用户配置中，实现个性化体验</li>
        <li>对于复杂场景，可以扩展组件功能，添加自定义工具和操作</li>
        <li>性能优化：对于大型CAD文件，建议降低渲染质量并禁用部分非必要功能</li>
      </ul>
    </div>
  </div>
</template>

<style>
/* 全局主题变量 */
:root {
  --primary-color: #409eff;
}
</style>

<style scoped>
.example-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.config-panel {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
}

.config-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
  font-weight: 500;
}

.config-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 5px 0;
}

.config-label {
  width: 120px;
  font-size: 14px;
  color: #606266;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.action-buttons button {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
}

.action-buttons button:hover:not(:disabled) {
  background-color: #66b1ff;
}

.action-buttons button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.loading-message {
  background-color: #f0f9ff;
  color: #409eff;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #bae7ff;
  text-align: center;
}

.error-message {
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #fbc4c4;
}

.viewer-wrapper {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
  background-color: #ffffff;
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
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

.usage-hint ul {
  margin-top: 8px;
  margin-bottom: 15px;
}

.usage-hint li {
  margin-bottom: 5px;
  color: #606266;
  line-height: 1.5;
}
</style>