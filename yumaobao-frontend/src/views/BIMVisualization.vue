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

      <!-- 未选择模型时的提示 -->
      <div class="model-placeholder" v-if="!selectedModel">
        <el-icon size="64">
          <Document />
        </el-icon>
        <p>请选择一个项目和模型</p>
      </div>

      <!-- CAD查看器（2D视图） -->
      <div class="cad-viewer-wrapper" v-else-if="selectedModel.type === '2d'">
        <div class="view-title">
          2D CAD视图: {{ selectedModel?.name || '未命名' }}
          <span v-if="localCadFile" style="font-size: 12px; color: #909399; margin-left: 10px;">
            ({{ (localCadFile.size / 1024 / 1024).toFixed(2) }} MB)
          </span>
        </div>
        <div v-if="!localCadFile" class="cad-placeholder">
          <el-icon size="64">
            <Document />
          </el-icon>
          <p>正在加载模型文件...</p>
        </div>
        <div v-else class="cad-container">
          <!-- 使用条件渲染来避免初始化问题 -->
          <div v-if="!showCadViewer" class="cad-placeholder">
            <el-icon size="64">
              <Document />
            </el-icon>
            <p>正在初始化查看器...</p>
          </div>
          <div v-else class="cad-viewer-container" ref="cadContainerRef">
            <MlCadViewer
          ref="cadViewerRef"
          :key="cadViewerKey"
          :local-file="localCadFile"
          :use-main-thread-draw="false"
          base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
          locale="zh"
          @loaded="onViewerLoaded"
          @error="onViewerError"
        />
          </div>
        </div>
      </div>

      <!-- 3D BIM模型视图 -->
      <div class="bim-viewer-wrapper" v-else-if="selectedModel.type === '3d'">
        <div class="view-title">3D BIM视图</div>
        <div class="bim-viewer-container" ref="bimViewerRef">
        </div>
      </div>
    </div>

    <!-- 预埋件列表 -->
    <div class="embedded-parts-panel">
      <div class="panel-header">
        <h3>预埋件列表 ({{ filteredEmbeddedParts.length }})</h3>
        <div class="panel-actions">
          <el-button 
            type="primary" 
            size="small" 
            icon="RefreshRight" 
            @click="refreshEmbeddedPartsIn3D"
            v-if="filteredEmbeddedParts.length > 0"
            :disabled="!scene || !isThreeJsInitialized"
          >
            刷新3D显示
          </el-button>
          <el-input
            v-model="embeddedPartSearch"
            placeholder="搜索预埋件"
            clearable
            size="small"
            class="search-input"
          />
        </div>
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
import { ref, shallowRef, reactive, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, UploadFilled, Refresh, FullScreen, Grid, Collection, RefreshRight } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { useUserStore } from '../stores/index.js'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import config from '../config/index.js'
// 导入Three.js相关模块
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
// 导入坐标转换引擎
import { CoordinateMapper, createDefaultMapper } from '../utils/coordinateMapper.js'

// --- 【核心修复补丁】开始 ---
// 解决 TypeError: u.addUpdateRange is not a function 报错
if (THREE.BufferAttribute && !THREE.BufferAttribute.prototype.addUpdateRange) {
  THREE.BufferAttribute.prototype.addUpdateRange = function(start, count) {
    const updateRange = this.updateRange;
    if (updateRange.count === -1) {
      updateRange.offset = start;
      updateRange.count = count;
    } else {
      const oldEnd = updateRange.offset + updateRange.count;
      const newEnd = start + count;
      updateRange.offset = Math.min(updateRange.offset, start);
      updateRange.count = Math.max(oldEnd, newEnd) - updateRange.offset;
    }
  };
  console.log('✅ 已成功注入 addUpdateRange 补丁');
}
// --- 【核心修复补丁】结束 ---

// 创建userStore实例
const userStore = useUserStore()

// 组件引用
const cadViewerRef = shallowRef(null)
const bimViewerRef = ref(null)

