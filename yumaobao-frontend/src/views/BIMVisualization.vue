<template>
  <div class="bim-visualization">
    <!-- 页面顶部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>BIM</h2>
        <el-select
          v-model="selectedProjectId"
          placeholder="选择项目"
          class="project-select"
          :clearable="!isRestrictedUser"
          :disabled="isRestrictedUser"
          @change="handleProjectChange"
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
          class="floor-select"
          filterable
          :disabled="!selectedProjectId"
          @change="handleFloorChange"
        >
          <el-option
            v-for="floor in floors"
            :key="floor.id"
            :label="floor.name"
            :value="floor.id"
          />
        </el-select>
        <el-select
          v-model="selectedModelId"
          placeholder="选择模型"
          class="model-select"
          filterable
          :disabled="!selectedProjectId || models.length === 0"
          @change="handleModelChange"
        >
          <el-option
            v-for="model in models"
            :key="model.id"
            :label="model.name"
            :value="model.id"
          />
        </el-select>
        <div class="floor-controls">
          <el-button type="primary" size="small" @click="showPreviousFloor" :disabled="!canNavigateFloors">
            <el-icon><ArrowUp /></el-icon>
          </el-button>
          <el-button type="primary" size="small" @click="showNextFloor" :disabled="!canNavigateFloors">
            <el-icon><ArrowDown /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshViewer" icon="Refresh">
          刷新模型
        </el-button>
      </div>
    </div>

    

    <!-- 模型显示区域 -->
    <div class="model-container">
      <!-- 模型视图切换和操作 -->
      <div class="view-switcher">
        <el-radio-group v-model="currentView" size="small">
          <el-radio-button label="2d">2D CAD视图</el-radio-button>
          <el-radio-button label="3d">3D BIM视图</el-radio-button>
          <el-radio-button label="both">双视图</el-radio-button>
        </el-radio-group>
        <el-checkbox v-model="enableCoordinateSync" size="small" class="sync-checkbox">
          <el-icon><RefreshRight /></el-icon>坐标同步
        </el-checkbox>
        <div class="view-controls">
          <el-button type="primary" size="small" @click="zoomToExtent" icon="FullScreen">
            全屏显示
          </el-button>
          <el-button type="success" size="small" @click="toggleGrid" icon="Grid">
            {{ showGrid ? '隐藏网格' : '显示网格' }}
          </el-button>
          <el-button type="warning" size="small" @click="toggleLayers" icon="Collection">
            图层管理
          </el-button>
        </div>
      </div>

      <!-- CAD查看器（2D视图） -->
      <div class="cad-viewer-wrapper" v-if="selectedModel && selectedModel.type === '2d'">
        <div class="view-title">2D CAD视图</div>
        <MlCadViewer
          ref="cadViewerRef"
          :locale="locale"
          :local-file="modelFile"
          :useMainThreadDraw="true"
          baseUrl=""
          @loaded="onViewerLoaded"
          @click="onViewerClick"
          @mouse-move="onViewerMouseMove"
        />
      </div>

      <!-- 3D BIM模型视图 -->
      <div class="bim-viewer-wrapper" v-if="selectedModel && selectedModel.type === '3d'">
        <div class="view-title">3D BIM视图</div>
        <div class="bim-viewer-container" ref="bimViewerRef">
          <!-- Three.js 3D模型渲染区域 - 直接渲染，无占位符 -->
        </div>
      </div>

      <!-- 未选择模型时的提示 -->
      <div class="model-placeholder" v-else>
        <el-icon size="64">
          <Document />
        </el-icon>
        <p>请选择一个项目和模型</p>
      </div>
    </div>

    <!-- 预埋件列表 -->
    <div class="embedded-parts-panel">
      <div class="panel-header">
        <h3>预埋件列表 ({{ filteredEmbeddedParts.length }})</h3>
        <el-input
          v-model="embeddedPartSearch"
          placeholder="搜索预埋件"
          clearable
          size="small"
          class="search-input"
        />
      </div>
      <!-- 状态筛选 -->
      <div class="status-filter">
        <el-checkbox-group v-model="selectedStatuses" @change="handleStatusFilterChange" size="small">
          <el-checkbox label="pending" border>待安装</el-checkbox>
          <el-checkbox label="installed" border>已安装</el-checkbox>
          <el-checkbox label="inspected" border>已验收</el-checkbox>
          <el-checkbox label="completed" border>已完成</el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="embedded-parts-list">
        <div
          v-for="embeddedPart in filteredEmbeddedParts"
          :key="embeddedPart.id"
          class="embedded-part-item"
          :class="{
            'status-pending': embeddedPart.status === 'pending',
            'status-installed': embeddedPart.status === 'installed',
            'status-inspected': embeddedPart.status === 'inspected',
            'status-completed': embeddedPart.status === 'completed'
          }"
          @click="highlightEmbeddedPart(embeddedPart)"
        >
          <div class="item-header">
            <div class="item-title">{{ embeddedPart.name }}</div>
            <el-tag
              :type="
                embeddedPart.status === 'pending' ? 'info' :
                embeddedPart.status === 'installed' ? 'success' :
                embeddedPart.status === 'inspected' ? 'warning' : 'success'
              "
              size="small"
            >
              {{ embeddedPart.status === 'pending' ? '待安装' :
                embeddedPart.status === 'installed' ? '已安装' :
                embeddedPart.status === 'inspected' ? '已验收' : '已完成' }}
            </el-tag>
          </div>
          <div class="item-info">
            <div class="info-item">编号: {{ embeddedPart.code }}</div>
            <div class="info-item">型号: {{ embeddedPart.modelNumber }}</div>
            <div class="info-item">位置: {{ embeddedPart.location }}</div>
          </div>
        </div>
      </div>
    </div>



    <!-- 图层管理对话框 -->
    <el-dialog
      v-model="layersDialogVisible"
      title="图层管理"
      width="40%"
    >
      <div class="layers-list">
        <el-scrollbar height="400px">
          <div v-for="layer in layers" :key="layer.id" class="layer-item">
            <el-checkbox v-model="layer.visible">{{ layer.name }}</el-checkbox>
          </div>
        </el-scrollbar>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="layersDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyLayerChanges">应用</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, UploadFilled, Refresh, FullScreen, Grid, Collection, RefreshRight, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import { useUserStore } from '../stores/index.js'
