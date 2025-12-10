<template>
  <div class="bim-visualization">
    <!-- 页面顶部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>BIM模型可视化</h2>
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
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshViewer" icon="Refresh">
          刷新模型
        </el-button>
      </div>
    </div>

    <!-- 控制面板 -->
    <el-card class="control-panel">
      <!-- 楼层选择 -->
      <div class="control-section">
        <h3>楼层管理</h3>
        <el-select
          v-model="selectedFloorId"
          placeholder="选择楼层"
          filterable
          style="width: 100%"
          @change="handleFloorChange"
        >
          <el-option
            v-for="floor in floors"
            :key="floor.id"
            :label="floor.name"
            :value="floor.id"
          />
        </el-select>
        <div class="floor-controls">
          <el-button type="primary" size="small" @click="showPreviousFloor" :disabled="!canNavigateFloors">
          <el-icon><ArrowUp /></el-icon>
          上一层
        </el-button>
        <el-button type="primary" size="small" @click="showNextFloor" :disabled="!canNavigateFloors">
          <el-icon><ArrowDown /></el-icon>
          下一层
        </el-button>
        </div>
      </div>

      <!-- 模型管理 -->
      <div class="control-section">
        <h3>模型管理</h3>
        <el-select
          v-model="selectedModelId"
          placeholder="选择模型"
          filterable
          style="width: 100%"
          @change="handleModelChange"
        >
          <el-option
            v-for="model in models"
            :key="model.id"
            :label="model.name"
            :value="model.id"
          />
        </el-select>
        <el-button
          type="success"
          size="small"
          style="margin-top: 8px; display: block; width: 100%;"
          @click="uploadNewModel"
          icon="Upload"
        >
          上传模型
        </el-button>
      </div>

      <!-- 状态筛选 -->
      <div class="control-section">
        <h3>状态筛选</h3>
        <el-checkbox-group v-model="selectedStatuses" @change="handleStatusFilterChange">
          <el-checkbox label="pending" border>待安装</el-checkbox>
          <el-checkbox label="installed" border>已安装</el-checkbox>
          <el-checkbox label="inspected" border>已验收</el-checkbox>
          <el-checkbox label="completed" border>已完成</el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 操作按钮 -->
      <div class="control-section">
        <h3>视图操作</h3>
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
    </el-card>

    <!-- 模型显示区域 -->
    <div class="model-container">
      <!-- 模型视图切换 -->
      <div class="view-switcher">
        <el-radio-group v-model="currentView" size="small">
          <el-radio-button label="2d">2D CAD视图</el-radio-button>
          <el-radio-button label="3d">3D BIM视图</el-radio-button>
          <el-radio-button label="both">双视图</el-radio-button>
        </el-radio-group>
        <el-checkbox v-model="enableCoordinateSync" size="small" class="sync-checkbox">
          <el-icon><RefreshRight /></el-icon>坐标同步
        </el-checkbox>
      </div>

      <!-- CAD查看器（2D视图） -->
      <div class="cad-viewer-wrapper" v-if="selectedModel && (currentView === '2d' || currentView === 'both')">
        <div class="view-title">2D CAD视图</div>
        <MlCadViewer
          ref="cadViewerRef"
          locale="zh"
          :local-file="modelFile"
          :useMainThreadDraw="false"
          @loaded="onViewerLoaded"
          @click="onViewerClick"
          @mouse-move="onViewerMouseMove"
        />
      </div>

      <!-- 3D BIM模型视图（占位符，实际项目中应集成Three.js等3D库） -->
      <div class="bim-viewer-wrapper" v-if="selectedModel && (currentView === '3d' || currentView === 'both')">
        <div class="view-title">3D BIM视图</div>
        <div class="bim-viewer-container" ref="bimViewerRef">
          <!-- 这里可以集成Three.js或其他3D库来显示BIM模型 -->
          <div class="bim-placeholder" v-if="!isBimModelLoaded">
            <el-icon size="64"><Document /></el-icon>
            <p>加载3D模型中...</p>
          </div>
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

    <!-- 模型上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传BIM模型"
      width="50%"
    >
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="项目">
          <el-select v-model="uploadForm.projectId" placeholder="选择项目" :disabled="true">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="uploadForm.floorId" placeholder="选择楼层">
            <el-option
              v-for="floor in floors"
              :key="floor.id"
              :label="floor.name"
              :value="floor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型名称">
          <el-input v-model="uploadForm.name" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="模型文件">
          <el-upload
            class="upload-demo"
            drag
            action=""
            :auto-upload="false"
            :on-change="handleFileUpload"
            accept=".dwg,.dxf,.ifc,.rvt,.nwd,.3ds,.obj,.stp,.step"
            :show-file-list="true"
          >
            <el-icon class="el-icon--upload" size="64">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              <p>拖放文件到此处，或 <em>点击选择文件</em></p>
            </div>
            <template #tip>
              <div class="el-upload__tip">支持的格式: DWG, DXF (CAD), IFC, RVT, NWD (BIM), 3DS, OBJ, STP, STEP (3D模型)</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUpload">上传</el-button>
        </span>
      </template>
    </el-dialog>

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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, UploadFilled, Refresh, FullScreen, Grid,Upload, Collection, RefreshRight } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import { useUserStore } from '../stores/index.js'