// Three.js相关状态 - 使用普通变量，避免Vue响应式系统干扰
let scene = null
let camera = null
let renderer = null
let controls = null
let gridHelper = null // 保存3D网格对象引用
let highlightedMesh = null // 当前高亮的预埋件网格
let pulseAnimationId = null // 脉冲动画ID
// 只有需要响应式的状态才使用ref
const bimModels = ref([]) // 存储加载的BIM模型
const bimModelObjects = ref({}) // 存储模型对象，用于高亮

// 环境变量 - 在script部分获取，然后在模板中使用
const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

// 坐标转换器实例
let coordinateMapper = null

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
// CAD查看器控制
const showCadViewer = ref(false)
const cadViewerKey = ref(0)

// 数据
const projects = ref([])
const floors = ref([])
const models = ref([])
const embeddedParts = ref([])
const layers = ref([])

// 模型文件
const modelFile = ref(null)
const localCadFile = shallowRef(null)
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



// 生命周期
onMounted(() => {
  // 配置CAD查看器UI设置
  AcApSettingManager.instance.isShowCommandLine = false
  AcApSettingManager.instance.isShowToolbar = config.cadViewer.showToolbars
  AcApSettingManager.instance.isShowCoordinate = true
  AcApSettingManager.instance.isShowMainMenu = false
  AcApSettingManager.instance.isShowStats = false
  AcApSettingManager.instance.isShowEntityInfo = false
  AcApSettingManager.instance.isShowLanguageSelector = false

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
  // 释放 Blob URL
  if (localCadFile.value && typeof localCadFile.value === 'string') {
    URL.revokeObjectURL(localCadFile.value);
  }
})

// 监听视图切换 - 直接放在script setup中，而不是onMounted中
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

// 监听坐标同步开关 - 直接放在script setup中，而不是onMounted中
watch(enableCoordinateSync, (newValue) => {
  if (newValue && selectedModel.value && selectedModel.value.type === '3d') {
    loadBimModel()
  }
})

// 监听模型变化 - 直接放在script setup中，而不是onMounted中
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
// 1. 定义 ref
const cadContainerRef = ref(null)

// 2. 监听容器出现，添加"防滚动"补丁
watch(cadContainerRef, (dom) => {
  if (dom) {
    // 核心逻辑：添加 wheel 事件监听，强行阻止浏览器默认行为
    // 注意：必须加 { passive: false }，否则无法阻止
    dom.addEventListener('wheel', (e) => {
      e.preventDefault(); 
    }, { passive: false });
    
    console.log('✅ 已启用鼠标滚轮独占模式 (防止页面滚动)');
  }
})