// 导入Three.js相关模块
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// 创建userStore实例
const userStore = useUserStore()

// 组件引用
const cadViewerRef = ref(null)
const bimViewerRef = ref(null)

// Three.js相关状态
const scene = ref(null)
const camera = ref(null)
const renderer = ref(null)
const controls = ref(null)
const bimModels = ref([]) // 存储加载的BIM模型
const bimModelObjects = ref({}) // 存储模型对象，用于高亮

// 状态管理
const selectedProjectId = ref('')
const selectedFloorId = ref('')
const selectedModelId = ref('')
const selectedStatuses = ref(['pending', 'installed', 'inspected', 'completed'])
const showGrid = ref(true)
const embeddedPartSearch = ref('')
const currentView = ref('2d') // 2d, 3d, both
const enableCoordinateSync = ref(true) // 启用2D/3D坐标同步
const locale = ref('zh') // 语言设置，修复i18n错误
const isBimModelLoaded = ref(false)
const isThreeJsInitialized = ref(false)
const refreshTimer = ref(null) // 自动刷新定时器

// 数据
const projects = ref([])
const floors = ref([])
const models = ref([])
const embeddedParts = ref([])
const layers = ref([])

// 模型文件
const modelFile = ref(null)
const selectedModel = ref(null)

// 模型信息
const modelInfo = ref({
  name: '',
  layers: 0,
  entities: 0,
  embeddedParts: 0
})

// 选中的预埋件
const selectedEmbeddedPart = ref(null)

// 可见的预埋件（根据当前楼层过滤）
const visibleEmbeddedParts = ref([])

// 判断用户是否是安装人员或质检人员
const isRestrictedUser = computed(() => {
  const role = userStore.userRole || ''
  return role === 'installer' || role === 'qualityInspector'
})

// 获取用户可访问的项目ID
const userProjects = computed(() => {
  return userStore.userInfo?.projects || []
})

const updateVisibleEmbeddedParts = () => {
  visibleEmbeddedParts.value = embeddedParts.value.filter(ep => 
    ep.floorId === selectedFloorId.value
  )
}



// 监听楼层变化，更新可见预埋件
watch(selectedFloorId, () => {
  updateVisibleEmbeddedParts()
})

// 对话框
const layersDialogVisible = ref(false)

// 计算属性
const filteredEmbeddedParts = computed(() => {
  let result = embeddedParts.value

  // 按楼层筛选
  if (selectedFloorId.value) {
    result = result.filter(ep => ep.floorId === selectedFloorId.value)
  }

  // 按状态筛选
  if (selectedStatuses.value.length > 0) {
    result = result.filter(ep => selectedStatuses.value.includes(ep.status))
  }

  // 按名称或编号筛选
  if (embeddedPartSearch.value) {
    const keyword = embeddedPartSearch.value.toLowerCase()
    result = result.filter(ep => 
      ep.name.toLowerCase().includes(keyword) || 
      ep.code.toLowerCase().includes(keyword)
    )
  }

  return result
})

const canNavigateFloors = computed(() => {
  return floors.value.length > 1
})

