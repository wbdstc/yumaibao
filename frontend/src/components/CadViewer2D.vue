<template>
  <div class="cad-viewer-2d" ref="containerRef">
    <!-- 标题栏 -->
    <div class="view-title" v-if="showTitle">
      <span>2D CAD图纸</span>
      <div class="title-actions">
        <el-button size="small" @click="handleRefresh">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- DxfViewer组件 -->
    <div class="cad-container">
      <DxfViewer
        v-if="dxfFile"
        ref="dxfViewerRef"
        :key="viewerKey"
        :file="dxfFile"
        :embedded-parts="embeddedPartsWithCoords"
        :show-controls="true"
        :show-coords="true"
        @loaded="onViewerLoaded"
        @error="onViewerError"
        @part-click="onPartClick"
        @axis-detected="onAxisDetected"
        @canvas-click="onCanvasClick"
      />
      
      <!-- 无文件提示 -->
      <div v-if="!dxfFile && !isLoading" class="placeholder">
        <el-icon :size="48"><Document /></el-icon>
        <p>请选择一个2D模型以查看CAD图纸</p>
        <p class="placeholder-hint" v-if="unsupportedFormat">
          <el-tag type="warning" size="small">注意</el-tag>
          当前仅支持DXF格式，DWG文件需要先转换
        </p>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onUnmounted, markRaw, nextTick, type PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, RefreshRight, Loading } from '@element-plus/icons-vue'
import DxfViewer from './DxfViewer.vue'

/**
 * 预埋件接口
 */
export interface EmbeddedPart {
  id: string
  name: string
  code: string
  status: string
  coordinates2D?: { x: number; y: number }
  floorId?: string
}

/**
 * BIM模型接口
 */
export interface BIMModel {
  id: string
  name: string
  type: string
  format?: string
  fileUrl?: string
  isLightweight?: boolean
}

// Props
const props = defineProps({
  model: {
    type: Object as PropType<BIMModel | null>,
    default: null
  },
  embeddedParts: {
    type: Array as PropType<EmbeddedPart[]>,
    default: () => []
  },
  showTitle: {
    type: Boolean,
    default: true
  },
  showAxisOverlay: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits<{
  'viewer-loaded': []
  'viewer-error': [error: Error]
  'axis-configured': [config: any]
  'part-click': [part: EmbeddedPart]
  'canvas-click': [coord: { x: number; y: number }]
}>()

// 模板引用
const containerRef = ref<HTMLElement | null>(null)
const dxfViewerRef = shallowRef<InstanceType<typeof DxfViewer> | null>(null)

// 状态
const viewerKey = ref(0)
const isLoading = ref(false)
const loadingMessage = ref('加载中...')
const dxfFile = shallowRef<File | null>(null)
const unsupportedFormat = ref(false)

// 带坐标的预埋件列表
const embeddedPartsWithCoords = computed(() => {
  return props.embeddedParts.filter(part => part.coordinates2D)
})

/**
 * 加载模型文件
 */
const loadModelFile = async () => {
  if (!props.model || props.model.type !== '2d') {
    dxfFile.value = null
    return
  }
  
  isLoading.value = true
  loadingMessage.value = '正在加载模型文件...'
  unsupportedFormat.value = false
  
  // 释放旧文件
  if (dxfFile.value) {
    dxfFile.value = null
  }
  viewerKey.value++
  
  try {
    const url = `/api/models/${props.model.id}/download?useLightweight=${props.model.isLightweight ? 'true' : 'false'}`
    const token = localStorage.getItem('token')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    })
    
    if (!response.ok) {
      throw new Error(`文件下载失败: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    if (blob.size === 0) {
      throw new Error('服务器返回空文件')
    }
    
    // 检测文件格式
    const buffer = await blob.slice(0, 10).arrayBuffer()
    const header = new TextDecoder().decode(buffer)
    
    // 判断是否为DXF格式
    const isDxf = header.includes('0') && (header.includes('SECTION') || header.includes('s'))
    const isDwg = header.startsWith('AC')
    
    if (isDwg) {
      // DWG格式不支持
      unsupportedFormat.value = true
      throw new Error('DWG格式暂不支持，请上传DXF格式文件或在服务端转换')
    }
    
    // 创建DXF文件
    const baseName = props.model.name || 'temp_model'
    const finalFileName = baseName.toLowerCase().endsWith('.dxf') 
      ? baseName 
      : (baseName.replace(/\.[^.]+$/, '') + '.dxf')
    
    const file = new File([blob], finalFileName, { type: 'application/octet-stream' })
    
    await nextTick()
    dxfFile.value = markRaw(file)
    
  } catch (error) {
    console.error('获取模型文件失败:', error)
    ElMessage.error(`获取模型文件失败: ${(error as Error).message}`)
    dxfFile.value = null
  } finally {
    isLoading.value = false
  }
}

/**
 * 刷新查看器
 */
const handleRefresh = async () => {
  if (!props.model) return
  
  viewerKey.value++
  await loadModelFile()
}

/**
 * 查看器加载完成
 */
const onViewerLoaded = (data: any) => {
  console.log('✅ DXF查看器加载完成', data)
  ElMessage.success('模型加载成功')
  emit('viewer-loaded')
}

/**
 * 查看器错误
 */
const onViewerError = (error: Error) => {
  console.error('DXF查看器错误:', error)
  ElMessage.error(`图纸加载失败: ${error.message || '未知错误'}`)
  emit('viewer-error', error)
}

/**
 * 预埋件点击
 */
const onPartClick = (part: EmbeddedPart) => {
  emit('part-click', part)
}

/**
 * 轴线检测完成
 */
const onAxisDetected = (data: any) => {
  console.log('轴线检测完成:', data)
  emit('axis-configured', data)
}

/**
 * 画布点击（转发DXF世界坐标）
 */
const onCanvasClick = (coord: { x: number; y: number }) => {
  emit('canvas-click', coord)
}

/**
 * 获取世界坐标（供外部调用）
 */
const getWorldCoordinates = (screenX: number, screenY: number) => {
  // DxfViewer使用Three.js坐标系统，可以通过暴露的方法获取
  return null // 需要根据实际需要扩展DxfViewer
}

// 监听模型变化
watch(() => props.model, (newModel) => {
  if (newModel && newModel.type === '2d') {
    loadModelFile()
  } else {
    dxfFile.value = null
  }
}, { immediate: true })

// 清理
onUnmounted(() => {
  if (dxfFile.value) {
    dxfFile.value = null
  }
})

// 暴露方法
defineExpose({
  refresh: handleRefresh,
  getWorldCoordinates,
  getDxfViewerRef: () => dxfViewerRef.value,
  zoomIn: () => dxfViewerRef.value?.zoomIn?.(),
  zoomOut: () => dxfViewerRef.value?.zoomOut?.(),
  fitToView: () => dxfViewerRef.value?.fitToView?.(),
  focusOnCoordinate: (x: number, y: number) => dxfViewerRef.value?.focusOnCoordinate?.(x, y)
})
</script>

<style scoped>
.cad-viewer-2d {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  position: relative;
}

.view-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.title-actions {
  display: flex;
  gap: 8px;
}

.cad-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.placeholder p {
  margin-top: 12px;
}

.placeholder-hint {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 100;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}
</style>
