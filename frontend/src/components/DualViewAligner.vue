<template>
  <div class="dual-view-aligner">
    <!-- 阶段导航 -->
    <div class="stage-navigation">
      <el-steps :active="stage" simple finish-status="success">
        <el-step title="2D标记参考点" />
        <el-step title="3D标记参考点" />
        <el-step title="确认对齐" />
      </el-steps>
    </div>
    
    <!-- 阶段0: 2D选点 -->
    <div v-if="stage === 0" class="stage-view-container">
      <div class="view-title">
        <span><el-icon><Aim /></el-icon> 在2D图纸中标记参考点</span>
        <div class="title-actions">
          <el-button 
            size="small" 
            @click="clearPoints('2d')"
            :disabled="referencePoints2D.length === 0"
          >
            清除点
          </el-button>
        </div>
      </div>
      
      <div class="full-view-container">
        <!-- 2D DXF查看器 -->
        <DxfViewer
          v-if="showCadViewer && cadFile"
          ref="dxfViewerRef"
          :key="cadViewerKey"
          :file="cadFile"
          :show-controls="true"
          :show-coords="true"
          @loaded="onCadLoaded"
          @error="onCadError"
          @part-click="onDxfPartClick"
          @canvas-click="onDxfCanvasClick"
        />
        
        <!-- 点选覆盖层 (仅作为视觉提示，不拦截点击) -->
        <div 
          v-if="showCadViewer && cadFile" 
          class="picking-overlay"
        >
          <div class="picking-hint">
            <el-icon><Aim /></el-icon>
            点击图纸选择参考点
          </div>
        </div>
        
        <!-- 无文件提示 -->
        <div v-if="!cadFile" class="placeholder">
          <el-icon :size="48"><Document /></el-icon>
          <p>请先选择2D模型</p>
        </div>
      </div>
      
      <!-- 已选点列表 -->
      <div class="points-panel">
        <div class="panel-title">
          <span>已标记 {{ referencePoints2D.length }} 个点</span>
          <span class="hint">(至少需要2个点)</span>
        </div>
        <div class="points-list">
          <div 
            v-for="(point, index) in referencePoints2D" 
            :key="point.id"
            class="point-item"
          >
            <span class="point-label">{{ point.label }}</span>
            <span class="point-coords">({{ point.x.toFixed(2) }}, {{ point.y.toFixed(2) }})</span>
            <el-button 
              size="small" 
              type="danger" 
              text 
              @click="removePoint('2d', index)"
            >
              删除
            </el-button>
          </div>
        </div>
        <el-button 
          type="primary"
          :disabled="referencePoints2D.length < 2"
          @click="goToStage(1)"
        >
          下一步：3D标记
        </el-button>
      </div>
    </div>
    
    <!-- 阶段1: 3D选点 -->
    <div v-if="stage === 1" class="stage-view-container">
      <div class="view-title">
        <span><el-icon><Aim /></el-icon> 在3D模型中标记对应参考点</span>
        <div class="title-actions">
          <el-button 
            size="small"
            :type="isPicking3D ? 'warning' : 'default'"
            @click="togglePicking3D"
          >
            <el-icon><Aim /></el-icon>
            {{ isPicking3D ? '停止选点' : '开始选点' }}
          </el-button>
          
          <el-divider direction="vertical" />
          
          <el-button-group size="small">
            <el-button @click="setViewAngle('front')">前</el-button>
            <el-button @click="setViewAngle('top')">俯</el-button>
            <el-button @click="setViewAngle('side')">侧</el-button>
            <el-button @click="setViewAngle('iso')">3D</el-button>
          </el-button-group>
          <el-button 
            size="small" 
            @click="clearPoints('3d')"
            :disabled="referencePoints3D.length === 0"
          >
            清除点
          </el-button>
        </div>
      </div>
      
      <div class="full-view-container">
        <!-- 3D BIM查看器 -->
        <div ref="bimViewerRef" class="bim-viewer-full"></div>
        
        <!-- 点击提示 -->
        <div class="click-hint">
          <el-icon><Aim /></el-icon>
          点击3D模型中与2D参考点对应的位置
        </div>
      </div>
      
      <!-- 已选点列表 -->
      <div class="points-panel">
        <div class="panel-title">
          <span>已标记 {{ referencePoints3D.length }}/{{ referencePoints2D.length }} 个点</span>
        </div>
        <div class="points-list">
          <div 
            v-for="(point, index) in referencePoints3D" 
            :key="point.id"
            class="point-item"
          >
            <span class="point-label">{{ point.label }}</span>
            <span class="point-coords">
              ({{ point.x.toFixed(2) }}, {{ point.y.toFixed(2) }}, {{ point.z.toFixed(2) }})
            </span>
            <el-button 
              size="small" 
              type="danger" 
              text 
              @click="removePoint('3d', index)"
            >
              删除
            </el-button>
          </div>
        </div>
        <div class="button-group">
          <el-button @click="goToStage(0)">上一步</el-button>
          <el-button 
            type="primary"
            :disabled="referencePoints3D.length < 2"
            @click="goToStage(2)"
          >
            下一步：确认对齐
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 阶段2: 确认对齐 -->
    <div v-if="stage === 2" class="confirmation-container">
      <el-card class="result-card">
        <template #header>
          <div class="card-header">
            <span>对齐参数</span>
            <el-tag type="success">计算完成</el-tag>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
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
          <el-descriptions-item label="2D参考点">
            {{ referencePoints2D.length }} 个
          </el-descriptions-item>
          <el-descriptions-item label="3D参考点">
            {{ referencePoints3D.length }} 个
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="action-buttons">
          <el-button @click="goToStage(1)">返回调整</el-button>
          <el-button @click="resetAlignment">重新开始</el-button>
          <el-button type="primary" @click="confirmAlignment">确认并保存</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, watch, onMounted, onUnmounted, nextTick, markRaw, type PropType } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Aim, Document } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import DxfViewer from './DxfViewer.vue'
