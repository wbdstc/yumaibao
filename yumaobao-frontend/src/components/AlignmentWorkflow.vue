<template>
  <div 
    class="alignment-workflow"
    :style="panelStyle"
  >
    <!-- Drag handle -->
    <div 
      class="drag-handle"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <el-icon><Rank /></el-icon>
      <span>拖拽移动</span>
    </div>
    
    <!-- Progress steps -->
    <div class="workflow-progress">
      <div 
        v-for="(step, index) in steps" 
        :key="step.key"
        class="progress-step"
        :class="{ 
          active: currentStage === index,
          completed: currentStage > index
        }"
        @click="goToStage(index)"
      >
        <div class="step-indicator">
          <el-icon v-if="currentStage > index"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Stage content -->
    <div class="workflow-content">
      <!-- Stage 1: 2D Reference Point Marking -->
      <div v-if="currentStage === 0" class="stage-panel">
        <div class="stage-header">
          <h3>标记2D参考点</h3>
          <p class="stage-description">
            在左侧2D视图中点击以添加参考点。至少需要2个点（推荐3个）以实现精确对齐。
          </p>
        </div>
        
        <div class="points-list">
          <div class="points-header">
            <span>已标记点 ({{ referencePoints.length }})</span>
            <el-button 
              v-if="referencePoints.length > 0"
              type="danger" 
              text 
              size="small"
              @click="clearAllPoints"
            >
              清除全部
            </el-button>
          </div>
          
          <div v-if="referencePoints.length === 0" class="empty-points">
            <el-icon size="32"><Location /></el-icon>
            <p>点击2D视图添加参考点</p>
          </div>
          
          <el-scrollbar v-else max-height="200px">
            <div 
              v-for="(point, index) in referencePoints"
              :key="point.id"
              class="point-item"
            >
              <div class="point-number">{{ index + 1 }}</div>
              <div class="point-coords">
                <span>X: {{ point.x?.toFixed(2) }}</span>
                <span>Y: {{ point.y?.toFixed(2) }}</span>
              </div>
              <el-button 
                type="danger" 
                text 
                size="small" 
                :icon="Delete"
                @click="removePoint(index)"
              />
            </div>
          </el-scrollbar>
        </div>
        
        <div class="stage-tips">
          <el-alert 
            :type="referencePoints.length >= 2 ? 'success' : 'info'"
            :closable="false"
          >
            <template #default>
              <span v-if="referencePoints.length < 2">
                还需要 {{ 2 - referencePoints.length }} 个点才能继续
              </span>
              <span v-else>
                ✓ 已满足最低要求，您可以继续或添加更多点以提高精度
              </span>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Stage 2: 3D View Adjustment -->
      <div v-if="currentStage === 1" class="stage-panel">
        <div class="stage-header">
          <h3>调整3D视角</h3>
          <p class="stage-description">
            拖动右侧3D视图调整视角。参考轴线显示当前方向。
          </p>
        </div>
        
        <div class="view-controls-section">
          <div class="control-group">
            <label>视角预设</label>
            <el-button-group size="small">
              <el-button @click="setViewAngle('front')">前视图</el-button>
              <el-button @click="setViewAngle('top')">俯视图</el-button>
              <el-button @click="setViewAngle('side')">侧视图</el-button>
              <el-button @click="setViewAngle('iso')">等轴测</el-button>
            </el-button-group>
          </div>
          
          <div class="control-group">
            <label>自动对齐</label>
            <el-button type="primary" @click="calculateBestAngle">
              <el-icon><Aim /></el-icon>
              计算最佳视角
            </el-button>
          </div>
          
          <div class="control-group">
            <el-button @click="resetViewAngle">
              <el-icon><RefreshRight /></el-icon>
              视角复位
            </el-button>
            <el-checkbox v-model="showReferenceAxis">显示参考轴</el-checkbox>
          </div>
        </div>
        
        <div class="alignment-preview">
          <h4>对齐预览</h4>
          <div class="preview-params">
            <div class="param-row">
              <span class="param-name">缩放比例:</span>
              <span class="param-value">{{ alignmentParams.scale.toFixed(4) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">旋转角度:</span>
              <span class="param-value">{{ alignmentParams.rotation.toFixed(2) }}°</span>
            </div>
            <div class="param-row">
              <span class="param-name">X偏移:</span>
              <span class="param-value">{{ alignmentParams.offsetX.toFixed(2) }}</span>
            </div>
            <div class="param-row">
              <span class="param-name">Y偏移:</span>
              <span class="param-value">{{ alignmentParams.offsetY.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stage 3: Confirmation -->
      <div v-if="currentStage === 2" class="stage-panel">
        <div class="stage-header">
          <h3>确认对齐</h3>
          <p class="stage-description">
            检查对齐参数，确认后将锁定视图。
          </p>
        </div>
        
        <div class="confirmation-summary">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="参考点数量">
              {{ referencePoints.length }}
            </el-descriptions-item>
            <el-descriptions-item label="对齐精度">
              <el-tag :type="alignmentQuality === 'high' ? 'success' : 'warning'">
                {{ alignmentQuality === 'high' ? '高' : '中' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="缩放比例">
              {{ alignmentParams.scale.toFixed(4) }}
            </el-descriptions-item>
            <el-descriptions-item label="旋转角度">
              {{ alignmentParams.rotation.toFixed(2) }}°
            </el-descriptions-item>
            <el-descriptions-item label="X偏移">
              {{ alignmentParams.offsetX.toFixed(2) }}
            </el-descriptions-item>
            <el-descriptions-item label="Y偏移">
              {{ alignmentParams.offsetY.toFixed(2) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="lock-option">
          <el-checkbox v-model="lockAfterConfirm" size="large">
            确认后锁定参数（防止意外修改）
          </el-checkbox>
        </div>
      </div>
    </div>

    <!-- Navigation buttons -->
    <div class="workflow-footer">
      <el-button 
        v-if="currentStage > 0"
        @click="previousStage"
        :disabled="isLocked"
      >
        <el-icon><ArrowLeft /></el-icon>
        上一步
      </el-button>
      
      <div class="footer-spacer"></div>
      
      <el-button 
        v-if="currentStage < steps.length - 1"
        type="primary"
        @click="nextStage"
        :disabled="!canProceed"
      >
        下一步
        <el-icon><ArrowRight /></el-icon>
      </el-button>
      
      <el-button 
        v-if="currentStage === steps.length - 1"
        type="success"
        @click="confirmAlignment"
        :disabled="isLocked"
      >
        <el-icon><Check /></el-icon>
        确认对齐
      </el-button>
      
      <el-button 
        v-if="isLocked"
        type="warning"
        @click="unlockAlignment"
      >
        <el-icon><Unlock /></el-icon>
        解锁编辑
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { 
  Check, Location, Delete, Aim, RefreshRight, 
  ArrowLeft, ArrowRight, Unlock, Rank
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// Props
const props = defineProps({
  // Reference points from 2D view
  referencePoints: {
    type: Array,
    default: () => []
  },
  // 3D corresponding points
  reference3DPoints: {
    type: Array,
    default: () => []
  },
  // Initial alignment parameters
  initialParams: {
    type: Object,
    default: () => ({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0
    })
  }
})

// Emits
const emit = defineEmits([
  'stage-change',
  'point-removed',
  'points-cleared',
  'view-angle-change',
  'best-angle-requested',
  'reset-view',
  'reference-axis-toggle',
  'confirm',
  'cancel',
  'unlock'
])

// Workflow steps
const steps = [
  { key: 'mark', label: '标记参考点' },
  { key: 'adjust', label: '调整视角' },
  { key: 'confirm', label: '确认对齐' }
]

// State
const currentStage = ref(0)
const showReferenceAxis = ref(true)
const lockAfterConfirm = ref(true)
const isLocked = ref(false)

// Drag state
const isDragging = ref(false)
const panelPosition = reactive({ x: 0, y: 0 })
const dragOffset = reactive({ x: 0, y: 0 })

// Panel style computed
const panelStyle = computed(() => {
  if (panelPosition.x === 0 && panelPosition.y === 0) {
    return {}
  }
  return {
    position: 'fixed',
    left: `${panelPosition.x}px`,
    top: `${panelPosition.y}px`,
    right: 'auto',
    transform: 'none'
  }
})

// Drag methods
const startDrag = (e) => {
  e.preventDefault()
  isDragging.value = true
  
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  
  const panel = e.target.closest('.alignment-workflow')
  const rect = panel.getBoundingClientRect()
  
  // If first drag, initialize position from current location
  if (panelPosition.x === 0 && panelPosition.y === 0) {
    panelPosition.x = rect.left
    panelPosition.y = rect.top
  }
  
  dragOffset.x = clientX - panelPosition.x
  dragOffset.y = clientY - panelPosition.y
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
  
  panelPosition.x = clientX - dragOffset.x
  panelPosition.y = clientY - dragOffset.y
  
  // Keep within viewport
  panelPosition.x = Math.max(0, Math.min(window.innerWidth - 360, panelPosition.x))
  panelPosition.y = Math.max(0, Math.min(window.innerHeight - 200, panelPosition.y))
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
})

// Alignment parameters
const alignmentParams = reactive({
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0
})

// Update alignment params from initial props
watch(() => props.initialParams, (newParams) => {
  Object.assign(alignmentParams, newParams)
}, { immediate: true })

// Computed
const canProceed = computed(() => {
  if (currentStage.value === 0) {
    return props.referencePoints.length >= 2
  }
  return true
})

const alignmentQuality = computed(() => {
  if (props.referencePoints.length >= 3) return 'high'
  return 'medium'
})

// Watch for reference axis toggle
watch(showReferenceAxis, (value) => {
  emit('reference-axis-toggle', value)
})

// Methods
const goToStage = (index) => {
  if (isLocked.value) return
  if (index < currentStage.value) {
    currentStage.value = index
    emit('stage-change', { stage: index, name: steps[index].key })
  }
}

const nextStage = () => {
  if (!canProceed.value) return
  if (currentStage.value < steps.length - 1) {
    currentStage.value++
    emit('stage-change', { stage: currentStage.value, name: steps[currentStage.value].key })
  }
}

const previousStage = () => {
  if (currentStage.value > 0) {
    currentStage.value--
    emit('stage-change', { stage: currentStage.value, name: steps[currentStage.value].key })
  }
}

const clearAllPoints = () => {
  ElMessageBox.confirm('确定要清除所有标记点吗？', '确认', {
    type: 'warning'
  }).then(() => {
    emit('points-cleared')
  }).catch(() => {})
}

const removePoint = (index) => {
  emit('point-removed', index)
}

const setViewAngle = (angle) => {
  emit('view-angle-change', angle)
}

const calculateBestAngle = () => {
  emit('best-angle-requested')
}

const resetViewAngle = () => {
  emit('reset-view')
}

const confirmAlignment = async () => {
  try {
    await ElMessageBox.confirm(
      '确认后将应用当前对齐参数。' + 
      (lockAfterConfirm.value ? '参数将被锁定，需要解锁才能修改。' : ''),
      '确认对齐',
      { type: 'success' }
    )
    
    if (lockAfterConfirm.value) {
      isLocked.value = true
    }
    
    emit('confirm', {
      params: { ...alignmentParams },
      referencePoints: [...props.referencePoints],
      locked: lockAfterConfirm.value
    })
    
    ElMessage.success('对齐已确认')
    
  } catch {
    // User cancelled
  }
}

const unlockAlignment = async () => {
  try {
    await ElMessageBox.confirm(
      '解锁后可以修改对齐参数。确定要解锁吗？',
      '解锁确认',
      { type: 'warning' }
    )
    
    isLocked.value = false
    currentStage.value = 0
    emit('unlock')
    
    ElMessage.info('已解锁，可以重新编辑')
    
  } catch {
    // User cancelled
  }
}

// Update alignment params method (called from parent)
const updateAlignmentParams = (newParams) => {
  Object.assign(alignmentParams, newParams)
}

// Expose methods
defineExpose({
  currentStage,
  alignmentParams,
  updateAlignmentParams,
  nextStage,
  previousStage,
  isLocked
})
</script>

<style scoped>
.alignment-workflow {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Drag handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: linear-gradient(to right, #409eff, #66b1ff);
  color: white;
  font-size: 12px;
  cursor: move;
  user-select: none;
}

.drag-handle:hover {
  background: linear-gradient(to right, #3a8ee6, #5dade2);
}

.drag-handle:active {
  cursor: grabbing;
}

/* Progress steps */
.workflow-progress {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(to right, #f5f7fa, #fff);
  border-bottom: 1px solid #e4e7ed;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.progress-step.active,
.progress-step.completed {
  opacity: 1;
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: #909399;
  transition: all 0.3s;
}

.progress-step.active .step-indicator {
  background: #409eff;
  color: white;
}

.progress-step.completed .step-indicator {
  background: #67c23a;
  color: white;
}

.step-label {
  font-size: 14px;
  color: #606266;
}

.progress-step.active .step-label {
  color: #303133;
  font-weight: 500;
}

/* Stage content */
.workflow-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.stage-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stage-header {
  margin-bottom: 20px;
}

.stage-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.stage-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

/* Points list */
.points-list {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #303133;
}

.empty-points {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.empty-points p {
  margin: 8px 0 0 0;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 8px;
}

.point-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
}

.point-coords {
  flex: 1;
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #606266;
}

.stage-tips {
  margin-top: 16px;
}

/* View controls */
.view-controls-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
}

/* Alignment preview */
.alignment-preview {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.alignment-preview h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
}

.preview-params {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
}

.param-name {
  color: #909399;
}

.param-value {
  font-weight: 500;
  color: #303133;
  font-family: monospace;
}

/* Confirmation */
.confirmation-summary {
  margin-bottom: 20px;
}

.lock-option {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

/* Footer */
.workflow-footer {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
}

.footer-spacer {
  flex: 1;
}
</style>