// 方法
const getProjects = async () => {
  try {
    // 添加详细的调试日志
    console.log('开始获取项目列表...')
    console.log('当前用户角色:', userStore.userRole)
    console.log('是否为受限用户:', isRestrictedUser.value)
    console.log('用户关联项目列表:', userProjects.value)
    
    const response = await api.project.getProjects()
    
    // 添加更详细的调试日志
    console.log('获取项目列表成功，原始响应:', response)
    
    // 确保response是数组
    const projectList = Array.isArray(response) ? response : []
    
    // 根据用户角色过滤项目列表
    const userProjectList = userProjects.value || []
    if (isRestrictedUser.value && userProjectList.length > 0) {
      // 安装人员和质检人员只能看到自己注册的项目
      projects.value = projectList.filter(project => userProjectList.includes(project.id))
      console.log('受限用户，过滤后项目列表:', projects.value)
    } else {
      // 其他角色可以看到所有项目
      projects.value = projectList
      console.log('管理员/项目管理员，项目列表:', projects.value)
    }
    
    // 如果是受限用户，自动选择他们的项目
    if (isRestrictedUser.value && projects.value.length > 0) {
      selectedProjectId.value = projects.value[0].id
      console.log('自动选择项目:', selectedProjectId.value)
      await handleProjectChange(selectedProjectId.value)
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    console.error('错误详情:', error.response || error.message)
    ElMessage.error({
      message: '获取项目列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    // 发生错误时确保projects是数组
    projects.value = []
  }
}

const getFloors = async (projectId) => {
  try {
    const response = await api.floor.getFloors(projectId) // 直接传入projectId，不是对象
    floors.value = response
    
    // 初始化坐标转换器
    if (floors.value && floors.value.length > 0) {
      coordinateMapper = createDefaultMapper(floors.value)
      console.log('✅ 坐标转换器已初始化，楼层数:', floors.value.length)
    }
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
    
    console.log('✅ 获取到预埋件数据:', embeddedParts.value.length, '个')
    
    // 🔧 修复：如果3D场景已初始化且有预埋件，重新创建预埋件球体
    if (scene && isThreeJsInitialized.value && embeddedParts.value.length > 0) {
      console.log('🎯 3D场景已存在，重新创建预埋件球体')
      
      // 清除现有的预埋件球体
      Object.values(bimModelObjects.value).forEach(mesh => {
        if (mesh.userData.embeddedPartId) {
          scene.remove(mesh)
          if (mesh.geometry) mesh.geometry.dispose()
          if (mesh.material) mesh.material.dispose()
        }
      })
      bimModelObjects.value = {}
      
      // 重新创建预埋件球体
      createEmbeddedPartSpheres()
    }
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
    // 1. Basic Validation
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
    
    // Release previous URL to prevent memory leaks
    if (localCadFile.value && typeof localCadFile.value === 'string') {
       URL.revokeObjectURL(localCadFile.value)
    }
    
    const loadingMessage = ElMessage({
      message: '正在加载模型文件...',
      duration: 0,
      type: 'info'
    })
    
    // Skip for 3D models
    if (model.type === '3d') {
      loadingMessage.close()
      isBimModelLoaded.value = false
      return
    }
    
    // --- Step 1: Fetch Data (Bypassing Axios) ---
    const url = `/api/models/${modelId}/download?useLightweight=${model.isLightweight ? 'true' : 'false'}`;
    const token = localStorage.getItem('token');

    console.log('正在尝试使用原生 Fetch 下载:', url);

    const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        }
    });

    if (!fetchResponse.ok) {
        throw new Error(`文件下载失败: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const finalBlob = await fetchResponse.blob(); // Define ONCE here

    // --- Step 2: Diagnostic & Correction ---
    // Read first 6 bytes to check header
    const buffer = await finalBlob.slice(0, 6).arrayBuffer();
    const header = new TextDecoder().decode(buffer);
    
    console.log('====== 文件格式诊断 ======');
    console.log('1. 文件头(String):', header);
    
    // Auto-correct extension based on header
    let realExtension = '.dwg'; // Default
    
    // DXF Detection: Starts with "  0" or "0\n"
    if (header.includes('0') && (header.includes('S') || header.includes('s'))) {
        realExtension = '.dxf';
        console.log('🔍 自动检测：这是一个 DXF 文件，强制修正后缀为 .dxf');
    } else if (header.startsWith('AC')) {
        realExtension = '.dwg';
        console.log('🔍 自动检测：这是一个 DWG 文件');
    }

    if (finalBlob.size === 0) {
      throw new Error('服务器返回空文件');
    }

    // Create File with CORRECT extension
    const baseName = selectedModel.value?.name || 'temp_model';
    // Ensure filename ends with correct extension
    const finalFileName = baseName.toLowerCase().endsWith(realExtension) 
        ? baseName 
        : (baseName + realExtension);
    
    console.log('📄 最终传给组件的文件名:', finalFileName);

    const finalFile = new File([finalBlob], finalFileName, { type: 'application/octet-stream' });

    // --- Step 3: Assign to Component ---
    localCadFile.value = markRaw(finalFile);

    // Load parts
    await getEmbeddedParts(selectedProjectId.value, selectedFloorId.value)
    
    loadingMessage.close()

  } catch (error) {
    console.error('获取模型文件失败:', error)
    if (ElMessage.closeAll) ElMessage.closeAll()
    ElMessage.error({
      message: `获取模型文件失败: ${error.message}`,
      duration: 3000,
      type: 'error'
    })
    selectedModel.value = null
    localCadFile.value = null
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
  
  console.log('🔄 楼层切换，当前预埋件:', embeddedParts.value.length, '个')
}

const handleModelChange = async (modelId) => {
  if (!modelId) return
  
  selectedModelId.value = modelId
  
  // 1. 【关键】彻底销毁组件，并清理资源
  showCadViewer.value = false
  // 释放旧的 URL 对象，防止内存泄漏
  if (localCadFile.value && typeof localCadFile.value === 'string') {
    URL.revokeObjectURL(localCadFile.value)
  }
  localCadFile.value = null 
  cadViewerKey.value++ // 强制 Key 变化
  
  // 2. 获取新数据
  // 注意：getModelFile 内部现在是用 fetch 获取 Blob URL
  await getModelFile(modelId)
  
  // 3. 【关键】增加延迟，给 Vue 和 CAD 库足够的销毁时间
  // 之前的 nextTick 可能太快了，导致旧的 command stack 还没释放
  if (selectedModel.value) {
    if (selectedModel.value.type === '2d') {
      currentView.value = '2d'
      
      setTimeout(() => {
        showCadViewer.value = true
      }, 100) // 给 100ms 的缓冲时间让旧实例彻底卸载
    } else if (selectedModel.value.type === '3d') {
      currentView.value = '3d'
      showCadViewer.value = false
      nextTick(() => {
        loadBimModel()
      })
    }
  }
}

const handleStatusFilterChange = () => {
  // 筛选状态变化时自动更新列表
}



// 查看器相关方法
const onViewerError = (error) => {
  console.error('CAD查看器错误:', error)
  
  // 检查是否是 draw 方法相关的错误
  if (error.message && (
    error.message.includes('draw is not a function') || 
    error.message.includes('batchConvert') ||
    error.message.includes('TypeError') ||
    error.message.includes('n.draw')
  )) {
    console.warn('检测到渲染相关错误，尝试重新初始化...')
    ElMessage.warning('渲染初始化遇到问题，正在重新配置...')
    
    // 重新初始化查看器配置
    setTimeout(() => {
      refreshViewer()
    }, 1500)
    return
  }
  
  ElMessage.error(`CAD查看器加载失败: ${error.message || '未知错误'}`)
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
  console.log('==================== highlightEmbeddedPart ====================')
  console.log('🎯 点击的预埋件:', embeddedPart.name, 'ID:', embeddedPart.id)
  console.log('📍 当前视图模式:', currentView.value)
  console.log('📊 bimModelObjects总数:', Object.keys(bimModelObjects.value).length)
  console.log('📊 bimModelObjects的所有ID:', Object.keys(bimModelObjects.value))
  
  // 🔧 修复：只在3D或双视图模式下才需要3D对象
  const need3DHighlight = currentView.value === '3d' || currentView.value === 'both'
  console.log('🔍 是否需要3D高亮:', need3DHighlight)
  
  if (need3DHighlight) {
    // 检查是否有3D对象
    const has3DObject = bimModelObjects.value[embeddedPart.id]
    console.log('🔍 查找ID为', embeddedPart.id, '的3D对象:', has3DObject ? '找到了！' : '未找到')
    
    if (!has3DObject && scene && isThreeJsInitialized.value) {
      console.warn('❌ 未找到预埋件3D对象:', embeddedPart.id)
      console.log('💡 提示：尝试点击"刷新3D显示"按钮')
      
      ElMessage.warning({
        message: `预埋件 "${embeddedPart.name}" 在3D场景中不可见。请点击"刷新3D显示"按钮`,
        duration: 4000
      })
      return // 如果找不到就直接返回，不要继续
    }
  }
  
  ElMessage.info(`已定位到预埋件: ${embeddedPart.name}`)
  
  // 在2D CAD视图中，暂时只显示提示信息
  // TODO: 后续可以添加CAD查看器的高亮功能（需要查看CAD查看器文档）
  
  // 如果启用了坐标同步且在3D/双视图模式，在3D视图中高亮
  if (enableCoordinateSync.value && bimViewerRef.value && need3DHighlight && scene) {
    console.log('✅ 准备调用highlightInBimViewer')
    highlightInBimViewer(embeddedPart)
  }
  console.log('==============================================================')
}



const zoomToExtent = () => {
  if (cadViewerRef.value) {
    // 调用CAD查看器的zoomToExtent方法
    cadViewerRef.value.zoomToExtent()
  }
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  
  // 处理2D视图网格
  if (cadViewerRef.value) {
    cadViewerRef.value.setGridVisible(showGrid.value)
  }
  
  // 处理3D视图网格
  if (gridHelper) {
    gridHelper.visible = showGrid.value
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

// 刷新预埋件3D显示
const refreshEmbeddedPartsIn3D = () => {
  if (!scene || !isThreeJsInitialized.value) {
    ElMessage.warning({
      message: '请先切换到"3D BIM视图"或"双视图"模式以初始化3D场景',
      duration: 3000
    })
    return
  }
  
  if (embeddedParts.value.length === 0) {
    ElMessage.info('当前没有预埋件数据')
    return
  }
  
  console.log('🔄 手动刷新预埋件3D显示，预埋件数量:', embeddedParts.value.length)
  
  // 清除现有的预埋件球体
  Object.values(bimModelObjects.value).forEach(mesh => {
    if (mesh.userData.embeddedPartId) {
      scene.remove(mesh)
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) mesh.material.dispose()
    }
  })
  bimModelObjects.value = {}
  
  // 重新创建预埋件球体
  createEmbeddedPartSpheres()
  
  ElMessage.success(`已刷新 ${embeddedParts.value.length} 个预埋件的3D显示`)
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
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f7fa)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(10, 10, 10)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = '' // 清空容器
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
  
  // 添加网格辅助线
  gridHelper = new THREE.GridHelper(100, 100)
  gridHelper.visible = showGrid.value // 根据当前showGrid状态设置初始可见性
  scene.add(gridHelper)
  
  // 添加坐标轴辅助线
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
  
  isThreeJsInitialized.value = true
  
  // 🔧 优化：3D场景初始化后立即同步创建预埋件球体
  if (embeddedParts.value.length > 0) {
    console.log('🎯 3D场景初始化完成，立即创建预埋件球体')
    createEmbeddedPartSpheres()
  }
  
  // 开始动画循环
  animate()
}

// 动画循环
let animationFrameId = null
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  try {
    if (controls) {
      controls.update()
    }
    
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  } catch (error) {
    console.error('Three.js动画循环错误:', error)
    // 停止动画循环
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    // 清理Three.js资源
    cleanupThreeJs()
    // 显示错误信息
    ElMessage.error('3D模型渲染失败，已切换到演示模式')
    // 创建演示模型作为备选
    createDemoModel()
  }
}

// 调整窗口大小
const handleWindowResize = () => {
  if (!bimViewerRef.value || !camera || !renderer) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
}

// 清理Three.js资源
const cleanupThreeJs = () => {
  // 停止动画循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 停止脉冲动画
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
  
  if (renderer && renderer.domElement) {
    renderer.dispose()
    if (bimViewerRef.value) {
      bimViewerRef.value.innerHTML = ''
    }
  }
  
  // 清理场景中的对象
  if (scene) {
    scene.traverse((object) => {
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
  
  scene = null
  camera = null
  renderer = null
  controls = null
  gridHelper = null
  highlightedMesh = null
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
  
  // 直接使用模型的fileUrl加载，不再通过API下载
      if (selectedModel.value.fileUrl) {
        try {
          // 清空现有模型
          bimModels.value.forEach(model => {
            scene.remove(model)
          })
          bimModels.value = []
          bimModelObjects.value = {}
          
          // 确保fileUrl包含完整的协议前缀
          let modelUrl = selectedModel.value.fileUrl
          if (modelUrl.startsWith('localhost:')) {
            modelUrl = `http://${modelUrl}`
          } else if (!modelUrl.startsWith('http://') && !modelUrl.startsWith('https://')) {
            modelUrl = `http://${modelUrl}`
          }
          
          // 修复文件路径编码问题
          // 将URL分解为各个部分，对路径部分进行正确编码
          const urlParts = new URL(modelUrl)
          // 解析路径，确保中文文件名正确编码
          const pathParts = urlParts.pathname.split('/').map(part => {
            // 如果已经编码过，先解码，然后重新编码
            try {
              // 尝试解码，如果成功则重新编码，否则直接编码
              const decoded = decodeURIComponent(part)
              return encodeURIComponent(decoded)
            } catch (e) {
              // 如果解码失败，直接编码
              return encodeURIComponent(part)
            }
          })
          // 重新构建路径
          urlParts.pathname = pathParts.join('/')
          // 重新构建完整URL
          modelUrl = urlParts.toString()
          
          console.log('直接使用模型URL加载3D模型:', modelUrl)
          
          // 保存当前的scene引用，避免回调函数中scene变为null
          const currentScene = scene
          const currentCamera = camera
          const currentControls = controls
          
          // 使用GLTFLoader直接从URL加载模型
          const loader = new GLTFLoader()
          loader.load(
            modelUrl,
            (gltf) => {
              // 模型加载成功
              if (!currentScene || !currentCamera || !currentControls) {
                console.error('Scene, camera or controls is null when model loaded, skipping...')
                return
              }
              
              const model = gltf.scene
              
              // 使用markRaw确保Three.js对象不会被Vue的响应式系统转换
              const nonReactiveModel = markRaw(model)
              
              currentScene.add(nonReactiveModel)
              bimModels.value.push(nonReactiveModel)
              
              // 🔧 修复：不要从模型中提取预埋件ID，避免覆盖我们创建的预埋件球体
              // 模型只是用于展示建筑结构，预埋件由我们单独创建的球体表示
              console.log('📦 GLTF模型已添加到场景')
              
              // 调整相机位置以适合模型
              const box = new THREE.Box3().setFromObject(model)
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              const fov = currentCamera.fov * (Math.PI / 180)
              let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
              cameraZ *= 1.5
              
              currentCamera.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
              currentControls.target.copy(center)
              currentControls.update()
              
              // 🔧 关键修复：模型加载完成后，重新创建预埋件球体
              // 这样可以确保预埋件球体在最上层，不会被模型对象覆盖
              console.log('📍 GLTF模型加载完成，重新创建预埋件球体以确保可见性')
              
              // 先清除bimModelObjects（移除旧的预埋件球体）
              Object.keys(bimModelObjects.value).forEach(id => {
                const mesh = bimModelObjects.value[id]
                if (mesh && mesh.userData && mesh.userData.embeddedPartId) {
                  currentScene.remove(mesh)
                  if (mesh.geometry) mesh.geometry.dispose()
                  if (mesh.material) mesh.material.dispose()
                }
              })
              bimModelObjects.value = {}
              
              // 重新创建预埋件球体
              if (embeddedParts.value.length > 0) {
                createEmbeddedPartSpheres()
              }
              
              isBimModelLoaded.value = true
              console.log('3D BIM模型加载完成')
              ElMessage.success('3D BIM模型加载完成')
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
            }
          )
        } catch (error) {
          console.error('加载3D BIM模型失败:', error)
          ElMessage.error('加载3D BIM模型失败')
          
          // 如果获取模型文件失败，创建演示模型作为备选
          createDemoModel()
          isBimModelLoaded.value = true
        }
      } else {
        // 如果没有fileUrl，创建演示模型
        console.log('模型没有fileUrl，创建演示模型')
        createDemoModel()
        isBimModelLoaded.value = true
      }
}

