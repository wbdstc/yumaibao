<template>
  <div class="embedded-part-management">
    <div class="page-header">
      <h2>预埋件管理</h2>
      <div class="header-actions">
        <el-upload
          class="upload-excel"
          action=""
          :auto-upload="false"
          :on-change="handleExcelUpload"
          accept=".xlsx,.xls"
          :show-file-list="false"
        >
          <el-button type="primary" icon="Upload">
            批量导入
          </el-button>
        </el-upload>
        <el-button type="success" icon="Plus" @click="showAddDialog">
          新增预埋件
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="项目">
          <el-select v-model="searchForm.projectId" placeholder="选择项目">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="searchForm.floorId" placeholder="选择楼层">
            <el-option
              v-for="floor in floors"
              :key="floor.id"
              :label="floor.name"
              :value="floor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态">
            <el-option label="待安装" value="pending" />
            <el-option label="已安装" value="installed" />
            <el-option label="已验收" value="inspected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索名称/编号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchEmbeddedParts">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预埋件列表 -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="embeddedParts" stripe>
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="code" label="编号" width="150" />
        <el-table-column prop="modelNumber" label="型号" width="150" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="projectId" label="项目" width="150" />
        <el-table-column prop="floorId" label="楼层" width="120" />
        <el-table-column prop="location" label="位置" width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag
              :type="
                scope.row.status === 'pending' ? 'info' :
                scope.row.status === 'installed' ? 'success' :
                scope.row.status === 'inspected' ? 'warning' : 'success'
              "
            >
              {{ scope.row.status === 'pending' ? '待安装' :
                scope.row.status === 'installed' ? '已安装' :
                scope.row.status === 'inspected' ? '已验收' : '已完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="showEditDialog(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">
              删除
            </el-button>
            <el-button type="info" size="small" @click="generateQRCode(scope.row)">
              生成二维码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑预埋件' : '新增预埋件'"
      width="50%"
    >
      <el-form
        ref="embeddedPartForm"
        :model="embeddedPartForm"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="项目" prop="projectId">
          <el-select v-model="embeddedPartForm.projectId" placeholder="选择项目">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层" prop="floorId">
          <el-select v-model="embeddedPartForm.floorId" placeholder="选择楼层">
            <el-option
              v-for="floor in floors"
              :key="floor.id"
              :label="floor.name"
              :value="floor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="embeddedPartForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="编号" prop="code">
          <el-input v-model="embeddedPartForm.code" placeholder="请输入编号" />
        </el-form-item>
        <el-form-item label="型号" prop="modelNumber">
          <el-input v-model="embeddedPartForm.modelNumber" placeholder="请输入型号" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-input v-model="embeddedPartForm.type" placeholder="请输入类型" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="embeddedPartForm.location" placeholder="请输入位置" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="embeddedPartForm.status" placeholder="选择状态">
            <el-option label="待安装" value="pending" />
            <el-option label="已安装" value="installed" />
            <el-option label="已验收" value="inspected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="embeddedPartForm.notes"
            type="textarea"
            placeholder="请输入备注信息"
            rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEmbeddedPart">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 二维码预览对话框 -->
    <el-dialog
      v-model="qrcodeDialogVisible"
      title="二维码预览"
      width="30%"
    >
      <div class="qrcode-container" v-if="qrcodeUrl">
        <img :src="qrcodeUrl" alt="预埋件二维码" class="qrcode-img" />
        <div class="qrcode-info">
          <p>{{ selectedEmbeddedPart.name }}</p>
          <p>编号：{{ selectedEmbeddedPart.code }}</p>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="qrcodeDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="downloadQRCode">下载</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import * as XLSX from 'xlsx'

// 数据
const embeddedParts = ref([])
const projects = ref([])
const floors = ref([])
const loading = ref(false)

// 搜索和分页
const searchForm = reactive({
  projectId: '',
  floorId: '',
  status: '',
  keyword: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 表单
const embeddedPartForm = ref({
  id: '',
  projectId: '',
  floorId: '',
  name: '',
  code: '',
  modelNumber: '',
  type: '',
  location: '',
  status: 'pending',
  notes: ''
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const embeddedPartFormRef = ref(null)

// 二维码
const qrcodeDialogVisible = ref(false)
const qrcodeUrl = ref('')
const selectedEmbeddedPart = ref(null)

// 表单验证规则
const formRules = reactive({
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  floorId: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入编号', trigger: 'blur' }],
  modelNumber: [{ required: true, message: '请输入型号', trigger: 'blur' }],
  type: [{ required: true, message: '请输入类型', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
})

// 获取项目列表
const getProjects = async () => {
  try {
    const response = await api.project.getProjects()
    projects.value = response
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  }
}

// 获取楼层列表
const getFloors = async () => {
  try {
    const response = await api.floor.getFloors()
    floors.value = response
  } catch (error) {
    console.error('获取楼层列表失败:', error)
    ElMessage.error('获取楼层列表失败')
  }
}

// 获取预埋件列表
const searchEmbeddedParts = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    const response = await api.embeddedPart.getEmbeddedParts(params)
    embeddedParts.value = response.data
    pagination.total = response.total
  } catch (error) {
    console.error('获取预埋件列表失败:', error)
    ElMessage.error('获取预埋件列表失败')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    projectId: '',
    floorId: '',
    status: '',
    keyword: ''
  })
  searchEmbeddedParts()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  searchEmbeddedParts()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  searchEmbeddedParts()
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  embeddedPartForm.value = {
    id: '',
    projectId: '',
    floorId: '',
    name: '',
    code: '',
    modelNumber: '',
    type: '',
    location: '',
    status: 'pending',
    notes: ''
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (row) => {
  isEdit.value = true
  embeddedPartForm.value = { ...row }
  dialogVisible.value = true
}

// 保存预埋件
const saveEmbeddedPart = async () => {
  if (!embeddedPartFormRef.value) return
  await embeddedPartFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await api.embeddedPart.updateEmbeddedPart(embeddedPartForm.value.id, embeddedPartForm.value)
          ElMessage.success('编辑成功')
        } else {
          await api.embeddedPart.createEmbeddedPart(embeddedPartForm.value)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        searchEmbeddedParts()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error(isEdit.value ? '编辑失败' : '创建失败')
      }
    }
  })
}

// 删除预埋件
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个预埋件吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await api.embeddedPart.deleteEmbeddedPart(row.id)
    ElMessage.success('删除成功')
    searchEmbeddedParts()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

// 处理Excel上传
const handleExcelUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    
    // 处理上传的数据
    handleBatchImport(jsonData)
  }
  reader.readAsArrayBuffer(file.raw)
}

// 批量导入
const handleBatchImport = async (data) => {
  try {
    await api.embeddedPart.batchCreateEmbeddedParts(data)
    ElMessage.success('批量导入成功')
    searchEmbeddedParts()
  } catch (error) {
    console.error('批量导入失败:', error)
    ElMessage.error('批量导入失败')
  }
}

// 生成二维码
const generateQRCode = async (row) => {
  try {
    const response = await api.embeddedPart.generateQRCode(row.id)
    qrcodeUrl.value = response.qrCodeUrl
    selectedEmbeddedPart.value = row
    qrcodeDialogVisible.value = true
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  }
}

// 下载二维码
const downloadQRCode = () => {
  const link = document.createElement('a')
  link.href = qrcodeUrl.value
  link.download = `${selectedEmbeddedPart.value.name}-${selectedEmbeddedPart.value.code}-二维码.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 页面加载时初始化数据
onMounted(() => {
  getProjects()
  getFloors()
  searchEmbeddedParts()
})
</script>

<style scoped>
.embedded-part-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  margin-bottom: 20px;
}

.qrcode-info {
  text-align: center;
}

.dialog-footer {
  text-align: right;
}
</style>