import config from '../config/index.js'

/**
 * 2D参考点
 */
interface ReferencePoint2D {
  id: string
  x: number
  y: number
  label: string
}

/**
 * 3D参考点
 */
interface ReferencePoint3D {
  id: string
  x: number
  y: number
  z: number
  label: string
}

/**
 * 对齐参数
 */
interface AlignmentParams {
  scale: number
  rotation: number
  offsetX: number
  offsetY: number
}

/**
 * BIM模型接口
 */
interface BIMModel {
  id: string
  name: string
  type: string
  fileUrl?: string
}

// Props
const props = defineProps({
  cadFile: {
    type: Object as PropType<File | null>,
    default: null
  },
  model3D: {
    type: Object as PropType<BIMModel | null>,
    default: null
  },
  coordinateMapper: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits<{
  'alignment-complete': [params: AlignmentParams]
  'alignment-cancel': []
  'stage-change': [stage: number]
}>()

// 模板引用
const dxfViewerRef = shallowRef<InstanceType<typeof DxfViewer> | null>(null)
const bimViewerRef = ref<HTMLElement | null>(null)
const pickingOverlayRef = ref<HTMLElement | null>(null)

// 阶段状态
const stage = ref(0)
const isPicking3D = ref(false)

// CAD查看器状态
const showCadViewer = ref(0)
const cadViewerKey = ref(0)

// 参考点
const referencePoints2D = ref<ReferencePoint2D[]>([])
const referencePoints3D = ref<ReferencePoint3D[]>([])

// 对齐参数
const alignmentParams = reactive<AlignmentParams>({
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0
})

// Three.js 对象
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationFrameId: number | null = null

// 点标记球体
const pointMarkers: THREE.Mesh[] = []

/**
 * 初始化3D场景
 */
const init3DScene = () => {
  if (!bimViewerRef.value) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f7fa)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(15, 15, 15)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = ''
  container.appendChild(renderer.domElement)
  
  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7.5)
  scene.add(directionalLight)
  
  // 添加网格
  const gridHelper = new THREE.GridHelper(100, 100)
  scene.add(gridHelper)
  
  // 添加坐标轴
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
  
  // 添加点击事件
  renderer.domElement.addEventListener('click', on3DClick)
  updateCursor() // 初始化光标
  
  // 加载模型
  if (props.model3D?.fileUrl) {
    loadModel()
  }
  
  // 启动渲染循环
  animate()
}