// 创建预埋件球体（当模型中没有预埋件对象时使用）
const createEmbeddedPartSpheres = () => {
  if (!scene) {
    console.error('❌ 无法创建预埋件球体: scene为null')
    return
  }
  
  console.log('🎨 开始创建预埋件球体，预埋件数量:', embeddedParts.value.length)
  
  let createdCount = 0
  let withCoordinatesCount = 0
  let withoutCoordinatesCount = 0
  
  embeddedParts.value.forEach((ep) => {
    let position = null
    
    // 尝试使用坐标转换器计算3D位置
    if (ep.coordinates2D && coordinateMapper) {
      const coord3D = coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) {
        position = coord3D
        withCoordinatesCount++
        console.log(`✅ 预埋件 ${ep.name} (${ep.id}) 使用真实坐标:`, coord3D)
      }
    }
    
    // 如果没有2D坐标或转换失败，使用随机位置（兼容旧数据）
    if (!position) {
      position = getRandomPosition()
      withoutCoordinatesCount++
      console.warn(`⚠️ 预埋件 ${ep.name} (${ep.id}) 缺少坐标信息，使用随机位置`, position)
    }
    
    const embeddedPartGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const embeddedPartMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const embeddedPartMesh = new THREE.Mesh(embeddedPartGeometry, embeddedPartMaterial)
    embeddedPartMesh.position.set(position.x, position.y, position.z)
    embeddedPartMesh.userData = { 
      embeddedPartId: ep.id,
      embeddedPartName: ep.name,
      embeddedPartCode: ep.code
    }
    
    // 使用markRaw确保Three.js对象不会被Vue的响应式系统转换
    const nonReactiveMesh = markRaw(embeddedPartMesh)
    
    scene.add(nonReactiveMesh)
    bimModelObjects.value[ep.id] = nonReactiveMesh
    createdCount++
  })
  
  console.log(`✅ 预埋件球体创建完成！总数: ${createdCount}, 有坐标: ${withCoordinatesCount}, 无坐标: ${withoutCoordinatesCount}`)
  console.log('📊 bimModelObjects:', Object.keys(bimModelObjects.value))
}

