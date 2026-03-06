<template>
  <div class="dxf-viewer" ref="containerRef">
    <!-- 渲染画布 -->
    <canvas ref="canvasRef" class="dxf-canvas"></canvas>
    
    <!-- 控制面板 -->
    <div class="viewer-controls" v-if="showControls">
      <el-button-group size="small">
        <el-button @click="zoomIn">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
        <el-button @click="zoomOut">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
        <el-button @click="resetView">
          <el-icon><FullScreen /></el-icon>
        </el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button 
        :type="showAxisAnnotations ? 'primary' : 'default'"
        size="small"
        @click="toggleAxisAnnotations"
      >
        {{ showAxisAnnotations ? '隐藏标注' : '显示标注' }}
      </el-button>
      
      <el-divider direction="vertical" />
      
      <el-dropdown trigger="click" @command="handleEncodingChange">
        <el-button size="small">
          {{ currentEncodingLabel }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="gb18030">GBK/GB18030 (中文默认)</el-dropdown-item>
            <el-dropdown-item command="utf-8">UTF-8 (国际标准)</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <!-- 加载状态 -->
    <div class="loading-overlay" v-if="loading">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <p>正在加载图纸...</p>
    </div>
    
    <!-- 坐标显示 -->
    <div class="coord-display" v-if="showCoords">
      X: {{ mouseCoord.x.toFixed(1) }} | Y: {{ mouseCoord.y.toFixed(1) }}
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch, computed, markRaw } from 'vue'
import { ZoomIn, ZoomOut, FullScreen, Loading, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import DxfParser from 'dxf-parser'

// Props
const props = defineProps({
  file: {
    type: [File, String],
    default: null
  },
  embeddedParts: {
    type: Array,
    default: () => []
  },
  showControls: {
    type: Boolean,
    default: true
  },
  showCoords: {
    type: Boolean,
    default: true
  },
  axisLayerNames: {
    type: Array,
    default: () => ['AXIS', 'axis', '轴线', 'DOTE', 'A-GRID']
  },
  // 字体路径（用于文字渲染）
  fontUrl: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits([
  'loaded',
  'error',
  'part-click',
  'axis-detected',
  'canvas-click'
])

// DOM Refs
const containerRef = ref(null)
const canvasRef = ref(null)

// Three.js 对象 - 使用普通变量避免Vue响应式代理
// 这些对象包含大量嵌套属性，Vue Proxy会严重影响性能
let scene = null
let camera = null
let renderer = null
let controls = null
let animationFrameId = null

// DXF 数据 - 使用shallowRef避免深度响应式
const dxfData = shallowRef(null)
const axisLines = shallowRef([])
const axisLabels = shallowRef([])

// 状态
const loading = ref(false)
const showAxisAnnotations = ref(true)
const mouseCoord = ref({ x: 0, y: 0 })
const encoding = ref('gb18030')

const currentEncodingLabel = computed(() => {
  return encoding.value === 'gb18030' ? 'GBK' : 'UTF-8'
})

// 对象组
let dxfGroup = null
let annotationGroup = null
let embeddedPartsGroup = null
let axisLabelGroup = null

// 视图范围
let viewDims = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }

// ========== 生命周期 ==========
onMounted(() => {
  initThreeJs()
  window.addEventListener('resize', handleResize)
  
  if (props.file) {
    loadDxfFile(props.file)
  }
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', handleResize)
})

// 监听文件变化
watch(() => props.file, (newFile) => {
  if (newFile) {
    loadDxfFile(newFile)
  }
})

// 监听预埋件变化
watch(() => props.embeddedParts, () => {
  if (dxfData.value) {
    updateEmbeddedParts()
    updateAnnotations()
  }
}, { deep: true })

// ========== Three.js 初始化 ==========
const initThreeJs = () => {
  if (!containerRef.value || !canvasRef.value) return
  
  const container = containerRef.value
  const canvas = canvasRef.value
  
  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  
  // 正交相机 - 增大far值以支持大图纸
  const aspect = container.clientWidth / container.clientHeight || 1
  const frustumSize = 10000
  camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    100000  // 增大far值
  )
  camera.position.set(0, 0, 1000)  // 距离远一点
  camera.lookAt(0, 0, 0)
  
  // 渲染器 - 添加上下文恢复处理
  renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true  // 保持绘制缓冲区
  })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))  // 限制像素比
  
  // WebGL上下文丢失和恢复处理
  canvas.addEventListener('webglcontextlost', handleContextLost, false)
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false)
  
  // 控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableRotate = false
  controls.enablePan = true
  controls.enableZoom = true
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }
  controls.zoomSpeed = 1.5
  controls.panSpeed = 1.2
  
  // 创建对象组
  dxfGroup = new THREE.Group()
  dxfGroup.name = 'dxfContent'
  scene.add(dxfGroup)
  
  annotationGroup = new THREE.Group()
  annotationGroup.name = 'annotations'
  scene.add(annotationGroup)
  
  embeddedPartsGroup = new THREE.Group()
  embeddedPartsGroup.name = 'embeddedParts'
  scene.add(embeddedPartsGroup)
  
  axisLabelGroup = new THREE.Group()
  axisLabelGroup.name = 'axisLabels'
  scene.add(axisLabelGroup)
  
  // 鼠标事件
  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('click', handleClick)
  
  // 监听 OrbitControls 的 change 事件，滚轮缩放/拖拽时同步更新坐标
  controls.addEventListener('change', handleControlsChange)
  
  // 渲染循环
  animate()
  
  console.log('✅ Three.js 初始化完成')
}

// WebGL上下文丢失处理
const handleContextLost = (event) => {
  event.preventDefault()
  console.warn('⚠️ WebGL上下文丢失，停止渲染循环并释放资源')
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 释放所有组的资源
  disposeGroup(dxfGroup)
  disposeGroup(annotationGroup)
  disposeGroup(embeddedPartsGroup)
  disposeGroup(axisLabelGroup)
}

// WebGL上下文恢复处理
const handleContextRestored = () => {
  console.log('✅ WebGL上下文已恢复，重新初始化')
  // 重新启动渲染循环
  if (!animationFrameId) {
    animate()
  }
  // 如果有数据，重新渲染
  if (dxfData.value) {
    renderDxf(dxfData.value)
    fitToView()
  }
}

const animate = () => {
  if (!renderer) return
  animationFrameId = requestAnimationFrame(animate)
  controls?.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

/**
 * 释放Three.js对象组的所有资源
 */
const disposeGroup = (group) => {
  if (!group) return
  
  while (group.children.length > 0) {
    const child = group.children[0]
    group.remove(child)
    disposeObject(child)
  }
}

/**
 * 递归释放单个Three.js对象的资源
 */
const disposeObject = (obj) => {
  if (!obj) return
  
  // 递归处理子对象
  if (obj.children) {
    while (obj.children.length > 0) {
      const child = obj.children[0]
      obj.remove(child)
      disposeObject(child)
    }
  }
  
  // 释放几何体
  if (obj.geometry) {
    obj.geometry.dispose()
  }
  
  // 释放材质
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => disposeMaterial(mat))
    } else {
      disposeMaterial(obj.material)
    }
  }
}

/**
 * 释放材质及其纹理
 */
const disposeMaterial = (material) => {
  if (!material) return
  
  // 释放纹理
  if (material.map) material.map.dispose()
  if (material.alphaMap) material.alphaMap.dispose()
  if (material.bumpMap) material.bumpMap.dispose()
  if (material.normalMap) material.normalMap.dispose()
  if (material.specularMap) material.specularMap.dispose()
  if (material.envMap) material.envMap.dispose()
  
  material.dispose()
}

