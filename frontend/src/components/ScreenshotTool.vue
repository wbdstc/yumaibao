<template>
  <div class="screenshot-tool">
    <!-- Screenshot preview area -->
    <div 
      class="screenshot-container" 
      ref="containerRef"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
    >
      <img 
        v-if="screenshotData"
        :src="screenshotData"
        class="screenshot-image"
        ref="imageRef"
      />
      
      <!-- Selection box for cropping -->
      <div 
        v-if="isSelecting && selectionBox"
        class="selection-box"
        :style="selectionBoxStyle"
      ></div>
      
      <!-- Markers on the screenshot -->
      <div 
        v-for="(marker, index) in markers"
        :key="marker.id"
        class="screenshot-marker"
        :style="{ left: marker.x + 'px', top: marker.y + 'px' }"
        @click.stop="selectMarker(marker)"
      >
        <span class="marker-label">{{ index + 1 }}</span>
      </div>
      
      <!-- No screenshot placeholder -->
      <div v-if="!screenshotData" class="screenshot-placeholder">
        <el-icon size="48"><Picture /></el-icon>
        <p>点击下方按钮截取CAD视图</p>
      </div>
    </div>
    
    <!-- Toolbar -->
    <div class="screenshot-toolbar">
      <el-button-group>
        <el-button type="primary" @click="captureScreenshot" :loading="capturing">
          <el-icon><Camera /></el-icon>
          截图
        </el-button>
        <el-button 
          @click="toggleCropMode" 
          :type="isCropMode ? 'success' : 'default'"
          :disabled="!screenshotData"
        >
          <el-icon><Crop /></el-icon>
          裁剪
        </el-button>
        <el-button 
          @click="toggleMarkMode" 
          :type="isMarkMode ? 'success' : 'default'"
          :disabled="!screenshotData"
        >
          <el-icon><Location /></el-icon>
          标记
        </el-button>
      </el-button-group>
      
      <el-button-group>
        <el-button @click="clearMarkers" :disabled="markers.length === 0">
          <el-icon><Delete /></el-icon>
          清除标记
        </el-button>
        <el-button type="success" @click="saveScreenshot" :disabled="!screenshotData">
          <el-icon><Download /></el-icon>
          保存
        </el-button>
      </el-button-group>
    </div>
    
    <!-- View parameters display -->
    <div v-if="screenshotData" class="view-params">
      <h4>视图参数</h4>
      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">缩放:</span>
          <span class="param-value">{{ viewParams.zoom?.toFixed(2) || '1.00' }}x</span>
        </div>
        <div class="param-item">
          <span class="param-label">偏移X:</span>
          <span class="param-value">{{ viewParams.offsetX?.toFixed(1) || '0' }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">偏移Y:</span>
          <span class="param-value">{{ viewParams.offsetY?.toFixed(1) || '0' }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">旋转:</span>
          <span class="param-value">{{ viewParams.rotation?.toFixed(1) || '0' }}°</span>
        </div>
      </div>
    </div>
    
    <!-- Screenshot history gallery -->
    <div v-if="history.length > 0" class="screenshot-history">
      <h4>历史截图 ({{ history.length }})</h4>
      <div class="history-gallery">
        <div 
          v-for="(item, index) in history"
          :key="item.timestamp"
          class="history-item"
          :class="{ active: selectedHistoryIndex === index }"
          @click="loadFromHistory(index)"
        >
          <img :src="item.imageData" :alt="'截图 ' + (index + 1)" />
          <span class="history-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { Picture, Camera, Crop, Location, Delete, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps({
  // The CAD canvas element or viewer reference to capture
  sourceCanvas: {
    type: Object,
    default: null
  },
  // Current view parameters from the CAD viewer
  currentViewParams: {
    type: Object,
    default: () => ({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    })
  }
})

// Emits
const emit = defineEmits([
  'screenshot-taken',
  'markers-updated',
  'screenshot-saved'
])