/**
 * 加载3D模型
 */
const loadModel = () => {
  if (!scene || !props.model3D?.fileUrl) return
  
  let modelUrl = props.model3D.fileUrl
  if (!modelUrl.startsWith('http://') && !modelUrl.startsWith('https://')) {
    modelUrl = `${config.assets?.baseUrl || config.api?.baseUrl || ''}${modelUrl}`
  }
  
  const loader = new GLTFLoader()
  loader.load(
    modelUrl,
    (gltf: any) => {
      if (!scene) return
      
      const model = gltf.scene
      model.scale.set(1.0, 1.0, 1.0)
      scene.add(markRaw(model))
      
      // 调整相机
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera!.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5
      
      camera!.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
      controls!.target.copy(center)
      controls!.update()
    },
    undefined,
    (error: any) => {console.error('加载模型失败:', error)}
  )
}

/**
 * 渲染循环
 */
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  if (controls) controls.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

/**
 * 3D点击事件
 */
const on3DClick = (event: MouseEvent) => {
  if (!isPicking3D.value) return // 如果未开启选点，不处理点击
  if (!camera || !scene || !renderer) return
  
  const rect = renderer.domElement.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )
  
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)
  
  const intersects = raycaster.intersectObjects(scene.children, true)
  
  if (intersects.length > 0) {
    const point = intersects[0].point
    addPoint3D(point.x, point.y, point.z)
  }
}

/**
 * 切换3D选点模式
 */
const togglePicking3D = () => {
  isPicking3D.value = !isPicking3D.value
  updateCursor()
  
  if (isPicking3D.value) {
    ElMessage.info('已进入选点模式，请点击模型')
  } else {
    ElMessage.info('已退出选点模式')
  }
}

/**
 * 更新光标样式
 */
const updateCursor = () => {
  if (!renderer?.domElement) return
  renderer.domElement.style.cursor = isPicking3D.value ? 'crosshair' : 'default'
}

/**
 * 添加3D参考点
 */
const addPoint3D = (x: number, y: number, z: number) => {
  const pointId = `p3d_${Date.now()}`
  const label = `P${referencePoints3D.value.length + 1}`
  
  referencePoints3D.value.push({ id: pointId, x, y, z, label })
  
  // 创建标记球体
  if (scene) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16)
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.set(x, y, z)
    ;(sphere as any).userData.pointId = pointId
    scene.add(sphere)
    pointMarkers.push(sphere)
  }
  
  ElMessage.success(`已标记3D参考点: ${label}`)
}

/**
 * 处理DXF画布点击（新方法）
 */
const onDxfCanvasClick = (coords: { x: number, y: number }) => {
  if (stage.value !== 0) return
  
  // 添加参考点
  const pointId = `p2d_${Date.now()}`
  const label = `P${referencePoints2D.value.length + 1}`
  
  referencePoints2D.value.push({
    id: pointId,
    x: coords.x,
    y: coords.y,
    label
  })
  
  ElMessage.success(`已标记2D参考点: ${label} (${coords.x.toFixed(0)}, ${coords.y.toFixed(0)})`)
}

/**
 * CAD加载完成
 */
const onCadLoaded = () => {
  console.log('✅ 双视图DXF加载完成')
}

/**
 * CAD加载错误
 */
const onCadError = (error: Error) => {
  console.error('双视图DXF错误:', error)
  ElMessage.error('DXF加载失败')
}

/**
 * DXF预埋件点击
 */
const onDxfPartClick = (part: any) => {
  console.log('DXF预埋件点击:', part)
}

/**
  
  // 假设图纸范围 (这里需要根据实际DXF数据调整)
  const extMin = dxfData?.header?.$EXTMIN || { x: 0, y: 0 }
  const extMax = dxfData?.header?.$EXTMAX || { x: 1000, y: 1000 }
  
  const worldX = extMin.x + relX * (extMax.x - extMin.x)
  const worldY = extMin.y + relY * (extMax.y - extMin.y)
  
  // 添加参考点
  const pointId = `p2d_${Date.now()}`
  const label = `P${referencePoints2D.value.length + 1}`
  
  referencePoints2D.value.push({
    id: pointId,
    x: worldX,
    y: worldY,
    label
  })
  
  ElMessage.success(`已标记2D参考点: ${label} (${worldX.toFixed(0)}, ${worldY.toFixed(0)})`)
}

/**
 * 2D点选中
 */