const cleanup = () => {
  console.log('🧹 清理DxfViewer资源...')
  
  // 停止动画循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 移除事件监听
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('webglcontextlost', handleContextLost)
    canvasRef.value.removeEventListener('webglcontextrestored', handleContextRestored)
    canvasRef.value.removeEventListener('mousemove', handleMouseMove)
    canvasRef.value.removeEventListener('click', handleClick)
  }
  
  // 移除 OrbitControls 事件
  controls?.removeEventListener('change', handleControlsChange)
  
  // 释放所有组的资源
  disposeGroup(dxfGroup)
  disposeGroup(annotationGroup)
  disposeGroup(embeddedPartsGroup)
  disposeGroup(axisLabelGroup)
  
  // 释放控制器
  controls?.dispose()
  
  // 释放渲染器
  renderer?.dispose()
  renderer?.forceContextLoss()
  
  // 清空引用
  scene = null
  camera = null
  renderer = null
  controls = null
  dxfGroup = null
  annotationGroup = null
  embeddedPartsGroup = null
  axisLabelGroup = null
  
  console.log('✅ DxfViewer资源清理完成')
}

// ========== DXF 加载 ==========
const loadDxfFile = async (file) => {
  loading.value = true
  
  try {
    let dxfText = ''
    
    if (file instanceof File) {
      const buffer = await file.arrayBuffer()
      console.log(`使用 ${encoding.value} 解码...`)
      const decoder = new TextDecoder(encoding.value)
      dxfText = decoder.decode(buffer)
    } else if (typeof file === 'string') {
      const response = await fetch(file)
      dxfText = await response.text()
    }
    
    // 解析 DXF
    const parser = new DxfParser()
    const dxf = parser.parseSync(dxfText)
    dxfData.value = dxf
    
    console.log('DXF 解析完成:', dxf)
    console.log('实体数量:', dxf.entities?.length || 0)
    
    // 渲染 DXF（异步批量处理）
    await renderDxf(dxf)
    
    // 提取轴线和轴号
    extractAxisLines(dxf)
    
    // 更新预埋件和标注
    updateEmbeddedParts()
    updateAnnotations()
    renderAxisLabels()
    
    // 适应视图
    fitToView()
    
    emit('loaded', { dxf, axisLines: axisLines.value, axisLabels: axisLabels.value })
    
  } catch (error) {
    console.error('DXF 加载失败:', error)
    ElMessage.error('图纸加载失败: ' + error.message)
    emit('error', error)
  } finally {
    loading.value = false
  }
}

// ========== DXF 渲染（优化版：预渲染归一化 + 异步合并）==========
// 坐标偏移量（用于将大坐标归一化到原点）
let worldOffset = { x: 0, y: 0 }

// 渲染进度
const renderProgress = ref(0)

/**
 * 异步渲染DXF - 预渲染归一化 + 分块处理
 * 关键：先计算边界再创建几何体，避免GPU处理超大浮点数
 */
const renderDxf = async (dxf) => {
  if (!dxf.entities || !scene) return
  
  // 释放旧资源
  disposeGroup(dxfGroup)
  
  const startTime = performance.now()
  const entities = dxf.entities
  console.log('🚀 开始渲染DXF, 实体数:', entities.length)
  
  // ========== 第一阶段：快速扫描计算边界（不创建几何体）==========
  console.log('📐 扫描边界...')
  renderProgress.value = 5
  
  let rawBounds = { 
    min: { x: Infinity, y: Infinity }, 
    max: { x: -Infinity, y: -Infinity } 
  }
  
  // 快速扫描实体坐标
  let lineEntityCount = 0
  for (const entity of entities) {
    scanEntityBounds(entity, rawBounds)
    
    // 🔍 诊断：检查第一个LINE实体的边界贡献
    if (entity.type === 'LINE' && entity.vertices && lineEntityCount < 1) {
      const v0 = entity.vertices[0]
      const v1 = entity.vertices[1]
      console.log('🔍 LINE实体边界检查:')
      console.log('   vertices[0]:', v0.x, v0.y)
      console.log('   vertices[1]:', v1.x, v1.y)
      console.log('   当前bounds.min:', rawBounds.min.x, rawBounds.min.y)
      console.log('   当前bounds.max:', rawBounds.max.x, rawBounds.max.y)
      console.log('   isFinite检查:', isFinite(v0.x), isFinite(v0.y), isFinite(v1.x), isFinite(v1.y))
      lineEntityCount++
    }
  }
  
  console.log('🔍 扫描后边界(含LINE):')
  console.log('   min:', rawBounds.min.x, rawBounds.min.y)
  console.log('   max:', rawBounds.max.x, rawBounds.max.y)
  
  // 🔥 优先使用 DXF Header 中的边界（更可靠）
  let usedHeaderBounds = false
  if (dxf.header?.$EXTMIN && dxf.header?.$EXTMAX) {
    const headerBounds = {
      min: { x: dxf.header.$EXTMIN.x, y: dxf.header.$EXTMIN.y },
      max: { x: dxf.header.$EXTMAX.x, y: dxf.header.$EXTMAX.y }
    }
    console.log('📐 DXF Header边界:', headerBounds)
    
    // 检查 Header 边界是否有效
    if (isFinite(headerBounds.min.x) && isFinite(headerBounds.max.x) &&
        headerBounds.max.x > headerBounds.min.x && headerBounds.max.y > headerBounds.min.y) {
      rawBounds = headerBounds
      usedHeaderBounds = true
      console.log('✅ 使用DXF Header边界（更可靠）')
    }
  }
  
  // 如果没有有效的Header边界，检查扫描边界是否有离群值
  if (!usedHeaderBounds && isFinite(rawBounds.min.x)) {
    const width = rawBounds.max.x - rawBounds.min.x
    const height = rawBounds.max.y - rawBounds.min.y
    
    // 如果范围超过1亿，可能有离群值，尝试使用更保守的边界
    if (width > 1e8 || height > 1e8) {
      console.warn('⚠️ 扫描边界范围过大，可能有离群值')
    }
  }
  
  console.log('原始边界:', rawBounds)
  
  // 计算偏移量（归一化到原点）
  const centerX = (rawBounds.min.x + rawBounds.max.x) / 2
  const centerY = (rawBounds.min.y + rawBounds.max.y) / 2
  const width = rawBounds.max.x - rawBounds.min.x
  const height = rawBounds.max.y - rawBounds.min.y
  const maxDim = Math.max(width, height, 1)
  
  // 🔥 关键修复：计算缩放因子，将坐标归一化到合理范围
  // 目标范围：最大尺寸归一化到 2000 单位 (±1000)
  const TARGET_SIZE = 2000
  const scaleFactor = maxDim > TARGET_SIZE ? TARGET_SIZE / maxDim : 1
  
  console.log(`📍 坐标偏移量: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`)
  console.log(`🔧 缩放因子: ${scaleFactor.toExponential(4)} (maxDim=${maxDim.toFixed(0)})`)
  
  // 存储偏移和缩放参数
  worldOffset = { 
    x: centerX, 
    y: centerY, 
    scale: scaleFactor  // 新增：缩放因子
  }
  
  // 更新归一化后的视图范围（已应用缩放）
  const scaledWidth = width * scaleFactor
  const scaledHeight = height * scaleFactor
  viewDims = {
    min: { x: -scaledWidth / 2, y: -scaledHeight / 2 },
    max: { x: scaledWidth / 2, y: scaledHeight / 2 }
  }
  
  console.log(`📐 归一化后视图范围: width=${scaledWidth.toFixed(2)}, height=${scaledHeight.toFixed(2)}`)
  
  await new Promise(r => setTimeout(r, 0))
  
  // ========== 第二阶段：创建归一化几何体（带偏移）==========
  console.log('🔧 创建归一化几何体...')
  renderProgress.value = 10
  
  const entityStats = {}
  const lineGeometriesByColor = new Map()
  const textSprites = []
  const otherObjects = []
  
  const CHUNK_SIZE = 1000
  
  for (let i = 0; i < entities.length; i += CHUNK_SIZE) {
    const chunk = entities.slice(i, i + CHUNK_SIZE)
    
    for (const entity of chunk) {
      entityStats[entity.type] = (entityStats[entity.type] || 0) + 1
      
      try {
        if (entity.type === 'LINE' || entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
          // 🔍 诊断：打印第一个LINE实体结构
          if (entity.type === 'LINE' && entityStats['LINE'] === 1) {
            console.log('🔍 第一个LINE实体结构:', JSON.stringify(entity, null, 2).substring(0, 500))
          }
          const geometry = createLineGeometryNormalized(entity, dxf, worldOffset)
          if (geometry) {
            const color = getColor(entity, dxf)
            const colorKey = color.toString()
            if (!lineGeometriesByColor.has(colorKey)) {
              lineGeometriesByColor.set(colorKey, { geometries: [], color })
            }
            lineGeometriesByColor.get(colorKey).geometries.push(geometry)
          }
        } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
          const geometry = createArcGeometryNormalized(entity, dxf, worldOffset)
          if (geometry) {
            const color = getColor(entity, dxf)
            const colorKey = color.toString()
            if (!lineGeometriesByColor.has(colorKey)) {
              lineGeometriesByColor.set(colorKey, { geometries: [], color })
            }
            lineGeometriesByColor.get(colorKey).geometries.push(geometry)
          }
        } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
          const sprite = createTextSpriteNormalized(entity, dxf, worldOffset)
          if (sprite) {
            textSprites.push(markRaw(sprite))
          }
        }
        // 暂时跳过其他复杂类型以保证性能
      } catch (err) {
        // 忽略单个实体错误
      }
    }
    
    // 更新进度（10-60%用于实体处理）
    renderProgress.value = 10 + Math.round((i + chunk.length) / entities.length * 50)
    
    // 让出主线程
    await new Promise(r => setTimeout(r, 0))
  }
  
  // ========== 第三阶段：异步合并几何体 ==========
  console.log(`📦 合并几何体: ${lineGeometriesByColor.size} 个颜色组`)
  renderProgress.value = 65
  
  let mergedCount = 0
  const colorGroups = Array.from(lineGeometriesByColor.entries())
  
  for (let i = 0; i < colorGroups.length; i++) {
    const [colorKey, { geometries, color }] = colorGroups[i]
    if (geometries.length === 0) continue
    
    try {
      let mergedGeometry
      
      // 分批合并避免阻塞
      if (geometries.length > 100) {
        // 大量几何体需要分批合并
        const MERGE_BATCH = 100
        let tempGeometries = [...geometries]
        
        while (tempGeometries.length > 1) {
          const batch = tempGeometries.splice(0, MERGE_BATCH)
          const merged = batch.length === 1 
            ? batch[0] 
            : BufferGeometryUtils.mergeGeometries(batch, false)
          
          if (merged) {
            tempGeometries.push(merged)
          }
          
          // 让出主线程
          await new Promise(r => setTimeout(r, 0))
        }
        
        mergedGeometry = tempGeometries[0]
      } else {
        mergedGeometry = geometries.length === 1 
          ? geometries[0] 
          : BufferGeometryUtils.mergeGeometries(geometries, false)
      }
      
      if (mergedGeometry) {
        const material = new THREE.LineBasicMaterial({ color })
        const mergedLine = new THREE.LineSegments(mergedGeometry, material)
        dxfGroup.add(markRaw(mergedLine))
        mergedCount++
      }
      
      // 释放原始几何体
      geometries.forEach(g => {
        if (g !== mergedGeometry) g.dispose()
      })
    } catch (err) {
      console.warn('几何体合并失败:', err)
    }
    
    // 更新进度（65-90%用于合并）
    renderProgress.value = 65 + Math.round((i + 1) / colorGroups.length * 25)
    
    // 让出主线程
    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 0))
    }
  }
  
  // 添加文字精灵
  textSprites.forEach(sprite => dxfGroup.add(sprite))
  
  // dxfGroup已经是归一化的，不需要设置position
  dxfGroup.position.set(0, 0, 0)
  
  const totalObjects = mergedCount + textSprites.length
  const elapsed = (performance.now() - startTime).toFixed(0)
  console.log(`✅ 渲染完成: ${entities.length}实体 → ${totalObjects}对象, 耗时${elapsed}ms`)
  console.log('实体分布:', entityStats)
  console.log('归一化后边界:', viewDims)
  
  // 🔍 诊断：检查实际渲染几何体的边界
  const box = new THREE.Box3().setFromObject(dxfGroup)
  console.log('🔍 实际几何体边界 (Box3):', {
    min: { x: box.min.x?.toFixed(2), y: box.min.y?.toFixed(2), z: box.min.z?.toFixed(2) },
    max: { x: box.max.x?.toFixed(2), y: box.max.y?.toFixed(2), z: box.max.z?.toFixed(2) },
    size: {
      x: (box.max.x - box.min.x)?.toFixed(2),
      y: (box.max.y - box.min.y)?.toFixed(2)
    }
  })
  
  renderProgress.value = 100
}