// 生命周期
onMounted(() => {
  // 初始化CAD查看器设置
  AcApSettingManager.instance.isShowCommandLine = false
  AcApSettingManager.instance.isShowToolbar = true
  AcApSettingManager.instance.isShowCoordinate = true

  // 获取项目列表
  getProjects()
  
  // 添加窗口大小调整监听
  window.addEventListener('resize', handleWindowResize)
  
  // 添加localStorage监听器，监听模型相关事件
  window.addEventListener('storage', (event) => {
    const modelEvents = ['modelUploaded', 'modelUpdated', 'modelDeleted', 'modelConverted']
    if (modelEvents.includes(event.key)) {
      try {
        const data = JSON.parse(event.newValue || '{}')
        // 如果事件涉及的项目与当前选中的项目匹配，刷新模型列表
        if (data.projectId === selectedProjectId.value) {
          getModels(selectedProjectId.value)
        }
      } catch (error) {
        console.error(`解析模型${event.key}事件失败:`, error)
      }
    }
  })
  
  // 添加定时自动刷新模型列表（每30秒）
  refreshTimer.value = setInterval(() => {
    if (selectedProjectId.value) {
      getModels(selectedProjectId.value)
    }
  }, 30000)
  
  // 监听视图切换
  watch(currentView, (newView) => {
    if (selectedModel.value) {
      if (newView !== '2d' && selectedModel.value.type === '3d') {
        nextTick(() => {
          loadBimModel()
        })
      } else if (newView === '2d' && selectedModel.value.type === '2d') {
        // 2D视图已经通过CAD查看器加载
      } else {
        // 清理不相关的视图资源
        cleanupThreeJs()
      }
    }
  })

  // 监听坐标同步开关
  watch(enableCoordinateSync, (newValue) => {
    if (newValue && selectedModel.value && selectedModel.value.type === '3d') {
      loadBimModel()
    }
  })

  // 监听模型变化
  watch(selectedModel, (newModel) => {
    if (newModel) {
      if (newModel.type === '3d') {
        // 3D模型，直接加载
        nextTick(() => {
          loadBimModel()
        })
      } else if (newModel.type === '2d') {
        // 2D模型，清理3D资源
        cleanupThreeJs()
      }
    } else {
      // 清理之前的模型
      cleanupThreeJs()
    }
  })
  
  // 监听组件卸载，清理资源
  onUnmounted(() => {
    cleanupThreeJs()
    window.removeEventListener('resize', handleWindowResize)
    // 清理定时器
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
    // 清理localStorage监听器
    window.removeEventListener('storage', (event) => {
      // 监听器函数被移除，无需具体实现
    })
  })
})

