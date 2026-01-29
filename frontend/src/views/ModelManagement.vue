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
      @close="resetUploadProgress"
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
        <!-- 上传进度显示 -->
        <el-form-item v-if="uploadProgress.show" :label="uploadProgress.type === 'conversion' ? '转换进度' : '上传进度'">
          <div class="upload-progress">
            <el-progress 
              :percentage="uploadProgress.percentage" 
              :status="uploadProgress.status"
              :color="uploadProgress.status === 'exception' ? '#f56c6c' : undefined"
            />
            <p class="upload-status">{{ uploadProgress.message }}</p>
            <!-- IFC转换详细信息显示 -->
            <div v-if="uploadProgress.type === 'conversion' && uploadProgress.details" class="conversion-details">
              <el-collapse>
                <el-collapse-item title="转换详情" name="1">
                  <div class="detail-item">
                    <span class="detail-label">原始大小:</span>
                    <span class="detail-value">{{ formatFileSize(uploadProgress.details.originalSize) }}</span>
                  </div>
                  <div class="detail-item" v-if="uploadProgress.details.convertedSize">
                    <span class="detail-label">转换后大小:</span>
                    <span class="detail-value">{{ formatFileSize(uploadProgress.details.convertedSize) }}</span>
                  </div>
                  <div class="detail-item" v-if="uploadProgress.details.sizeReduction">
                    <span class="detail-label">大小减少:</span>
                    <span class="detail-value">{{ uploadProgress.details.sizeReduction }}%</span>
                  </div>
                  <div class="detail-item" v-if="uploadProgress.details.conversionTime">
                    <span class="detail-label">转换耗时:</span>
                    <span class="detail-value">{{ Math.round(uploadProgress.details.conversionTime / 1000) }}秒</span>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-form-item>

        <!-- 错误建议显示 -->
        <el-form-item v-if="uploadProgress.errorSuggestions && uploadProgress.errorSuggestions.length > 0" label="解决建议">
          <div class="error-suggestions">
            <el-alert
              v-for="(suggestion, index) in uploadProgress.errorSuggestions"
              :key="index"
              :title="suggestion"
              type="warning"
              :closable="false"
              show-icon
              class="suggestion-item"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelUpload">取消</el-button>
          <el-button type="primary" @click="submitUpload" :loading="uploadProgress.show && uploadProgress.status !== 'exception'">
            {{ uploadProgress.show ? '上传中...' : '上传' }}
          </el-button>
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

// 格式化文件大小显示
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生成错误建议
function generateErrorSuggestions(errorMessage) {
  const suggestions = []
  
  if (!errorMessage) {
    return ['请检查网络连接后重试', '确保文件格式正确', '联系系统管理员获取帮助']
  }
  
  const lowerMessage = errorMessage.toLowerCase()
  
  // 网络相关错误
  if (lowerMessage.includes('timeout') || lowerMessage.includes('超时')) {
    suggestions.push('网络连接超时，请检查网络连接后重试')
    suggestions.push('文件过大，建议使用更稳定的网络环境')
  }
  
  // 文件格式相关错误
  if (lowerMessage.includes('format') || lowerMessage.includes('格式') || lowerMessage.includes('不支持')) {
    suggestions.push('请确保文件格式为支持的类型（DWG, DXF, IFC, RVT, NWD等）')
    suggestions.push('检查文件是否损坏，尝试重新保存文件')
  }
  
  // IFC转换相关错误
  if (lowerMessage.includes('ifc') || lowerMessage.includes('转换') || lowerMessage.includes('conversion')) {
    suggestions.push('IFC文件转换失败，请检查文件是否完整')
    suggestions.push('尝试使用更小的IFC文件或简化模型结构')
    suggestions.push('确保IFC文件符合标准格式要求')
  }
  
  // 文件大小相关错误
  if (lowerMessage.includes('large') || lowerMessage.includes('大') || lowerMessage.includes('size')) {
    suggestions.push('文件过大，建议压缩后重试')
    suggestions.push('考虑使用轻量级版本或简化模型')
  }
  
  // 权限相关错误
  if (lowerMessage.includes('permission') || lowerMessage.includes('权限') || lowerMessage.includes('unauthorized')) {
    suggestions.push('您可能没有上传权限，请联系管理员')
    suggestions.push('请确认您已正确登录系统')
  }
  
  // 服务器错误
  if (lowerMessage.includes('server') || lowerMessage.includes('服务器') || lowerMessage.includes('internal')) {
    suggestions.push('服务器暂时不可用，请稍后重试')
    suggestions.push('联系系统管理员检查服务器状态')
  }
  
  // 如果没有匹配到特定建议，提供通用建议
  if (suggestions.length === 0) {
    suggestions.push('请检查文件格式是否正确')
    suggestions.push('确保网络连接稳定')
    suggestions.push('尝试重新上传文件')
    suggestions.push('如问题持续存在，请联系技术支持')
  }
  
  return suggestions.slice(0, 3) // 最多返回3个建议
}

// 数据
const selectedProjectId = ref('')
const modelSearch = ref('')
const projects = ref([])
const floors = ref([])
const models = ref([])
const uploadDialogVisible = ref(false)
const editDialogVisible = ref(false)