/**
 * 快速扫描实体边界（不创建几何体）
 */
const scanEntityBounds = (entity, bounds) => {
  try {
    // vertices 数组格式
    if (entity.vertices) {
      for (const v of entity.vertices) {
        if (isFinite(v.x)) {
          if (v.x < bounds.min.x) bounds.min.x = v.x
          if (v.x > bounds.max.x) bounds.max.x = v.x
        }
        if (isFinite(v.y)) {
          if (v.y < bounds.min.y) bounds.min.y = v.y
          if (v.y > bounds.max.y) bounds.max.y = v.y
        }
      }
    }
    
    // startPoint/endPoint 格式 (LINE实体常用)
    if (entity.startPoint) {
      const px = entity.startPoint.x, py = entity.startPoint.y
      if (isFinite(px)) {
        if (px < bounds.min.x) bounds.min.x = px
        if (px > bounds.max.x) bounds.max.x = px
      }
      if (isFinite(py)) {
        if (py < bounds.min.y) bounds.min.y = py
        if (py > bounds.max.y) bounds.max.y = py
      }
    }
    if (entity.endPoint) {
      const px = entity.endPoint.x, py = entity.endPoint.y
      if (isFinite(px)) {
        if (px < bounds.min.x) bounds.min.x = px
        if (px > bounds.max.x) bounds.max.x = px
      }
      if (isFinite(py)) {
        if (py < bounds.min.y) bounds.min.y = py
        if (py > bounds.max.y) bounds.max.y = py
      }
    }
    
    // center+radius 格式 (CIRCLE/ARC)
    if (entity.center && entity.radius) {
      const cx = entity.center.x, cy = entity.center.y, r = entity.radius
      if (isFinite(cx) && isFinite(r)) {
        if (cx - r < bounds.min.x) bounds.min.x = cx - r
        if (cx + r > bounds.max.x) bounds.max.x = cx + r
      }
      if (isFinite(cy) && isFinite(r)) {
        if (cy - r < bounds.min.y) bounds.min.y = cy - r
        if (cy + r > bounds.max.y) bounds.max.y = cy + r
      }
    }
    
    // position 格式 (TEXT等)
    if (entity.position) {
      const px = entity.position.x, py = entity.position.y
      if (isFinite(px)) {
        if (px < bounds.min.x) bounds.min.x = px
        if (px > bounds.max.x) bounds.max.x = px
      }
      if (isFinite(py)) {
        if (py < bounds.min.y) bounds.min.y = py
        if (py > bounds.max.y) bounds.max.y = py
      }
    }
  } catch (err) {
    // 忽略
  }
}

/**
 * 创建归一化线条几何体（应用偏移和缩放）
 */
