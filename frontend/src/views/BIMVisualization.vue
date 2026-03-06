<template>
  <div class="bim-visualization">
    <!-- 顶部工具栏 (桌面端) -->
    <div class="toolbar" v-if="!isMobile">
      <div class="toolbar-left">
        <el-select
          v-model="selectedProjectId"
          placeholder="选择项目"
          @change="handleProjectChange"
          style="width: 200px; margin-right: 10px"
        >
          <el-option
            v-for="project in projects"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>
        <el-select
          v-model="selectedFloorId"
          placeholder="选择楼层"
          @change="handleFloorChange"
          :disabled="!selectedProjectId"
          style="width: 150px; margin-right: 10px"
        >
          <el-option
            v-for="floor in floors"
            :key="floor.id"
            :label="floor.name"
            :value="floor.id"
          />
        </el-select>
        <el-select
          v-model="selectedModel"
          placeholder="选择模型"
          value-key="id"
          @change="handleModelChange"
          :disabled="!selectedFloorId"
          style="width: 250px; margin-right: 10px"
        >
          <el-option
            v-for="model in filteredModels"
            :key="model.id"
            :label="model.name"
            :value="model"
          />
        </el-select>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshViewer" :icon="Refresh">
          刷新模型
        </el-button>
      </div>
    </div>

    <!-- 移动端悬浮菜单按钮 -->
    <div class="mobile-menu-btn" v-if="isMobile" @click="mobileDrawerVisible = true">
      <el-icon><Menu /></el-icon>
      <span>菜单</span>
    </div>

    <!-- 移动端控制面板抽屉 -->
    <el-drawer
      v-model="mobileDrawerVisible"
      title="BIM控制面板"
      direction="ltr"
      size="85%"
    >
      <div class="mobile-controls">
        <div class="control-group">
          <h3>项目选择</h3>
          <el-select v-model="selectedProjectId" placeholder="选择项目" @change="handleProjectChange" class="mobile-select">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </div>
        
        <div class="control-group">
          <h3>楼层选择</h3>
          <el-select v-model="selectedFloorId" placeholder="选择楼层" @change="handleFloorChange" :disabled="!selectedProjectId" class="mobile-select">
            <el-option v-for="floor in floors" :key="floor.id" :label="floor.name" :value="floor.id" />
          </el-select>
        </div>
        
        <div class="control-group">
          <h3>模型选择</h3>
          <el-select v-model="selectedModel" placeholder="选择模型" value-key="id" @change="handleModelChange" :disabled="!selectedFloorId" class="mobile-select">
            <el-option v-for="model in filteredModels" :key="model.id" :label="model.name" :value="model" />
          </el-select>
        </div>
        
        <el-divider />
        
        <!-- 移动端预埋件列表 -->
        <EmbeddedPartPanel
          :embedded-parts="embeddedParts"
          :projects="projects"
          :floors="floors"
          :selected-floor-id="selectedFloorId"
          :is-mobile="true"
          :can-refresh-3d="isThreeJsInitialized"
          @part-select="handlePartSelect"
          @part-highlight="handlePartHighlight"
          @status-change="handleStatusChange"
          @refresh-3d="refreshEmbeddedPartsIn3D"
        />
      </div>
    </el-drawer>

    <!-- 主要内容区域 -->
    <div class="page-content">
      <!-- 模型显示区域 -->
      <div class="model-container">
        <!-- 坐标标记模式提示条 -->
        <div v-if="isMarkingPosition" class="marking-mode-banner">
          <el-icon><MapLocation /></el-icon>
          <span>正在为 <strong>{{ markingPart?.name }}</strong> 标记位置 — 请在2D图纸上点击目标位置</span>
          <el-button size="small" type="danger" plain @click="cancelMarking">取消</el-button>
        </div>

        <!-- 模型视图切换 -->
        <div class="view-switcher">
          <el-radio-group v-model="currentView" size="small">
            <el-radio-button value="2d">2D CAD视图</el-radio-button>
            <el-radio-button value="3d">3D BIM视图</el-radio-button>
            <el-radio-button value="dualAlign">双视图对齐</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 未选择模型时的提示 -->
        <div class="model-placeholder" v-if="!selectedModel">
          <el-icon size="64"><Document /></el-icon>
          <p>请选择一个项目和模型</p>
        </div>

        <!-- 2D CAD视图 - 使用新组件 -->
        <CadViewer2D
          v-else-if="currentView === '2d' && selectedModel?.type === '2d'"
          ref="cadViewer2DRef"
          :model="selectedModel"
          :embedded-parts="embeddedPartsWithCoords"
          :show-axis-overlay="true"
          :class="{ 'marking-cursor': isMarkingPosition }"
          @viewer-loaded="onCadViewerLoaded"
          @viewer-error="onViewerError"
          @axis-configured="onAxisConfigured"
          @part-click="handlePartSelect"
          @canvas-click="onCanvasClick"
        />

        <!-- 3D BIM视图 - 使用新组件 -->
        <BimViewer3D
          v-else-if="currentView === '3d' && selectedModel?.type === '3d'"
          ref="bimViewer3DRef"
          :model="selectedModel"
          :embedded-parts="embeddedParts"
          :floors="floors"
          :show-grid="showGrid"
          :coordinate-mapper="coordinateMapper || undefined"
          @model-loaded="onBimModelLoaded"
          @part-click="handlePartSelect"
          @part-highlight="handlePartHighlight"
        />

        <!-- 双视图对齐模式 - 使用新组件 -->
        <DualViewAligner
          v-else-if="currentView === 'dualAlign'"
          ref="dualViewAlignerRef"
          :cad-file="localCadFile"
          :model3-d="model3D"
          :coordinate-mapper="coordinateMapper || undefined"
          @alignment-complete="onAlignmentComplete"
          @alignment-cancel="onAlignmentCancel"
        />
        
        <!-- 其他类型模型的兼容视图 -->
        <div class="model-placeholder" v-else-if="selectedModel">
          <el-icon size="64"><Document /></el-icon>
          <p>{{ currentView === '2d' ? '当前模型不是2D格式' : '当前模型不是3D格式' }}</p>
          <el-button type="primary" size="small" @click="autoSwitchView" style="margin-top: 12px">
            自动切换视图
          </el-button>
        </div>
      </div>

      <!-- 预埋件列表面板 (桌面端) - 使用新组件 -->
      <EmbeddedPartPanel
        v-if="!isMobile"
        ref="embeddedPartPanelRef"
        :embedded-parts="embeddedParts"
        :projects="projects"
        :floors="floors"
        :selected-floor-id="selectedFloorId"
        :is-mobile="false"
        :can-refresh-3d="isThreeJsInitialized"
        :can-confirm-installation="canConfirmInstallation"
        :can-confirm-inspection="canConfirmInspection"
        @part-select="handlePartSelect"
        @part-highlight="handlePartHighlight"
        @status-change="handleStatusChange"
        @refresh-3d="refreshEmbeddedPartsIn3D"
        @mark-position="handleMarkPosition"
      />
    </div>

    <!-- 移动端底部快捷工具栏 -->
    <div class="mobile-bottom-toolbar" v-if="isMobile">
      <!-- 扫码按钮 - 所有用户可见 -->
      <div class="toolbar-item" @click="goToScan">
        <el-icon size="24"><Camera /></el-icon>
        <span>扫码</span>
      </div>
      
      <!-- 视图切换 -->
      <div class="toolbar-item" @click="toggleView">
        <el-icon size="24"><Switch /></el-icon>
        <span>{{ currentView === '2d' ? '3D' : '2D' }}</span>
      </div>
      
      <!-- 刷新 - 仅桌面端有刷新按钮，移动端也添加 -->
      <div class="toolbar-item" @click="refreshViewer">
        <el-icon size="24"><Refresh /></el-icon>
        <span>刷新</span>
      </div>
      
      <!-- 安装确认 - 安装人员/项目经理/管理员可见 -->
      <div 
        class="toolbar-item" 
        v-if="canConfirmInstallation && selectedPart"
        @click="quickConfirmInstallation"
      >
        <el-icon size="24"><Check /></el-icon>
        <span>安装</span>
      </div>
      
      <!-- 验收确认 - 质检人员/项目经理/管理员可见 -->
      <div 
        class="toolbar-item" 
        v-if="canConfirmInspection && selectedPart && selectedPart.status === 'installed'"
        @click="quickConfirmInspection"
      >
        <el-icon size="24"><Select /></el-icon>
        <span>验收</span>
      </div>
      
      <!-- 菜单 -->
      <div class="toolbar-item" @click="mobileDrawerVisible = true">
        <el-icon size="24"><Menu /></el-icon>
        <span>菜单</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Refresh, Menu, Camera, Switch, Check, Select, MapLocation } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/index.js'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'