// Refs
const containerRef = ref(null)
const imageRef = ref(null)

// State
const screenshotData = ref(null)
const viewParams = reactive({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0
})
const markers = ref([])
const history = ref([])
const selectedHistoryIndex = ref(-1)

// Mode states
const capturing = ref(false)
const isCropMode = ref(false)
const isMarkMode = ref(false)
const isSelecting = ref(false)

// Selection box for cropping
const selectionBox = ref(null)
const selectionStart = ref({ x: 0, y: 0 })

// Computed
const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {}
  
  const { x, y, width, height } = selectionBox.value
  return {
    left: x + 'px',
    top: y + 'px',
    width: width + 'px',
    height: height + 'px'
  }
})

// Methods
const captureScreenshot = async () => {
  capturing.value = true
  
  try {
    let canvas = null
    
    // Try to get canvas from source
    if (props.sourceCanvas) {
      if (props.sourceCanvas instanceof HTMLCanvasElement) {
        canvas = props.sourceCanvas
      } else if (props.sourceCanvas.$el) {
        // Vue component reference
        canvas = props.sourceCanvas.$el.querySelector('canvas')
      } else if (typeof props.sourceCanvas.getCanvas === 'function') {
        // Custom getter method
        canvas = props.sourceCanvas.getCanvas()
      }
    }
    
    // Fallback: find canvas in parent
    if (!canvas) {
      const parentElement = containerRef.value?.parentElement
      if (parentElement) {
        canvas = parentElement.querySelector('.ml-cad-canvas canvas') ||
                 parentElement.querySelector('canvas')
      }
    }
    
    if (!canvas) {
      ElMessage.warning('未找到CAD画布，请确保CAD视图已加载')
      return
    }
    
    // Capture the canvas
    screenshotData.value = canvas.toDataURL('image/png')
    
    // Save current view parameters
    Object.assign(viewParams, props.currentViewParams)
    
    // Clear markers for new screenshot
    markers.value = []
    
    emit('screenshot-taken', {
      imageData: screenshotData.value,
      viewParams: { ...viewParams },
      timestamp: new Date()
    })
    
    ElMessage.success('截图成功')
    
  } catch (error) {
    console.error('Screenshot capture failed:', error)
    ElMessage.error('截图失败: ' + error.message)
  } finally {
    capturing.value = false
  }
}

const toggleCropMode = () => {
  isCropMode.value = !isCropMode.value
  if (isCropMode.value) {
    isMarkMode.value = false
  }
}

const toggleMarkMode = () => {
  isMarkMode.value = !isMarkMode.value
  if (isMarkMode.value) {
    isCropMode.value = false
  }
}