const createLineGeometryNormalized = (entity, data, offset) => {
  const points = []
  const scale = offset.scale || 1  // 获取缩放因子
  
  if (entity.type === 'LINE') {
    // LINE 实体可能有多种坐标格式
    let startX, startY, endX, endY
    
    if (entity.vertices && entity.vertices.length >= 2) {
      startX = entity.vertices[0].x
      startY = entity.vertices[0].y
      endX = entity.vertices[1].x
      endY = entity.vertices[1].y
    } else if (entity.startPoint && entity.endPoint) {
      // dxf-parser 常见格式
      startX = entity.startPoint.x
      startY = entity.startPoint.y
      endX = entity.endPoint.x
      endY = entity.endPoint.y
    } else if (entity.start && entity.end) {
      // 另一种格式
      startX = entity.start.x
      startY = entity.start.y
      endX = entity.end.x
      endY = entity.end.y
    }
    
    if (startX !== undefined && endX !== undefined) {
      points.push(new THREE.Vector3(
        (startX - offset.x) * scale, 
        (startY - offset.y) * scale, 
        0
      ))
      points.push(new THREE.Vector3(
        (endX - offset.x) * scale, 
        (endY - offset.y) * scale, 
        0
      ))
    }
  } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    if (entity.vertices && entity.vertices.length >= 2) {
      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const v1 = entity.vertices[i]
        const v2 = entity.vertices[i + 1]
        
        if (v1.bulge && Math.abs(v1.bulge) > 0.001) {
          const curvePoints = getBulgeCurvePoints(v1, v2, v1.bulge)
          for (let j = 0; j < curvePoints.length - 1; j++) {
            points.push(new THREE.Vector3(
              (curvePoints[j].x - offset.x) * scale, 
              (curvePoints[j].y - offset.y) * scale, 
              0
            ))
            points.push(new THREE.Vector3(
              (curvePoints[j+1].x - offset.x) * scale, 
              (curvePoints[j+1].y - offset.y) * scale, 
              0
            ))
          }
        } else {
          points.push(new THREE.Vector3((v1.x - offset.x) * scale, (v1.y - offset.y) * scale, 0))
          points.push(new THREE.Vector3((v2.x - offset.x) * scale, (v2.y - offset.y) * scale, 0))
        }
      }
      
      if (entity.shape) {
        const first = entity.vertices[0]
        const last = entity.vertices[entity.vertices.length - 1]
        points.push(new THREE.Vector3((last.x - offset.x) * scale, (last.y - offset.y) * scale, 0))
        points.push(new THREE.Vector3((first.x - offset.x) * scale, (first.y - offset.y) * scale, 0))
      }
    }
  }
  
  if (points.length < 2) return null
  return new THREE.BufferGeometry().setFromPoints(points)
}

/**
 * 创建归一化圆弧几何体（应用偏移和缩放）
 */
const createArcGeometryNormalized = (entity, data, offset) => {
  const points = []
  const scale = offset.scale || 1  // 获取缩放因子
  const center = entity.center || { x: 0, y: 0 }
  const radius = entity.radius || 1
  
  let startAngle = entity.startAngle || 0
  let endAngle = entity.endAngle !== undefined ? entity.endAngle : Math.PI * 2
  
  if (entity.type === 'CIRCLE') {
    startAngle = 0
    endAngle = Math.PI * 2
  }
  
  const segments = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 16)))
  const deltaAngle = (endAngle - startAngle) / segments
  
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + i * deltaAngle
    const angle2 = startAngle + (i + 1) * deltaAngle
    
    points.push(new THREE.Vector3(
      (center.x + radius * Math.cos(angle1) - offset.x) * scale,
      (center.y + radius * Math.sin(angle1) - offset.y) * scale,
      0
    ))
    points.push(new THREE.Vector3(
      (center.x + radius * Math.cos(angle2) - offset.x) * scale,
      (center.y + radius * Math.sin(angle2) - offset.y) * scale,
      0
    ))
  }
  
  if (points.length < 2) return null
  return new THREE.BufferGeometry().setFromPoints(points)
}

/**
 * 创建归一化文字精灵（应用偏移和缩放）
 */
const createTextSpriteNormalized = (entity, data, offset) => {
  const text = entity.text || entity.string || ''
  if (!text) return null
  
  const scale = offset.scale || 1  // 获取缩放因子
  const pos = entity.position || entity.startPoint || { x: 0, y: 0 }
  const height = entity.textHeight || entity.height || 50
  
  // 创建Canvas文字
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const fontSize = Math.max(32, Math.min(128, height * 2))
  ctx.font = `${fontSize}px Arial`
  const metrics = ctx.measureText(text)
  
  canvas.width = Math.ceil(metrics.width) + 4
  canvas.height = fontSize + 4
  
  ctx.font = `${fontSize}px Arial`
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 2, 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  
  const material = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(material)
  
  // 归一化位置（应用偏移和缩放）
  sprite.position.set(
    (pos.x - offset.x) * scale, 
    (pos.y - offset.y) * scale, 
    0
  )
  // 精灵尺寸也需要缩放
  const scaledHeight = height * scale
  sprite.scale.set(canvas.width * scaledHeight / fontSize, scaledHeight, 1)
  
  return sprite
}

/**
 * 创建线条几何体（用于批量合并）
 */
const createLineGeometry = (entity, data) => {
  const points = []
  const color = getColor(entity, data)
  
  if (entity.type === 'LINE') {
    if (entity.vertices && entity.vertices.length >= 2) {
      points.push(new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, 0))
      points.push(new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, 0))
    }
  } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    if (entity.vertices && entity.vertices.length >= 2) {
      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const v1 = entity.vertices[i]
        const v2 = entity.vertices[i + 1]
        
        if (v1.bulge && Math.abs(v1.bulge) > 0.001) {
          // 有凸度的线段需要转换为弧
          const curvePoints = getBulgeCurvePoints(v1, v2, v1.bulge)
          for (let j = 0; j < curvePoints.length - 1; j++) {
            points.push(new THREE.Vector3(curvePoints[j].x, curvePoints[j].y, 0))
            points.push(new THREE.Vector3(curvePoints[j+1].x, curvePoints[j+1].y, 0))
          }
        } else {
          points.push(new THREE.Vector3(v1.x, v1.y, 0))
          points.push(new THREE.Vector3(v2.x, v2.y, 0))
        }
      }
      
      // 闭合多段线
      if (entity.shape) {
        const first = entity.vertices[0]
        const last = entity.vertices[entity.vertices.length - 1]
        points.push(new THREE.Vector3(last.x, last.y, 0))
        points.push(new THREE.Vector3(first.x, first.y, 0))
      }
    }
  }
  
  if (points.length < 2) return null
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return geometry
}

/**
 * 创建圆弧几何体（用于批量合并）
 */
const createArcGeometry = (entity, data) => {
  const points = []
  const center = entity.center || { x: 0, y: 0 }
  const radius = entity.radius || 1
  
  let startAngle = entity.startAngle || 0
  let endAngle = entity.endAngle !== undefined ? entity.endAngle : Math.PI * 2
  
  // 圆是特殊的圆弧
  if (entity.type === 'CIRCLE') {
    startAngle = 0
    endAngle = Math.PI * 2
  }
  
  // 计算弧上的点
  const segments = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 16)))
  const deltaAngle = (endAngle - startAngle) / segments
  
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + i * deltaAngle
    const angle2 = startAngle + (i + 1) * deltaAngle
    
    points.push(new THREE.Vector3(
      center.x + radius * Math.cos(angle1),
      center.y + radius * Math.sin(angle1),
      0
    ))
    points.push(new THREE.Vector3(
      center.x + radius * Math.cos(angle2),
      center.y + radius * Math.sin(angle2),
      0
    ))
  }
  
  if (points.length < 2) return null
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return geometry
}

// ========== 实体绘制函数（来自 three-dxf）==========
const drawEntity = (entity, data) => {
  let mesh = null
  
  try {
    switch (entity.type) {
      case 'CIRCLE':
      case 'ARC':
        mesh = drawArc(entity, data)
        break
      case 'LWPOLYLINE':
      case 'LINE':
      case 'POLYLINE':
        mesh = drawLine(entity, data)
        break
      case 'TEXT':
        mesh = drawText(entity, data)
        break
      case 'MTEXT':
        mesh = drawMtext(entity, data)
        break
      case 'SOLID':
        mesh = drawSolid(entity, data)
        break
      case 'POINT':
        mesh = drawPoint(entity, data)
        break
      case 'INSERT':
        mesh = drawBlock(entity, data)
        break
      case 'SPLINE':
        mesh = drawSpline(entity, data)
        break
      case 'ELLIPSE':
        mesh = drawEllipse(entity, data)
        break
      case 'DIMENSION':
        mesh = drawDimension(entity, data)
        break
      default:
        // console.log('不支持的实体类型:', entity.type)
        break
    }
  } catch (e) {
    console.warn('实体渲染出错:', entity.type, e.message)
  }
  
  return mesh
}

