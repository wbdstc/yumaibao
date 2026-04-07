<template>
  <div class="auth-shell auth-register">
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
            <p class="auth-kicker">Access Provisioning</p>
            <h1>为现场成员快速开通账号，让项目协同从第一天就走在一条线上。</h1>
            <p class="auth-copy">
              注册时即可绑定角色和项目范围，减少后续人工分配与切换成本。
            </p>
          </div>
        </div>

        <div class="auth-hero-foot">
          <div class="auth-signal-strip">
            <article
              v-for="item in registerHighlights"
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
            <strong>创建平台账号</strong>
            <span>按角色和项目范围初始化权限</span>
          </div>
        </div>

        <div class="auth-form-head">
          <p class="section-kicker">账户注册</p>
          <h2>添加新的协同成员</h2>
          <p class="auth-panel-copy">
            完成基础信息后，系统会立即创建账户，并自动登录进入平台。
          </p>
        </div>

        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          class="auth-form"
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
              <el-option
                v-for="item in roleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item v-if="showProjectSelect" prop="projects">
            <el-select
              v-model="registerForm.projects"
              placeholder="绑定项目"
              class="w-full"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
            >
              <el-option
                v-for="project in projects"
                :key="project.id"
                :label="project.name"
                :value="project.id"
              />
            </el-select>
            <div class="project-help">
              安装人员和质检人员至少需要绑定一个项目。
            </div>
          </el-form-item>

          <el-button
            type="primary"
            :loading="loading"
            class="auth-submit"
            native-type="submit"
            @click="handleRegister"
          >
            {{ loading ? '正在注册...' : '创建并登录' }}
          </el-button>
        </el-form>

        <div class="auth-footer">
          <p>
            已有账号？
            <el-link type="primary" class="auth-link" @click="goToLogin">返回登录</el-link>
          </p>
          <p>© 2026 预埋宝智能防错定位系统</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index'
import api from '../api/index'
import logoFull from '../assets/logo-full.png'

defineOptions({
  name: 'Register'
})

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref(null)
const loading = ref(false)
const projects = ref([])

const roleOptions = [
  { label: '项目经理', value: 'projectManager' },
  { label: '项目工程师', value: 'projectEngineer' },
  { label: '质检人员', value: 'qualityInspector' },
  { label: '安装人员', value: 'installer' },
  { label: '系统管理员', value: 'admin' }
]

const registerHighlights = [
  { index: '01', title: '角色即入口', description: '创建账号时就定义操作视图，减少后续培训和切换成本。' },
  { index: '02', title: '项目范围清晰', description: '安装和质检角色直接绑定项目，进入系统即可开始处理任务。' },
  { index: '03', title: '注册后自动登录', description: '人员创建完成后立即进入平台，无需再次手动认证。' }
]

const registerForm = reactive({
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'installer',
  projects: []
})

const showProjectSelect = computed(() =>
  ['installer', 'qualityInspector'].includes(registerForm.role)
)

const registerRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为 2 到 20 位', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为 6 到 20 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }

        callback()
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  projects: [
    {
      validator: (rule, value, callback) => {
        if (showProjectSelect.value && (!value || value.length === 0)) {
          callback(new Error('请至少绑定一个项目'))
          return
        }

        callback()
      },
      trigger: 'change'
    }
  ]
}

const fetchProjects = async () => {
  try {
    const response = await api.project.getProjects()
    projects.value = response
  } catch (error) {
    ElMessage.error('获取项目列表失败')
  }
}

const handleRegister = async () => {
  if (!registerFormRef.value) {
    return
  }

  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true

  try {
    const registerData = {
      name: registerForm.name,
      phone: registerForm.phone,
      password: registerForm.password,
      role: registerForm.role,
      projects: registerForm.projects
    }

    await api.user.register(registerData)
    ElMessage.success('注册成功')

    const loginResponse = await api.user.login({
      phone: registerForm.phone,
      password: registerForm.password
    })

    userStore.login(loginResponse.user, loginResponse.token)
    router.push('/')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.auth-register::before {
  background-image:
    linear-gradient(120deg, rgba(7, 17, 34, 0.18), rgba(7, 17, 34, 0.22)),
    url('../assets/1login-bg.jpg');
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

.project-help {
  margin-top: 10px;
  color: var(--app-text-soft);
  font-size: 0.86rem;
  line-height: 1.55;
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