// 导入新组件
import EmbeddedPartPanel from '../components/EmbeddedPartPanel.vue'
import BimViewer3D from '../components/BimViewer3D.vue'
import CadViewer2D from '../components/CadViewer2D.vue'
import DualViewAligner from '../components/DualViewAligner.vue'

// 导入坐标转换
import { CoordinateMapper, createDefaultMapper } from '../utils/coordinateMapper.js'

// ==================== 状态定义 ====================

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

// 组件引用
const cadViewer2DRef = ref<InstanceType<typeof CadViewer2D> | null>(null)
const bimViewer3DRef = ref<InstanceType<typeof BimViewer3D> | null>(null)
const dualViewAlignerRef = ref<InstanceType<typeof DualViewAligner> | null>(null)
const embeddedPartPanelRef = ref<InstanceType<typeof EmbeddedPartPanel> | null>(null)

// 选择状态
const selectedProjectId = ref('')
const selectedFloorId = ref('')
const selectedModel = ref<any>(null)
const currentView = ref('2d') // 2d, 3d, dualAlign

// 数据
const projects = ref<any[]>([])
const floors = ref<any[]>([])
const models = ref<any[]>([])
const embeddedParts = ref<any[]>([])

// UI状态
const showGrid = ref(true)
const isMobile = ref(false)
const mobileDrawerVisible = ref(false)
const isThreeJsInitialized = ref(false)
const selectedPart = ref<any>(null)  // 当前选中的预埋件
const isMarkingPosition = ref(false) // 是否处于坐标标记模式
const markingPart = ref<any>(null)   // 正在标记的预埋件