// 获取实体颜色
const getColor = (entity, data) => {
  let color = 0x000000
  if (entity.color) {
    color = entity.color
  } else if (data.tables?.layer?.layers[entity.layer]) {
    color = data.tables.layer.layers[entity.layer].color
  }
  if (color == null || color === 0xffffff) {
    color = 0x000000
  }
  return color
}

// 绘制圆/圆弧
const drawArc = (entity, data) => {
  let startAngle, endAngle
  if (entity.type === 'CIRCLE') {
    startAngle = entity.startAngle || 0
    endAngle = startAngle + 2 * Math.PI
  } else {
    startAngle = entity.startAngle
    endAngle = entity.endAngle
  }
  
  const curve = new THREE.ArcCurve(
    0, 0,
    entity.radius,
    startAngle,
    endAngle
  )
  
  const points = curve.getPoints(32)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color: getColor(entity, data) })
  
  const arc = new THREE.Line(geometry, material)
  arc.position.x = entity.center.x
  arc.position.y = entity.center.y
  arc.position.z = entity.center.z || 0
  
  return arc
}

// 绘制直线/多段线
const drawLine = (entity, data) => {
  if (!entity.vertices) return null
  
  const points = []
  const color = getColor(entity, data)
  
  for (let i = 0; i < entity.vertices.length; i++) {
    if (entity.vertices[i].bulge) {
      const bulge = entity.vertices[i].bulge
      const startPoint = entity.vertices[i]
      const endPoint = i + 1 < entity.vertices.length ? entity.vertices[i + 1] : entity.vertices[0]
      const bulgePoints = getBulgeCurvePoints(startPoint, endPoint, bulge)
      points.push(...bulgePoints)
    } else {
      const vertex = entity.vertices[i]
      points.push(new THREE.Vector3(vertex.x, vertex.y, 0))
    }
  }
  
  if (entity.shape) points.push(points[0])
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ linewidth: 1, color })
  
  return new THREE.Line(geometry, material)
}

// 计算凸度曲线点
const getBulgeCurvePoints = (startPoint, endPoint, bulge) => {
  const p0 = new THREE.Vector2(startPoint.x, startPoint.y)
  const p1 = new THREE.Vector2(endPoint.x, endPoint.y)
  
  const angle = 4 * Math.atan(bulge)
  const radius = p0.distanceTo(p1) / 2 / Math.sin(angle / 2)
  
  const angleToP1 = Math.atan2(p1.y - p0.y, p1.x - p0.x)
  const centerAngle = angleToP1 + (Math.PI / 2 - angle / 2)
  const center = {
    x: startPoint.x + radius * Math.cos(centerAngle),
    y: startPoint.y + radius * Math.sin(centerAngle)
  }
  
  const segments = Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6)
  const startAngle = Math.atan2(p0.y - center.y, p0.x - center.x)
  const thetaAngle = angle / segments
  
  const vertices = []
  vertices.push(new THREE.Vector3(p0.x, p0.y, 0))
  
  for (let i = 1; i <= segments - 1; i++) {
    const vertex = {
      x: center.x + Math.abs(radius) * Math.cos(startAngle + thetaAngle * i),
      y: center.y + Math.abs(radius) * Math.sin(startAngle + thetaAngle * i)
    }
    vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0))
  }
  
  return vertices
}

// 绘制椭圆
const drawEllipse = (entity, data) => {
  const color = getColor(entity, data)
  const xrad = Math.sqrt(Math.pow(entity.majorAxisEndPoint.x, 2) + Math.pow(entity.majorAxisEndPoint.y, 2))
  const yrad = xrad * entity.axisRatio
  const rotation = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x)
  
  const curve = new THREE.EllipseCurve(
    entity.center.x, entity.center.y,
    xrad, yrad,
    entity.startAngle, entity.endAngle,
    false,
    rotation
  )
  
  const points = curve.getPoints(50)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ linewidth: 1, color })
  
  return new THREE.Line(geometry, material)
}

// 绘制样条曲线
const drawSpline = (entity, data) => {
  const color = getColor(entity, data)
  if (!entity.controlPoints || entity.controlPoints.length < 2) return null
  
  // 简化处理：使用 CatmullRomCurve3
  const points = entity.controlPoints.map(p => new THREE.Vector3(p.x, p.y, 0))
  const curve = new THREE.CatmullRomCurve3(points)
  const curvePoints = curve.getPoints(entity.controlPoints.length * 10)
  
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints)
  const material = new THREE.LineBasicMaterial({ linewidth: 1, color })
  
  return new THREE.Line(geometry, material)
}

// 绘制点
const drawPoint = (entity, data) => {
  if (!entity.position) return null
  
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    entity.position.x, entity.position.y, entity.position.z || 0
  ], 3))
  
  const material = new THREE.PointsMaterial({ size: 2, color: getColor(entity, data) })
  return new THREE.Points(geometry, material)
}

// 绘制实心填充
const drawSolid = (entity, data) => {
  if (!entity.points || entity.points.length < 3) return null
  
  const verts = []
  const points = entity.points
  
  // 添加三角形
  verts.push(
    new THREE.Vector3(points[0].x, points[0].y, points[0].z || 0),
    new THREE.Vector3(points[1].x, points[1].y, points[1].z || 0),
    new THREE.Vector3(points[2].x, points[2].y, points[2].z || 0)
  )
  if (points.length > 3) {
    verts.push(
      new THREE.Vector3(points[1].x, points[1].y, points[1].z || 0),
      new THREE.Vector3(points[2].x, points[2].y, points[2].z || 0),
      new THREE.Vector3(points[3].x, points[3].y, points[3].z || 0)
    )
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(verts)
  const material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) })
  
  return new THREE.Mesh(geometry, material)
}

// 绘制文字（使用 Canvas + Sprite）
const drawText = (entity, data) => {
  const text = entity.text || entity.string || ''
  if (!text) return null
  
  const color = getColor(entity, data)
  const fontSize = Math.max(entity.textHeight || entity.height || 100, 20)
  
  // 创建 Canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // 设置字体并测量文字
  ctx.font = `${fontSize}px Arial, sans-serif`
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize * 1.2
  
  // 设置 Canvas 尺寸
  canvas.width = Math.max(textWidth + 10, 1)
  canvas.height = Math.max(textHeight + 10, 1)
  
  // 绘制文字
  ctx.font = `${fontSize}px Arial, sans-serif`
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
  ctx.textBaseline = 'top'
  ctx.fillText(text, 5, 5)
  
  // 创建 Sprite
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  
  const pos = entity.startPoint || entity.position || { x: 0, y: 0, z: 0 }
  sprite.position.set(pos.x + canvas.width / 2, pos.y + canvas.height / 2, pos.z || 0)
  sprite.scale.set(canvas.width, canvas.height, 1)
  
  return sprite
}

// 绘制多行文字（使用 Canvas + Sprite）
const drawMtext = (entity, data) => {
  let text = entity.text || ''
  if (!text) return null
  
  // 清理 MTEXT 控制字符
  text = text.replace(/\\[AXQWOoLIpfH].*;/g, '')
    .replace(/\\[{}]/g, '')
    .replace(/\\P/g, '\n')
    .replace(/\\X/g, '\n')
  
  const color = getColor(entity, data)
  const fontSize = Math.max(entity.height || 100, 20)
  
  // 创建 Canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // 分割多行
  const lines = text.split('\n')
  
  // 设置字体并计算尺寸
  ctx.font = `${fontSize}px Arial, sans-serif`
  let maxWidth = 0
  lines.forEach(line => {
    const w = ctx.measureText(line).width
    if (w > maxWidth) maxWidth = w
  })
  
  const lineHeight = fontSize * 1.3
  const textHeight = lines.length * lineHeight
  
  canvas.width = Math.max(maxWidth + 10, 1)
  canvas.height = Math.max(textHeight + 10, 1)
  
  // 绘制每行文字
  ctx.font = `${fontSize}px Arial, sans-serif`
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
  ctx.textBaseline = 'top'
  
  lines.forEach((line, i) => {
    ctx.fillText(line, 5, 5 + i * lineHeight)
  })
  
  // 创建 Sprite
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  
  const pos = entity.position || { x: 0, y: 0, z: 0 }
  sprite.position.set(pos.x + canvas.width / 2, pos.y - canvas.height / 2, pos.z || 0)
  sprite.scale.set(canvas.width, canvas.height, 1)
  
  return sprite
}