const onPoint2DSelected = (data: any) => {
  const pointId = `p2d_${Date.now()}`
  const label = `P${referencePoints2D.value.length + 1}`
  
  referencePoints2D.value.push({
    id: pointId,
    x: data.worldCoords.x,
    y: data.worldCoords.y,
    label
  })
  
  ElMessage.success(`已标记2D参考点: ${label}`)
}

/**
 * 坐标更新
 */
const onCoordinateUpdate = (data: any) => {
  // 可用于实时显示坐标
}

/**
 * 2D点清除
 */
const onPoints2DCleared = () => {
  referencePoints2D.value = []
}

/**
 * 清除点
 */
const clearPoints = (type: '2d' | '3d') => {
  if (type === '2d') {
    referencePoints2D.value = []
  } else {
    referencePoints3D.value = []
    // 移除标记球体
    pointMarkers.forEach(marker => {
      if (scene) scene.remove(marker)
      marker.geometry.dispose()
      ;(marker.material as THREE.Material).dispose()
    })
    pointMarkers.length = 0
  }
}

/**
 * 移除单个点
 */
const removePoint = (type: '2d' | '3d', index: number) => {
  if (type === '2d') {
    referencePoints2D.value.splice(index, 1)
  } else {
    const point = referencePoints3D.value[index]
    referencePoints3D.value.splice(index, 1)
    
    // 移除对应的标记球体
    const markerIndex = pointMarkers.findIndex(m => (m as any).userData?.pointId === point.id)
    if (markerIndex > -1) {
      const marker = pointMarkers[markerIndex]
      if (scene) scene.remove(marker)
      marker.geometry.dispose()
      ;(marker.material as THREE.Material).dispose()
      pointMarkers.splice(markerIndex, 1)
    }
  }
}

/**
 * 切换阶段
 */
const goToStage = async (newStage: number) => {
  if (newStage === 1 && stage.value === 0) {
    // 初始化3D场景
    stage.value = 1
    await nextTick()
    setTimeout(() => init3DScene(), 100)
  } else if (newStage === 2) {
    // 计算对齐参数
    calculateAlignment()
    stage.value = 2
  } else if (newStage === 0 && stage.value === 1) {
    // 清理3D场景
    cleanup3D()
    stage.value = 0
  } else {
    stage.value = newStage
  }
  
  emit('stage-change', stage.value)
}

/**
 * 计算对齐参数
 */
const calculateAlignment = () => {
  if (referencePoints2D.value.length < 2 || referencePoints3D.value.length < 2) return
  
  const p2D_1 = referencePoints2D.value[0]
  const p2D_2 = referencePoints2D.value[1]
  const p3D_1 = referencePoints3D.value[0]
  const p3D_2 = referencePoints3D.value[1]
  
  // 计算缩放
  const dist2D = Math.sqrt(Math.pow(p2D_2.x - p2D_1.x, 2) + Math.pow(p2D_2.y - p2D_1.y, 2))
  const dist3D = Math.sqrt(Math.pow(p3D_2.x - p3D_1.x, 2) + Math.pow(p3D_2.z - p3D_1.z, 2))
  alignmentParams.scale = dist2D > 0 ? dist3D / dist2D : 1
  
  // 计算旋转
  const angle2D = Math.atan2(p2D_2.y - p2D_1.y, p2D_2.x - p2D_1.x)
  const angle3D = Math.atan2(p3D_2.z - p3D_1.z, p3D_2.x - p3D_1.x)
  alignmentParams.rotation = (angle3D - angle2D) * (180 / Math.PI)
  
  // 计算偏移（需先将2D参考点旋转后再求偏移，否则只有参考点1处准确）
  const rad = alignmentParams.rotation * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rotatedX = (p2D_1.x * cos - p2D_1.y * sin) * alignmentParams.scale
  const rotatedZ = (p2D_1.x * sin + p2D_1.y * cos) * alignmentParams.scale
  alignmentParams.offsetX = p3D_1.x - rotatedX
  alignmentParams.offsetY = p3D_1.z - rotatedZ
}