// 方法
const getProjects = async () => {
  try {
    const response = await api.project.getProjects()
    
    // 根据用户角色过滤项目列表
    const userProjectList = userProjects.value || []
    if (isRestrictedUser.value && userProjectList.length > 0) {
      // 安装人员和质检人员只能看到自己注册的项目
      projects.value = response.filter(project => userProjectList.includes(project.id))
    } else {
      // 其他角色可以看到所有项目
      projects.value = response
    }
    
    // 如果是受限用户，自动选择他们的项目
    if (isRestrictedUser.value && projects.value.length > 0) {
      selectedProjectId.value = projects.value[0].id
      await handleProjectChange(selectedProjectId.value)
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error({
      message: '获取项目列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
  }
}

const getFloors = async (projectId) => {
  try {
    const response = await api.floor.getFloors(projectId) // 直接传入projectId，不是对象
    floors.value = response
  } catch (error) {
    console.error('获取楼层列表失败:', error)
    ElMessage.error({
      message: '获取楼层列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    floors.value = [] // 发生错误时确保floors是数组
  }
}

const getModels = async (projectId) => {
  try {
    if (!projectId) {
      models.value = []
      return
    }
    
    const response = await api.bimModel.getBIMModels({ projectId }) // 正确，传入对象
    models.value = Array.isArray(response) ? response : []
    
    // 如果当前选中的模型不在列表中，清空选中状态
    if (selectedModel.value && !models.value.find(m => m.id === selectedModel.value.id)) {
      selectedModel.value = null
      modelFile.value = null
      isBimModelLoaded.value = false
      selectedModelId.value = ''
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    ElMessage.error({
      message: '获取模型列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    models.value = [] // 发生错误时确保models是数组
  }
}

const getEmbeddedParts = async (projectId, floorId = '') => {
  try {
    if (!projectId) {
      embeddedParts.value = []
      return
    }
    const params = { projectId }
    if (floorId) params.floorId = floorId
    const response = await api.embeddedPart.getEmbeddedParts(params) // 正确，传入对象
    // 确保embeddedParts始终是数组
    embeddedParts.value = Array.isArray(response) ? response : []
  } catch (error) {
    console.error('获取预埋件列表失败:', error)
    ElMessage.error({
      message: '获取预埋件列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    // 发生错误时也确保embeddedParts是数组
    embeddedParts.value = []
  }
}

const getModelFile = async (modelId) => {
  try {
    // 验证modelId
    if (!modelId) {
      throw new Error('模型ID不能为空')
    }
    
    const model = models.value.find(m => m.id === modelId)
    if (!model) {
      throw new Error('未找到指定模型')
    }
    
    selectedModel.value = model
    selectedEmbeddedPart.value = null
    isBimModelLoaded.value = false
    
    // 释放之前的模型文件URL，防止内存泄漏
    if (modelFile.value) {
      URL.revokeObjectURL(modelFile.value)
      modelFile.value = null
    }
    
    // 显示加载中提示
    const loadingMessage = ElMessage({
      message: '正在加载模型文件...',
      duration: 0,
      type: 'info'
    })
    
    // 根据模型类型加载不同的文件
    if (model.type === '3d') {
      // 3D模型直接调用loadBimModel，不需要设置modelFile
      loadingMessage.close()
      isBimModelLoaded.value = false
      // loadBimModel会在合适的时候被调用
      return
    }
    
    // 2D模型继续使用原有的加载逻辑
    // 从服务器加载模型文件
    const response = await api.bimModel.downloadBIMModel(modelId, model.isLightweight)
    
    // 验证响应
    if (!response) {
      throw new Error('服务器返回空响应')
    }
    
    // 创建blob并验证大小
    const blob = new Blob([response], { type: 'application/octet-stream' })
    if (blob.size === 0) {
      throw new Error('服务器返回空文件')
    }
    
    // 创建临时URL用于CAD-Viewer
    modelFile.value = URL.createObjectURL(blob)
    
    // 加载该模型下的预埋件
    await getEmbeddedParts(selectedProjectId.value, selectedFloorId.value)
    
    // 关闭加载提示
    loadingMessage.close()
  } catch (error) {
    console.error('获取模型文件失败:', error)
    
    // 关闭任何可能存在的加载提示
    if (ElMessage.closeAll) {
      ElMessage.closeAll()
    }
    
    // 显示详细的错误信息
    let errorMsg = '获取模型文件失败，请稍后重试'
    if (error.message) {
      errorMsg = `获取模型文件失败: ${error.message}`
    } else if (error.response?.status === 404) {
      errorMsg = '未找到模型文件或模型不存在'
    } else if (error.response?.data?.message) {
      errorMsg = `获取模型文件失败: ${error.response.data.message}`
    } else if (error.response?.status) {
      errorMsg = `获取模型文件失败: 服务器错误 ${error.response.status}`
    }
    
    ElMessage.error({
      message: errorMsg,
      duration: 3000,
      type: 'error'
    })
    
    // 重置模型状态并清理资源
    selectedModel.value = null
    if (modelFile.value) {
      URL.revokeObjectURL(modelFile.value)
      modelFile.value = null
    }
    isBimModelLoaded.value = false
  }
}

// 事件处理
const handleProjectChange = async (projectId) => {
  if (!projectId) return
  
  selectedProjectId.value = projectId
  selectedFloorId.value = ''
  selectedModelId.value = ''
  selectedModel.value = null
  
  await getFloors(projectId)
  await getModels(projectId)
  await getEmbeddedParts(projectId)
}

const handleFloorChange = async (floorId) => {
  if (!floorId) return
  
  selectedFloorId.value = floorId
  await getEmbeddedParts(selectedProjectId.value, floorId)
}

const handleModelChange = async (modelId) => {
  if (!modelId) return
  
  selectedModelId.value = modelId
  await getModelFile(modelId)
  
  // 根据模型类型自动切换视图
  if (selectedModel.value) {
    if (selectedModel.value.type === '2d') {
      currentView.value = '2d'
    } else if (selectedModel.value.type === '3d') {
      currentView.value = '3d'
    }
  }
}

const handleStatusFilterChange = () => {
  // 筛选状态变化时自动更新列表
}



// 查看器相关方法
const onViewerLoaded = () => {
  console.log('Viewer loaded')
  ElMessage.success('模型加载成功')
  
  // 模拟加载后获取模型信息
  setTimeout(() => {
    modelInfo.value = {
      name: selectedModel.value?.name || '未命名模型',
      layers: 4,
      entities: 1250,
      embeddedParts: embeddedParts.value.length
    }
  }, 500)
  
  // 如果启用了坐标同步，初始化BIM模型
  if (enableCoordinateSync.value && currentView.value !== '2d') {
    loadBimModel()
  }
}

const onViewerClick = (event) => {
  console.log('Viewer clicked:', event)
  
  // 处理点击事件，高亮选中的预埋件
  if (cadViewerRef.value) {
    // 获取点击位置的实体信息
    const entityInfo = cadViewerRef.value.getEntityAt(event.clientX, event.clientY)
    if (entityInfo) {
      // 查找对应的预埋件
      const clickedEmbeddedPart = embeddedParts.value.find(ep => ep.code === entityInfo.entityId || ep.name === entityInfo.name)
      if (clickedEmbeddedPart) {
        selectedEmbeddedPart.value = clickedEmbeddedPart
        highlightEmbeddedPart(clickedEmbeddedPart)
        
        // 如果启用了坐标同步，在3D视图中高亮对应位置
        if (enableCoordinateSync.value && bimViewerRef.value) {
          highlightInBimViewer(clickedEmbeddedPart)
        }
      }
    }
  }
}

const highlightEmbeddedPart = (embeddedPart) => {
  console.log('Highlight embedded part:', embeddedPart)
  ElMessage.info(`已定位到预埋件: ${embeddedPart.name}`)
  
  // 在2D CAD视图中高亮
  if (cadViewerRef.value) {
    // 调用CAD查看器的高亮方法
    cadViewerRef.value.highlightEntity(embeddedPart.code)
    cadViewerRef.value.zoomToEntity(embeddedPart.code)
  }
  
  // 如果启用了坐标同步，在3D视图中高亮
  if (enableCoordinateSync.value && bimViewerRef.value) {
    highlightInBimViewer(embeddedPart)
  }
}

const showPreviousFloor = () => {
  const currentIndex = floors.value.findIndex(f => f.id === selectedFloorId.value)
  if (currentIndex > 0) {
    selectedFloorId.value = floors.value[currentIndex - 1].id
    handleFloorChange(floors.value[currentIndex - 1].id)
    updateVisibleEmbeddedParts()
  }
}

const showNextFloor = () => {
  const currentIndex = floors.value.findIndex(f => f.id === selectedFloorId.value)
  if (currentIndex < floors.value.length - 1) {
    selectedFloorId.value = floors.value[currentIndex + 1].id
    handleFloorChange(floors.value[currentIndex + 1].id)
    updateVisibleEmbeddedParts()
  }
}

const zoomToExtent = () => {
  if (cadViewerRef.value) {
    // 调用CAD查看器的zoomToExtent方法
    cadViewerRef.value.zoomToExtent()
  }
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  if (cadViewerRef.value) {
    // 调用CAD查看器的setGridVisible方法
    cadViewerRef.value.setGridVisible(showGrid.value)
  }
}

const toggleLayers = () => {
  if (cadViewerRef.value) {
    // 从CAD查看器获取图层信息
    const viewerLayers = cadViewerRef.value.getLayers()
    layers.value = viewerLayers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible
    }))
  }
  layersDialogVisible.value = true
}

const applyLayerChanges = () => {
  if (cadViewerRef.value) {
    // 应用图层变化到CAD查看器
    layers.value.forEach(layer => {
      cadViewerRef.value.setLayerVisible(layer.id, layer.visible)
    })
  }
  layersDialogVisible.value = false
}

const refreshViewer = () => {
  if (cadViewerRef.value) {
    // 调用CAD查看器的refresh方法
    cadViewerRef.value.refresh()
  }
}

// 新添加的方法
// 鼠标移动事件处理（用于坐标同步）
const onViewerMouseMove = (event) => {
  if (!enableCoordinateSync || !bimViewerRef.value) return
  
  // 获取鼠标位置的坐标信息
  if (cadViewerRef.value) {
    const coordinate = cadViewerRef.value.getCoordinateAt(event.clientX, event.clientY)
    if (coordinate) {
      // 在3D视图中同步显示坐标
      console.log('同步坐标:', coordinate)
      // 实际项目中，这里应该更新3D视图的相机位置
    }
  }
}

// 初始化Three.js场景
const initThreeJs = () => {
  if (!bimViewerRef.value) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  // 创建场景
  scene.value = new THREE.Scene()
  scene.value.background = new THREE.Color(0xf5f7fa)
  
  // 创建相机
  camera.value = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.value.position.set(10, 10, 10)
  
  // 创建渲染器
  renderer.value = new THREE.WebGLRenderer({ antialias: true })
  renderer.value.setSize(width, height)
  renderer.value.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = '' // 清空容器
  container.appendChild(renderer.value.domElement)
  
  // 创建控制器
  controls.value = new OrbitControls(camera.value, renderer.value.domElement)
  controls.value.enableDamping = true
  controls.value.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.value.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7.5)
  scene.value.add(directionalLight)
  
  // 添加网格辅助线
  const gridHelper = new THREE.GridHelper(100, 100)
  scene.value.add(gridHelper)
  
  // 添加坐标轴辅助线
  const axesHelper = new THREE.AxesHelper(5)
  scene.value.add(axesHelper)
  
  isThreeJsInitialized.value = true
  
  // 开始动画循环
  animate()
}

// 动画循环
const animate = () => {
  requestAnimationFrame(animate)
  
  if (controls.value) {
    controls.value.update()
  }
  
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value)
  }
}

// 调整窗口大小
const handleWindowResize = () => {
  if (!bimViewerRef.value || !camera.value || !renderer.value) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  
  renderer.value.setSize(width, height)
}

// 清理Three.js资源
const cleanupThreeJs = () => {
  if (renderer.value && renderer.value.domElement) {
    renderer.value.dispose()
    if (bimViewerRef.value) {
      bimViewerRef.value.innerHTML = ''
    }
  }
  
  // 清理场景中的对象
  if (scene.value) {
    scene.value.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose()
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  
  scene.value = null
  camera.value = null
  renderer.value = null
  controls.value = null
  bimModels.value = []
  bimModelObjects.value = {}
  isThreeJsInitialized.value = false
  isBimModelLoaded.value = false
}

// 加载3D BIM模型
const loadBimModel = async () => {
  if (!selectedModel.value || !bimViewerRef.value) return
  
  console.log('加载3D BIM模型:', selectedModel.value.name)
  isBimModelLoaded.value = false
  
  // 检查模型转换状态 - 仅对需要转换的模型类型进行检查
  if (!selectedModel.value.conversionStatus) {
    // 对于直接是glb/gltf格式的3D模型，默认设置为已完成
    if (selectedModel.value.format === 'glb' || selectedModel.value.format === 'gltf') {
      selectedModel.value.conversionStatus = 'completed'
    } else {
      selectedModel.value.conversionStatus = 'pending' // 默认状态
    }
  }
  
  if (selectedModel.value.conversionStatus === 'pending') {
    console.log('模型尚未转换，无法加载3D视图')
    ElMessage.warning('该模型尚未转换为3D格式，请在模型管理页面先完成转换')
    return
  }
  
  if (selectedModel.value.conversionStatus === 'converting') {
    console.log('模型正在转换中，无法加载3D视图')
    ElMessage.info('该模型正在转换中，请稍候再试')
    return
  }
  
  if (selectedModel.value.conversionStatus === 'failed') {
    console.log('模型转换失败，无法加载3D视图')
    ElMessage.error('该模型转换失败，请在模型管理页面重新尝试转换')
    return
  }
  
  // 确保Three.js已初始化
  if (!isThreeJsInitialized.value) {
    initThreeJs()
  }
  
  try {
    // 从服务器获取3D模型文件 - 确保使用转换完成的轻量化模型
    const response = await api.bimModel.downloadBIMModel(selectedModel.value.id, true)
    
    // 验证响应
    if (!response) {
      throw new Error('服务器返回空响应')
    }
    
    // 清空现有模型
    bimModels.value.forEach(model => {
      scene.value.remove(model)
    })
    bimModels.value = []
    bimModelObjects.value = {}
    
    // 创建Blob对象并验证
    const blob = new Blob([response], { type: 'model/gltf-binary' })
    if (blob.size === 0) {
      throw new Error('服务器返回空文件')
    }
    
    const modelUrl = URL.createObjectURL(blob)
    
    // 使用GLTFLoader加载模型
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        // 模型加载成功
        const model = gltf.scene
        scene.value.add(model)
        bimModels.value.push(model)
        
        // 为模型中的每个对象添加用户数据，方便后续操作
        model.traverse((object) => {
          if (object.isMesh) {
            // 假设模型中对象的name属性包含预埋件ID
            // 实际项目中，需要根据模型的具体结构进行调整
            const embeddedPartId = object.name.replace(/[^0-9]/g, '')
            if (embeddedPartId) {
              object.userData.embeddedPartId = embeddedPartId
              bimModelObjects.value[embeddedPartId] = object
            }
          }
        })
        
        // 调整相机位置以适合模型
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.value.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= 1.5
        
        camera.value.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
        controls.value.target.copy(center)
        controls.value.update()
        
        // 添加预埋件球体（如果模型中没有预埋件对象）
        if (Object.keys(bimModelObjects.value).length === 0) {
          createEmbeddedPartSpheres()
        }
        
        isBimModelLoaded.value = true
        console.log('3D BIM模型加载完成')
        ElMessage.success('3D BIM模型加载完成')
        
        // 释放URL对象
        URL.revokeObjectURL(modelUrl)
      },
      (progress) => {
        // 模型加载进度
        console.log('模型加载进度:', (progress.loaded / progress.total) * 100, '%')
      },
      (error) => {
        // 模型加载失败
        console.error('加载3D BIM模型失败:', error)
        ElMessage.error('加载3D BIM模型失败')
        isBimModelLoaded.value = false
        
        // 如果加载失败，创建演示模型作为备选
        createDemoModel()
        isBimModelLoaded.value = true
        
        // 释放URL对象
        URL.revokeObjectURL(modelUrl)
      }
    )
  } catch (error) {
    console.error('加载3D BIM模型失败:', error)
    ElMessage.error('加载3D BIM模型失败')
    
    // 如果获取模型文件失败，创建演示模型作为备选
    createDemoModel()
    isBimModelLoaded.value = true
  }
}

// 创建预埋件球体（当模型中没有预埋件对象时使用）
const createEmbeddedPartSpheres = () => {
  if (!scene.value) return
  
  embeddedParts.value.forEach((ep) => {
    // 尝试从2D模型中获取预埋件的实际位置
    // 实际项目中，需要根据2D模型和3D模型的坐标映射关系来计算
    const position = getRandomPosition()
    const embeddedPartGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const embeddedPartMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const embeddedPartMesh = new THREE.Mesh(embeddedPartGeometry, embeddedPartMaterial)
    embeddedPartMesh.position.set(position.x, position.y, position.z)
    embeddedPartMesh.userData = { embeddedPartId: ep.id }
    
    scene.value.add(embeddedPartMesh)
    bimModelObjects.value[ep.id] = embeddedPartMesh
  })
}

// 创建演示模型
const createDemoModel = () => {
  if (!scene.value) return
  
  // 清空现有模型
  bimModels.value.forEach(model => {
    scene.value.remove(model)
  })
  bimModels.value = []
  bimModelObjects.value = {}
  
  // 创建一个建筑模型（简化版）
  const buildingGroup = new THREE.Group()
  
  // 建筑主体
  const buildingGeometry = new THREE.BoxGeometry(20, 15, 20)
  const buildingMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x87CEEB,
    transparent: true,
    opacity: 0.7
  })
  const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial)
  buildingGroup.add(buildingMesh)
  
  // 楼层分割线
  for (let i = 1; i < 5; i++) {
    const floorGeometry = new THREE.BoxGeometry(21, 0.1, 21)
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial)
    floorMesh.position.y = (i * 3) - 7.5
    buildingGroup.add(floorMesh)
  }
  
  // 添加一些预埋件（作为示例）
  embeddedParts.value.forEach((ep, index) => {
    const position = getRandomPosition()
    const embeddedPartGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const embeddedPartMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const embeddedPartMesh = new THREE.Mesh(embeddedPartGeometry, embeddedPartMaterial)
    embeddedPartMesh.position.set(position.x, position.y, position.z)
    embeddedPartMesh.userData = { embeddedPartId: ep.id }
    
    buildingGroup.add(embeddedPartMesh)
    bimModelObjects.value[ep.id] = embeddedPartMesh
  })
  
  scene.value.add(buildingGroup)
  bimModels.value.push(buildingGroup)
  
  // 调整相机位置以适合模型
  const box = new THREE.Box3().setFromObject(buildingGroup)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.value.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  cameraZ *= 1.5
  
  camera.value.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
  controls.value.target.copy(center)
  controls.value.update()
}