// 坐标转换器
let coordinateMapper: CoordinateMapper | null = null

// 本地CAD文件（用于双视图）
const localCadFile = shallowRef<File | null>(null)

// ==================== 计算属性 ====================

// 过滤后的模型列表（根据选中的楼层）
const filteredModels = computed(() => {
  if (!selectedFloorId.value) {
    return models.value
  }
  return models.value.filter(m => m.floorId === selectedFloorId.value)
})

// 带坐标的预埋件
const embeddedPartsWithCoords = computed(() => {
  return embeddedParts.value.filter(part => part.coordinates2D)
})

// 3D模型（用于双视图）
const model3D = computed(() => {
  return models.value.find(m => m.type === '3d') || null
})

// 权限检查
const canConfirmInstallation = computed(() => {
  const role = userStore.userRole || ''
  return ['projectManager', 'admin', 'projectEngineer', 'installer'].includes(role)
})

const canConfirmInspection = computed(() => {
  const role = userStore.userRole || ''
  return ['projectManager', 'admin', 'projectEngineer', 'qualityInspector'].includes(role)
})

// ==================== 数据获取方法 ====================

const getProjects = async () => {
  try {
    const response = await api.project.getProjects({})
    projects.value = response.data || response || []
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  }
}

const getFloors = async (projectId: string) => {
  try {
    const response = await api.floor.getFloors(projectId) as any
    floors.value = Array.isArray(response) ? response : (response?.data || response || [])
  } catch (error) {
    console.error('获取楼层列表失败:', error)
  }
}

const getModels = async (projectId: string, floorId?: string) => {
  try {
    const params: any = { projectId }
    if (floorId) params.floorId = floorId
    const response = await api.bimModel.getBIMModels(params)
    models.value = response.data || response || []
  } catch (error) {
    console.error('获取模型列表失败:', error)
  }
}

const getEmbeddedParts = async (projectId: string, floorId?: string) => {
  try {
    // 始终传 projectId，可选传 floorId
    const params: any = { projectId }
    if (floorId) params.floorId = floorId
    const response = await api.embeddedPart.getEmbeddedParts(params)
    const data = response.data || response || []
    // 过滤掉没有 projectId 的孤儿预埋件
    embeddedParts.value = Array.isArray(data) 
      ? data.filter((p: any) => p.projectId) 
      : []
  } catch (error) {
    console.error('获取预埋件列表失败:', error)
    embeddedParts.value = []
  }
}

