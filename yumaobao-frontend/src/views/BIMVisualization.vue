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
          style="margin-top: 8px"
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
      <!-- CAD查看器 -->
      <div class="cad-viewer-wrapper" v-if="selectedModel">
        <MlCadViewer
          ref="cadViewerRef"
          locale="zh"
          :local-file="modelFile"
          :base-url="'http://localhost:3000/uploads/'"
          :useMainThreadDraw="false"
          @loaded="onViewerLoaded"
          @click="onViewerClick"
        />
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
            accept=".dwg,.dxf"
            :show-file-list="true"
          >
            <el-icon class="el-icon--upload" size="64">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              <p>拖放文件到此处，或 <em>点击选择文件</em></p>
            </div>
            <template #tip>
              <div class="el-upload__tip">支持的格式: DWG, DXF</div>
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
import { ElMessage } from 'element-plus'
import { Document, UploadFilled, Refresh, FullScreen, Grid, Collection } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'

// 组件引用
const cadViewerRef = ref(null)

// 状态管理
const selectedProjectId = ref('')
const selectedFloorId = ref('')
const selectedModelId = ref('')
const selectedStatuses = ref(['pending', 'installed', 'inspected', 'completed'])
const showGrid = ref(true)
const embeddedPartSearch = ref('')

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
    projects.value = response
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  }
}

const getFloors = async (projectId) => {
  try {
    const response = await api.floor.getFloors({ projectId })
    floors.value = response
  } catch (error) {
    console.error('获取楼层列表失败:', error)
    ElMessage.error('获取楼层列表失败')
  }
}

const getModels = async (projectId) => {
  try {
    const response = await api.bimModel.getBIMModels({ projectId })
    models.value = response
  } catch (error) {
    console.error('获取模型列表失败:', error)
    ElMessage.error('获取模型列表失败')
  }
}

const getEmbeddedParts = async (projectId, floorId = '') => {
  try {
    const params = { projectId }
    if (floorId) params.floorId = floorId
    const response = await api.embeddedPart.getEmbeddedParts(params)
    embeddedParts.value = response
  } catch (error) {
    console.error('获取预埋件列表失败:', error)
    ElMessage.error('获取预埋件列表失败')
  }
}

const getModelFile = async (modelId) => {
  try {
    const model = models.value.find(m => m.id === modelId)
    if (model) {
      selectedModel.value = model
      selectedEmbeddedPart.value = null
      
      // 从服务器加载模型文件
      const response = await api.bimModel.downloadBIMModel(modelId)
      
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
  const validExtensions = ['.dwg', '.dxf']
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
}

const onViewerClick = (event) => {
  console.log('Viewer clicked:', event)
  // 处理点击事件，例如高亮选中的预埋件
  
  // 模拟点击模型中的预埋件
  const clickedEmbeddedPart = embeddedParts.value.find(ep => Math.random() > 0.7)
  if (clickedEmbeddedPart) {
    selectedEmbeddedPart.value = clickedEmbeddedPart
    highlightEmbeddedPart(clickedEmbeddedPart)
  }
}

const highlightEmbeddedPart = (embeddedPart) => {
  console.log('Highlight embedded part:', embeddedPart)
  ElMessage.info(`已定位到预埋件: ${embeddedPart.name}`)
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
}

.cad-viewer-wrapper {
  width: 100%;
  height: 100%;
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
  }
  
  .control-panel {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .embedded-parts-panel {
    height: 300px;
  }
}
</style>
