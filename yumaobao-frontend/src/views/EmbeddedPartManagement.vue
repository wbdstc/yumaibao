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
        <el-button type="info" icon="Document" @click="downloadSampleTemplate">
          下载示例模板
        </el-button>
        <el-button type="success" icon="Plus" @click="showAddDialog">
          新增预埋件
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="项目">
          <el-select 
            v-model="searchForm.projectId" 
            placeholder="选择项目" 
            @change="getFloors(searchForm.projectId)"
            :disabled="isRestrictedUser"
          >
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

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import * as XLSX from 'xlsx'
import { useUserStore } from '../stores/index.js'

export default {
  name: 'EmbeddedPartManagement',
  setup() {
    // 数据
    const userStore = useUserStore()
    const embeddedParts = ref([])
    const projects = ref([])
    const floors = ref([])
    const loading = ref(false)

    // 判断用户是否是安装人员或质检人员
    const isRestrictedUser = computed(() => {
      const role = userStore.userRole
      return role === 'installer' || role === 'qualityInspector'
    })

    // 获取用户可访问的项目ID数组
    const userProjects = computed(() => {
      return userStore.userInfo?.projects || []
    })

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
          searchForm.projectId = projects.value[0].id
          await getFloors(searchForm.projectId)
          await searchEmbeddedParts()
        }
      } catch (error) {
        console.error('获取项目列表失败:', error)
        ElMessage.error('获取项目列表失败')
      }
    }

    // 获取楼层列表
    const getFloors = async (projectId) => {
      try {
        // 如果没有项目ID，清空楼层列表
        if (!projectId) {
          floors.value = []
          return
        }
        const response = await api.floor.getFloors(projectId) // 直接传入projectId，不是对象
        floors.value = response
      } catch (error) {
        console.error('获取楼层列表失败:', error)
        ElMessage.error('获取楼层列表失败')
        floors.value = [] // 发生错误时确保floors是数组
      }
    }

    // 搜索预埋件
    const searchEmbeddedParts = async () => {
      try {
        loading.value = true
        const response = await api.embeddedPart.getEmbeddedParts(searchForm)
        embeddedParts.value = response
        pagination.total = response.length
      } catch (error) {
        console.error('获取预埋件列表失败:', error)
        ElMessage.error('获取预埋件列表失败')
      } finally {
        loading.value = false
      }
    }

    // 重置搜索
    const resetSearch = () => {
      searchForm.projectId = ''
      searchForm.floorId = ''
      searchForm.status = ''
      searchForm.keyword = ''
      floors.value = []
    }

    // 显示新增对话框
    const showAddDialog = () => {
      isEdit.value = false
      embeddedPartForm.value = {
        id: '',
        projectId: searchForm.projectId,
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
      try {
        await embeddedPartFormRef.value.validate()
        
        if (isEdit.value) {
          await api.embeddedPart.updateEmbeddedPart(embeddedPartForm.value.id, embeddedPartForm.value)
          ElMessage.success('更新成功')
        } else {
          await api.embeddedPart.createEmbeddedPart(embeddedPartForm.value)
          ElMessage.success('新增成功')
        }
        
        dialogVisible.value = false
        searchEmbeddedParts()
      } catch (error) {
        console.error('保存预埋件失败:', error)
        if (error !== false) { // 如果不是表单验证失败
          ElMessage.error(isEdit.value ? '更新失败' : '新增失败')
        }
      }
    }

    // 删除预埋件
    const deleteEmbeddedPart = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这个预埋件吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await api.embeddedPart.deleteEmbeddedPart(id)
        ElMessage.success('删除成功')
        searchEmbeddedParts()
      } catch (error) {
        if (error !== 'cancel') { // 如果不是用户取消
          console.error('删除预埋件失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }

    // 生成二维码
    const generateQRCode = async (row) => {
      try {
        selectedEmbeddedPart.value = row
        const response = await api.embeddedPart.generateQRCode(row.id)
        qrcodeUrl.value = response.qrcodeUrl
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
      link.download = `${selectedEmbeddedPart.value.name}_${selectedEmbeddedPart.value.code}.png`
      link.click()
    }

    // 处理Excel上传
    const handleExcelUpload = (file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          // 批量导入逻辑
          batchImportEmbeddedParts(jsonData)
        } catch (error) {
          console.error('解析Excel失败:', error)
          ElMessage.error('解析Excel失败')
        }
      }
      reader.readAsArrayBuffer(file.raw)
    }

    // 批量导入预埋件
    const batchImportEmbeddedParts = async (data) => {
      try {
        loading.value = true
        await api.embeddedPart.batchCreateEmbeddedParts(data)
        ElMessage.success('批量导入成功')
        searchEmbeddedParts()
      } catch (error) {
        console.error('批量导入失败:', error)
        ElMessage.error('批量导入失败')
      } finally {
        loading.value = false
      }
    }

    // 下载示例模板
    const downloadSampleTemplate = () => {
      const templateData = [
        {
          name: '预埋件1',
          code: 'EP001',
          modelNumber: 'M10',
          type: '锚栓',
          location: '一层A区',
          status: 'pending',
          notes: '示例说明'
        }
      ]
      
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '预埋件模板')
      XLSX.writeFile(workbook, '预埋件导入模板.xlsx')
    }

    // 页面加载时初始化数据
    onMounted(() => {
      getProjects()
      // 暂时不获取楼层，等待用户选择项目后再获取
      // getFloors()
      searchEmbeddedParts()
    })

    // 返回组件属性
    return {
      embeddedParts,
      projects,
      floors,
      loading,
      searchForm,
      pagination,
      embeddedPartForm,
      dialogVisible,
      isEdit,
      embeddedPartFormRef,
      qrcodeDialogVisible,
      qrcodeUrl,
      selectedEmbeddedPart,
      formRules,
      isRestrictedUser,
      userProjects,
      // 方法
      getProjects,
      getFloors,
      searchEmbeddedParts,
      resetSearch,
      showAddDialog,
      showEditDialog,
      showDeleteConfirm: showEditDialog, // 占位符，实际应该是删除确认
      saveEmbeddedPart,
      deleteEmbeddedPart,
      generateQRCode,
      downloadQRCode,
      handleExcelUpload,
      downloadSampleTemplate
    }
  }
}
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