// 创建userStore实例
const userStore = useUserStore()

// 组件引用
const cadViewerRef = ref(null)
const bimViewerRef = ref(null)

// 状态管理
const selectedProjectId = ref('')
const selectedFloorId = ref('')
const selectedModelId = ref('')
const selectedStatuses = ref(['pending', 'installed', 'inspected', 'completed'])
const showGrid = ref(true)
const embeddedPartSearch = ref('')
const currentView = ref('2d') // 2d, 3d, both
const enableCoordinateSync = ref(true) // 启用2D/3D坐标同步
const isBimModelLoaded = ref(false)

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
const uploadDialogVisible = ref(false)
const layersDialogVisible = ref(false)

// 上传表单
const uploadForm = reactive({
  projectId: '',
  floorId: '',
  name: '',
  file: null
})

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
})

// 方法
const getProjects = async () => {
  try {
    const response = await api.project.getProjects()
    
    // 根据用户角色过滤项目列表
    if (isRestrictedUser.value && userProjects.value.length > 0) {
      // 安装人员和质检人员只能看到自己注册的项目
      projects.value = response.filter(project => userProjects.value.includes(project.id))
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
    ElMessage.error('获取项目列表失败')
  }
}

const getFloors = async (projectId) => {
  try {
    const response = await api.floor.getFloors(projectId) // 直接传入projectId，不是对象
    floors.value = response
  } catch (error) {
    console.error('获取楼层列表失败:', error)
    ElMessage.error('获取楼层列表失败')
    floors.value = [] // 发生错误时确保floors是数组
  }
}

const getModels = async (projectId) => {
  try {
    const response = await api.bimModel.getBIMModels({ projectId }) // 正确，传入对象
    models.value = response
  } catch (error) {
    console.error('获取模型列表失败:', error)
    ElMessage.error('获取模型列表失败')
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
    ElMessage.error('获取预埋件列表失败')
    // 发生错误时也确保embeddedParts是数组
    embeddedParts.value = []
  }
}

const getModelFile = async (modelId) => {
  try {
    const model = models.value.find(m => m.id === modelId)
    if (model) {
      selectedModel.value = model
      selectedEmbeddedPart.value = null
      
      // 从服务器加载模型文件 - 优先使用轻量化版本
      const response = await api.bimModel.downloadBIMModel(modelId, model.isLightweight)
      
      // 创建临时URL用于CAD-Viewer
      const blob = new Blob([response], { type: 'application/octet-stream' })
      modelFile.value = URL.createObjectURL(blob)
      
      // 加载该模型下的预埋件
      await getEmbeddedParts(selectedProjectId.value, selectedFloorId.value)
    }
  } catch (error) {
    console.error('获取模型文件失败:', error)
    ElMessage.error('获取模型文件失败')
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
}

const handleStatusFilterChange = () => {
  // 筛选状态变化时自动更新列表
}

const handleFileUpload = (uploadFile) => {
  if (uploadFile.raw && isValidFile(uploadFile.raw)) {
    uploadForm.file = uploadFile.raw
  }
}

const isValidFile = (file) => {
  const validExtensions = ['.dwg', '.dxf', '.ifc', '.rvt', '.nwd', '.3ds', '.obj', '.stp', '.step']
  const fileName = file.name.toLowerCase()
  return validExtensions.some(ext => fileName.endsWith(ext))
}

const submitUpload = async () => {
  try {
    if (!uploadForm.projectId || !uploadForm.floorId || !uploadForm.name || !uploadForm.file) {
      ElMessage.error('请填写完整信息')
      return
    }

    const formData = new FormData()
    formData.append('projectId', uploadForm.projectId)
    formData.append('floorId', uploadForm.floorId)
    formData.append('name', uploadForm.name)
    formData.append('file', uploadForm.file)

    await api.bimModel.uploadBIMModel(formData)
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    
    // 重置表单
    uploadForm.projectId = ''
    uploadForm.floorId = ''
    uploadForm.name = ''
    uploadForm.file = null
    
    // 更新模型列表
    await getModels(selectedProjectId.value)
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  }
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
  if (enableCoordinateSync && currentView !== '2d') {
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
        if (enableCoordinateSync && bimViewerRef.value) {
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
  if (enableCoordinateSync && bimViewerRef.value) {
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

// 加载3D BIM模型
const loadBimModel = () => {
  if (!selectedModel.value || !bimViewerRef.value) return
  
  console.log('加载3D BIM模型:', selectedModel.value.name)
  isBimModelLoaded.value = false
  
  // 模拟3D模型加载过程
  setTimeout(() => {
    console.log('3D BIM模型加载完成')
    isBimModelLoaded.value = true
    
    // 实际项目中，这里应该使用Three.js或其他3D库加载BIM模型
    // 例如：
    // const scene = new THREE.Scene()
    // const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
    // const renderer = new THREE.WebGLRenderer()
    // // ... 加载模型并渲染 ...
  }, 2000)
}

// 在3D BIM视图中高亮预埋件
const highlightInBimViewer = (embeddedPart) => {
  if (!bimViewerRef.value) return
  
  console.log('在3D视图中高亮:', embeddedPart.name)
  // 实际项目中，这里应该使用3D库的API来高亮指定的预埋件
  // 例如，在Three.js中可以通过修改材质颜色或添加发光效果来实现高亮
}

const uploadNewModel = () => {
  if (!selectedProjectId.value) {
    ElMessage.error('请先选择项目')
    return
  }
  
  uploadForm.projectId = selectedProjectId.value
  uploadForm.floorId = selectedFloorId.value || ''
  uploadDialogVisible.value = true
}
</script>

<style scoped>
.bim-visualization {
  padding: 20px;
  display: grid;
  grid-template-areas:
    "header header"
    "control model"
    "parts model";
  grid-template-columns: 300px 1fr;
  grid-template-rows: auto auto 1fr;
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

.project-select {
  width: 200px;
}

.control-panel {
  grid-area: control;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.control-section {
  margin-bottom: 20px;
}

.control-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
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
}

.view-switcher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
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
  background-color: #000;
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
  height: calc(100vh - 300px);
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

@media (max-width: 1200px) {
  .bim-visualization {
    grid-template-areas:
      "header"
      "control"
      "model"
      "parts";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto;
    padding: 10px;
    height: calc(100vh - 20px);
  }
  
  .control-panel {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px;
  }
  
  .control-section {
    flex: 1 1 calc(50% - 5px);
    margin-bottom: 10px;
  }
  
  .floor-controls, .view-controls {
    flex-direction: column;
    gap: 5px;
  }
  
  .model-container {
    height: calc(100vh - 300px);
  }
  
  .embedded-parts-panel {
    height: 250px;
  }
}

@media (max-width: 768px) {
  .bim-visualization {
    grid-template-rows: auto auto auto auto;
    height: auto;
    min-height: 100vh;
    padding: 5px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 0 10px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
  }
  
  .project-select {
    width: 100%;
  }
  
  .control-panel {
    flex-direction: column;
    padding: 0 10px;
  }
  
  .control-section {
    flex: 1 1 100%;
  }
  
  .model-container {
    height: 350px;
    margin: 0 5px;
  }
  
  .view-switcher {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .sync-checkbox {
    margin-left: 0 !important;
  }
  
  .embedded-parts-panel {
    height: 250px;
    margin: 0 5px;
  }
  
  .panel-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .search-input {
    width: 100%;
  }
  
  .embedded-part-item {
    padding: 8px;
  }
  
  .item-info {
    font-size: 12px;
  }
}

/* 小屏幕移动端适配 */
@media (max-width: 480px) {
  .bim-visualization {
    padding: 0;
  }
  
  .page-header {
    padding: 5px;
  }
  
  .control-panel {
    padding: 5px;
  }
  
  .control-section {
    padding: 8px;
  }
  
  .model-container {
    height: 300px;
    margin: 0;
  }
  
  .view-controls button {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .control-section h3 {
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .embedded-parts-panel {
    height: 200px;
    margin: 0;
  }
  
  .embedded-part-item {
    flex-direction: column;
    gap: 5px;
    padding: 8px;
  }
  
  .item-info {
    font-size: 11px;
  }
  
  .page-header .el-button {
    width: 100%;
  }
}
</style>