// 获取随机位置
const getRandomPosition = () => {
  return {
    x: (Math.random() - 0.5) * 18,
    y: (Math.random() - 0.5) * 13,
    z: (Math.random() - 0.5) * 18
  }
}

// 根据状态获取颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 0x409eff // 蓝色
    case 'installed':
      return 0x67c23a // 绿色
    case 'inspected':
      return 0xe6a23c // 黄色
    case 'completed':
      return 0x909399 // 灰色
    default:
      return 0x409eff
  }
}

// 在3D BIM视图中高亮预埋件
const highlightInBimViewer = (embeddedPart) => {
  if (!bimViewerRef.value || !scene.value) return
  
  console.log('在3D视图中高亮:', embeddedPart.name)
  
  // 恢复所有模型的原始颜色
  Object.values(bimModelObjects.value).forEach(obj => {
    if (obj.userData.originalColor) {
      obj.material.color.set(obj.userData.originalColor)
      obj.material.emissive.set(0x000000)
    }
  })
  
  // 高亮选中的预埋件
  const targetObject = bimModelObjects.value[embeddedPart.id]
  if (targetObject) {
    // 保存原始颜色
    if (!targetObject.userData.originalColor) {
      targetObject.userData.originalColor = targetObject.material.color.clone()
    }
    
    // 设置高亮效果
    targetObject.material.emissive.set(0xffff00)
    targetObject.material.emissiveIntensity = 0.5
    
    // 聚焦到选中的对象
    controls.value.target.copy(targetObject.position)
    camera.value.position.set(
      targetObject.position.x + 5,
      targetObject.position.y + 5,
      targetObject.position.z + 5
    )
    controls.value.update()
  }
}


