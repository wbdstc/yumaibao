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
        <el-form-item prop="phone">
          <el-input
            v-model="loginForm.phone"
            placeholder="手机号"
            prefix-icon="Mobile"
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
      phone: '',
      password: '',
      role: 'installer',
      remember: false
    })

    // 登录表单验证规则
    const loginRules = {
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
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
          api.user.login({
            phone: loginForm.phone,
            password: loginForm.password
          })
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
  justify-content: flex-end; /* 将登录框移到右边 */
  align-items: center;
  height: 100vh;
  position: relative;
  overflow: hidden;
  padding-right: 10%; /* 右侧留一些边距 */
}

/* 背景图片层 - 带模糊效果 */
.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('@/assets/login-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(1px); /* 高斯模糊效果 */
  transform: scale(1.05); /* 稍微放大以避免模糊边缘 */
  z-index: 1;
}

/* 深色半透明遮罩层 */
.login-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(10, 22, 40, 0) 0%,  /* 深蓝色遮罩 */
    rgba(0, 20, 50, 0) 50%,
    rgba(5, 15, 35, 0) 100%
  );
  z-index: 2;
}

.login-form-wrapper {
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
  border-radius: 8px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  position: relative;
  border: 1px solid var(--steel-silver);
  z-index: 10;
}

/* 登录卡片顶部装饰条 */
.login-form-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--safety-orange) 100%);
  border-radius: 8px 8px 0 0;
}

/* 登录卡片蓝图角标 */
.login-form-wrapper::after {
  content: '';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--construction-blue);
  border-right: 2px solid var(--construction-blue);
  opacity: 0.3;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-header h1 {
  color: var(--construction-blue);
  font-size: 32px;
  margin: 0 0 8px 0;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.login-header p {
  color: var(--concrete-gray);
  margin: 0;
  font-size: 14px;
  letter-spacing: 1px;
}

.login-form {
  width: 100%;
}

.login-form .el-form-item {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__wrapper) {
  background: linear-gradient(180deg, #ffffff 0%, var(--cement-light) 100%);
  border: 1px solid var(--steel-silver);
  box-shadow: var(--shadow-sm);
  transition: all 0.25s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: var(--construction-blue-light);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--construction-blue);
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.remember-me {
  float: left;
}

.forgot-password {
  float: right;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(180deg, var(--construction-blue) 0%, var(--construction-blue-dark) 100%);
  border: none;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    var(--shadow-lg);
  transition: all 0.3s ease;
}

.login-button:hover {
  background: linear-gradient(180deg, var(--construction-blue-light) 0%, var(--construction-blue) 100%);
  transform: translateY(-2px);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    var(--shadow-xl);
}

.login-footer {
  text-align: center;
  margin-top: 28px;
  color: var(--concrete-gray);
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-container {
    justify-content: center; /* 移动端居中 */
    padding-right: 0;
    padding: 0 16px;
  }
  
  .login-form-wrapper {
    padding: 20px;
    margin: 0;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 0 8px;
  }
  
  .login-form-wrapper {
    padding: 16px;
    margin: 0;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
}
</style>