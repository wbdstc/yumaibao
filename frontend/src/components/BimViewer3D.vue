<template>
  <div class="bim-viewer-3d" ref="containerRef">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- 3D场景容器 -->
    <div 
      ref="sceneContainerRef" 
      class="scene-container"
      @click="handleSceneClick"
    ></div>
    
    <!-- 控制面板 -->
    <div class="controls-overlay" v-if="showControls">
      <el-button-group size="small">
        <el-button @click="toggleGrid" :type="showGrid ? 'primary' : ''">
          <el-icon><Grid /></el-icon>
        </el-button>
        <el-button @click="resetCamera">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
        <el-button @click="setViewAngle('iso')">3D</el-button>
        <el-button @click="setViewAngle('front')">前</el-button>
        <el-button @click="setViewAngle('top')">俯</el-button>
        <el-button @click="setViewAngle('side')">侧</el-button>
      </el-button-group>
    </div>
    
    <!-- 状态图例 -->
    <div class="status-legend" v-if="showLegend">
      <div class="legend-item">
        <span class="legend-dot pending"></span>
        <span>待安装</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot installed"></span>
        <span>已安装</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot inspected"></span>
        <span>已验收</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot completed"></span>
        <span>已完成</span>
      </div>
    </div>
    
    <!-- 信息提示 -->
    <div class="info-tooltip" v-if="hoveredPart">
      <strong>{{ hoveredPart.name }}</strong>
      <p>{{ hoveredPart.code }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted, markRaw, type PropType, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, RefreshRight, Loading } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useThreeScene } from '../composables/useThreeScene'
import type { Coordinate3D } from '../composables/useCoordinateTransform'
import config from '../config/index.js'

/**
 * 预埋件接口
 */
export interface EmbeddedPart {
  id: string
  name: string
  code: string
  type?: string
  status: 'pending' | 'installed' | 'inspected' | 'rejected' | 'completed'
  floorId?: string
  coordinates?: Coordinate3D
  coordinates2D?: { x: number; y: number }
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
  conversionStatus?: 'pending' | 'converting' | 'completed' | 'failed'
}

/**
 * 楼层接口
 */
