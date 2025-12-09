<template>
  <div class="profile-container">
    <div class="page-header">
      <h2>个人信息</h2>
    </div>
    
    <el-card class="profile-card">
      <div class="profile-content">
        <div class="profile-avatar-section">
          <el-avatar :size="100" :src="userStore.userInfo?.avatar || ''" class="profile-avatar">
            {{ userStore.userInfo?.name?.[0] || '用' }}
          </el-avatar>
          <div class="avatar-upload">
            <el-button type="primary" size="small">上传头像</el-button>
            <p class="avatar-tip">支持JPG、PNG格式，大小不超过2MB</p>
          </div>
        </div>
        
        <el-form :model="userForm" label-width="120px" class="profile-form">
          <el-form-item label="姓名">
            <el-input v-model="userForm.name" placeholder="请输入姓名" />
          </el-form-item>
          
          <el-form-item label="手机号">
            <el-input v-model="userForm.phone" placeholder="请输入手机号" disabled />
          </el-form-item>
          
          <el-form-item label="角色">
            <el-select v-model="userForm.role" placeholder="选择角色" disabled>
              <el-option label="项目管理员" value="projectManager" />
              <el-option label="项目工程师" value="projectEngineer" />
              <el-option label="质检人员" value="qualityInspector" />
              <el-option label="安装人员" value="installer" />
              <el-option label="管理员" value="admin" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="邮箱">
            <el-input v-model="userForm.email" placeholder="请输入邮箱" />
          </el-form-item>
          
          <el-form-item label="所属项目">
            <el-input v-model="userForm.projectName" placeholder="暂无所属项目" disabled />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveProfile" :loading="saving">保存修改</el-button>
            <el-button @click="resetForm">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <!-- 密码修改部分 -->
    <el-card class="password-card">
      <div class="password-header">
        <h3>修改密码</h3>
      </div>
      
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="120px" class="password-form">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请确认新密码" show-password />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="changePassword" :loading="changingPassword">修改密码</el-button>
          <el-button @click="resetPasswordForm">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 注销账号部分 -->
    <el-card class="delete-card">
      <div class="delete-header">
        <h3>注销账号</h3>
      </div>
      
      <div class="delete-content">
        <p class="warning-text">注意：注销账号将永久删除您的所有个人信息和相关数据，此操作不可撤销！</p>
        <el-button type="danger" @click="showDeleteConfirm" :loading="deletingAccount">注销账号</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../stores/index'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '../router/index'
import api from '../api/index'

export default {
  name: 'Profile',
  setup() {
    const userStore = useUserStore()
    const saving = ref(false)
    const changingPassword = ref(false)
    const deletingAccount = ref(false)
    const passwordFormRef = ref()
    
    // 用户信息表单
    const userForm = reactive({
      name: '',
      phone: '',
      email: '',
      role: '',
      projectName: ''
    })
    
    // 密码修改表单
    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    // 密码验证规则
    const passwordRules = {
      oldPassword: [
        { required: true, message: '请输入原密码', trigger: 'blur' }
      ],
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value !== passwordForm.newPassword) {
              callback(new Error('两次输入密码不一致'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ]
    }
    
    // 初始化表单数据
    onMounted(() => {
      if (userStore.userInfo) {
        userForm.name = userStore.userInfo.name || ''
        userForm.phone = userStore.userInfo.phone || ''
        userForm.email = userStore.userInfo.email || ''
        userForm.role = userStore.userInfo.role || ''
        userForm.projectName = userStore.userInfo.projectName || ''
      }
    })
    
    // 保存个人信息
    const saveProfile = async () => {
      saving.value = true
      try {
        // 调用API更新用户信息
        await api.user.updateProfile({
          name: userForm.name,
          email: userForm.email
        })
        
        // 更新本地存储的用户信息
        userStore.updateUserInfo({
          name: userForm.name,
          email: userForm.email
        })
        
        ElMessage.success('个人信息更新成功')
      } catch (error) {
        console.error('更新个人信息失败:', error)
        ElMessage.error('更新个人信息失败，请稍后重试')
      } finally {
        saving.value = false
      }
    }
    
    // 重置表单
    const resetForm = () => {
      if (userStore.userInfo) {
        userForm.name = userStore.userInfo.name || ''
        userForm.email = userStore.userInfo.email || ''
      }
    }
    
    // 修改密码
    const changePassword = async () => {
      if (!passwordFormRef.value) return
      
      passwordFormRef.value.validate(async (valid) => {
        if (valid) {
          changingPassword.value = true
          try {
            // 调用API修改密码
            await api.user.changePassword({
              oldPassword: passwordForm.oldPassword,
              newPassword: passwordForm.newPassword
            })
            
            ElMessage.success('密码修改成功，请重新登录')
            
            // 重置表单
            resetPasswordForm()
            
            // 登出并跳转到登录页
            // userStore.logout()
            // router.push('/login')
          } catch (error) {
            console.error('修改密码失败:', error)
            ElMessage.error('修改密码失败，原密码错误或网络异常')
          } finally {
            changingPassword.value = false
          }
        }
      })
    }
    
    // 重置密码表单
    const resetPasswordForm = () => {
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      passwordFormRef.value?.resetFields()
    }
    
    // 显示删除账号确认对话框
    const showDeleteConfirm = () => {
      ElMessageBox.confirm(
        '您确定要注销账号吗？此操作将永久删除您的所有个人信息和相关数据，不可撤销！',
        '注销账号确认',
        {
          confirmButtonText: '确认注销',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )
      .then(() => {
        deleteAccount()
      })
      .catch(() => {
        ElMessage.info('已取消注销操作')
      })
    }
    
    // 删除账号
    const deleteAccount = async () => {
      deletingAccount.value = true
      try {
        await api.user.deleteProfile()
        ElMessage.success('账号注销成功')
        // 清除用户信息和令牌
        userStore.logout()
        // 跳转到登录页
        router.push('/login')
      } catch (error) {
        console.error('注销账号失败:', error)
        ElMessage.error(error.response?.data?.message || '注销账号失败，请重试')
      } finally {
        deletingAccount.value = false
      }
    }
    
    return {
      userStore,
      userForm,
      passwordForm,
      passwordRules,
      passwordFormRef,
      saving,
      changingPassword,
      deletingAccount,
      saveProfile,
      resetForm,
      changePassword,
      resetPasswordForm,
      showDeleteConfirm
    }
  }
}
</script>

<style scoped>
.profile-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 80px);
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.profile-card {
  margin-bottom: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.profile-avatar {
  margin-bottom: 16px;
}

.avatar-upload {
  text-align: center;
}

.avatar-tip {
  margin: 8px 0 0;
  color: #999;
  font-size: 12px;
}

.profile-form {
  width: 100%;
  max-width: 600px;
}

.password-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.password-header {
  margin-bottom: 20px;
}

.password-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.password-form {
  width: 100%;
  max-width: 600px;
}

.delete-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.delete-header {
  margin-bottom: 20px;
}

.delete-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.delete-content {
  padding: 20px 0;
}

.warning-text {
  color: #f56c6c;
  margin-bottom: 24px;
  line-height: 1.5;
}

.delete-card .el-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
}
</style>