// 创建演示模型
const createDemoModel = () => {
  if (!scene) return
  
  // 清空现有模型
  bimModels.value.forEach(model => {
    scene.remove(model)
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
    let position = null
    
    // 尝试使用坐标转换器计算3D位置
    if (ep.coordinates2D && coordinateMapper) {
      const coord3D = coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) {
        position = coord3D
      }
    }
    
    // 如果没有坐标，使用随机位置
    if (!position) {
      position = getRandomPosition()
    }
    
    const embeddedPartGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const embeddedPartMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const embeddedPartMesh = new THREE.Mesh(embeddedPartGeometry, embeddedPartMaterial)
    embeddedPartMesh.position.set(position.x, position.y, position.z)
    embeddedPartMesh.userData = { 
      embeddedPartId: ep.id,
      embeddedPartName: ep.name,
      embeddedPartCode: ep.code
    }
    
    buildingGroup.add(embeddedPartMesh)
    bimModelObjects.value[ep.id] = embeddedPartMesh
  })
  
  // 使用markRaw确保Three.js对象不会被Vue的响应式系统转换
  const nonReactiveBuildingGroup = markRaw(buildingGroup)
  
  scene.add(nonReactiveBuildingGroup)
  bimModels.value.push(nonReactiveBuildingGroup)
  
  // 调整相机位置以适合模型
  const box = new THREE.Box3().setFromObject(buildingGroup)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
  cameraZ *= 1.5
  
  camera.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
  controls.target.copy(center)
  controls.update()
}

