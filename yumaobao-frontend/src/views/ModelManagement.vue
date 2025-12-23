<template>
  <div class="model-management">
    <div class="page-header">
      <div class="header-left">
        <h2>模型管理</h2>
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
        <el-button type="primary" @click="uploadNewModel">
          <el-icon><Upload /></el-icon>
          上传模型
        </el-button>
      </div>
    </div>

    <el-card class="model-list-card">
      <template #header>
        <div class="card-header">
          <h3>模型列表</h3>
          <el-input
            v-model="modelSearch"
            placeholder="搜索模型"
            clearable
            size="small"
            style="width: 200px;"
          />
        </div>
      </template>

      <el-table :data="filteredModels" style="width: 100%" stripe>
        <el-table-column prop="name" label="模型名称" min-width="180" />
        <el-table-column prop="projectName" label="所属项目" min-width="150" />
        <el-table-column prop="floorName" label="所属楼层" min-width="120" />
        <el-table-column prop="fileType" label="文件类型" width="100" />
        <el-table-column prop="uploadTime" label="上传时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag
              :type="scope.row.status === 'active' ? 'success' : 'warning'"
            >
              {{ scope.row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="editModel(scope.row)"
              style="margin-right: 5px;"
            >
              编辑
            </el-button>

            <el-button
              type="danger"
              size="small"
              @click="deleteModel(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 模型上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传BIM模型"
      width="50%"
    >
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="项目">
          <el-select v-model="uploadForm.projectId" placeholder="选择项目">
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

    <!-- 模型编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑模型"
      width="50%"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="模型名称">
          <el-input v-model="editForm.name" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="editForm.floorId" placeholder="选择楼层">
            <el-option
              v-for="floor in floors"
              :key="floor.id"
              :label="floor.name"
              :value="floor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" placeholder="选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEdit">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Upload, UploadFilled, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api/index'
// 从api对象中解构所需的API方法
const { getProjects } = api.project
const { getBIMModels: getModels, uploadBIMModel: uploadModel, updateBIMModel: updateModel, deleteBIMModel: deleteModelApi, convertIFCModel: convertIFCModelApi } = api.bimModel

// 数据
const selectedProjectId = ref('')
const modelSearch = ref('')
const projects = ref([])
const floors = ref([])
const models = ref([])
const uploadDialogVisible = ref(false)
const editDialogVisible = ref(false)

// 表单数据
const uploadForm = ref({
  projectId: '',
  floorId: '',
  name: '',
  file: null
})

const editForm = ref({
  id: '',
  name: '',
  floorId: '',
  status: 'active'
})

// 计算属性
const filteredModels = computed(() => {
  return models.value.filter(model => {
    const matchesProject = !selectedProjectId.value || model.projectId === selectedProjectId.value
    const matchesSearch = !modelSearch.value || model.name.toLowerCase().includes(modelSearch.value.toLowerCase())
    return matchesProject && matchesSearch
  })
})

// 生命周期
onMounted(async () => {
  await loadProjects()
})

// 方法
async function loadProjects() {
  try {
    const response = await getProjects()
    projects.value = response
    if (projects.value.length > 0) {
      selectedProjectId.value = projects.value[0].id
      await loadModels()
      await loadFloors(selectedProjectId.value)
    }
  } catch (error) {
    ElMessage.error('加载项目失败: ' + error.message)
  }
}

async function loadFloors(projectId) {
  try {
    // 调用实际API获取楼层数据
    const response = await api.floor.getFloors(projectId)
    floors.value = response
  } catch (error) {
    ElMessage.error('加载楼层失败: ' + error.message)
  }
}

async function loadModels() {
  try {
    const response = await getModels({ projectId: selectedProjectId.value })
    models.value = response
  } catch (error) {
    ElMessage.error('加载模型失败: ' + error.message)
  }
}

function handleProjectChange(value) {
  selectedProjectId.value = value
  loadModels()
  loadFloors(value)
}

function uploadNewModel() {
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  uploadForm.value.projectId = selectedProjectId.value
  uploadForm.value.floorId = ''
  uploadForm.value.name = ''
  uploadForm.value.file = null
  uploadDialogVisible.value = true
}

function handleFileUpload(file) {
  uploadForm.value.file = file.raw
}

async function submitUpload() {
  if (!uploadForm.value.name) {
    ElMessage.warning({ message: '请输入模型名称', duration: 3000 })
    return
  }
  if (!uploadForm.value.floorId) {
    ElMessage.warning({ message: '请选择楼层', duration: 3000 })
    return
  }
  if (!uploadForm.value.file) {
    ElMessage.warning({ message: '请选择模型文件', duration: 3000 })
    return
  }

  try {
    // 创建FormData对象
    const formData = new FormData()
    formData.append('projectId', uploadForm.value.projectId)
    formData.append('floorId', uploadForm.value.floorId)
    formData.append('name', uploadForm.value.name)
    formData.append('file', uploadForm.value.file)

    await uploadModel(formData)
    
    // 上传成功，更新模型列表
    await loadModels()
    
    // 显示上传成功消息
    ElMessage.success({ 
      message: '模型上传成功', 
      duration: 3000 
    })
    
    // 使用localStorage触发其他页面的自动刷新
    localStorage.setItem('modelUploaded', JSON.stringify({ 
      projectId: uploadForm.value.projectId, 
      timestamp: Date.now() 
    }))
    
    uploadDialogVisible.value = false
  } catch (error) {
    console.error('模型上传失败:', error)
    let errorMsg = '模型上传失败'
    if (error.message) {
      errorMsg = `模型上传失败: ${error.message}`
    } else if (error.response?.data?.message) {
      errorMsg = `模型上传失败: ${error.response.data.message}`
    }
    ElMessage.error({ 
      message: errorMsg, 
      duration: 3000 
    })
  }
}

function editModel(model) {
  editForm.value.id = model.id
  editForm.value.name = model.name
  editForm.value.floorId = model.floorId
  editForm.value.status = model.status
  editDialogVisible.value = true
}

async function submitEdit() {
  if (!editForm.value.name) {
    ElMessage.warning({ message: '请输入模型名称', duration: 3000 })
    return
  }
  if (!editForm.value.floorId) {
    ElMessage.warning({ message: '请选择楼层', duration: 3000 })
    return
  }

  try {
    const model = models.value.find(m => m.id === editForm.value.id)
    await updateModel(editForm.value.id, editForm.value)
    
    // 更新成功，刷新模型列表
    await loadModels()
    
    // 使用localStorage触发其他页面的自动刷新
    if (model) {
      localStorage.setItem('modelUpdated', JSON.stringify({ 
        projectId: model.projectId, 
        timestamp: Date.now() 
      }))
      // 立即移除，避免重复触发
      setTimeout(() => {
        localStorage.removeItem('modelUpdated')
      }, 100)
    }
    
    ElMessage.success({ 
      message: '模型更新成功', 
      duration: 3000 
    })
    editDialogVisible.value = false
  } catch (error) {
    console.error('模型更新失败:', error)
    let errorMsg = '模型更新失败'
    if (error.message) {
      errorMsg = `模型更新失败: ${error.message}`
    } else if (error.response?.data?.message) {
      errorMsg = `模型更新失败: ${error.response.data.message}`
    }
    ElMessage.error({ 
      message: errorMsg, 
      duration: 3000 
    })
  }
}

async function deleteModel(model) {
  try {
    await deleteModelApi(model.id)
    
    // 删除成功，刷新模型列表
    await loadModels()
    
    // 使用localStorage触发其他页面的自动刷新
    localStorage.setItem('modelDeleted', JSON.stringify({ 
      projectId: model.projectId, 
      timestamp: Date.now() 
    }))
    // 立即移除，避免重复触发
    setTimeout(() => {
      localStorage.removeItem('modelDeleted')
    }, 100)
    
    ElMessage.success({ 
      message: '模型删除成功', 
      duration: 3000 
    })
  } catch (error) {
    console.error('模型删除失败:', error)
    let errorMsg = '模型删除失败'
    if (error.message) {
      errorMsg = `模型删除失败: ${error.message}`
    } else if (error.response?.data?.message) {
      errorMsg = `模型删除失败: ${error.response.data.message}`
    }
    ElMessage.error({ 
      message: errorMsg, 
      duration: 3000 
    })
  }
}


</script>

<style scoped>
.model-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  color: var(--construction-blue);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.project-select {
  width: 200px;
}

.model-list-card {
  margin-bottom: 20px;
  color: var(--construction-blue);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 确保表格文字颜色正常显示 */
:deep(.el-table) {
  color: var(--construction-blue);
}

:deep(.el-table__header-wrapper th) {
  color: var(--construction-blue);
}

:deep(.el-table__body-wrapper td) {
  color: var(--construction-blue);
}

/* 确保输入框文字颜色正常显示 */
:deep(.el-input__inner) {
  color: var(--construction-blue);
}

/* 确保选择器文字颜色正常显示 */
:deep(.el-select__wrapper) {
  color: var(--construction-blue);
}
</style>