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

// 3D模型的包围盒（用于将预埋件球体映射到模型范围内）
let modelBoundingBox: THREE.Box3 | null = null
let sceneCenter: THREE.Vector3 = new THREE.Vector3(0, 5, 0)

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
 * 将 2D 坐标映射到 3D 模型的 XZ 范围内
 * 当没有 coordinateMapper 校准时，自动将所有预埋件的 2D 坐标按比例
 * 映射到模型的 XZ 平面上，使球体与模型重叠显示
 */
const mapCoord2DToModelSpace = (coord2D: { x: number; y: number }, floorId?: string): Coordinate3D => {
  const floorHeight = getFloorHeight(floorId)
  
  // 如果没有模型包围盒，直接用 mm → m 转换
  if (!modelBoundingBox) {
    return {
      x: coord2D.x / 1000,
      y: floorHeight,
      z: coord2D.y / 1000
    }
  }
  
  // 计算所有预埋件 2D 坐标的边界范围
  const parts2D = props.embeddedParts.filter(p => p.coordinates2D)
  if (parts2D.length === 0) {
    return { x: modelBoundingBox.min.x, y: floorHeight, z: modelBoundingBox.min.z }
  }
  
  let minX2D = Infinity, maxX2D = -Infinity
  let minY2D = Infinity, maxY2D = -Infinity
  parts2D.forEach(p => {
    minX2D = Math.min(minX2D, p.coordinates2D!.x)
    maxX2D = Math.max(maxX2D, p.coordinates2D!.x)
    minY2D = Math.min(minY2D, p.coordinates2D!.y)
    maxY2D = Math.max(maxY2D, p.coordinates2D!.y)
  })
  
  const range2DX = maxX2D - minX2D || 1
  const range2DY = maxY2D - minY2D || 1
  
  // 模型 XZ 范围（留 10% 边距）
  const modelSize = modelBoundingBox.getSize(new THREE.Vector3())
  const margin = 0.1
  const modelMinX = modelBoundingBox.min.x + modelSize.x * margin
  const modelMaxX = modelBoundingBox.max.x - modelSize.x * margin
  const modelMinZ = modelBoundingBox.min.z + modelSize.z * margin
  const modelMaxZ = modelBoundingBox.max.z - modelSize.z * margin
  
  // 线性映射：2D → 模型 XZ
  const tx = (coord2D.x - minX2D) / range2DX  // 0~1
  const tz = (coord2D.y - minY2D) / range2DY  // 0~1
  
  const x = modelMinX + tx * (modelMaxX - modelMinX)
  const z = modelMinZ + tz * (modelMaxZ - modelMinZ)
  
  // Y 使用模型顶部 + 1m（或楼层高度，取较大值）
  const y = Math.max(floorHeight, modelBoundingBox.max.y + 1)
  
  return { x, y, z }
}