const handleMouseDown = (e) => {
  if (!screenshotData.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  if (isCropMode.value) {
    isSelecting.value = true
    selectionStart.value = { x, y }
    selectionBox.value = { x, y, width: 0, height: 0 }
  } else if (isMarkMode.value) {
    addMarker(x, y)
  }
}

const handleMouseMove = (e) => {
  if (!isSelecting.value || !isCropMode.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const currentX = e.clientX - rect.left
  const currentY = e.clientY - rect.top
  
  const x = Math.min(selectionStart.value.x, currentX)
  const y = Math.min(selectionStart.value.y, currentY)
  const width = Math.abs(currentX - selectionStart.value.x)
  const height = Math.abs(currentY - selectionStart.value.y)
  
  selectionBox.value = { x, y, width, height }
}

const handleMouseUp = async (e) => {
  if (!isSelecting.value || !isCropMode.value) return
  
  isSelecting.value = false
  
  if (selectionBox.value && selectionBox.value.width > 10 && selectionBox.value.height > 10) {
    await cropScreenshot()
  }
  
  selectionBox.value = null
}

const cropScreenshot = async () => {
  if (!selectionBox.value || !screenshotData.value) return
  
  try {
    const img = new Image()
    img.src = screenshotData.value
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    
    const containerRect = containerRef.value.getBoundingClientRect()
    const scaleX = img.width / containerRect.width
    const scaleY = img.height / containerRect.height
    
    const canvas = document.createElement('canvas')
    canvas.width = selectionBox.value.width * scaleX
    canvas.height = selectionBox.value.height * scaleY
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      img,
      selectionBox.value.x * scaleX,
      selectionBox.value.y * scaleY,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    )
    
    screenshotData.value = canvas.toDataURL('image/png')
    
    // Adjust markers for crop offset
    markers.value = markers.value.filter(marker => {
      return marker.x >= selectionBox.value.x &&
             marker.x <= selectionBox.value.x + selectionBox.value.width &&
             marker.y >= selectionBox.value.y &&
             marker.y <= selectionBox.value.y + selectionBox.value.height
    }).map(marker => ({
      ...marker,
      x: marker.x - selectionBox.value.x,
      y: marker.y - selectionBox.value.y
    }))
    
    ElMessage.success('裁剪完成')
    
  } catch (error) {
    console.error('Crop failed:', error)
    ElMessage.error('裁剪失败')
  }
}

const addMarker = (x, y) => {
  const marker = {
    id: Date.now(),
    x,
    y,
    label: markers.value.length + 1
  }
  
  markers.value.push(marker)
  
  emit('markers-updated', [...markers.value])
}

const selectMarker = (marker) => {
  // Could be used for editing or highlighting
  console.log('Selected marker:', marker)
}

const clearMarkers = () => {
  markers.value = []
  emit('markers-updated', [])
}

const saveScreenshot = () => {
  if (!screenshotData.value) return
  
  // Save to history
  const historyItem = {
    imageData: screenshotData.value,
    viewParams: { ...viewParams },
    markers: [...markers.value],
    timestamp: new Date()
  }
  
  history.value.unshift(historyItem)
  
  // Keep only last 10 screenshots
  if (history.value.length > 10) {
    history.value.pop()
  }
  
  emit('screenshot-saved', historyItem)
  
  ElMessage.success('截图已保存')
}

const loadFromHistory = (index) => {
  const item = history.value[index]
  if (!item) return
  
  screenshotData.value = item.imageData
  Object.assign(viewParams, item.viewParams)
  markers.value = [...item.markers]
  selectedHistoryIndex.value = index
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// Expose methods
defineExpose({
  captureScreenshot,
  getScreenshotData: () => screenshotData.value,
  getMarkers: () => [...markers.value],
  getViewParams: () => ({ ...viewParams }),
  clearAll: () => {
    screenshotData.value = null
    markers.value = []
    Object.assign(viewParams, { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })
  }
})
</script>

<style scoped>
.screenshot-tool {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.screenshot-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin: 12px;
  min-height: 300px;
}

.screenshot-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.screenshot-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.screenshot-placeholder p {
  margin-top: 12px;
  font-size: 14px;
}

.selection-box {
  position: absolute;
  border: 2px dashed #409eff;
  background: rgba(64, 158, 255, 0.1);
  pointer-events: none;
}

.screenshot-marker {
  position: absolute;
  width: 24px;
  height: 24px;
  background: #ff4444;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.screenshot-marker:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.marker-label {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.screenshot-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.view-params {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.view-params h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.param-item {
  display: flex;
  flex-direction: column;
}

.param-label {
  font-size: 12px;
  color: #909399;
}

.param-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.screenshot-history {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.screenshot-history h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}

.history-gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.history-item {
  flex-shrink: 0;
  width: 80px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.history-item.active {
  border-color: #409eff;
}

.history-item:hover {
  border-color: #66b1ff;
}

.history-item img {
  width: 100%;
  height: 60px;
  object-fit: cover;
}

.history-time {
  display: block;
  font-size: 11px;
  color: #909399;
  text-align: center;
  padding: 4px;
  background: #f5f7fa;
}
</style>