/**
 * 设置3D视角
 */
const setViewAngle = (angle: string) => {
  if (!camera || !controls) return
  
  const distance = 30
  const positions: Record<string, { x: number; y: number; z: number }> = {
    front: { x: 0, y: 5, z: distance },
    top: { x: 0, y: distance, z: 0.1 },
    side: { x: distance, y: 5, z: 0 },
    iso: { x: distance * 0.7, y: distance * 0.7, z: distance * 0.7 }
  }
  
  const pos = positions[angle] || positions.iso
  camera.position.set(pos.x, pos.y, pos.z)
  controls.target.set(0, 5, 0)
  controls.update()
}

/**
 * 重置对齐
 */
const resetAlignment = () => {
  ElMessageBox.confirm('确定要重新开始对齐流程吗？', '确认', { type: 'warning' })
    .then(() => {
      clearPoints('2d')
      clearPoints('3d')
      cleanup3D()
      stage.value = 0
      alignmentParams.scale = 1
      alignmentParams.rotation = 0
      alignmentParams.offsetX = 0
      alignmentParams.offsetY = 0
      ElMessage.success('已重置')
    })
    .catch(() => {})
}

/**
 * 确认对齐
 */
const confirmAlignment = () => {
  ElMessageBox.confirm('确认保存对齐参数吗？', '确认对齐', { type: 'success' })
    .then(() => {
      // 更新坐标转换器
      if (props.coordinateMapper) {
        props.coordinateMapper.updateConfig({
          scale: alignmentParams.scale,
          rotation: alignmentParams.rotation,
          offsetX: alignmentParams.offsetX,
          offsetY: alignmentParams.offsetY
        })
      }
      
      emit('alignment-complete', { ...alignmentParams })
      ElMessage.success('对齐参数已保存')
    })
    .catch(() => {})
}

/**
 * 清理3D资源
 */
const cleanup3D = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('click', on3DClick)
    renderer.dispose()
    if (bimViewerRef.value) {
      bimViewerRef.value.innerHTML = ''
    }
  }
  
  pointMarkers.forEach(marker => {
    marker.geometry.dispose()
    ;(marker.material as THREE.Material).dispose()
  })
  pointMarkers.length = 0
  
  scene = null
  camera = null
  renderer = null
  controls = null
}

// 监听cadFile
watch(() => props.cadFile, async (newFile) => {
  if (newFile) {
    showCadViewer.value = false
    cadViewerKey.value++
    await nextTick()
    setTimeout(() => {
      showCadViewer.value = true
    }, 100)
  } else {
    showCadViewer.value = false
  }
}, { immediate: true })

// 清理
onUnmounted(() => {
  cleanup3D()
})

// 暴露方法
defineExpose({
  resetAlignment,
  getAlignmentParams: () => ({ ...alignmentParams })
})
</script>

<style scoped>
.dual-view-aligner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.stage-navigation {
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.stage-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(to right, #409eff, #66b1ff);
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.title-actions {
  display: flex;
  gap: 8px;
}

.full-view-container {
  flex: 1;
  position: relative;
  background: #fff;
  min-height: 0; /* 允许容器收缩 */
}

.bim-viewer-full {
  width: 100%;
  height: 100%;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.placeholder p {
  margin-top: 12px;
}

.click-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(103, 194, 58, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 14px;
  animation: breathe 2s infinite;
  pointer-events: none;
}

@keyframes breathe {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.03); }
}

.points-panel {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0; /* 防止被挤压 */
  max-height: 35vh; /* 限制最大高度 */
  display: flex;
  flex-direction: column;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
}

.hint {
  color: #909399;
  font-weight: normal;
  font-size: 12px;
}

.points-list {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.point-label {
  font-weight: 600;
  color: #409eff;
}

.point-coords {
  flex: 1;
  color: #606266;
  font-family: monospace;
}

.button-group {
  display: flex;
  gap: 12px;
}

.confirmation-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.result-card {
  width: 100%;
  max-width: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.picking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 40px;
}

.picking-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(64, 158, 255, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