/**
 * 创建预埋件球体（带文字标签）
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
  
  // 用于统计坐标范围
  const positions: { x: number; y: number; z: number }[] = []
  
  props.embeddedParts.forEach((ep) => {
    let position: Coordinate3D | null = null
    let hasMissingCoord = false
    
    // 优先使用3D坐标
    if (ep.coordinates && ep.coordinates.x !== undefined && ep.coordinates.y !== undefined && ep.coordinates.z !== undefined) {
      position = ep.coordinates
    }
    // 其次尝试使用坐标转换器计算3D位置（前提是已经校准过）
    else if (ep.coordinates2D && props.coordinateMapper && typeof props.coordinateMapper.isAligned === 'function' && props.coordinateMapper.isAligned()) {
      const coord3D = props.coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) {
        position = coord3D
      }
    }
    // 兆底：将 2D 坐标映射到模型的 XZ 范围内
    else if (ep.coordinates2D) {
      position = mapCoord2DToModelSpace(ep.coordinates2D, ep.floorId)
    }
    
    // 如果没有有效坐标，标记为缺失并使用固定位置
    if (!position) {
      hasMissingCoord = true
      position = getMissingCoordinatePosition(ep.floorId, missingCoordCount)
      missingCoordCount++
      console.warn(`⚠️ 预埋件 ${ep.name} (${ep.code}) 缺少坐标信息`)
    } else if (typeof ep.elevation === 'number') {
      // --- 用户自定义了高度（高程），严格使用此高度 ---
      position.y = ep.elevation
    } else if (modelBoundingBox && threeScene.scene.value) {
      // --- 没有高度时，使用射线检测吸附到模型真实表面 ---
      const rayOrigin = new THREE.Vector3(position.x, modelBoundingBox.max.y + 10, position.z)
      const rayDir = new THREE.Vector3(0, -1, 0)
      const dropRaycaster = new THREE.Raycaster(rayOrigin, rayDir)
      
      const modelObjects = threeScene.scene.value.children.filter(child => 
        child.type !== 'GridHelper' && 
        child.type !== 'AxesHelper' && 
        child.type !== 'AmbientLight' && 
        child.type !== 'DirectionalLight' &&
        !child.userData?.embeddedPartId
      )

      const intersects = dropRaycaster.intersectObjects(modelObjects, true)
      if (intersects.length > 0) {
        // 放置在表面附近，略微突起以便能看到，既然用户不要透视那就让它嵌在表面一半
        position.y = intersects[0].point.y
      }
    }
    
    positions.push(position)
    
    // 创建球体
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: getStatusColor(ep.status),
      transparent: true,
      opacity: hasMissingCoord ? 0.3 : 0.85
      // 移除 depthTest: false，恢复真实的物理遮挡
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    
    mesh.position.set(position.x, position.y, position.z)
    mesh.userData = {
      embeddedPartId: ep.id,
      embeddedPartName: ep.name,
      embeddedPartCode: ep.code,
      hasMissingCoord: hasMissingCoord
    }
    
    // 如果缺少坐标，添加警告标记
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

    // ========== 文字标签（Sprite）==========
    const label = createPartLabel(ep.name, ep.code, ep.status)
    // 标签需要在渲染层级最前，确保始终可见
    label.renderOrder = 1001 
    // 标签位置根据是否嵌入模型稍微抬高，如果自定义了高程则紧贴球体上方
    label.position.set(0, typeof ep.elevation === 'number' ? 0.8 : 1.5, 0)
    mesh.add(label)
    
    const nonReactiveMesh = markRaw(mesh)
    
    threeScene.addToScene(nonReactiveMesh)
    newMeshMap[ep.id] = nonReactiveMesh
  })
  
  partMeshMap.value = newMeshMap
  
  // 诊断日志：打印坐标范围
  if (positions.length > 0) {
    const xs = positions.map(p => p.x)
    const ys = positions.map(p => p.y)
    const zs = positions.map(p => p.z)
    console.log('📊 预埋件球体坐标范围:', {
      x: `[${Math.min(...xs).toFixed(1)}, ${Math.max(...xs).toFixed(1)}]`,
      y: `[${Math.min(...ys).toFixed(1)}, ${Math.max(...ys).toFixed(1)}]`,
      z: `[${Math.min(...zs).toFixed(1)}, ${Math.max(...zs).toFixed(1)}]`
    })
  }
  
  if (missingCoordCount > 0) {
    console.warn(`⚠️ 共有 ${missingCoordCount} 个预埋件缺少坐标信息，显示在左下角区域`)
    ElMessage.warning({
      message: `${missingCoordCount} 个预埋件缺少坐标，请完善坐标信息`,
      duration: 5000
    })
  }
  
  // 诊断日志不再调整相机——让调用方决定
  console.log('✅ 预埋件球体创建完成')
}

/**
 * 创建预埋件文字标签 (Sprite)
 */
const createPartLabel = (name: string, code: string, status: string): THREE.Sprite => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  const line1 = name || '未命名'
  const line2 = code || ''
  const fontSize = 28
  const padding = 8
  
  ctx.font = `bold ${fontSize}px Arial`
  const w1 = ctx.measureText(line1).width
  const w2 = line2 ? ctx.measureText(line2).width : 0
  const textWidth = Math.max(w1, w2)
  
  const lines = line2 ? 2 : 1
  canvas.width = Math.ceil(textWidth) + padding * 2
  canvas.height = fontSize * lines + padding * 2 + (lines > 1 ? 4 : 0)
  
  // 半透明深色背景 + 圆角
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.beginPath()
  ctx.roundRect(0, 0, canvas.width, canvas.height, 6)
  ctx.fill()
  
  // 左侧状态色条
  const statusColors: Record<string, string> = {
    pending: '#ff9800',
    installed: '#4caf50',
    inspected: '#2196f3',
    completed: '#9e9e9e'
  }
  ctx.fillStyle = statusColors[status] || '#ff9800'
  ctx.fillRect(0, 0, 4, canvas.height)
  
  // 文字
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(line1, canvas.width / 2, padding)
  if (line2) {
    ctx.font = `${fontSize * 0.85}px Arial`
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText(line2, canvas.width / 2, padding + fontSize + 4)
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true
  })
  const sprite = markRaw(new THREE.Sprite(spriteMaterial))
  
  // 标签尺寸（世界单位）
  const aspect = canvas.width / canvas.height
  const labelHeight = 1.0
  sprite.scale.set(labelHeight * aspect, labelHeight, 1)
  
  return sprite
}

/**
 * 清除预埋件球体
 */
