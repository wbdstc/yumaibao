<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1>预埋宝</h1>
        <p>智能防错定位系统</p>
      </div>
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="login-form"
      >
        <el-form-item prop="name">
          <el-input
            v-model="registerForm.name"
            placeholder="姓名"
            prefix-icon="User"
            clearable
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item prop="phone">
          <el-input
            v-model="registerForm.phone"
            placeholder="手机号"
            prefix-icon="Mobile"
            clearable
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item prop="role">
          <el-select
            v-model="registerForm.role"
            placeholder="选择角色"
            class="w-full"
          >
            <el-option label="项目管理员" value="projectManager" />
            <el-option label="项目工程师" value="projectEngineer" />
            <el-option label="质检人员" value="qualityInspector" />
            <el-option label="安装人员" value="installer" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleRegister"
            class="login-button"
            native-type="submit"
          >
            {{ loading ? '注册中...' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <p>已有账号？<el-link type="primary" @click="goToLogin">立即登录</el-link></p>
        <p>© 2023 预埋宝智能防错定位系统</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index'
import api from '../api/index'

export default {
  name: 'Register',
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const registerFormRef = ref(null)
    const loading = ref(false)
    
    const registerForm = ref({
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'installer' // 默认角色为安装人员
    })
    
    const registerRules = {
      name: [
        { required: true, message: '请输入姓名', trigger: 'blur' },
        { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
      ],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请确认密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value !== registerForm.value.password) {
              callback(new Error('两次输入密码不一致'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' }
      ]
    }
    
    const handleRegister = async () => {
      if (!registerFormRef.value) return
      
      registerFormRef.value.validate((valid) => {
        if (valid) {
          loading.value = true
          
          // 调用注册API
          api.user.register(registerForm.value)
            .then(response => {
              ElMessage.success('注册成功')
              // 注册成功后自动登录
              return api.user.login({
                phone: registerForm.value.phone,
                password: registerForm.value.password
              })
            })
            .then(loginResponse => {
              userStore.login(loginResponse.data.user, loginResponse.data.token)
              // 跳转到首页
              router.push('/')
            })
            .catch(error => {
              ElMessage.error(error.response?.data?.message || '注册失败，请重试')
            })
            .finally(() => {
              loading.value = false
            })
        } else {
          return false
        }
      })
    }
    
    const goToLogin = () => {
      router.push('/login')
    }
    
    return {
      registerFormRef,
      registerForm,
      registerRules,
      loading,
      handleRegister,
      goToLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form-wrapper {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 32px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #1890ff;
  font-size: 28px;
  margin: 0 0 8px 0;
}

.login-form {
  width: 100%;
}

.login-form .el-form-item {
  margin-bottom: 24px;
}

.login-button {
  width: 100%;
  height: 40px;
  font-size: 16px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  color: #999;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-form-wrapper {
    padding: 20px;
    margin: 0 16px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .login-form-wrapper {
    padding: 16px;
    margin: 0 8px;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
}
</style>