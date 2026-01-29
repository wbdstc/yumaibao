<template>
  <div class="dual-view-canvas-wrapper" ref="wrapperRef">
    <!-- Slot for the underlying viewer (CAD or BIM) -->
    <slot></slot>
    
    <!-- Transparent canvas overlay - only intercepts when in picking mode -->
    <canvas 
      ref="canvasRef"
      class="interaction-canvas"
      :class="{ 'picking-mode': isPickingMode }"
      @click="handleClick"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
    ></canvas>
    
    <!-- Mode indicator and control buttons -->
    <div class="canvas-controls" v-if="showControls">
      <!-- Picking mode toggle -->
      <el-button 
        :type="isPickingMode ? 'primary' : 'default'"
        size="small"
        @click="togglePickingMode"
      >
        <el-icon><Aim /></el-icon>
        {{ isPickingMode ? '退出选点' : '开始选点' }}
      </el-button>
      
      <el-divider direction="vertical" />
      
      <el-button-group size="small">
        <el-button @click="clearAllPoints" :disabled="points.length === 0">
          <el-icon><Delete /></el-icon>
          清除
        </el-button>
        <el-button @click="undoLastPoint" :disabled="points.length === 0">
          <el-icon><RefreshLeft /></el-icon>
          撤销
        </el-button>
        <el-button @click="redoPoint" :disabled="redoStack.length === 0">
          <el-icon><RefreshRight /></el-icon>
          重做
        </el-button>
      </el-button-group>
      <div class="point-count" v-if="points.length > 0">
        已标记: {{ points.length }} 点
      </div>
    </div>
    
    <!-- Mode hint overlay -->
    <div class="mode-hint" v-if="isPickingMode">
      <el-icon><Aim /></el-icon>
      选点模式 - 点击图纸添加参考点
    </div>
    
    <!-- Reference axis display -->
    <div class="axis-display" v-if="showAxis">
      <div class="axis-x">X</div>
      <div class="axis-y">Y</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Delete, RefreshLeft, RefreshRight, Aim } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  // Whether to allow point selection
  enabled: {
    type: Boolean,
    default: true
  },
  // Maximum number of points allowed (0 = unlimited)
  maxPoints: {
    type: Number,
    default: 0
  },
  // Point marker style
  markerColor: {
    type: String,
    default: '#ff4444'
  },
  markerRadius: {
    type: Number,
    default: 8
  },
  // Whether to show control buttons
  showControls: {
    type: Boolean,
    default: true
  },
  // Whether to show axis reference
  showAxis: {
    type: Boolean,
    default: false
  },
  // Zoom factor from 2D viewer
  zoomFactor: {
    type: Number,
    default: 1
  },
  // Offset from 2D viewer
  viewOffset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

// Emits
const emit = defineEmits([
  'point-selected',    // When a point is clicked
  'point-removed',     // When a point is removed
  'points-cleared',    // When all points are cleared
  'mouse-move',        // Mouse position updates
  'coordinate-update'  // Real-time coordinate updates
])

// Refs
const wrapperRef = ref(null)
const canvasRef = ref(null)
let ctx = null
let animationFrameId = null

// State
const points = ref([])          // Array of {x, y, screenX, screenY, label}
const redoStack = ref([])       // For undo/redo functionality
const isDrawing = ref(false)
const currentMousePos = ref({ x: 0, y: 0 })
const hoveredPoint = ref(null)
const isPickingMode = ref(false)  // Whether we're in point picking mode

// Toggle picking mode
const togglePickingMode = () => {
  isPickingMode.value = !isPickingMode.value
}

// Computed
const canAddPoint = computed(() => {
  if (!props.enabled) return false
  if (props.maxPoints === 0) return true
  return points.value.length < props.maxPoints
})

// Initialize canvas
onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  
  // Start render loop
  startRenderLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// Watch for wrapper size changes
watch(() => wrapperRef.value, () => {
  nextTick(() => {
    handleResize()
  })
})

const initCanvas = () => {
  if (!canvasRef.value || !wrapperRef.value) return
  
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  
  // Set canvas size to match wrapper
  canvas.width = wrapper.clientWidth
  canvas.height = wrapper.clientHeight
  
  ctx = canvas.getContext('2d')
  
  // Enable smooth rendering
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

const handleResize = () => {
  initCanvas()
  redrawCanvas()
}

const handleKeyDown = (e) => {
  // Ctrl+Z for undo
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undoLastPoint()
  }
  // Ctrl+Shift+Z for redo
  if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
    e.preventDefault()
    redoPoint()
  }
}

// Convert screen coordinates to world coordinates
const screenToWorld = (screenX, screenY) => {
  if (!wrapperRef.value) return { x: 0, y: 0 }
  
  const rect = wrapperRef.value.getBoundingClientRect()
  const relX = screenX - rect.left
  const relY = screenY - rect.top
  
  // Apply inverse transformations (zoom and offset)
  const worldX = (relX - props.viewOffset.x) / props.zoomFactor
  const worldY = (relY - props.viewOffset.y) / props.zoomFactor
  
  return { x: worldX, y: worldY }
}

// Convert world coordinates to screen coordinates
const worldToScreen = (worldX, worldY) => {
  const screenX = worldX * props.zoomFactor + props.viewOffset.x
  const screenY = worldY * props.zoomFactor + props.viewOffset.y
  
  return { x: screenX, y: screenY }
}