// 绘制块引用
const drawBlock = (entity, data) => {
  const block = data.blocks?.[entity.name]
  if (!block?.entities) return null
  
  const group = new THREE.Group()
  
  if (entity.xScale) group.scale.x = entity.xScale
  if (entity.yScale) group.scale.y = entity.yScale
  
  if (entity.rotation) {
    group.rotation.z = entity.rotation * Math.PI / 180
  }
  
  if (entity.position) {
    group.position.set(entity.position.x, entity.position.y, entity.position.z || 0)
  }
  
  for (const childEntity of block.entities) {
    const childMesh = drawEntity(childEntity, data)
    if (childMesh) group.add(childMesh)
  }
  
  return group
}

// 绘制尺寸标注
const drawDimension = (entity, data) => {
  const block = data.blocks?.[entity.block]
  if (!block?.entities) return null
  
  const group = new THREE.Group()
  
  for (const childEntity of block.entities) {
    const childMesh = drawEntity(childEntity, data)
    if (childMesh) group.add(childMesh)
  }
  
  return group
}

// ========== 轴线/轴号提取 ==========
// 注意：必须使用归一化坐标（减去worldOffset）
const extractAxisLines = (dxf) => {
  if (!dxf.entities) return
  
  axisLines.value = []
  axisLabels.value = []
  
  // 获取当前偏移量和缩放因子
  const offsetX = worldOffset.x || 0
  const offsetY = worldOffset.y || 0
  const scale = worldOffset.scale || 1
  
  console.log('轴线检测使用偏移量:', { offsetX, offsetY, scale })
  
  dxf.entities.forEach(entity => {
    const layer = entity.layer?.toUpperCase() || ''
    const isAxisLayer = props.axisLayerNames.some(name => 
      layer.includes(name.toUpperCase())
    )
    
    if (!isAxisLayer) return
    
    // 轴线 - 使用归一化坐标（应用缩放）
    if (entity.type === 'LINE') {
      let start, end
      
      if (entity.vertices?.length >= 2) {
        start = entity.vertices[0]
        end = entity.vertices[1]
      } else if (entity.startPoint && entity.endPoint) {
        start = entity.startPoint
        end = entity.endPoint
      }
      
      if (start && end) {
        // 归一化坐标并应用缩放
        const normStart = { 
          x: (start.x - offsetX) * scale, 
          y: (start.y - offsetY) * scale 
        }
        const normEnd = { 
          x: (end.x - offsetX) * scale, 
          y: (end.y - offsetY) * scale 
        }
      
      const dx = Math.abs(normEnd.x - normStart.x)
      const dy = Math.abs(normEnd.y - normStart.y)
      const isHorizontal = dy > dx
      
      axisLines.value.push({
        layer: entity.layer,
        startPoint: normStart,
        endPoint: normEnd,
        isHorizontal,
        position: isHorizontal ? normStart.y : normStart.x
      })
    }
  }
    
    // 轴号 - 使用归一化坐标（应用缩放）
    if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
      const position = entity.position || entity.startPoint
      if (position) {
        const text = (entity.text || entity.string || '').trim()
        if (text && text.length < 10) {
          axisLabels.value.push({
            text,
            position: { 
              x: (position.x - offsetX) * scale, 
              y: (position.y - offsetY) * scale 
            },
            layer: entity.layer,
            height: (entity.height || entity.textHeight || 300) * scale // 高度也需要缩放
          })
        }
      }
    }
  })
  
  console.log('检测到轴线:', axisLines.value.length, '条')
  console.log('检测到轴号:', axisLabels.value.length, '个')
  
  emit('axis-detected', { lines: axisLines.value, labels: axisLabels.value })
}

// ========== 预埋件和标注 ==========
const updateEmbeddedParts = () => {
  if (!embeddedPartsGroup) return
  
  while (embeddedPartsGroup.children.length > 0) {
    embeddedPartsGroup.remove(embeddedPartsGroup.children[0])
  }
  
  const statusColors = {
    pending: 0xE6A23C,
    installed: 0x67C23A,
    inspected: 0x409EFF,
    completed: 0x909399
  }
  
  // 动态计算圆点半径：取可视范围的 1%
  const viewWidth = Math.abs(viewDims.max.x - viewDims.min.x) || 2000
  const viewHeight = Math.abs(viewDims.max.y - viewDims.min.y) || 2000
  const viewSize = Math.min(viewWidth, viewHeight)
  const circleRadius = Math.max(viewSize * 0.0002, 0.1)
  
  // 获取归一化参数
  const offsetX = worldOffset.x || 0
  const offsetY = worldOffset.y || 0
  const scale = worldOffset.scale || 1
  
  props.embeddedParts.forEach(part => {
    if (!part.coordinates2D) return
    
    const color = statusColors[part.status] || 0x909399
    const geometry = new THREE.CircleGeometry(circleRadius, 32)
    const material = new THREE.MeshBasicMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    
    // 对预埋件坐标应用归一化变换（与DXF图纸一致）
    const nx = (part.coordinates2D.x - offsetX) * scale
    const ny = (part.coordinates2D.y - offsetY) * scale
    mesh.position.set(nx, ny, 1)
    mesh.userData = { part }
    
    embeddedPartsGroup.add(mesh)
  })
}

const updateAnnotations = () => {
  if (!annotationGroup || !showAxisAnnotations.value) return
  
  while (annotationGroup.children.length > 0) {
    annotationGroup.remove(annotationGroup.children[0])
  }
  
  if (axisLines.value.length === 0) return
  
  const hLines = axisLines.value.filter(l => l.isHorizontal)
  const vLines = axisLines.value.filter(l => !l.isHorizontal)
  
  // 获取归一化参数
  const offsetX = worldOffset.x || 0
  const offsetY = worldOffset.y || 0
  const scale = worldOffset.scale || 1
  
  // 引线长度（归一化单位）
  const viewWidth = Math.abs(viewDims.max.x - viewDims.min.x) || 2000
  const viewHeight = Math.abs(viewDims.max.y - viewDims.min.y) || 2000
  const viewSize = Math.min(viewWidth, viewHeight)
  const leaderLen = viewSize * 0.02  // 引线长度：可视范围的 2%
  
  /**
   * 过滤有效的轴号标签（排除坐标值、长数字等无效轴号）
   * 有效轴号例如：A, B, 1, 2, A-1, ①, ②
   * 无效例如：133800, 297450
   */
  const validAxisLabels = axisLabels.value.filter(label => {
    const t = label.text.trim()
    if (t.length === 0 || t.length > 5) return false
    // 排除纯数字且 > 999 的（这些通常是坐标值而非轴号）
    if (/^\d+$/.test(t) && parseInt(t) > 999) return false
    return true
  })
  
  /**
   * 根据归一化后的轴线位置，找到最近的有效轴号
   */
  const findAxisLabel = (axisLine) => {
    if (validAxisLabels.length === 0) return ''
    let bestLabel = ''
    let bestDist = Infinity
    validAxisLabels.forEach(label => {
      const d = axisLine.isHorizontal
        ? Math.abs(label.position.y - axisLine.position)
        : Math.abs(label.position.x - axisLine.position)
      if (d < bestDist) {
        bestDist = d
        bestLabel = label.text
      }
    })
    return bestLabel
  }
  
  props.embeddedParts.forEach((part, partIndex) => {
    if (!part.coordinates2D) return
    
    // 对预埋件坐标应用归一化变换
    const px = (part.coordinates2D.x - offsetX) * scale
    const py = (part.coordinates2D.y - offsetY) * scale
    
    if (vLines.length > 0) {
      const nearest = vLines.reduce((prev, curr) =>
        Math.abs(curr.position - px) < Math.abs(prev.position - px) ? curr : prev
      )
      const distNorm = Math.abs(px - nearest.position)
      const distReal = distNorm / scale
      const axisName = findAxisLabel(nearest)
      // 引线方向：右上
      drawLeaderAnnotation(px, py, leaderLen, leaderLen * 0.6, distReal, axisName, 'X')
    }
    
    if (hLines.length > 0) {
      const nearest = hLines.reduce((prev, curr) =>
        Math.abs(curr.position - py) < Math.abs(prev.position - py) ? curr : prev
      )
      const distNorm = Math.abs(py - nearest.position)
      const distReal = distNorm / scale
      const axisName = findAxisLabel(nearest)
      // 引线方向：右下（避免与上面的重叠）
      drawLeaderAnnotation(px, py, leaderLen, -leaderLen * 0.6, distReal, axisName, 'Y')
    }
  })
}

