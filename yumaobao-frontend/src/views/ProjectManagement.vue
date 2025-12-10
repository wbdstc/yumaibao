<template>
  <div class="project-management-container page-transition blueprint-bg">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <h2>项目管理</h2>
      <el-button 
        type="primary" 
        @click="showAddProjectDialog"
        :disabled="!canCreateProject"
      >
        <el-icon><Plus /></el-icon>
        新建项目
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索项目名称或编号"
            prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="statusFilter"
            placeholder="项目状态"
            clearable
            style="width: 100%"
          >
            <el-option label="全部" value="" />
            <el-option label="规划中" value="planning" />
        <el-option label="施工中" value="under_construction" />
        <el-option label="已完成" value="completed" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 项目列表 - 桌面版表格 -->
    <el-card shadow="hover" class="project-list-card project-list-table">
      <el-table
        :data="filteredProjects"
        style="width: 100%"
        border
        stripe
        @row-click="handleRowClick"
      >
        <el-table-column type="index" label="序号" width="80" />
        <el-table-column prop="name" label="项目名称" min-width="200" />
        <el-table-column prop="code" label="项目编号" width="180" />
        <el-table-column prop="description" label="项目描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :class="['status-tag', scope.row.status === 'under_construction' ? 'tag-construction' : scope.row.status === 'completed' ? 'tag-completed' : 'tag-planning']">
              {{ scope.row.status === 'planning' ? '规划中' : scope.row.status === 'under_construction' ? '施工中' : '已完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="150" />
        <el-table-column prop="endDate" label="结束日期" width="150" />
        <el-table-column prop="createdBy" label="创建人" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click.stop="viewProject(scope.row)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click.stop="showEditProjectDialog(scope.row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click.stop="showDeleteConfirm(scope.row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredProjects.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 项目列表 - 移动端卡片 -->
    <div class="project-list-mobile">
      <el-card
        v-for="project in filteredProjects"
        :key="project.id"
        shadow="hover"
        class="project-card"
        @click="viewProject(project)"
      >
        <div class="project-card-header">
          <h3 class="project-card-title">{{ project.name }}</h3>
          <el-tag :class="['status-tag', project.status === 'under_construction' ? 'tag-construction' : project.status === 'completed' ? 'tag-completed' : 'tag-planning']">
            {{ project.status === 'planning' ? '规划中' : project.status === 'under_construction' ? '施工中' : '已完成' }}
          </el-tag>
        </div>
        <div class="project-card-content">
          {{ project.description || '暂无项目描述' }}
        </div>
        <div class="project-card-meta">
          <div><strong>编号:</strong> {{ project.code }}</div>
          <div><strong>开始:</strong> {{ project.startDate }}</div>
          <div><strong>结束:</strong> {{ project.endDate }}</div>
          <div><strong>创建人:</strong> {{ project.createdBy }}</div>
        </div>
        <div class="project-card-actions">
          <el-button
            type="primary"
            size="small"
            @click.stop="viewProject(project)"
          >
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click.stop="showEditProjectDialog(project)"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click.stop="showDeleteConfirm(project)"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </el-card>

      <!-- 移动端分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next"
          :total="filteredProjects.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新建项目对话框 -->
    <el-dialog
      v-model="addProjectDialogVisible"
      title="新建项目"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addProjectFormRef"
        :model="addProjectForm"
        :rules="projectRules"
        label-width="120px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="addProjectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目编号" prop="code">
          <el-input v-model="addProjectForm.code" placeholder="请输入项目编号" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="addProjectForm.description"
            type="textarea"
            rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
        <el-form-item label="项目状态" prop="status">
          <el-select v-model="addProjectForm.status" placeholder="请选择项目状态">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="暂停" value="paused" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="addProjectForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="addProjectForm.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addProjectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddProject">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑项目对话框 -->
    <el-dialog
      v-model="editProjectDialogVisible"
      title="编辑项目"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editProjectFormRef"
        :model="editProjectForm"
        :rules="projectRules"
        label-width="120px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="editProjectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目编号" prop="code">
          <el-input v-model="editProjectForm.code" placeholder="请输入项目编号" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="editProjectForm.description"
            type="textarea"
            rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
        <el-form-item label="项目状态" prop="status">
          <el-select v-model="editProjectForm.status" placeholder="请选择项目状态">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="暂停" value="paused" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="editProjectForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="editProjectForm.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editProjectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleEditProject">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore, useUserStore } from '../stores/index'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, View, Edit, Delete } from '@element-plus/icons-vue'
import api from '../api/index'

export default {
  name: 'ProjectManagement',
  components: {
    Plus,
    Search,
    View,
    Edit,
    Delete
  },
  setup() {
    const router = useRouter()
    const projectStore = useProjectStore()
    const userStore = useUserStore()

    // 项目列表
    const projects = ref([])
    const searchQuery = ref('')
    const statusFilter = ref('')
    const dateRange = ref([])

    // 分页
    const currentPage = ref(1)
    const pageSize = ref(10)

    // 对话框
    const addProjectDialogVisible = ref(false)
    const editProjectDialogVisible = ref(false)
    const addProjectFormRef = ref(null)
    const editProjectFormRef = ref(null)

    // 表单数据
    const addProjectForm = reactive({
      name: '',
      code: '',
      description: '',
      status: 'planning',
      startDate: '',
      endDate: ''
    })

    const editProjectForm = reactive({
      id: '',
      name: '',
      code: '',
      description: '',
      status: '',
      startDate: '',
      endDate: ''
    })

    // 表单验证规则
    const projectRules = {
      name: [
        { required: true, message: '请输入项目名称', trigger: 'blur' },
        { min: 2, max: 50, message: '项目名称长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      code: [
        { required: true, message: '请输入项目编号', trigger: 'blur' },
        { min: 3, max: 20, message: '项目编号长度在 3 到 20 个字符', trigger: 'blur' }
      ],
      status: [
        { required: true, message: '请选择项目状态', trigger: 'change' }
      ],
      startDate: [
        { required: true, message: '请选择开始日期', trigger: 'change' }
      ],
      endDate: [
        { required: true, message: '请选择结束日期', trigger: 'change' },
        {
          validator: (rule, value, callback) => {
            if (value && addProjectForm.startDate && value < addProjectForm.startDate) {
              callback(new Error('结束日期不能早于开始日期'))
            } else {
              callback()
            }
          },
          trigger: 'change'
        }
      ]
    }

    // 计算是否为受限用户（安装人员或质检人员）
    const isRestrictedUser = computed(() => {
      const userRole = userStore.userRole
      return userRole === 'installer' || userRole === 'qualityInspector'
    })

    // 用户所在项目ID
    const userProjects = computed(() => {
      return userStore.userInfo?.projects || []
    })

    // 筛选后的项目
    const filteredProjects = computed(() => {
      let result = [...projects.value]

      // 项目锁定：安装人员和质检人员只能看到自己所在的项目
      if (isRestrictedUser.value && userProjects.value.length > 0) {
        result = result.filter(project => userProjects.value.includes(project.id))
      }

      // 搜索筛选
      if (searchQuery.value) {
        result = result.filter(project => 
          project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          project.code.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
      }

      // 状态筛选
      if (statusFilter.value) {
        result = result.filter(project => project.status === statusFilter.value)
      }

      // 日期范围筛选
      if (dateRange.value && dateRange.value.length === 2) {
        result = result.filter(project => {
          const projectDate = new Date(project.startDate)
          return projectDate >= dateRange.value[0] && projectDate <= dateRange.value[1]
        })
      }
      return result
    })

    // 1. 用 ref 代替 computed
    const canCreateProject = ref(false)
    
    // 2. 使用 watch 监听角色变化
    watch(
      () => userStore.userRole,
      (newRole) => {
        console.log('角色变化:', newRole)
        canCreateProject.value = newRole === 'admin' || newRole === 'projectManager'
        console.log('权限更新:', canCreateProject.value)
      },
      { immediate: true }
    )



    // 显示新建项目对话框
    const showAddProjectDialog = () => {
      if (canCreateProject.value) {
        // 重置表单
        Object.assign(addProjectForm, {
          name: '',
          code: '',
          description: '',
          status: 'planning',
          startDate: '',
          endDate: ''
        })
        if (addProjectFormRef.value) {
          addProjectFormRef.value.resetFields()
        }
        addProjectDialogVisible.value = true
      } else {
        ElMessage.error('只有管理员或项目经理可以创建项目')
      }
    }

    // 显示编辑项目对话框
    const showEditProjectDialog = (project) => {
      // 填充表单数据
      Object.assign(editProjectForm, project)
      editProjectDialogVisible.value = true
    }

    // 处理新建项目
    const handleAddProject = async () => {
      addProjectFormRef.value.validate(async (valid) => {
        if (valid && canCreateProject.value) {
          try {
            // 调用API创建项目
            const response = await api.project.createProject(addProjectForm)
            // 后端返回的响应包含message和data字段
            const newProject = response.data
            projects.value.push(newProject)
            projectStore.addProject(newProject)
            addProjectDialogVisible.value = false
            ElMessage.success(response.message || '项目创建成功')
          } catch (error) {
            console.error('创建项目失败:', error)
            // 从错误响应中获取更详细的消息
            const errorMessage = error.response?.data?.message || '创建项目失败'
            ElMessage.error(errorMessage)
          }
        }
      })
    }

    // 处理编辑项目
    const handleEditProject = async () => {
      editProjectFormRef.value.validate(async (valid) => {
        if (valid) {
          try {
            // 调用API更新项目
            const response = await api.project.updateProject(editProjectForm.id, editProjectForm)
            // 后端返回的响应包含message和data字段
            const updatedProject = response.data
            const index = projects.value.findIndex(p => p.id === editProjectForm.id)
            if (index !== -1) {
              projects.value[index] = updatedProject
              projectStore.updateProject(updatedProject)
            }
            editProjectDialogVisible.value = false
            ElMessage.success(response.message || '项目更新成功')
          } catch (error) {
            console.error('更新项目失败:', error)
            ElMessage.error('更新项目失败')
          }
        }
      })
    }

    // 显示删除确认对话框
    const showDeleteConfirm = (project) => {
      ElMessageBox.confirm(
        `确定要删除项目 "${project.name}" 吗？此操作不可撤销。`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          // 调用API删除项目
          await api.project.deleteProject(project.id)
          const index = projects.value.findIndex(p => p.id === project.id)
          if (index !== -1) {
            projects.value.splice(index, 1)
          }
          ElMessage.success('项目删除成功')
        } catch (error) {
          console.error('删除项目失败:', error)
          ElMessage.error('删除项目失败')
        }
      }).catch(() => {
        // 取消删除
      })
    }

    // 查看项目
    const viewProject = (project) => {
      projectStore.selectProject(project)
      router.push(`/bim?projectId=${project.id}`)
    }

    // 行点击事件
    const handleRowClick = (project) => {
      // 可以添加行点击效果或其他操作
    }

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1 // 搜索后回到第一页
    }

    // 分页大小变化
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
    }

    // 当前页变化
    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
    }

    // 加载项目数据
    const loadProjects = async () => {
      try {
        const response = await api.project.getProjects()
        projects.value = response
      } catch (error) {
        console.error('获取项目列表失败:', error)
        ElMessage.error('获取项目列表失败')
      }
    }

    onMounted(() => {
      loadProjects()
    })

    return {
      projects,
      searchQuery,
      statusFilter,
      dateRange,
      currentPage,
      pageSize,
      filteredProjects,
      addProjectDialogVisible,
      editProjectDialogVisible,
      addProjectFormRef,
      editProjectFormRef,
      addProjectForm,
      editProjectForm,
      projectRules,
      canCreateProject,
      showAddProjectDialog,
      showEditProjectDialog,
      handleAddProject,
      handleEditProject,
      showDeleteConfirm,
      viewProject,
      handleRowClick,
      handleSearch,
      handleSizeChange,
      handleCurrentChange
    }
  }
}
</script>