// ==================== 事件处理 ====================

const handleProjectChange = async (projectId: string) => {
  if (!projectId) return
  
  selectedProjectId.value = projectId
  selectedFloorId.value = ''
  selectedModel.value = null
  
  await getFloors(projectId)
  await getModels(projectId)
  await getEmbeddedParts(projectId)
  
  // 初始化坐标转换器
  if (floors.value.length > 0) {
    coordinateMapper = createDefaultMapper(floors.value)
    
    // 尝试加载后端的对齐配置
    try {
      const configRes = await api.project.getCoordinateConfig(projectId)
      const savedConfig = configRes.data || configRes
      if (savedConfig && savedConfig.isAligned) {
        coordinateMapper.updateConfig(savedConfig)
        console.log('✅ 已加载项目的坐标对齐配置:', savedConfig)
      }
    } catch (err) {
      console.warn('未加载到项目的自定义坐标对齐配置，使用默认配置')
    }
  }
}

const handleFloorChange = async (floorId: string) => {
  if (!floorId) return
  
  selectedFloorId.value = floorId
  selectedModel.value = null
  await getModels(selectedProjectId.value, floorId)
  await getEmbeddedParts(selectedProjectId.value, floorId)
}

const handleModelChange = async (model: any) => {
  if (!model) return
  
  selectedModel.value = model
  
  // 自动切换到对应视图
  if (model.type === '2d') {
    currentView.value = '2d'
  } else if (model.type === '3d') {
    currentView.value = '3d'
    isThreeJsInitialized.value = true
  }
  
  // 加载CAD文件（用于双视图）
  if (model.type === '2d') {
    await loadCadFile(model.id)
  }
}

const loadCadFile = async (modelId: string) => {
  try {
    const url = `/api/models/${modelId}/download`
    const token = localStorage.getItem('token')
    
    const response = await fetch(url, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    })
    
    if (!response.ok) throw new Error('下载失败')
    
    const blob = await response.blob()
    const file = new File([blob], selectedModel.value?.name || 'model.dwg', { type: 'application/octet-stream' })
    localCadFile.value = markRaw(file)
  } catch (error) {
    console.error('加载CAD文件失败:', error)
  }
}

const handlePartSelect = (part: any) => {
  console.log('预埋件选中:', part.name)
  selectedPart.value = part  // 保存选中的预埋件
  
  // 显示详情弹窗
  if (embeddedPartPanelRef.value) {
    embeddedPartPanelRef.value.showPartDetails(part)
  }
}

const handlePartHighlight = (part: any) => {
  console.log('高亮预埋件:', part.name)
  selectedPart.value = part  // 保存选中的预埋件
  
  // 在2D视图中定位
  if (currentView.value === '2d' && cadViewer2DRef.value && part.coordinates2D) {
    cadViewer2DRef.value.focusOnCoordinate(part.coordinates2D.x, part.coordinates2D.y)
  }
  
  // 在3D视图中高亮 —— 先播放脉冲高亮动画，延迟后再弹出详情
  if (currentView.value === '3d' && bimViewer3DRef.value) {
    bimViewer3DRef.value.highlightPart(part)
    
    // 延迟2秒后再弹出详细信息，让用户先看到高亮定位效果
    setTimeout(() => {
      if (embeddedPartPanelRef.value) {
        embeddedPartPanelRef.value.showPartDetails(part)
      }
    }, 2000)
  } else {
    // 非3D视图：立即弹出详情
    if (embeddedPartPanelRef.value) {
      embeddedPartPanelRef.value.showPartDetails(part)
    }
  }
  
  mobileDrawerVisible.value = false
}

// ==================== 移动端快捷操作 ====================

// 跳转到扫码页面
const goToScan = () => {
  router.push('/scan')
}

// 切换视图
const toggleView = () => {
  if (currentView.value === '2d') {
    currentView.value = '3d'
  } else if (currentView.value === '3d') {
    currentView.value = '2d'
  }
}