export interface Floor {
  id: string
  name: string
  level: number
  height: number
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
  floors: {
    type: Array as PropType<Floor[]>,
    default: () => []
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  showControls: {
    type: Boolean,
    default: true
  },
  showLegend: {
    type: Boolean,
    default: true
  },
  coordinateMapper: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits<{
  'model-loaded': []
  'part-click': [part: EmbeddedPart]
  'part-highlight': [part: EmbeddedPart]
  'loading-change': [isLoading: boolean]
}>()

// 模板引用
const containerRef = ref<HTMLElement | null>(null)
const sceneContainerRef = ref<HTMLElement | null>(null)

// 使用 Three.js 场景 Composable
const threeScene = useThreeScene(sceneContainerRef, {
  backgroundColor: 0xf5f7fa,
  showGrid: props.showGrid,
  cameraPosition: { x: 15, y: 15, z: 15 }
})

// 状态
const isLoading = ref(false)
const loadingMessage = ref('加载中...')
const isModelLoaded = ref(false)
const hoveredPart = ref<EmbeddedPart | null>(null)

// 预埋件球体映射 - 使用any绕过Three.js泛型类型问题
const partMeshMap = shallowRef<Record<string, any>>({})

// 高亮相关
let highlightedMesh: THREE.Mesh | null = null
let pulseAnimationId: number | null = null

// 鼠标射线检测
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

/**
 * 根据状态获取颜色
 */
const getStatusColor = (status: string): number => {
  const colorMap: Record<string, number> = {
    'pending': 0xff9800,    // 橙色
    'installed': 0x4caf50,  // 绿色
    'inspected': 0x2196f3,  // 蓝色
    'completed': 0x9e9e9e   // 灰色
  }
  return colorMap[status] || 0xff9800
}

/**
 * 根据楼层ID获取高度
 */
const getFloorHeight = (floorId: string | undefined): number => {
  if (!floorId || !props.floors.length) return 0
  
  const floor = props.floors.find(f => f.id === floorId)
  if (floor) {
    if (floor.height) return floor.height
    const floorIndex = props.floors.indexOf(floor)
    return floorIndex * 3
  }
  return 0
}

/**
 * 获取缺失坐标的默认位置（固定位置，不是随机）
 */
const getMissingCoordinatePosition = (floorId?: string, index: number = 0): Coordinate3D => {
  const floorHeight = getFloorHeight(floorId)
  // 以网格方式排列缺少坐标的预埋件，而不是随机分布
  const gridSize = 5
  const row = Math.floor(index / gridSize)
  const col = index % gridSize
  return {
    x: -15 + col * 3,  // 左侧区域
    y: floorHeight + 1.5,
    z: -15 + row * 3
  }
}

/**
 * 创建预埋件球体
 */
const createEmbeddedPartSpheres = () => {
  if (!threeScene.scene.value) {
    console.error('❌ 无法创建预埋件球体: scene为null')
    return
  }
  
  // 清除现有球体
  clearEmbeddedPartSpheres()
  
  console.log('🎨 开始创建预埋件球体，数量:', props.embeddedParts.length)
  
  const newMeshMap: Record<string, THREE.Mesh> = {}
  let missingCoordCount = 0
  
  props.embeddedParts.forEach((ep) => {
    let position: Coordinate3D | null = null
    let hasMissingCoord = false
    
    // 优先使用3D坐标
    if (ep.coordinates && ep.coordinates.x !== undefined && ep.coordinates.y !== undefined && ep.coordinates.z !== undefined) {
      position = ep.coordinates
    }
    // 其次尝试使用坐标转换器计算3D位置
    else if (ep.coordinates2D && props.coordinateMapper) {
      const coord3D = props.coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) {
        position = coord3D
      }
    }
    
    // 如果没有有效坐标，标记为缺失并使用固定位置
    if (!position) {
      hasMissingCoord = true
      position = getMissingCoordinatePosition(ep.floorId, missingCoordCount)
      missingCoordCount++
      console.warn(`⚠️ 预埋件 ${ep.name} (${ep.code}) 缺少坐标信息`)
    }
    
    // 创建球体
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: getStatusColor(ep.status),
      // 缺少坐标时使用透明效果
      transparent: hasMissingCoord,
      opacity: hasMissingCoord ? 0.5 : 1.0
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    mesh.userData = {
      embeddedPartId: ep.id,
      embeddedPartName: ep.name,
      embeddedPartCode: ep.code,
      hasMissingCoord: hasMissingCoord  // 标记是否缺失坐标
    }
    
    // 如果缺少坐标，添加警告标记（一个小的问号图标球体）
    if (hasMissingCoord) {
      const warnGeometry = new THREE.SphereGeometry(0.15, 16, 16)
      const warnMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
      })
      const warnMesh = new THREE.Mesh(warnGeometry, warnMaterial)
      warnMesh.position.set(0.4, 0.4, 0)
      mesh.add(warnMesh)
    }
    
    // 使用markRaw避免Vue响应式系统干扰
    const nonReactiveMesh = markRaw(mesh)
    
    threeScene.addToScene(nonReactiveMesh)
    newMeshMap[ep.id] = nonReactiveMesh
  })
  
  partMeshMap.value = newMeshMap
  
  if (missingCoordCount > 0) {
    console.warn(`⚠️ 共有 ${missingCoordCount} 个预埋件缺少坐标信息，显示在左下角区域`)
    ElMessage.warning({
      message: `${missingCoordCount} 个预埋件缺少坐标，请完善坐标信息`,
      duration: 5000
    })
  }
  
  console.log('✅ 预埋件球体创建完成')
}

/**
 * 清除预埋件球体
 */
const clearEmbeddedPartSpheres = () => {
  Object.values(partMeshMap.value).forEach(mesh => {
    threeScene.removeFromScene(mesh)
    mesh.geometry.dispose()
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose()
    }
  })
  partMeshMap.value = {}
}

/**
 * 刷新预埋件显示
 */
const refreshEmbeddedParts = () => {
  createEmbeddedPartSpheres()
}

/**
 * 加载BIM模型
 */