// 获取随机位置
const getRandomPosition = () => {
  return {
    x: (Math.random() - 0.5) * 18,
    y: (Math.random() - 0.5) * 13,
    z: (Math.random() - 0.5) * 18
  }
}

// 根据状态获取颜色 - 使用更鲜明的颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 0xff9800 // 橙色 - 待安装
    case 'installed':
      return 0x4caf50 // 绿色 - 已安装
    case 'inspected':
      return 0x2196f3 // 蓝色 - 已验收
    case 'completed':
      return 0x9e9e9e // 灰色 - 已完成
    default:
      return 0xff9800
  }
}

// 在3D BIM视图中高亮预埋件 - 带脉冲定位效果
const highlightInBimViewer = (embeddedPart) => {
  if (!bimViewerRef.value || !scene) return
  
  console.log('在3D视图中高亮:', embeddedPart.name)
  
  // 停止之前的脉冲动画
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
  
  // 恢复之前高亮的预埋件
  if (highlightedMesh) {
    highlightedMesh.material.emissive.set(0x000000)
    highlightedMesh.material.emissiveIntensity = 0
    highlightedMesh.scale.set(1, 1, 1)
  }
  
  // 获取目标对象
  const targetObject = bimModelObjects.value[embeddedPart.id]
  if (!targetObject) {
    console.warn('未找到预埋件对应的3D对象:', embeddedPart.id)
    return
  }
  
  highlightedMesh = targetObject
  
  // 保存原始颜色和大小
  if (!targetObject.userData.originalColor) {
    targetObject.userData.originalColor = targetObject.material.color.clone()
    targetObject.userData.originalScale = targetObject.scale.clone()
  }
  
  // 设置高亮颜色（亮黄色）
  targetObject.material.emissive.set(0xffff00)
  targetObject.material.emissiveIntensity = 1
  
  // 相机平滑移动到预埋件位置
  const targetPosition = targetObject.position
  const distance = 10 // 相机距离
  
  // 计算相机新位置（在预埋件上方偏后）
  const newCameraPosition = {
    x: targetPosition.x + distance * 0.5,
    y: targetPosition.y + distance * 0.7,
    z: targetPosition.z + distance * 0.5
  }
  
  // 平滑移动相机
  const startCameraPos = camera.position.clone()
  const startTargetPos = controls.target.clone()
  const duration = 1000 // 1秒
  const startTime = Date.now()
  
  const smoothMove = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数（ease-out）
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    // 插值相机位置
    camera.position.lerpVectors(
      startCameraPos,
      new THREE.Vector3(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z),
      easeProgress
    )
    
    // 插值控制器目标
    controls.target.lerpVectors(
      startTargetPos,
      targetPosition,
      easeProgress
    )
    
    controls.update()
    
    if (progress < 1) {
      requestAnimationFrame(smoothMove)
    }
  }
  
  smoothMove()
  
  // 脉冲动画效果
  let pulseTime = 0
  const pulseDuration = 3000 // 脉冲持续3秒
  const pulseStartTime = Date.now()
  
  const pulseAnimation = () => {
    const elapsed = Date.now() - pulseStartTime
    
    if (elapsed > pulseDuration) {
      // 动画结束，保持高亮状态
      targetObject.scale.set(1, 1, 1)
      return
    }
    
    pulseTime += 0.05
    
    // 缩放脉冲（呼吸效果）
    const scaleMultiplier = 1 + Math.sin(pulseTime * 3) * 0.2
    targetObject.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier)
    
    // 发光强度脉冲
    const intensity = 0.5 + Math.sin(pulseTime * 3) * 0.5
    targetObject.material.emissiveIntensity = intensity
    
    pulseAnimationId = requestAnimationFrame(pulseAnimation)
  }
  
  pulseAnimation()
  
  ElMessage.success({
    message: `已定位到预埋件: ${embeddedPart.name}`,
    duration: 2000
  })
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
  display: flex;
  flex-direction: column;
}

.cad-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 确保MlCadViewer组件能够正确填充父容器 */
.cad-viewer-wrapper :deep(.ml-cad-canvas) {
  position: relative !important;
  height: calc(100% - 34px) !important; /* 减去标题栏高度 */
  width: 100% !important;
}

.cad-viewer-wrapper :deep(.ml-cad-viewer-container) {
  height: 100% !important;
  width: 100% !important;
}

.cad-viewer-wrapper :deep(.ml-cad-viewer-container > *) {
  position: relative !important;
}

/* 隐藏MlCadViewer组件的额外UI元素 */
.cad-viewer-wrapper :deep(.ml-cad-viewer-container header),
.cad-viewer-wrapper :deep(.ml-cad-viewer-container footer) {
  display: none;
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
  .view-controls {
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-top: 12px;
  }
  
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
  
  .view-controls {
    flex-direction: column;
  }
  
  .view-controls button {
    width: 100%;
  }
  
}

</style>