// 快捷确认安装（移动端）
const quickConfirmInstallation = async () => {
  if (!selectedPart.value) {
    ElMessage.warning('请先选择一个预埋件')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确认将 "${selectedPart.value.name}" 标记为已安装？`,
      '确认安装',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'info' }
    )
    
    await handleStatusChange(selectedPart.value.id, 'installed', '移动端快捷安装确认')
    ElMessage.success('安装状态已更新')
  } catch {
    // 用户取消
  }
}

// 快捷确认验收（移动端）
const quickConfirmInspection = async () => {
  if (!selectedPart.value) {
    ElMessage.warning('请先选择一个预埋件')
    return
  }
  
  if (selectedPart.value.status !== 'installed') {
    ElMessage.warning('只有已安装的预埋件才能验收')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确认将 "${selectedPart.value.name}" 标记为已验收？`,
      '确认验收',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'success' }
    )
    
    await handleStatusChange(selectedPart.value.id, 'inspected', '移动端快捷验收确认')
    ElMessage.success('验收状态已更新')
  } catch {
    // 用户取消
  }
}

const handleStatusChange = async (partId: string, status: string, notes?: string) => {
  try {
    await api.embeddedPart.updateScanStatus(partId, status, notes || '')
    
    // 更新本地状态
    const part = embeddedParts.value.find(p => p.id === partId)
    if (part) {
      part.status = status
    }
    
    // 刷新3D显示
    refreshEmbeddedPartsIn3D()
    
    ElMessage.success('状态更新成功')
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
  }
}

const refreshEmbeddedPartsIn3D = () => {
  if (bimViewer3DRef.value) {
    bimViewer3DRef.value.refreshEmbeddedParts()
  }
}

const refreshViewer = () => {
  if (currentView.value === '2d' && cadViewer2DRef.value) {
    cadViewer2DRef.value.refresh()
  } else if (currentView.value === '3d' && bimViewer3DRef.value) {
    bimViewer3DRef.value.loadModel()
  }
}

const autoSwitchView = () => {
  if (selectedModel.value) {
    currentView.value = selectedModel.value.type === '3d' ? '3d' : '2d'
  }
}

// ==================== 组件事件处理 ====================

const onCadViewerLoaded = () => {
  console.log('CAD查看器加载完成')
}

const onBimModelLoaded = () => {
  console.log('BIM模型加载完成')
  isThreeJsInitialized.value = true
}

const onViewerError = (error: Error) => {
  console.error('查看器错误:', error)
  ElMessage.error(`查看器加载失败: ${error.message}`)
}

const onAxisConfigured = (config: any) => {
  console.log('轴线配置完成:', config)
}

// 处理「在图纸上标记位置」
const handleMarkPosition = (part: any) => {
  markingPart.value = part
  isMarkingPosition.value = true
  // 自动切换到2D视图
  if (currentView.value !== '2d') {
    // 找到2D模型
    const model2d = models.value.find(m => m.type === '2d')
    if (model2d) {
      selectedModel.value = model2d
      currentView.value = '2d'
    } else {
      ElMessage.warning('没有可用的2D模型，请先上传DXF图纸')
      cancelMarking()
      return
    }
  }
  ElMessage.info({ message: `请在图纸上点击 ${part.name} 的位置`, duration: 3000 })
}

// 取消标记模式
const cancelMarking = () => {
  isMarkingPosition.value = false
  markingPart.value = null
}

// 画布点击（标记模式下保存坐标）
const onCanvasClick = async (coord: { x: number; y: number }) => {
  if (!isMarkingPosition.value || !markingPart.value) return
  
  const part = markingPart.value
  const coordinates2D = { x: coord.x, y: coord.y }
  
  try {
    // 调用API保存坐标
    await api.embeddedPart.updateEmbeddedPart(part.id, { coordinates2D })
    
    // 更新本地数据
    const idx = embeddedParts.value.findIndex(p => p.id === part.id)
    if (idx !== -1) {
      embeddedParts.value[idx].coordinates2D = coordinates2D
    }
    
    ElMessage.success(`已为 ${part.name} 设置坐标 (${coord.x.toFixed(1)}, ${coord.y.toFixed(1)})`)
    
    // 退出标记模式
    cancelMarking()
    
    // 刷新2D视图中的预埋件标记
    nextTick(() => {
      cadViewer2DRef.value?.refresh()
    })
  } catch (error) {
    console.error('保存坐标失败:', error)
    ElMessage.error('保存坐标失败，请重试')
  }
}