/**
 * 绘制引线标注：从预埋件位置引出一条斜线，标签放在引线末端
 * @param {number} px - 预埋件归一化 X
 * @param {number} py - 预埋件归一化 Y
 * @param {number} dx - 引线 X 方向偏移
 * @param {number} dy - 引线 Y 方向偏移
 * @param {number} distReal - 真实DXF距离 (mm)
 * @param {string} axisName - 轴号名称
 * @param {string} direction - 'X' 或 'Y'，表示距离方向
 */
const drawLeaderAnnotation = (px, py, dx, dy, distReal, axisName, direction) => {
  const viewWidth = Math.abs(viewDims.max.x - viewDims.min.x) || 2000
  const viewHeight = Math.abs(viewDims.max.y - viewDims.min.y) || 2000
  const viewSize = Math.min(viewWidth, viewHeight)
  const unitSize = viewSize * 0.001

  // 引线终点
  const endX = px + dx
  const endY = py + dy

  // ① 引线（实线，细）
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([px, py, 2, endX, endY, 2]), 3
  ))
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff6666, linewidth: 1 })
  annotationGroup.add(new THREE.Line(lineGeo, lineMat))

  // ② 引线末端小圆点
  const dotGeo = new THREE.CircleGeometry(unitSize * 0.3, 12)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff6666 })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.position.set(px, py, 2)
  annotationGroup.add(dot)

  // ③ 文字标签（放在引线末端）
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const distText = Math.round(distReal)
  let text
  if (axisName) {
    text = `${direction}→轴${axisName}: ${distText}mm`
  } else {
    text = `${direction}: ${distText}mm`
  }
  const fontSize = 32

  ctx.font = `bold ${fontSize}px Arial`
  const metrics = ctx.measureText(text)

  const pad = 6
  canvas.width = Math.ceil(metrics.width) + pad * 2
  canvas.height = fontSize + pad * 2

  // 半透明深色背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  ctx.roundRect(0, 0, canvas.width, canvas.height, 4)
  ctx.fill()

  // 白色文字
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(spriteMat)

  const spriteH = unitSize * 1.2
  const spriteW = spriteH * (canvas.width / canvas.height)

  // 标签放在引线终点稍外侧
  sprite.position.set(endX + spriteW * 0.5, endY, 3)
  sprite.scale.set(spriteW, spriteH, 1)

  annotationGroup.add(sprite)
}

const renderAxisLabels = () => {
  if (!axisLabelGroup) return
  
  while (axisLabelGroup.children.length > 0) {
    axisLabelGroup.remove(axisLabelGroup.children[0])
  }
  
  if (!showAxisAnnotations.value) return
  
  axisLabels.value.forEach(label => {
    // 使用 Sprite 绘制轴号圆圈
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const fontSize = 64
    const text = label.text
    
    canvas.width = fontSize * Math.max(text.length, 1.5)
    canvas.height = fontSize * 1.5
    
    // 圆形背景
    const radius = canvas.height / 2 - 2
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#333'
    ctx.stroke()
    
    // 文字
    ctx.font = `bold ${fontSize * 0.6}px Arial`
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    
    const scale = label.height ? label.height * 2.5 : 500
    sprite.position.set(label.position.x, label.position.y, 5)
    sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1)
    
    axisLabelGroup.add(sprite)
  })
}

// ========== 视图控制 ==========
const fitToView = () => {
  if (!scene || !camera || !containerRef.value) {
    console.warn('fitToView: 组件未准备好')
    return
  }
  
  // 直接使用归一化后的 viewDims
  let minX = viewDims.min.x
  let minY = viewDims.min.y
  let maxX = viewDims.max.x
  let maxY = viewDims.max.y
  
  // ⚠️ 关键诊断：打印实际的 viewDims 值
  console.log('🔍 fitToView DEBUG - viewDims原始值:', JSON.stringify(viewDims))
  console.log('🔍 fitToView DEBUG - minX=%s, minY=%s, maxX=%s, maxY=%s', 
    minX, minY, maxX, maxY)
  
  // 如果没有有效范围，使用默认值
  if (!isFinite(minX) || !isFinite(maxX) || minX === maxX) {
    console.warn('⚠️ fitToView: 使用默认边界')
    minX = -10000
    minY = -10000
    maxX = 10000
    maxY = 10000
  }
  
  // 防止Y范围为0或极小
  if (!isFinite(minY) || !isFinite(maxY) || Math.abs(maxY - minY) < 0.01) {
    const avgY = isFinite(minY) ? minY : 0
    minY = avgY - 1000
    maxY = avgY + 1000
    console.log('⚠️ Y范围太小，扩展为:', { minY, maxY })
  }
  
  const width = Math.abs(maxX - minX)
  const height = Math.abs(maxY - minY)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const aspectRatio = width / height
  
  // 核心诊断输出
  console.log('📐 BoundingBox尺寸:', {
    width: width.toFixed(2),
    height: height.toFixed(2),
    aspectRatio: aspectRatio.toFixed(2),
    center: `(${centerX.toFixed(2)}, ${centerY.toFixed(2)})`
  })
  
  const containerWidth = containerRef.value.clientWidth || 800
  const containerHeight = containerRef.value.clientHeight || 600
  const containerAspect = containerWidth / containerHeight
  
  // 计算缩放因子
  const scaleX = containerWidth / width   // 适应宽度的缩放
  const scaleY = containerHeight / height // 适应高度的缩放
  
  console.log('🔍 缩放因子:', { scaleX: scaleX.toFixed(6), scaleY: scaleY.toFixed(6) })
  
  // 极端宽高比阈值
  const EXTREME_ASPECT_THRESHOLD = 50
  
  let viewWidth, viewHeight
  
  if (aspectRatio > EXTREME_ASPECT_THRESHOLD) {
    // ⚠️ 极端宽高比检测：忽略宽度适配，只以高度为基准
    console.warn(`⚠️ Extreme aspect ratio detected (${aspectRatio.toFixed(1)}:1), fitting to HEIGHT only!`)
    
    // 以高度为基准，让数据高度占屏幕的约80%
    viewHeight = height * 1.25  // 数据高度占80%
    viewWidth = viewHeight * containerAspect
    
    console.log('📏 强制按高度适配:', {
      viewHeight: viewHeight.toFixed(2),
      viewWidth: viewWidth.toFixed(2),
      dataHeightPercent: '80%'
    })
  } else if (aspectRatio > containerAspect) {
    // 数据更宽（但不极端），以宽度为准
    viewWidth = width * 1.1
    viewHeight = viewWidth / containerAspect
  } else {
    // 数据更高或正常比例，以高度为准
    viewHeight = height * 1.1
    viewWidth = viewHeight * containerAspect
  }
  
  // 确保视图尺寸有效
  viewWidth = Math.max(viewWidth, 1)
  viewHeight = Math.max(viewHeight, 1)
  
  // 设置正交相机 - left/right/top/bottom 是相对于相机位置的偏移量
  camera.left = -viewWidth / 2
  camera.right = viewWidth / 2
  camera.top = viewHeight / 2
  camera.bottom = -viewHeight / 2
  
  // near/far 平面
  camera.near = 0.1
  camera.far = Math.max(10000, Math.max(width, height) * 10)
  
  // 相机位置：在数据中心上方
  camera.position.set(centerX, centerY, 1000)
  camera.lookAt(centerX, centerY, 0)
  
  // 必须更新投影矩阵！
  camera.updateProjectionMatrix()
  
  // 更新控制器目标
  if (controls) {
    controls.target.set(centerX, centerY, 0)
    controls.update()
  }
  
  console.log('✅ 相机设置完成:', {
    view: { 
      width: viewWidth.toFixed(2), 
      height: viewHeight.toFixed(2) 
    },
    camera: {
      left: camera.left.toFixed(2),
      right: camera.right.toFixed(2),
      top: camera.top.toFixed(2),
      bottom: camera.bottom.toFixed(2),
      position: `(${centerX.toFixed(2)}, ${centerY.toFixed(2)}, 1000)`
    },
    isExtremeAspect: aspectRatio > EXTREME_ASPECT_THRESHOLD
  })
}