</script>

<style scoped>
.bim-visualization {
  padding: 20px;
  display: grid;
  grid-template-areas:
    "header header"
    "model parts";
  grid-template-columns: 1fr 320px;
  grid-template-rows: auto 1fr;
  gap: 20px;
  height: calc(100vh - 40px);
}

.page-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.project-select,
.model-select {
  width: 200px;
}

.control-panel {
  grid-area: control;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.control-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.control-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
  color: #1E3A5F;
}

.floor-controls,
.view-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.model-container {
  grid-area: model;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f7fa;
  position: relative;
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
}

.view-switcher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}

/* 添加上传提示样式 */
.upload-hint {
  margin-top: 8px;
  text-align: center;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.sync-checkbox {
  margin-left: 15px;
}

.view-title {
  padding: 8px 12px;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
  font-size: 14px;
}

.cad-viewer-wrapper {
  width: 100%;
  flex: 1;
  border: 1px solid #ebeef5;
  margin: 5px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.bim-viewer-wrapper {
  width: 100%;
  flex: 1;
  border: 1px solid #ebeef5;
  margin: 5px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  background-color: #f5f7fa;
}

.bim-viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.bim-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #606266;
}

/* 双视图布局 */
.model-container:has(.current-view-both) .cad-viewer-wrapper,
.model-container:has(.current-view-both) .bim-viewer-wrapper {
  width: calc(50% - 10px);
  height: calc(100% - 20px);
}

.model-container:has(.current-view-both) {
  flex-direction: row;
}

.model-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.embedded-parts-panel {
  grid-area: parts;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.search-input {
  width: 180px;
}

.embedded-parts-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.embedded-part-item {
  padding: 15px;
  margin-bottom: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.embedded-part-item:hover {
  background-color: #ecf5ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.embedded-part-item.status-pending {
  border-left: 4px solid #409eff;
}

.embedded-part-item.status-installed {
  border-left: 4px solid #67c23a;
}

.embedded-part-item.status-inspected {
  border-left: 4px solid #e6a23c;
}

.embedded-part-item.status-completed {
  border-left: 4px solid #909399;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.item-title {
  font-weight: bold;
}

.item-info {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: #606266;
}

.info-item {
  margin-bottom: 3px;
}

.layers-list {
  max-height: 400px;
  overflow-y: auto;
}

.layer-item {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}

/* ========== 响应式修复开始 ========== */

/* 平板设备适配 (1024px以下) */
@media (max-width: 1024px) {
  .bim-visualization {
    grid-template-areas: 
      "header header"
      "model parts";
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr;
    padding: 16px;
    gap: 16px;
  }
  
  .embedded-parts-panel {
    max-height: calc(100vh - 200px);
  }
}

/* 移动端适配 (768px及以下) - 修复这里的关键问题 */
@media (max-width: 768px) {
  .bim-visualization {
    /* 改为单列布局，确保所有内容都可见 */
    grid-template-areas:
      "header"
      "model"
      "parts";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 16px;
    padding: 16px;
    height: auto; /* 改为自动高度，支持滚动 */
    min-height: 100vh;
    overflow-y: auto; /* 允许垂直滚动 */
  }
  
  /* 按钮组适配 */
  .floor-controls,
  .view-controls {
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-top: 12px;
  }
  
  .floor-controls button,
  .view-controls button {
    flex: 1;
    min-width: 0; /* 允许按钮缩小 */
    white-space: nowrap;
  }
  
  /* 模型容器 */
  .model-container {
    height: 500px; /* 固定高度，确保足够显示 */
    min-height: 500px;
    margin: 0;
  }
  
  /* 视图切换器 */
  .view-switcher {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 12px;
  }
  
  .sync-checkbox {
    margin-left: 0;
    margin-top: 0;
  }
  
  /* 预埋件面板 */
  .embedded-parts-panel {
    height: 400px; /* 固定高度 */
    min-height: 400px;
    margin: 0;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 0;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }
  
  .project-select {
    width: 100%;
  }
  
  .header-right {
    align-self: stretch;
  }
  
  .header-right .el-button {
    width: 100%;
  }
  
  .embedded-part-item {
    padding: 12px;
  }
  
  .item-info {
    font-size: 13px;
  }
}

/* 小屏幕移动端 (480px及以下) */
@media (max-width: 480px) {
  .bim-visualization {
    padding: 12px;
    gap: 12px;
  }
  
  /* 状态筛选的复选框调整为垂直排列 */
  .el-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .el-checkbox {
    margin-right: 0 !important;
  }
  
  /* 模型容器调整 */
  .model-container {
    height: 400px;
    min-height: 400px;
  }
  
  /* 预埋件面板调整 */
  .embedded-parts-panel {
    height: 350px;
    min-height: 350px;
  }
  
  /* 嵌入式部件项优化 */
  .embedded-part-item {
    padding: 10px;
    margin-bottom: 8px;
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .item-info {
    font-size: 12px;
  }
  
  /* 视图切换按钮调整为垂直 */
  .el-radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .el-radio-button {
    width: 100%;
  }
  
  .view-switcher {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .page-header {
    padding: 0;
  }
  
  .view-controls button {
    font-size: 13px;
    padding: 8px 12px;
  }
}

/* 超小屏幕 (375px及以下) */
@media (max-width: 375px) {
  .model-container {
    height: 350px;
    min-height: 350px;
  }
  
  .embedded-parts-panel {
    height: 300px;
    min-height: 300px;
  }
  
  .floor-controls,
  .view-controls {
    flex-direction: column;
  }
  
  .floor-controls button,
  .view-controls button {
    width: 100%;
  }
  
}

</style>