const loadModel = async () => {
  if (!props.model || !threeScene.scene.value) return
  
  // 检查模型状态
  if (props.model.conversionStatus === 'pending') {
    ElMessage.warning('该模型尚未转换为3D格式')
    return
  }
  
  if (props.model.conversionStatus === 'converting') {
    ElMessage.info('该模型正在转换中，请稍候')
    return
  }
  
  if (props.model.conversionStatus === 'failed') {
    ElMessage.error('该模型转换失败')
    return
  }
  
  if (!props.model.fileUrl) {
    console.log('模型没有fileUrl')
    isModelLoaded.value = true
    createEmbeddedPartSpheres()
    return
  }
  
  isLoading.value = true
  loadingMessage.value = '正在加载3D模型...'
  emit('loading-change', true)
  
  try {
    // 构建完整URL
    let modelUrl = props.model.fileUrl
    if (modelUrl.startsWith('localhost:')) {
      modelUrl = `http://${modelUrl}`
    } else if (!modelUrl.startsWith('http://') && !modelUrl.startsWith('https://')) {
      modelUrl = `${config.api.baseUrl}${modelUrl}`
    }
    
    // 修复URL编码
    try {
      const urlParts = new URL(modelUrl)
      const pathParts = urlParts.pathname.split('/').map(part => {
        try {
          const decoded = decodeURIComponent(part)
          return encodeURIComponent(decoded)
        } catch {
          return encodeURIComponent(part)
        }
      })
      urlParts.pathname = pathParts.join('/')
      modelUrl = urlParts.toString()
    } catch (e) {
      console.warn('URL解析失败，使用原始URL:', e)
    }
    
    console.log('📦 开始加载BIM模型:', modelUrl)
    
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf: any) => {
        if (!threeScene.scene.value) return
        
        const model = gltf.scene
        model.scale.set(1.0, 1.0, 1.0)
        
        const nonReactiveModel = markRaw(model)
        threeScene.addToScene(nonReactiveModel)
        
        // 调整相机
        threeScene.fitCameraToObject(model, 1.5)
        
        // 创建预埋件球体
        createEmbeddedPartSpheres()
        
        isModelLoaded.value = true
        isLoading.value = false
        emit('model-loaded')
        emit('loading-change', false)
        
        console.log('✅ BIM模型加载完成')
        ElMessage.success('3D BIM模型加载完成')
      },
      (progress: ProgressEvent) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100)
          loadingMessage.value = `加载中... ${percent}%`
        }
      },
      (error: ErrorEvent) => {
        console.error('加载BIM模型失败:', error)
        isLoading.value = false
        isModelLoaded.value = true
        emit('loading-change', false)
        
        // 即使模型加载失败，也创建预埋件球体
        createEmbeddedPartSpheres()
        
        ElMessage.error('加载3D BIM模型失败')
      }
    )
  } catch (error) {
    console.error('加载BIM模型异常:', error)
    isLoading.value = false
    emit('loading-change', false)
    createEmbeddedPartSpheres()
  }
}

/**
 * 高亮预埋件
 */