const zoomIn = () => {
  if (!camera) return
  const factor = 0.8
  camera.left *= factor
  camera.right *= factor
  camera.top *= factor
  camera.bottom *= factor
  camera.updateProjectionMatrix()
}

const zoomOut = () => {
  if (!camera) return
  const factor = 1.25
  camera.left *= factor
  camera.right *= factor
  camera.top *= factor
  camera.bottom *= factor
  camera.updateProjectionMatrix()
}

const resetView = () => {
  fitToView()
}

// 定位到指定坐标（原始图纸坐标）
const focusOnCoordinate = (rawX, rawY) => {
  if (!camera || !controls || !containerRef.value) {
    console.warn('focusOnCoordinate: 组件未准备好')
    return
  }

  // 将原始坐标转为归一化坐标
  const offsetX = worldOffset.x || 0
  const offsetY = worldOffset.y || 0
  const scale = worldOffset.scale || 1
  const nx = (rawX - offsetX) * scale
  const ny = (rawY - offsetY) * scale

  console.log('📍 定位到坐标:', { rawX, rawY, nx, ny })

  // 计算视口大小：图纸总范围的 20%，让目标放大显示
  const viewWidth = Math.abs(viewDims.max.x - viewDims.min.x) || 2000
  const viewHeight = Math.abs(viewDims.max.y - viewDims.min.y) || 2000
  const zoomSize = Math.min(viewWidth, viewHeight) * 0.2

  const containerAspect = (containerRef.value.clientWidth || 800) / (containerRef.value.clientHeight || 600)

  let vw, vh
  if (containerAspect > 1) {
    vh = zoomSize
    vw = vh * containerAspect
  } else {
    vw = zoomSize
    vh = vw / containerAspect
  }

  camera.left = -vw / 2
  camera.right = vw / 2
  camera.top = vh / 2
  camera.bottom = -vh / 2
  camera.position.set(nx, ny, 1000)
  camera.lookAt(nx, ny, 0)
  camera.updateProjectionMatrix()

  controls.target.set(nx, ny, 0)
  controls.update()

  // 添加闪烁高亮圆环
  highlightPosition(nx, ny, zoomSize)
}

// 高亮闪烁效果
const highlightPosition = (x, y, viewSize) => {
  if (!scene) return

  const ringRadius = viewSize * 0.06
  const ringGeo = new THREE.RingGeometry(ringRadius * 0.7, ringRadius, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.set(x, y, 5)
  scene.add(ring)

  // 3秒后淡出并移除
  let opacity = 0.9
  const fadeInterval = setInterval(() => {
    opacity -= 0.03
    if (opacity <= 0) {
      clearInterval(fadeInterval)
      scene.remove(ring)
      ringGeo.dispose()
      ringMat.dispose()
    } else {
      ringMat.opacity = opacity
    }
  }, 50)
}

// ========== 事件处理 ==========

/**
 * 将屏幕像素坐标转换为真实DXF世界坐标
 * 正确考虑了：
 *  - 正交相机 left/right/top/bottom 视锥体
 *  - 相机的 zoom 属性（OrbitControls 缩放修改的是 zoom，不是 frustum）
 *  - 渲染时的 worldOffset (偏移 + 缩放)
 */
const screenToWorld = (clientX, clientY) => {
  if (!camera || !containerRef.value) return null
  
  const rect = containerRef.value.getBoundingClientRect()
  // NDC: [-1, 1]
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  
  // 正交相机：需要除以 zoom 才能得到正确的世界坐标
  // 可见宽度 = (right - left) / zoom, 可见高度 = (top - bottom) / zoom
  const zoom = camera.zoom || 1
  const localX = ndcX * (camera.right - camera.left) / (2 * zoom) + camera.position.x
  const localY = ndcY * (camera.top - camera.bottom) / (2 * zoom) + camera.position.y
  
  // 反推真实DXF坐标：渲染时做的变换是 renderCoord = (dxfCoord - offset) * scale
  // 所以逆变换是 dxfCoord = renderCoord / scale + offset
  const scale = worldOffset.scale || 1
  return {
    x: localX / scale + worldOffset.x,
    y: localY / scale + worldOffset.y
  }
}

// 缓存最后一次鼠标位置，用于 controls change 事件更新坐标
let lastMouseClientX = 0
let lastMouseClientY = 0

const handleMouseMove = (event) => {
  // 缓存鼠标位置
  lastMouseClientX = event.clientX
  lastMouseClientY = event.clientY
  
  const coord = screenToWorld(event.clientX, event.clientY)
  if (coord) {
    mouseCoord.value = coord
  }
}

/**
 * OrbitControls change 事件处理器
 * 滚轮缩放或拖拽平移时，即使鼠标没有移动，坐标也需要更新
 */
const handleControlsChange = () => {
  if (lastMouseClientX === 0 && lastMouseClientY === 0) return
  const coord = screenToWorld(lastMouseClientX, lastMouseClientY)
  if (coord) {
    mouseCoord.value = coord
  }
}

const handleClick = (event) => {
  if (!camera || !scene) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // 使用统一的坐标转换
  const worldCoord = screenToWorld(event.clientX, event.clientY)
  if (worldCoord) {
    // 触发画布点击事件（真实DXF坐标）
    emit('canvas-click', { x: worldCoord.x, y: worldCoord.y })
  }
  
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  
  const intersects = raycaster.intersectObjects(embeddedPartsGroup.children)
  
  if (intersects.length > 0) {
    const part = intersects[0].object.userData.part
    if (part) {
      emit('part-click', part)
    }
  }
}

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return
  
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  const aspect = width / height
  
  camera.left = camera.bottom * aspect
  camera.right = camera.top * aspect
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
}

const toggleAxisAnnotations = () => {
  showAxisAnnotations.value = !showAxisAnnotations.value
  
  if (showAxisAnnotations.value) {
    updateAnnotations()
    renderAxisLabels()
  } else {
    while (annotationGroup.children.length > 0) {
      annotationGroup.remove(annotationGroup.children[0])
    }
    while (axisLabelGroup.children.length > 0) {
      axisLabelGroup.remove(axisLabelGroup.children[0])
    }
  }
}

const handleEncodingChange = (cmd) => {
  if (encoding.value !== cmd) {
    encoding.value = cmd
    if (props.file) {
      loadDxfFile(props.file)
      ElMessage.info(`已切换为 ${cmd === 'gb18030' ? 'GBK' : 'UTF-8'} 编码并重新加载`)
    }
  }
}

// 暴露方法
defineExpose({
  loadDxfFile,
  fitToView,
  zoomIn,
  zoomOut,
  focusOnCoordinate,
  getAxisLines: () => axisLines.value,
  getAxisLabels: () => axisLabels.value,
  getDxfData: () => dxfData.value
})
</script>

<style scoped>
.dxf-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  overflow: hidden;
}

.dxf-canvas {
  width: 100%;
  height: 100%;
}

.viewer-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
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
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  z-index: 20;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.coord-display {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  z-index: 10;
}
</style>