// 上传进度相关数据
const uploadProgress = ref({
  show: false,
  percentage: 0,
  status: '', // '', 'success', 'exception'
  message: ''
})

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

// 上传重试次数配置
const MAX_RETRY_COUNT = 3

// 重置上传进度
function resetUploadProgress() {
  uploadProgress.value = {
    show: false,
    percentage: 0,
    status: '',
    message: ''
  }
}

// 取消上传
function cancelUpload() {
  resetUploadProgress()
  uploadDialogVisible.value = false
  // 重置表单
  uploadForm.value = {
    projectId: '',
    floorId: '',
    name: '',
    file: null
  }
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

  // 初始化进度显示
  uploadProgress.value = {
    show: true,
    percentage: 0,
    status: '',
    message: '准备上传...'
  }

  // 创建FormData对象
  const formData = new FormData()
  formData.append('projectId', uploadForm.value.projectId)
  formData.append('floorId', uploadForm.value.floorId)
  formData.append('name', uploadForm.value.name)
  formData.append('file', uploadForm.value.file)

  let retryCount = 0
  
  while (retryCount <= MAX_RETRY_COUNT) {
    try {
      uploadProgress.value.message = retryCount > 0 ? `重试中... (${retryCount}/${MAX_RETRY_COUNT})` : '上传中...'
      
      // 创建进度回调函数
      const onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          uploadProgress.value.percentage = Math.min(progress, 99) // 上传完成时由响应处理
          uploadProgress.value.message = `上传中... ${progress}%`
        }
      }
      
      const response = await uploadModel(formData, onUploadProgress)
      
      // 检查是否有转换详情
      if (response.data?.data?.conversionResult) {
        const conversionResult = response.data.data.conversionResult
        if (conversionResult.success && conversionResult.convertedModel) {
          // 这是IFC转换成功的情况
          uploadProgress.value.percentage = 100
          uploadProgress.value.status = 'success'
          uploadProgress.value.message = 'IFC模型转换成功!'
          uploadProgress.value.type = 'conversion'
          uploadProgress.value.details = {
            originalSize: conversionResult.convertedModel.fileSize || 0,
            convertedSize: conversionResult.convertedModel.fileSize || 0,
            sizeReduction: 0, // 如果有原始大小可以计算减少比例
            conversionTime: 0 // 如果有转换时间可以显示
          }
        } else {
          // IFC转换失败
          uploadProgress.value.status = 'exception'
          uploadProgress.value.message = `转换失败: ${conversionResult.message || '未知错误'}`
          uploadProgress.value.errorSuggestions = generateErrorSuggestions(conversionResult.message || '转换失败')
        }
      } else {
        // 普通文件上传成功
        uploadProgress.value.percentage = 100
        uploadProgress.value.status = 'success'
        uploadProgress.value.message = '上传完成!'
      }
      
      // 延迟一下再关闭，显示完成状态
      setTimeout(() => {
        uploadDialogVisible.value = false
        // 重置进度
        uploadProgress.value = {
          show: false,
          percentage: 0,
          status: '',
          message: ''
        }
      }, 1000)
      
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
      
      return // 成功上传，退出循环
      
    } catch (error) {
      retryCount++
      
      console.error(`模型上传失败 (尝试 ${retryCount}/${MAX_RETRY_COUNT + 1}):`, error)
      
      // 如果是最后一次尝试
      if (retryCount > MAX_RETRY_COUNT) {
        uploadProgress.value.status = 'exception'
        uploadProgress.value.percentage = 0
        uploadProgress.value.message = `上传失败: ${error.message || '未知错误'}`
        
        let errorMsg = '模型上传失败'
        if (error.message) {
          errorMsg = `模型上传失败: ${error.message}`
        } else if (error.response?.data?.message) {
          errorMsg = `模型上传失败: ${error.response.data.message}`
        }
        
        ElMessage.error({ 
          message: errorMsg, 
          duration: 5000 
        })
        break
      } else {
        // 等待一段时间后重试
        uploadProgress.value.message = `上传失败，${retryCount}秒后重试...`
        await new Promise(resolve => setTimeout(resolve, retryCount * 1000))
      }
    }
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

/* 上传进度样式 */
.upload-progress {
  width: 100%;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.upload-progress .el-progress {
  margin-bottom: 8px;
}

.upload-progress .upload-status {
  margin: 0;
  font-size: 14px;
  color: #606266;
  text-align: center;
}

/* 上传按钮状态 */
.dialog-footer .el-button.is-loading {
  pointer-events: none;
}

/* 转换详情样式 */
.conversion-details {
  margin-top: 12px;
  border-radius: 6px;
  overflow: hidden;
}

.conversion-details .el-collapse {
  border: none;
}

.conversion-details .el-collapse-item__header {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  font-weight: 600;
  color: #495057;
}

.conversion-details .el-collapse-item__content {
  padding: 12px 16px;
  background-color: #ffffff;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.detail-value {
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

/* 错误建议样式 */
.error-suggestions {
  margin-top: 12px;
}

.suggestion-item {
  margin-bottom: 8px;
  border-radius: 6px;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}
</style>