<style scoped>
.project-management-container {
  width: 100%;
  height: 100%;
  padding: clamp(16px, 2vw, 24px);
  box-sizing: border-box;
}

/* 移动端项目列表默认隐藏 */
.project-list-mobile {
  display: none;
}

.project-card {
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
}

.project-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.project-card-title {
  font-size: 16px;
  margin: 0;
}

.project-card-content {
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.project-card-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.project-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 搜索筛选区域 */
.search-filter {
  margin-bottom: 20px;
  overflow-x: auto;
}

/* 项目列表表格容器 */
.project-list-table {
  overflow-x: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: clamp(20px, 4vw, 28px);
  color: var(--construction-blue);
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* 搜索和筛选 */
.search-filter {
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f2f5 100%);
  border: 1px solid var(--steel-silver);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 项目列表 */
.project-list-card {
  border-radius: 4px;
  overflow-x: auto;
  background: linear-gradient(135deg, #ffffff 0%, #f0f2f5 100%);
  border: 1px solid var(--steel-silver);
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

/* 对话框 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 状态标签样式 */
.tag-planning {
  background-color: var(--warning-yellow);
  color: white;
  transform: perspective(100px) rotateX(5deg);
}

.tag-construction {
  background-color: var(--complete-green);
  color: white;
  transform: perspective(100px) rotateX(5deg);
}

.tag-completed {
  background-color: var(--construction-blue);
  color: white;
  transform: perspective(100px) rotateX(5deg);
}

/* 按钮样式优化 */
.el-button {
  border-radius: 4px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  transition: all 0.3s ease !important;
}

.el-button--primary {
  background-color: var(--construction-blue) !important;
  border-color: var(--construction-blue) !important;
}

.el-button--primary:hover {
  background-color: #1a2f49 !important;
  box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3) !important;
  transform: translateY(-1px) !important;
}

.el-button--warning {
  background-color: var(--warning-yellow) !important;
  border-color: var(--warning-yellow) !important;
}

.el-button--warning:hover {
  background-color: #d97706 !important;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3) !important;
  transform: translateY(-1px) !important;
}

.el-button--danger {
  background-color: var(--safety-orange) !important;
  border-color: var(--safety-orange) !important;
}

.el-button--danger:hover {
  background-color: #ea580c !important;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3) !important;
  transform: translateY(-1px) !important;
}

/* 表格样式优化 */
:deep(.el-table) {
  border: 1px solid var(--steel-silver) !important;
  border-radius: 4px !important;
  overflow: hidden !important;
}

:deep(.el-table__header-wrapper th) {
  background-color: var(--construction-blue) !important;
  color: white !important;
  font-weight: 600 !important;
  border-right: 1px solid var(--steel-silver) !important;
}

:deep(.el-table__body-wrapper tr:hover) {
  background-color: rgba(30, 58, 95, 0.05) !important;
}

:deep(.el-table__body-wrapper tr) {
  transition: background-color 0.3s ease !important;
}

:deep(.el-table__body-wrapper td) {
  border-right: 1px solid var(--steel-silver) !important;
  border-bottom: 1px solid var(--steel-silver) !important;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 0 16px;
  }

  .search-filter {
    padding: 0 16px;
  }

  .el-row {
    margin-left: 0;
    margin-right: 0;
  }

  .project-management-container {
    padding: 10px;
  }
}

@media (max-width: 768px) {
  /* 隐藏桌面端表格，显示移动端卡片 */
  .project-list-table {
    display: none;
  }

  .project-list-mobile {
    display: block;
    padding: 0 16px;
  }

  .page-header {
    padding: 0 10px;
  }

  .search-filter {
    padding: 0 10px;
    margin-bottom: 10px;
  }

  .el-col {
    width: 100%;
    margin-bottom: 10px;
  }

  .project-management-container {
    padding: 5px;
  }

  .project-card-meta {
    grid-template-columns: 1fr;
  }

  .project-card-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .project-card-actions .el-button {
    flex: 1;
    min-width: 80px;
  }

  /* 对话框 */
  .el-dialog {
    margin: 0 10px;
    width: auto !important;
    max-width: 100%;
  }

  /* 按钮在小屏幕上调整 */
  .el-button {
    padding: 8px 12px !important;
    font-size: 14px !important;
  }
}
</style>