const highlightPart = (part: EmbeddedPart) => {
  if (!threeScene.scene.value) return
  
  // 停止之前的脉冲动画
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
  
  // 恢复之前高亮的预埋件
  if (highlightedMesh) {
    const mat = highlightedMesh.material as THREE.MeshStandardMaterial
    mat.emissive.set(0x000000)
    mat.emissiveIntensity = 0
    highlightedMesh.scale.set(1, 1, 1)
  }
  
  // 获取目标对象
  const targetMesh = partMeshMap.value[part.id]
  if (!targetMesh) {
    console.warn('未找到预埋件对应的3D对象:', part.id)
    return
  }
  
  highlightedMesh = targetMesh
  
  // 设置高亮
  const targetMat = targetMesh.material as THREE.MeshStandardMaterial
  targetMat.emissive.set(0xffff00)
  targetMat.emissiveIntensity = 1
  
  // 平滑移动相机
  const targetPosition = targetMesh.position
  const distance = 10
  
  threeScene.animateCameraTo(
    {
      x: targetPosition.x + distance * 0.5,
      y: targetPosition.y + distance * 0.7,
      z: targetPosition.z + distance * 0.5
    },
    {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z
    },
    1000
  )
  
  // 脉冲动画
  let pulseTime = 0
  const pulseDuration = 5000
  const pulseStartTime = Date.now()
  
  const pulseAnimation = () => {
    const elapsed = Date.now() - pulseStartTime
    
    if (elapsed > pulseDuration || !targetMesh) {
      if (targetMesh) {
        targetMesh.scale.set(1.2, 1.2, 1.2)
        ;(targetMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8
      }
      return
    }
    
    pulseTime += 0.08
    const scaleMultiplier = 1.5 + Math.sin(pulseTime * 4) * 0.5
    targetMesh.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier)
    
    const intensity = 1.0 + Math.sin(pulseTime * 4) * 0.5
    ;(targetMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
    
    pulseAnimationId = requestAnimationFrame(pulseAnimation)
  }
  
  pulseAnimation()
  
  emit('part-highlight', part)
  ElMessage.success({ message: `已定位到预埋件: ${part.name}`, duration: 2000 })
}

/**
 * 处理场景点击
 */
const handleSceneClick = (event: MouseEvent) => {
  if (!threeScene.camera.value || !threeScene.scene.value || !sceneContainerRef.value) return
  
  const rect = sceneContainerRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, threeScene.camera.value)
  
  const meshes = Object.values(partMeshMap.value)
  const intersects = raycaster.intersectObjects(meshes, false)
  
  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object as THREE.Mesh
    const partId = clickedMesh.userData?.embeddedPartId
    const part = props.embeddedParts.find(p => p.id === partId)
    if (part) {
      emit('part-click', part)
    }
  }
}

/**
 * 切换网格显示
 */
const toggleGrid = () => {
  const newValue = !props.showGrid
  threeScene.setGridVisible(newValue)
}

/**
 * 重置相机
 */
const resetCamera = () => {
  threeScene.setCameraPosition(15, 15, 15)
  threeScene.setControlsTarget(0, 0, 0)
}

/**
 * 设置视角
 */
const setViewAngle = (angle: 'front' | 'top' | 'side' | 'iso') => {
  const distance = 30
  const positions: Record<string, { x: number; y: number; z: number }> = {
    front: { x: 0, y: 5, z: distance },
    top: { x: 0, y: distance, z: 0.1 },
    side: { x: distance, y: 5, z: 0 },
    iso: { x: distance * 0.7, y: distance * 0.7, z: distance * 0.7 }
  }
  
  const pos = positions[angle]
  threeScene.animateCameraTo(pos, { x: 0, y: 5, z: 0 }, 500)
}

// 初始化
onMounted(async () => {
  await nextTick()
  
  // 稍微延迟初始化，确保容器尺寸正确
  setTimeout(() => {
    if (threeScene.init()) {
      threeScene.startAnimation()
      
      // 添加窗口大小变化监听
      window.addEventListener('resize', threeScene.handleResize)
      
      // 如果有模型，加载它
      if (props.model) {
        loadModel()
      } else {
        // 没有模型时也创建预埋件球体
        createEmbeddedPartSpheres()
      }
    }
  }, 100)
})

// 监听模型变化
watch(() => props.model, (newModel) => {
  if (newModel && threeScene.isInitialized.value) {
    loadModel()
  }
})

// 监听预埋件变化
watch(() => props.embeddedParts, () => {
  if (threeScene.isInitialized.value) {
    createEmbeddedPartSpheres()
  }
}, { deep: true })

// 监听网格显示
watch(() => props.showGrid, (show) => {
  threeScene.setGridVisible(show)
})

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', threeScene.handleResize)
  
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
  }
  
  clearEmbeddedPartSpheres()
})

// 暴露方法
defineExpose({
  highlightPart,
  refreshEmbeddedParts,
  loadModel,
  resetCamera,
  setViewAngle
})
</script>

<style scoped>
.bim-viewer-3d {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f5f7fa;
}

.scene-container {
  width: 100%;
  height: 100%;
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

.controls-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.status-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  z-index: 50;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.pending { background-color: #ff9800; }
.legend-dot.installed { background-color: #4caf50; }
.legend-dot.inspected { background-color: #2196f3; }
.legend-dot.completed { background-color: #9e9e9e; }

.info-tooltip {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 50;
}

.info-tooltip strong {
  display: block;
  margin-bottom: 4px;
}

.info-tooltip p {
  margin: 0;
  opacity: 0.8;
}
</style>
