<template>
  <div class="auth-shell auth-login">
    <div class="auth-stage">
      <section class="auth-hero">
        <div class="auth-hero-main">
          <div class="auth-brand">
            <div class="auth-brand-mark">
              <img :src="logoFull" alt="Yumaibao" />
            </div>
            <div class="auth-brand-copy">
              <strong>预埋宝</strong>
              <span>Embedded Control Console</span>
            </div>
          </div>

          <div class="auth-hero-copy">
            <p class="auth-kicker">Field Coordination Platform</p>
            <h2>把 BIM、现场扫码与质检反馈，收进一个更清晰的工作台。</h2>
            <p class="auth-copy">
              面向项目经理、工程师、安装与质检人员的协同平台，聚焦定位、执行与追踪闭环。
            </p>
          </div>
        </div>

        <div class="auth-hero-foot">
          <div class="auth-signal-strip">
            <article
              v-for="item in heroHighlights"
              :key="item.title"
              class="auth-signal"
            >
              <span>{{ item.index }}</span>
              <strong>{{ item.title }}</strong>
            </article>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-brand auth-brand-panel">
          <div class="auth-brand-mark auth-brand-mark-panel">
            <img :src="logoFull" alt="Yumaibao" />
          </div>
          <div class="auth-brand-copy">
            <strong>预埋宝控制台</strong>
            <span>登录后按角色进入对应工作台</span>
          </div>
        </div>

        <div class="auth-form-head">
          <p class="section-kicker">账户登录</p>
          <h2>进入现场控制台</h2>
          <p class="auth-panel-copy">
            使用手机号与密码登录，系统会自动加载你的项目与权限。
          </p>
        </div>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="auth-form"
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
              <el-option
                v-for="item in roleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <div class="auth-inline">
            <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
            <el-link type="primary" class="auth-link">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            class="auth-submit"
            native-type="submit"
            @click="handleLogin"
          >
            {{ loading ? '正在登录...' : '登录系统' }}
          </el-button>
        </el-form>

        <div class="auth-footer">
          <p>
            还没有账号？
            <el-link type="primary" class="auth-link" @click="goToRegister">立即注册</el-link>
          </p>
          <p>© 2026 预埋宝智能防错定位系统</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index'
import api from '../api/index'
import logoFull from '../assets/logo-full.png'

defineOptions({
  name: 'Login'
})

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)

const roleOptions = [
  { label: '项目经理', value: 'projectManager' },
  { label: '项目工程师', value: 'projectEngineer' },
  { label: '质检人员', value: 'qualityInspector' },
  { label: '安装人员', value: 'installer' },
  { label: '系统管理员', value: 'admin' }
]

const heroHighlights = [
  { index: '01', title: '模型与现场同屏', description: '预埋件定位、模型管理和项目进度放在一套操作语境里。' },
  { index: '02', title: '扫码记录可追踪', description: '安装、验收与异常处理不再散落在多个页面和表格里。' },
  { index: '03', title: '角色权限清晰', description: '按项目经理、工程师、安装和质检角色切入对应工作台。' }
]

const loginForm = reactive({
  phone: '',
  password: '',
  role: 'installer',
  remember: false
})

const loginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为 6 到 20 位', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const goToRegister = () => {
  router.push('/register')
}

const handleLogin = () => {
  loginFormRef.value?.validate(async (valid) => {
    if (!valid) {
      return false
    }

    loading.value = true

    try {
      const response = await api.user.login({
        phone: loginForm.phone,
        password: loginForm.password
      })

      userStore.login(response.user, response.token)
      ElMessage.success('登录成功')

      const redirect = router.currentRoute.value.query.redirect || '/'
      router.push(redirect)
    } catch (error) {
      // API interceptor handles the visible error feedback.
    } finally {
      loading.value = false
    }

    return true
  })
}
</script>

<style scoped>
.auth-login::before {
  background-image:
    linear-gradient(120deg, rgba(10, 21, 39, 0.12), rgba(9, 20, 38, 0.12)),
    url('../assets/login-bg.jpg');
}

.auth-brand-panel {
  margin-bottom: 24px;
  gap: 12px;
}

.auth-brand-mark-panel {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.12);
  padding: 6px;
}

.auth-submit {
  width: 100%;
  min-height: 46px;
  margin-top: 4px;
  font-size: 1rem;
}

.auth-panel :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