const clearEmbeddedPartSpheres = () => {
  Object.values(partMeshMap.value).forEach(mesh => {
    // 先释放子对象资源（标签精灵、警告球体等）
    mesh.children.forEach((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    })
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
        
        // 计算并存储模型包围盒
        modelBoundingBox = new THREE.Box3().setFromObject(model)
        sceneCenter = modelBoundingBox.getCenter(new THREE.Vector3())
        const modelSize = modelBoundingBox.getSize(new THREE.Vector3())
        console.log('📦 3D模型包围盒:', {
          min: `(${modelBoundingBox.min.x.toFixed(1)}, ${modelBoundingBox.min.y.toFixed(1)}, ${modelBoundingBox.min.z.toFixed(1)})`,
          max: `(${modelBoundingBox.max.x.toFixed(1)}, ${modelBoundingBox.max.y.toFixed(1)}, ${modelBoundingBox.max.z.toFixed(1)})`,
          size: `(${modelSize.x.toFixed(1)}, ${modelSize.y.toFixed(1)}, ${modelSize.z.toFixed(1)})`,
          center: `(${sceneCenter.x.toFixed(1)}, ${sceneCenter.y.toFixed(1)}, ${sceneCenter.z.toFixed(1)})`
        })
        
        // 调整相机看到模型
        threeScene.fitCameraToObject(model, 1.5)
        
        // 创建预埋件球体
        createEmbeddedPartSpheres()
        
        // 最终相机调整：基于模型+球体（排除grid/axes/light）
        fitCameraToContent()
        
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
      (error: unknown) => {
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
 * 将相机适配到内容（排除GridHelper、AxesHelper、Light等辅助对象）
 */
const fitCameraToContent = () => {
  if (!threeScene.scene.value || !threeScene.camera.value || !threeScene.controls.value) return
  
  // 收集内容对象（模型 + 球体），排除辅助对象
  const contentGroup = new THREE.Group()
  threeScene.scene.value.children.forEach((child: THREE.Object3D) => {
    if (
      child instanceof THREE.GridHelper ||
      child instanceof THREE.AxesHelper ||
      child instanceof THREE.Light
    ) {
      return // 跳过辅助对象
    }
    // 临时添加一个定位点（不克隆，只标记位置）
    const marker = new THREE.Object3D()
    const box = new THREE.Box3().setFromObject(child)
    if (!box.isEmpty()) {
      marker.position.copy(box.min)
      contentGroup.add(marker)
      const marker2 = new THREE.Object3D()
      marker2.position.copy(box.max)
      contentGroup.add(marker2)
    }
  })
  
  if (contentGroup.children.length === 0) return
  
  const contentBox = new THREE.Box3().setFromObject(contentGroup)
  if (contentBox.isEmpty()) return
  
  sceneCenter = contentBox.getCenter(new THREE.Vector3())
  const size = contentBox.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  
  console.log('📐 内容包围盒:', {
    min: `(${contentBox.min.x.toFixed(1)}, ${contentBox.min.y.toFixed(1)}, ${contentBox.min.z.toFixed(1)})`,
    max: `(${contentBox.max.x.toFixed(1)}, ${contentBox.max.y.toFixed(1)}, ${contentBox.max.z.toFixed(1)})`,
    center: `(${sceneCenter.x.toFixed(1)}, ${sceneCenter.y.toFixed(1)}, ${sceneCenter.z.toFixed(1)})`,
    maxDim: maxDim.toFixed(1)
  })
  
  // 用 fitCameraToObject 的逻辑，但基于内容包围盒
  const fov = threeScene.camera.value.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5
  
  threeScene.camera.value.position.set(
    sceneCenter.x + cameraZ * 0.5,
    sceneCenter.y + cameraZ * 0.5,
    sceneCenter.z + cameraZ
  )
  threeScene.controls.value.target.copy(sceneCenter)
  threeScene.controls.value.update()
}

/**
 * 重置相机（基于场景中心）
 */
const resetCamera = () => {
  fitCameraToContent()
}

/**
 * 设置视角（基于场景中心）
 */
const setViewAngle = (angle: 'front' | 'top' | 'side' | 'iso') => {
  const c = sceneCenter
  // 根据内容范围计算合适距离（不包含grid）
  let distance = 30
  if (modelBoundingBox) {
    const size = modelBoundingBox.getSize(new THREE.Vector3())
    distance = Math.max(size.x, size.y, size.z) * 2.5
  }
  // 确保最小距离
  distance = Math.max(distance, 20)
  
  const positions: Record<string, { x: number; y: number; z: number }> = {
    front: { x: c.x, y: c.y + distance * 0.2, z: c.z + distance },
    top:   { x: c.x, y: c.y + distance, z: c.z + 0.1 },
    side:  { x: c.x + distance, y: c.y + distance * 0.2, z: c.z },
    iso:   { x: c.x + distance * 0.5, y: c.y + distance * 0.5, z: c.z + distance * 0.5 }
  }
  
  const pos = positions[angle]
  threeScene.animateCameraTo(pos, { x: c.x, y: c.y, z: c.z }, 500)
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