const onAlignmentComplete = async (params: any) => {
  console.log('对齐完成:', params)
  
  const newConfig = {
    scale: params.scale,
    rotation: params.rotation,
    offsetX: params.offsetX,
    offsetY: params.offsetY,
    isAligned: true
  }

  // 保存对齐参数到坐标转换器
  if (coordinateMapper) {
    coordinateMapper.updateConfig(newConfig)
  }
  
  // 保存到后端
  try {
    if (selectedProjectId.value) {
      await api.project.updateCoordinateConfig(selectedProjectId.value, newConfig)
      ElMessage.success('对齐参数已永久保存至项目')
    } else {
      ElMessage.success('对齐参数已在本地保存')
    }
  } catch (err) {
    console.error('保存对齐参数失败:', err)
    ElMessage.warning('对齐参数应用成功，但未能持久化到服务器')
  }
  
  // 返回3D视图
  currentView.value = '3d'
  
  // 对齐完成后刷新预埋件的3D位置
  nextTick(() => {
    bimViewer3DRef.value?.refreshEmbeddedParts()
  })
}

const onAlignmentCancel = () => {
  currentView.value = '3d'
}

// ==================== 移动端适配 ====================

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// ==================== 生命周期 ====================

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  await getProjects()
  
  // 处理URL参数（QR码扫描跳转）
  const partId = route.query.partId as string
  if (partId) {
    console.log('🔗 从URL参数跳转，目标预埋件:', partId)
    try {
      // 1. 获取预埋件详情以知道它属于哪个项目和楼层
      const res = await api.embeddedPart.getEmbeddedPart(partId)
      const part = res.data || res
      if (part && part.projectId) {
        // 2. 切换到对应的项目
        await handleProjectChange(part.projectId)
        
        // 3. 切换到对应的楼层
        if (part.floorId) {
          await handleFloorChange(part.floorId)
        }
        
        // 4. 确保当前是 3D 视图，并尝试找到 3D 模型进行加载
        currentView.value = '3d'
        const model3D = models.value.find(m => m.type === '3d')
        if (model3D) {
          await handleModelChange(model3D)
        }
        
        // 5. 等待 3D 场景初始化完成后高亮该预埋件
        setTimeout(() => {
          handlePartHighlight(part)
        }, 1500)
      } else {
        ElMessage.warning('未能找到扫描的预埋件信息所属的项目')
      }
    } catch (err) {
      console.error('扫码跳转加载预埋件失败:', err)
      ElMessage.error('无法加载该预埋件数据')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* 坐标标记模式 */
.marking-mode-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  font-size: 14px;
  z-index: 60;
  flex-shrink: 0;
}

.marking-mode-banner strong {
  font-weight: 700;
}

.marking-cursor :deep(canvas) {
  cursor: crosshair !important;
}

.bim-visualization {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  overflow: hidden;
}

.toolbar {
  background-color: #fff;
  padding: 14px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.page-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.model-container {
  flex: 1;
  background-color: #2c2c2c;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-switcher {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}

.model-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
  flex: 1;
}

.model-placeholder p {
  margin-top: 16px;
  font-size: 14px;
}

/* 移动端 */
.mobile-menu-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 2000;
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: bold;
  color: #409eff;
}

.mobile-controls {
  padding: 16px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #606266;
}

.mobile-select {
  width: 100%;
}

/* 移动端底部工具栏 */
.mobile-bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 10px 0;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 2000;
}

.mobile-bottom-toolbar .toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 56px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-bottom-toolbar .toolbar-item:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.mobile-bottom-toolbar .toolbar-item span {
  font-size: 11px;
  margin-top: 4px;
  font-weight: 500;
}

.mobile-bottom-toolbar .toolbar-item .el-icon {
  font-size: 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .bim-visualization {
    height: auto;
    min-height: 100vh;
    padding-bottom: 76px; /* 给底部工具栏留出空间 */
  }
  
  .page-content {
    flex-direction: column;
  }
  
  .model-container {
    height: calc(60vh - 38px);
    min-height: 350px;
  }
}
</style>
