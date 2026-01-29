<template>
  <div class="user-management-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理系统用户账号和权限</p>
    </div>

    <div class="action-bar">
      <el-button type="primary" @click="handleAddUser">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
      <el-input
        v-model="searchQuery"
        placeholder="搜索用户名称或手机号"
        prefix-icon="Search"
        clearable
        style="width: 300px; margin-left: 20px;"
      />
    </div>

    <el-table
      :data="paginatedUsers"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="id" label="用户ID" width="120" />
      <el-table-column prop="name" label="用户名" />
      <el-table-column prop="phone" label="手机号" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="scope">
          <el-tag :type="getRoleType(scope.row.role)">
            {{ getRoleLabel(scope.row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="scope">
          {{ formatDate(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click="handleEditUser(scope.row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button type="danger" size="small" @click="handleDeleteUser(scope.row)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '添加用户'"
      width="500px"
    >
      <el-form
        ref="userFormRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色">
            <el-option label="项目管理员" value="projectManager" />
            <el-option label="项目工程师" value="projectEngineer" />
            <el-option label="安装工" value="installer" />
            <el-option label="质检员" value="qualityInspector" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目" prop="projects" v-if="formData.role !== 'admin'">
          <el-select
            v-model="formData.projects"
            placeholder="请选择项目"
            multiple
            filterable
            class="w-full"
          >
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
          <div class="el-form-item__help">* 安装人员和质检人员必须选择至少一个项目</div>
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import api from '../api/index'

export default {
  name: 'UserManagement',
  components: {
    Plus,
    Edit,
    Delete,
    Search
  },
  setup() {
    // 真实用户数据
    const users = ref([])
    const total = ref(0)

    const searchQuery = ref('')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const selectedUsers = ref([])
    const dialogVisible = ref(false)
    const isEdit = ref(false)
    const userFormRef = ref(null)
    const projects = ref([])

    // 表单数据
    const formData = reactive({
      id: '',
      name: '',
      phone: '',
      password: '',
      role: '',
      projects: []
    })

    // 表单验证规则
    const formRules = reactive({
      name: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
      ],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' }
      ],
      projects: [
        {
          validator: (rule, value, callback) => {
            if ((formData.role === 'installer' || formData.role === 'qualityInspector') && (!value || value.length === 0)) {
              callback(new Error('请选择至少一个项目'))
            } else {
              callback()
            }
          },
          trigger: 'change'
        }
      ]
    })

    // 过滤用户数据
    const filteredUsers = computed(() => {
      if (!searchQuery.value) {
        return users.value
      }
      const query = searchQuery.value.toLowerCase()
      return users.value.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      )
    })

    // 分页处理
    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredUsers.value.slice(start, end)
    })

    // 处理选择变化
    const handleSelectionChange = (selection) => {
      selectedUsers.value = selection
    }

    // 获取用户列表
    const fetchUsers = async () => {
      try {
        const response = await api.user.getUsers()
        users.value = response.users || []
        total.value = response.total || users.value.length
      } catch (error) {
        ElMessage.error('获取用户列表失败')
        console.error('获取用户列表失败:', error)
      }
    }

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

    // 处理添加用户
    const handleAddUser = () => {
      isEdit.value = false
      resetForm()
      dialogVisible.value = true
    }

    // 处理编辑用户
    const handleEditUser = (user) => {
      isEdit.value = true
      Object.assign(formData, user)
      dialogVisible.value = true
    }

    // 处理删除用户
    const handleDeleteUser = (user) => {
      ElMessageBox.confirm(
        `确定要删除用户 "${user.name}" 吗？`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(async () => {
          try {
            await api.user.deleteUser(user.id)
            await fetchUsers()
            ElMessage.success('用户删除成功')
          } catch (error) {
            ElMessage.error('用户删除失败')
            console.error('用户删除失败:', error)
          }
        })
        .catch(() => {
          // 取消删除
        })
    }

    // 处理表单提交
    const handleSubmit = async () => {
      userFormRef.value.validate(async (valid) => {
        if (valid) {
          try {
            if (isEdit.value) {
            // 编辑用户
            await api.user.updateUser(formData.id, {
              name: formData.name,
              phone: formData.phone,
              role: formData.role
            })
            ElMessage.success('用户更新成功')
          } else {
            // 添加用户
            await api.user.createUser({
              name: formData.name,
              phone: formData.phone,
              password: formData.password,
              role: formData.role
            })
            ElMessage.success('用户添加成功')
          }
            dialogVisible.value = false
            resetForm()
            await fetchUsers()
          } catch (error) {
            ElMessage.error(isEdit.value ? '用户更新失败' : '用户添加失败')
            console.error('用户操作失败:', error)
          }
        } else {
          return false
        }
      })
    }

    // 重置表单
    const resetForm = () => {
      userFormRef.value?.resetFields()
      Object.assign(formData, {
        id: '',
        name: '',
        phone: '',
        password: '',
        role: '',
        projects: []
      })
    }

    // 处理分页大小变化
    const handleSizeChange = (size) => {
      pageSize.value = size
      currentPage.value = 1
    }

    // 处理当前页码变化
    const handleCurrentChange = (current) => {
      currentPage.value = current
    }

    // 处理状态变化


    // 获取角色标签
    const getRoleLabel = (role) => {
      const roleMap = {
        projectManager: '项目管理员',
        projectEngineer: '项目工程师',
        installer: '安装工',
        qualityInspector: '质检员',
        admin: '管理员'
      }
      return roleMap[role] || role
    }

    // 获取角色类型
    const getRoleType = (role) => {
      const roleTypeMap = {
        projectManager: 'primary',
        projectEngineer: 'success',
        installer: 'warning',
        qualityInspector: 'info',
        admin: 'danger'
      }
      return roleTypeMap[role] || 'default'
    }

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }

    onMounted(async () => {
      // 页面加载时的初始化逻辑
      console.log('UserManagement page mounted')
      await fetchUsers()
      await getProjects()
    })

    return {
      searchQuery,
      users,
      filteredUsers,
      paginatedUsers,
      currentPage,
      pageSize,
      selectedUsers,
      dialogVisible,
      isEdit,
      formData,
      formRules,
      userFormRef,
      projects,
      handleAddUser,
      handleEditUser,
      handleDeleteUser,
      handleSubmit,
      handleSelectionChange,
      handleSizeChange,
      handleCurrentChange,
      getRoleLabel,
      getRoleType,
      formatDate
    }
  }
}
</script>

<style scoped>
.user-management-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-header p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-bar .el-button {
    width: 100%;
  }

  .action-bar .el-input {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .pagination-container {
    justify-content: center;
  }
}
</style>