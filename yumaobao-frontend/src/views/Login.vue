<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1>预埋宝</h1>
        <p>智能防错定位系统</p>
      </div>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
      >
        <el-form-item prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="邮箱"
            prefix-icon="Message"
            clearable
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item prop="role">
          <el-select
            v-model="loginForm.role"
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
          <el-checkbox v-model="loginForm.remember" class="remember-me">记住密码</el-checkbox>
          <el-link type="primary" class="forgot-password">忘记密码?</el-link>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
            native-type="submit"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <p>还没有账号？<el-link type="primary" @click="goToRegister">立即注册</el-link></p>
        <p>© 2023 预埋宝智能防错定位系统</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/index'
import { ElMessage } from 'element-plus'
import api from '../api/index'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const loginFormRef = ref(null)
    const loading = ref(false)
    
    const goToRegister = () => {
      router.push('/register')
    }

    // 登录表单数据
    const loginForm = reactive({
      email: '',
      password: '',
      role: 'installer',
      remember: false
    })

    // 登录表单验证规则
    const loginRules = {
      email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' }
      ]
    }

    // 处理登录
    const handleLogin = () => {
      loginFormRef.value.validate((valid) => {
        if (valid) {
          loading.value = true

          // 使用真实API请求
          api.user.login(loginForm)
            .then((response) => {
              // 保存用户信息到store
              userStore.login(response.user, response.token)

              ElMessage.success('登录成功')
              
              // 跳转到之前尝试访问的页面或首页
              const redirect = router.currentRoute.value.query.redirect || '/'
              router.push(redirect)
            })
            .catch((error) => {
              // 错误处理已在API拦截器中处理
              console.error('登录失败:', error)
            })
            .finally(() => {
              loading.value = false
            })
        } else {
          return false
        }
      })
    }

    return {
      loginFormRef,
      loginForm,
      loginRules,
      loading,
      handleLogin,
      goToRegister
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
  background-size: cover;
  background-position: center;
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

.login-header p {
  color: #666;
  margin: 0;
}

.login-form {
  width: 100%;
}

.login-form .el-form-item {
  margin-bottom: 24px;
}

.remember-me {
  float: left;
}

.forgot-password {
  float: right;
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