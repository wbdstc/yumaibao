<template>
  <div class="embedded-part-management">
    <div class="page-header">
      <div class="header-left">
        <h2>预埋件管理</h2>
        <div class="import-info" v-if="canImport">
          <el-tag type="success" size="small">
            当前导入项目：{{ projects.find(p => p.id === searchForm.projectId)?.name || '未知项目' }}
          </el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-upload
          class="upload-excel"
          action=""
          :auto-upload="false"
          :on-change="handleExcelUpload"
          accept=".xlsx,.xls"
          :show-file-list="false"
          :disabled="!canImport"
        >
          <el-button type="primary" icon="Upload" :disabled="!canImport">
            批量导入
          </el-button>
          <template #tip>
            <div class="el-upload__tip" v-if="!canImport">
              请先选择项目后导入
            </div>
          </template>
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
      <el-form :model="searchForm" label-width="80px">
        <div class="filter-row">
          <div class="filter-group">
            <el-form-item label="项目" class="filter-item">
              <el-select 
                v-model="searchForm.projectId" 
                placeholder="选择项目" 
                @change="getFloors(searchForm.projectId)"
                :disabled="isRestrictedUser"
                style="width: 100%"
              >
                <el-option
                  v-for="project in projects"
                  :key="project.id"
                  :label="project.name"
                  :value="project.id"
                />
              </el-select>
            </el-form-item>
          </div>
          <div class="filter-group">
            <el-form-item label="楼层" class="filter-item">
              <el-select 
                v-model="searchForm.floorId" 
                placeholder="选择楼层" 
                @change="handleFloorChange"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="floor in floors"
                  :key="floor.id"
                  :label="floor.name"
                  :value="floor.id"
                />
              </el-select>
            </el-form-item>
          </div>
          <div class="filter-group">
            <el-form-item label="状态" class="filter-item">
              <el-select 
                v-model="searchForm.status" 
                placeholder="选择状态" 
                @change="searchEmbeddedParts"
                clearable
                style="width: 100%"
              >
                <el-option label="待安装" value="pending" />
                <el-option label="已安装" value="installed" />
                <el-option label="已验收" value="inspected" />
                <el-option label="已完成" value="completed" />
              </el-select>
            </el-form-item>
          </div>
          <div class="filter-group search-group">
            <el-form-item label="搜索" class="filter-item">
              <el-input
                v-model="searchForm.keyword"
                placeholder="搜索名称/编号"
                clearable
                @keyup.enter="searchEmbeddedParts"
                style="width: 100%"
              >
                <template #append>
                  <el-button @click="searchEmbeddedParts" icon="Search" />
                </template>
              </el-input>
            </el-form-item>
          </div>
        </div>
        <div class="filter-actions">
          <el-button type="primary" @click="searchEmbeddedParts" size="large">搜索</el-button>
          <el-button @click="resetSearch" size="large">重置</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 数据表格卡片 -->
    <el-card class="table-card">
      <el-table
        :data="paginatedData"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无数据"
        :row-class-name="getRowClassName"
      >
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="code" label="编号" width="120" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="modelNumber" label="型号" width="100" />
        <el-table-column prop="location" label="位置" min-width="150" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="floorId" label="楼层" width="100">
          <template #default="scope">
            {{ getFloorName(scope.row.floorId) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button 
              size="small" 
              type="info" 
              @click="generateQRCode(scope.row)"
              v-if="canViewQRCode"
            >
              二维码
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="showEditDialog(scope.row)"
              v-if="canEdit"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteEmbeddedPart(scope.row.id)"
              v-if="canDelete"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination" v-if="pagination.total > 0">
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

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑预埋件' : '新增预埋件'"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="embeddedPartFormRef"
        :model="embeddedPartForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目" prop="projectId">
              <el-select 
                v-model="embeddedPartForm.projectId" 
                placeholder="选择项目"
                :disabled="isRestrictedUser"
                style="width: 100%"
              >
                <el-option
                  v-for="project in projects"
                  :key="project.id"
                  :label="project.name"
                  :value="project.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="楼层" prop="floorId">
              <el-select 
                v-model="embeddedPartForm.floorId" 
                placeholder="选择楼层"
                style="width: 100%"
              >
                <el-option
                  v-for="floor in floors"
                  :key="floor.id"
                  :label="floor.name"
                  :value="floor.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="embeddedPartForm.name" placeholder="请输入名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编号" prop="code">
              <el-input v-model="embeddedPartForm.code" placeholder="请输入编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="型号" prop="modelNumber">
              <el-input v-model="embeddedPartForm.modelNumber" placeholder="请输入型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-input v-model="embeddedPartForm.type" placeholder="请输入类型" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="位置" prop="location">
          <el-input v-model="embeddedPartForm.location" placeholder="请输入位置" />
        </el-form-item>
        <el-divider content-position="left">2D坐标信息 (可选)</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="坐标X" prop="coordinateX">
              <el-input-number
                v-model="embeddedPartForm.coordinateX"
                placeholder="输入X坐标"
                :precision="2"
                :step="10"
                controls-position="right"
                style="width: 100%"
              />
              <div class="field-tip">CAD图纸X坐标 (mm)</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="坐标Y" prop="coordinateY">
              <el-input-number
                v-model="embeddedPartForm.coordinateY"
                placeholder="输入Y坐标"
                :precision="2"
                :step="10"
                controls-position="right"
                style="width: 100%"
              />
              <div class="field-tip">CAD图纸Y坐标 (mm)</div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态" prop="status">
          <el-select v-model="embeddedPartForm.status" placeholder="选择状态" style="width: 100%">
            <el-option label="待安装" value="pending" />
            <el-option label="已安装" value="installed" />
            <el-option label="已验收" value="inspected" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input 
            v-model="embeddedPartForm.notes" 
            type="textarea" 
            :rows="3"
            placeholder="请输入备注信息"
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

    // 判断是否可以导入（需要先选择项目）
    const canImport = computed(() => {
      return searchForm.projectId && searchForm.projectId !== ''
    })

    // 权限控制计算属性
    const canViewQRCode = computed(() => {
      // 所有角色都可以查看二维码
      return true
    })

    const canEdit = computed(() => {
      // 安装人员和质检人员不能编辑
      return !isRestrictedUser.value
    })

    const canDelete = computed(() => {
      // 只有管理员和项目经理可以删除
      return ['admin', 'projectManager'].includes(userStore.userRole)
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
      coordinateX: null,  // 2D坐标X (mm)
      coordinateY: null,  // 2D坐标Y (mm)
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
          searchForm.projectId = projects.value[0].id
          await getFloors(searchForm.projectId)
          await searchEmbeddedParts()
        } else if (!isRestrictedUser.value) {
          // 非受限用户默认选择第一个项目
          if (projects.value.length > 0 && !searchForm.projectId) {
            searchForm.projectId = projects.value[0].id
            await getFloors(searchForm.projectId)
            await searchEmbeddedParts()
          }
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

    // 数据处理方法
    const paginatedData = computed(() => {
      // 确保 embeddedParts.value 是数组
      if (!Array.isArray(embeddedParts.value)) {
        return []
      }
      const start = (pagination.currentPage - 1) * pagination.pageSize
      const end = start + pagination.pageSize
      return embeddedParts.value.slice(start, end)
    })

    // 状态相关方法
    const getStatusLabel = (status) => {
      const statusMap = {
        pending: '待安装',
        installed: '已安装',
        inspected: '已验收',
        rejected: '已拒绝',
        completed: '已完成'
      }
      return statusMap[status] || status
    }

    const getStatusType = (status) => {
      const statusTypeMap = {
        pending: 'warning',
        installed: 'primary',
        inspected: 'success',
        rejected: 'danger',
        completed: 'info'
      }
      return statusTypeMap[status] || 'default'
    }

    const getFloorName = (floorId) => {
      const floor = floors.value.find(f => f.id === floorId)
      return floor ? floor.name : '未知楼层'
    }

    const getRowClassName = ({ row }) => {
      // 根据状态设置行样式
      if (row.status === 'rejected') {
        return 'warning-row'
      } else if (row.status === 'completed') {
        return 'success-row'
      }
      return ''
    }

    // 分页处理方法
    const handleSizeChange = (size) => {
      pagination.pageSize = size
      pagination.currentPage = 1
    }

    const handleCurrentChange = (current) => {
      pagination.currentPage = current
    }

    // 对话框关闭处理
    const handleDialogClose = () => {
      dialogVisible.value = false
      // 重置表单
      embeddedPartFormRef.value?.resetFields()
    }

    // 搜索预埋件
    const searchEmbeddedParts = async () => {
      try {
        loading.value = true
        
        console.log('=== 搜索预埋件调试信息 ===')
        console.log('用户角色:', userStore.userRole)
        console.log('是否受限用户:', isRestrictedUser.value)
        console.log('用户关联项目:', userProjects.value)
        console.log('当前选择项目ID:', searchForm.projectId)
        console.log('当前选择楼层ID:', searchForm.floorId)
        console.log('当前选择状态:', searchForm.status)
        console.log('当前搜索关键词:', searchForm.keyword)
        
        // 构建搜索参数
        const searchParams = {}
        
        // 必填：项目ID
        if (searchForm.projectId) {
          searchParams.projectId = searchForm.projectId
          console.log('搜索项目ID:', searchParams.projectId)
        } else {
          console.warn('警告：没有选择项目ID')
          return // 如果没有项目ID，直接返回
        }
        
        // 可选：楼层ID（仅在选择时传递）
        if (searchForm.floorId && searchForm.floorId.trim() !== '') {
          searchParams.floorId = searchForm.floorId
          console.log('搜索楼层ID:', searchParams.floorId)
        }
        
        // 可选：状态
        if (searchForm.status && searchForm.status.trim() !== '') {
          searchParams.status = searchForm.status
          console.log('搜索状态:', searchParams.status)
        }
        
        // 可选：关键词
        if (searchForm.keyword && searchForm.keyword.trim() !== '') {
          searchParams.keyword = searchForm.keyword.trim()
          console.log('搜索关键词:', searchParams.keyword)
        }
        
        // 如果是受限用户，强制使用用户关联的项目
        if (isRestrictedUser.value) {
          searchParams.projectId = searchForm.projectId
          console.log('受限用户，强制使用项目ID:', searchParams.projectId)
        }
        
        console.log('最终搜索参数:', searchParams)
        
        const response = await api.embeddedPart.getEmbeddedParts(searchParams)
        console.log('API响应原始数据:', response)
        
        // 处理API响应格式 - 后端返回 {total, pages, currentPage, data}
        let responseData = []
        if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            responseData = response.data
            pagination.total = response.total || responseData.length
            pagination.currentPage = response.currentPage || 1
            pagination.pages = response.pages || Math.ceil((response.total || 0) / pagination.pageSize)
          } else if (Array.isArray(response)) {
            // 兼容直接返回数组的格式
            responseData = response
            pagination.total = responseData.length
            pagination.currentPage = 1
            pagination.pages = Math.ceil(responseData.length / pagination.pageSize)
          }
        }
        
        embeddedParts.value = responseData
        console.log('处理后的数据:', embeddedParts.value)
        console.log('分页信息:', { total: pagination.total, currentPage: pagination.currentPage, pages: pagination.pages })
        console.log('=== 搜索结束 ===')
      } catch (error) {
        console.error('获取预埋件列表失败:', error)
        ElMessage.error('获取预埋件列表失败')
        // 发生错误时确保数据是空数组
        embeddedParts.value = []
        pagination.total = 0
      } finally {
        loading.value = false
      }
    }

    // 处理楼层变化
    const handleFloorChange = (value) => {
      // 当楼层变化时，重新搜索预埋件
      searchEmbeddedParts()
    }

    // 重置搜索
    const resetSearch = () => {
      // 受限用户不能重置项目
      if (!isRestrictedUser.value) {
        searchForm.projectId = ''
      }
      searchForm.floorId = ''
      searchForm.status = ''
      searchForm.keyword = ''
      floors.value = []
      pagination.currentPage = 1
      
      // 如果不是受限用户，搜索所有项目的数据
      if (!isRestrictedUser.value) {
        searchEmbeddedParts()
      }
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
        coordinateX: null,
        coordinateY: null,
        status: 'pending',
        notes: ''
      }
      dialogVisible.value = true
    }

    // 显示编辑对话框
    const showEditDialog = async (row) => {
      isEdit.value = true
      embeddedPartForm.value = { ...row }
      
      // 如果有coordinates2D对象，展开为coordinateX/Y
      if (row.coordinates2D) {
        embeddedPartForm.value.coordinateX = row.coordinates2D.x
        embeddedPartForm.value.coordinateY = row.coordinates2D.y
      } else {
        embeddedPartForm.value.coordinateX = null
        embeddedPartForm.value.coordinateY = null
      }
      
      // 🔧 修复：加载对应项目的楼层数据
      if (row.projectId) {
        await getFloors(row.projectId)
      }
      
      dialogVisible.value = true
    }

    // 保存预埋件
    const saveEmbeddedPart = async () => {
      try {
        console.log('=== 保存预埋件调试信息 ===')
        console.log('表单数据:', embeddedPartForm.value)
        console.log('是否编辑模式:', isEdit.value)
        
        await embeddedPartFormRef.value.validate()
        
        // 准备提交数据 - 只提取需要的字段
        const submitData = {
          projectId: embeddedPartForm.value.projectId,
          floorId: embeddedPartForm.value.floorId,
          name: embeddedPartForm.value.name,
          code: embeddedPartForm.value.code,
          modelNumber: embeddedPartForm.value.modelNumber,
          type: embeddedPartForm.value.type,
          location: embeddedPartForm.value.location,
          status: embeddedPartForm.value.status,
          notes: embeddedPartForm.value.notes || ''
        }
        
        // 如果是编辑模式，添加id
        if (isEdit.value) {
          submitData.id = embeddedPartForm.value.id
        }
        
        // 如果有坐标输入，构建coordinates2D对象
        if (embeddedPartForm.value.coordinateX !== null && 
            embeddedPartForm.value.coordinateY !== null &&
            !isNaN(embeddedPartForm.value.coordinateX) &&
            !isNaN(embeddedPartForm.value.coordinateY)) {
          submitData.coordinates2D = {
            x: Number(embeddedPartForm.value.coordinateX),
            y: Number(embeddedPartForm.value.coordinateY)
          }
          console.log('✅ 构建2D坐标对象:', submitData.coordinates2D)
        }
        
        console.log('最终提交数据:', submitData)
        
        if (isEdit.value) {
          console.log('执行更新操作...')
          const result = await api.embeddedPart.updateEmbeddedPart(submitData.id, submitData)
          console.log('更新结果:', result)
          ElMessage.success('更新成功')
        } else {
          console.log('执行新增操作...')
          const result = await api.embeddedPart.createEmbeddedPart(submitData)
          console.log('新增结果:', result)
          ElMessage.success('新增成功')
        }
        
        dialogVisible.value = false
        
        // 保存成功后立即刷新数据，清空筛选条件显示最新数据
        setTimeout(() => {
          // 保存成功后临时清空筛选条件，显示该项目的全部数据
          const originalFilters = {
            floorId: searchForm.floorId,
            status: searchForm.status,
            keyword: searchForm.keyword
          }
          
          // 清空筛选条件
          searchForm.floorId = ''
          searchForm.status = ''
          searchForm.keyword = ''
          
          // 搜索全部数据
          searchEmbeddedParts()
          
          // 恢复原始筛选条件（可选）
          setTimeout(() => {
            searchForm.floorId = originalFilters.floorId
            searchForm.status = originalFilters.status
            searchForm.keyword = originalFilters.keyword
          }, 1000)
        }, 500)
        console.log('=== 保存结束 ===')
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
      if (!canImport.value) {
        ElMessage.warning('请先选择项目后再进行导入')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          if (jsonData.length === 0) {
            ElMessage.warning('Excel文件为空或格式不正确')
            return
          }

          // 确认导入项目
          const selectedProject = projects.value.find(p => p.id === searchForm.projectId)
          ElMessageBox.confirm(
            `确认将 ${jsonData.length} 条预埋件数据导入到项目"${selectedProject?.name}"中吗？`,
            '批量导入确认',
            {
              confirmButtonText: '确认导入',
              cancelButtonText: '取消',
              type: 'info'
            }
          ).then(() => {
            batchImportEmbeddedParts(jsonData)
          }).catch(() => {
            ElMessage.info('已取消导入')
          })
        } catch (error) {
          console.error('解析Excel失败:', error)
          ElMessage.error('解析Excel失败，请检查文件格式')
        }
      }
      reader.readAsArrayBuffer(file.raw)
    }

    // 批量导入预埋件
    const batchImportEmbeddedParts = async (data) => {
      try {
        loading.value = true
        
        console.log('开始导入数据:', data)
        console.log('当前项目ID:', searchForm.projectId)
        
        // 为每条数据添加项目ID和默认状态
        const dataWithProject = data.map(item => ({
          ...item,
          projectId: searchForm.projectId,
          // 确保状态字段存在
          status: item.status || 'pending'
        }))
        
        console.log('处理后的数据:', dataWithProject)
        
        // 使用正确的批量创建接口
        const result = await api.embeddedPart.batchCreateEmbeddedParts(dataWithProject)
        console.log('导入结果:', result)
        
        ElMessage.success(`批量导入成功！共导入 ${data.length} 条数据`)
        
        // 等待一段时间让后端处理完成，然后刷新数据
        setTimeout(() => {
          searchEmbeddedParts()
        }, 1000)
      } catch (error) {
        console.error('批量导入失败:', error)
        ElMessage.error(`批量导入失败：${error.response?.data?.message || error.message}`)
      } finally {
        loading.value = false
      }
    }

    // 下载示例模板
    const downloadSampleTemplate = () => {
      // 根据是否选择项目来生成相应的模板
      const selectedProject = searchForm.projectId ? 
        projects.value.find(p => p.id === searchForm.projectId) : null
      
      // 获取第一个楼层的ID作为示例
      const sampleFloorId = floors.value.length > 0 ? floors.value[0].id : 'FLOOR_ID_EXAMPLE'
      
      const templateData = [
        {
          name: '预埋件1',
          code: 'EP001',
          modelNumber: 'M10',
          type: '锚栓',
          location: '一层A区',
          floorId: sampleFloorId,
          status: 'pending',
          description: '示例说明'
        },
        {
          name: '预埋件2',
          code: 'EP002', 
          modelNumber: 'M12',
          type: '螺栓',
          location: '二层B区',
          floorId: sampleFloorId,
          status: 'pending',
          description: '示例说明'
        }
      ]
      
      // 如果没有楼层数据，添加提示
      if (!selectedProject || floors.value.length === 0) {
        templateData[0].notes = '请将FLOOR_ID_EXAMPLE替换为实际的楼层ID'
      }
      
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '预埋件模板')
      
      // 生成文件名
      const fileName = selectedProject ? 
        `${selectedProject.name}_预埋件导入模板.xlsx` : 
        '预埋件导入模板.xlsx'
      
      XLSX.writeFile(workbook, fileName)
      ElMessage.success('示例模板下载成功')
    }

    // 页面加载时初始化数据
    onMounted(async () => {
      console.log('=== 页面初始化 ===')
      await getProjects()
      // 不在这里调用 searchEmbeddedParts，因为在 getProjects 中会根据用户类型自动调用
      console.log('=== 页面初始化完成 ===')
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
      canImport,
      canViewQRCode,
      canEdit,
      canDelete,
      paginatedData,
      // 方法
      getProjects,
      getFloors,
      searchEmbeddedParts,
      resetSearch,
      showAddDialog,
      showEditDialog,
      saveEmbeddedPart,
      deleteEmbeddedPart,
      generateQRCode,
      downloadQRCode,
      handleExcelUpload,
      downloadSampleTemplate,
      getStatusLabel,
      getStatusType,
      getFloorName,
      getRowClassName,
      handleSizeChange,
      handleCurrentChange,
      handleDialogClose
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

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.import-info {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-item {
  margin-bottom: 0;
}

.search-group {
  flex: 1.5;
  min-width: 300px;
}

.filter-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .filter-row {
    flex-direction: column;
  }
  
  .filter-group,
  .search-group {
    min-width: 100%;
  }
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

/* 表格行样式 */
:deep(.el-table .warning-row) {
  background-color: #fef0f0;
}

:deep(.el-table .success-row) {
  background-color: #f0f9ff;
}

/* 字段提示文字样式 */
.field-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1;
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}
</style>