const handleClick = (e) => {
  if (!props.enabled || !canAddPoint.value || !isPickingMode.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top
  
  // Convert to world coordinates
  const world = screenToWorld(e.clientX, e.clientY)
  
  const point = {
    id: Date.now(),
    x: world.x,
    y: world.y,
    screenX,
    screenY,
    label: points.value.length + 1
  }
  
  points.value.push(point)
  redoStack.value = [] // Clear redo stack on new action
  
  emit('point-selected', {
    point,
    allPoints: [...points.value],
    worldCoords: world,
    screenCoords: { x: screenX, y: screenY }
  })
  
  redrawCanvas()
}

const handleMouseMove = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top
  
  currentMousePos.value = { x: screenX, y: screenY }
  
  // Check if hovering over a point
  hoveredPoint.value = findPointAtPosition(screenX, screenY)
  
  // Convert to world coordinates and emit
  const world = screenToWorld(e.clientX, e.clientY)
  emit('coordinate-update', {
    screen: { x: screenX, y: screenY },
    world
  })
}

const handleMouseDown = (e) => {
  isDrawing.value = true
}

const handleMouseUp = (e) => {
  isDrawing.value = false
}

const findPointAtPosition = (screenX, screenY) => {
  const hitRadius = props.markerRadius + 5
  
  for (const point of points.value) {
    const dx = point.screenX - screenX
    const dy = point.screenY - screenY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance <= hitRadius) {
      return point
    }
  }
  
  return null
}

const clearAllPoints = () => {
  const clearedPoints = [...points.value]
  points.value = []
  redoStack.value = []
  
  emit('points-cleared', clearedPoints)
  redrawCanvas()
}

const undoLastPoint = () => {
  if (points.value.length === 0) return
  
  const removed = points.value.pop()
  redoStack.value.push(removed)
  
  emit('point-removed', {
    point: removed,
    remainingPoints: [...points.value]
  })
  
  redrawCanvas()
}

const redoPoint = () => {
  if (redoStack.value.length === 0) return
  
  const restored = redoStack.value.pop()
  restored.label = points.value.length + 1
  points.value.push(restored)
  
  emit('point-selected', {
    point: restored,
    allPoints: [...points.value],
    isRedo: true
  })
  
  redrawCanvas()
}

// Render loop for smooth animations
const startRenderLoop = () => {
  const render = () => {
    redrawCanvas()
    animationFrameId = requestAnimationFrame(render)
  }
  animationFrameId = requestAnimationFrame(render)
}

const redrawCanvas = () => {
  if (!ctx || !canvasRef.value) return
  
  const canvas = canvasRef.value
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw crosshair at mouse position
  if (props.enabled && canAddPoint.value) {
    drawCrosshair(currentMousePos.value.x, currentMousePos.value.y)
  }
  
  // Draw connecting lines between points
  if (points.value.length > 1) {
    drawConnectionLines()
  }
  
  // Draw all points
  points.value.forEach((point, index) => {
    const isHovered = hoveredPoint.value?.id === point.id
    drawPoint(point, isHovered)
  })
}

const drawCrosshair = (x, y) => {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  
  // Horizontal line
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(canvasRef.value.width, y)
  ctx.stroke()
  
  // Vertical line
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, canvasRef.value.height)
  ctx.stroke()
  
  ctx.restore()
}

const drawConnectionLines = () => {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  
  ctx.beginPath()
  ctx.moveTo(points.value[0].screenX, points.value[0].screenY)
  
  for (let i = 1; i < points.value.length; i++) {
    ctx.lineTo(points.value[i].screenX, points.value[i].screenY)
  }
  
  ctx.stroke()
  ctx.restore()
}

const drawPoint = (point, isHovered) => {
  const radius = isHovered ? props.markerRadius * 1.3 : props.markerRadius
  
  ctx.save()
  
  // Draw outer ring
  ctx.beginPath()
  ctx.arc(point.screenX, point.screenY, radius + 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 3
  ctx.stroke()
  
  // Draw main circle
  ctx.beginPath()
  ctx.arc(point.screenX, point.screenY, radius, 0, Math.PI * 2)
  ctx.fillStyle = props.markerColor
  ctx.fill()
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
  
  // Draw label
  ctx.fillStyle = 'white'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(point.label.toString(), point.screenX, point.screenY)
  
  // Draw pulse animation on hover
  if (isHovered) {
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7
    ctx.beginPath()
    ctx.arc(point.screenX, point.screenY, radius * 1.8, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 68, 68, ${pulse * 0.5})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  
  ctx.restore()
}

// Expose methods for parent component
defineExpose({
  points,
  clearAllPoints,
  undoLastPoint,
  redoPoint,
  getPointsData: () => [...points.value],
  setPoints: (newPoints) => {
    points.value = newPoints
    redrawCanvas()
  },
  screenToWorld,
  worldToScreen
})
</script>

<style scoped>
.dual-view-canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* The slot content fills the wrapper naturally */
.dual-view-canvas-wrapper :slotted(*) {
  width: 100%;
  height: 100%;
}

.interaction-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  /* Default: allow events to pass through to CAD viewer */
  pointer-events: none;
  cursor: default;
}

/* When in picking mode, intercept mouse events */
.interaction-canvas.picking-mode {
  pointer-events: auto;
  cursor: crosshair;
}

.mode-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(64, 158, 255, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}

.canvas-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 101;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.point-count {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.axis-display {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 101;
}

.axis-x, .axis-y {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.axis-x {
  background: rgba(255, 0, 0, 0.8);
  color: white;
}

.axis-y {
  background: rgba(0, 128, 0, 0.8);
  color: white;
  margin-top: 4px;
}
</style>
