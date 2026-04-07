<template>
  <div class="layout-shell">
    <transition name="overlay-fade">
      <div
        v-if="isMobile && mobileMenuOpen"
        class="sidebar-overlay"
        @click="mobileMenuOpen = false"
      />
    </transition>

    <aside
      class="sidebar"
      :class="{
        collapsed: menuCollapsed,
        mobile: isMobile,
        open: mobileMenuOpen
      }"
    >
      <div class="brand-panel" :class="{ compact: menuCollapsed && !isMobile }" @click="handleNavigate(defaultRoute)">
        <div class="brand-mark">
          <img class="brand-logo" :src="logoFull" alt="Yumaibao" />
        </div>
        <div v-if="!menuCollapsed || isMobile" class="brand-copy">
          <strong>预埋宝</strong>
          <span>现场协同控制台</span>
        </div>
      </div>

      <div v-if="!menuCollapsed || isMobile" class="sidebar-meta">
        <span class="sidebar-meta-label">当前身份</span>
        <strong>{{ roleLabel }}</strong>
      </div>

      <el-menu
        class="sidebar-menu"
        :default-active="activeIndex"
        :collapse="menuCollapsed"
        :collapse-transition="false"
        :default-openeds="['bim-group']"
        unique-opened
        @select="handleMenuSelect"
      >
        <template v-for="item in filteredNavItems" :key="item.index">
          <el-sub-menu v-if="item.children" :index="item.index">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.index"
              :index="child.index"
            >
              <el-icon><component :is="child.icon" /></el-icon>
              <span>{{ child.label }}</span>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item v-else :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>
              <span>{{ item.label }}</span>
            </template>
          </el-menu-item>
        </template>
      </el-menu>

      <div v-if="!menuCollapsed || isMobile" class="sidebar-footer">
        <p>统一管理项目、模型、扫码与现场状态。</p>
        <button class="sidebar-footer-action" type="button" @click="handleNavigate('/manual')">
          打开帮助中心
        </button>
      </div>
    </aside>

    <main class="main-panel">
      <header class="topbar surface-panel">
        <div class="topbar-left">
          <button class="sidebar-toggle" type="button" @click="toggleSidebar">
            <el-icon><Menu /></el-icon>
          </button>
          <div class="page-copy">
            <p class="section-kicker">Yumaibao Workspace</p>
            <h1>{{ pageTitle }}</h1>
            <p>{{ pageSubtitle }}</p>
          </div>
        </div>

        <div class="topbar-right">
          <div class="topbar-chip topbar-chip-date">
            <span class="chip-dot" />
            {{ currentDateLabel }}
          </div>
          <div class="topbar-chip topbar-chip-role">{{ roleLabel }}</div>

          <el-dropdown>
            <button class="user-trigger" type="button">
              <el-avatar :size="38" :src="userStore.userInfo?.avatar || ''">
                {{ avatarFallback }}
              </el-avatar>
              <span class="user-trigger-copy">
                <strong>{{ userStore.userInfo?.name || '用户' }}</strong>
                <small>{{ userStore.userInfo?.phone || '账号已登录' }}</small>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleNavigate('/profile')">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item @click="handleNavigate('/settings')">
                  <el-icon><Setting /></el-icon>
                  系统设置
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <div class="content-wrapper">
        <router-view />
      </div>
    </main>

    <nav class="mobile-dock">
      <button
        v-for="item in mobileNavItems"
        :key="item.index"
        type="button"
        class="mobile-dock-item"
        :class="{ active: activeIndex === item.index }"
        @click="handleNavigate(item.index)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/index'
import logoFull from '../assets/logo-full.png'
import {
  ArrowDown,
  Box,
  DocumentAdd,
  Guide,
  House,
  Menu,
  Monitor,
  OfficeBuilding,
  PictureFilled,
  Setting,
  SwitchButton,
  TrendCharts,
  User,
  View
} from '@element-plus/icons-vue'

defineOptions({
  name: 'Layout'
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const navItems = [
  {
    index: '/',
    label: '仪表盘',
    icon: House,
    roles: ['projectManager', 'admin', 'projectEngineer']
  },
  {
    index: '/projects',
    label: '项目管理',
    icon: OfficeBuilding,
    roles: ['projectManager', 'admin', 'projectEngineer']
  },
  {
    index: 'bim-group',
    label: 'BIM 工作台',
    icon: PictureFilled,
    children: [
      {
        index: '/bim',
        label: '预埋件定位',
        icon: Monitor,
        roles: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer']
      },
      {
        index: '/model-management',
        label: '模型管理',
        icon: DocumentAdd,
        roles: ['projectManager', 'admin', 'projectEngineer']
      }
    ]
  },
  {
    index: '/embedded-parts',
    label: '预埋件管理',
    icon: Box,
    roles: ['projectManager', 'admin', 'projectEngineer']
  },
  {
    index: '/scan',
    label: '扫码管理',
    icon: View,
    roles: ['installer', 'qualityInspector', 'projectManager', 'admin', 'projectEngineer']
  },
  {
    index: '/users',
    label: '用户管理',
    icon: User,
    roles: ['admin']
  },
  {
    index: '/project-statistics',
    label: '项目统计',
    icon: TrendCharts,
    roles: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer']
  },
  {
    index: '/manual',
    label: '信息中心',
    icon: Guide,
    roles: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer']
  }
]

const pageMeta = [
  { match: (path) => path === '/', title: '仪表盘', subtitle: '查看项目总览、现场风险和近期动态。' },
  { match: (path) => path.startsWith('/projects'), title: '项目管理', subtitle: '集中维护项目生命周期、进度与基础配置。' },
  { match: (path) => path.startsWith('/bim'), title: 'BIM 工作台', subtitle: '连接模型、构件定位与现场操作记录。' },
  { match: (path) => path.startsWith('/model-management'), title: '模型管理', subtitle: '上传、校验并维护项目 BIM 模型。' },
  { match: (path) => path.startsWith('/embedded-parts'), title: '预埋件管理', subtitle: '处理构件台账、状态、二维码与批量导入。' },
  { match: (path) => path.startsWith('/scan'), title: '扫码管理', subtitle: '查看现场扫码、安装打卡与质检反馈。' },
  { match: (path) => path.startsWith('/users'), title: '用户管理', subtitle: '维护账户、角色权限与项目成员。' },
  { match: (path) => path.startsWith('/project-statistics'), title: '项目统计', subtitle: '追踪项目维度的数据表现与执行效率。' },
  { match: (path) => path.startsWith('/manual'), title: '信息中心', subtitle: '查看说明文档、流程指引和帮助内容。' },
  { match: (path) => path.startsWith('/profile'), title: '个人中心', subtitle: '更新个人资料、密码与登录信息。' },
  { match: (path) => path.startsWith('/settings'), title: '系统设置', subtitle: '管理系统配置、默认参数与平台行为。' }
]

const roleTextMap = {
  admin: '系统管理员',
  projectManager: '项目经理',
  projectEngineer: '项目工程师',
  qualityInspector: '质检人员',
  installer: '安装人员'
}

const sidebarCollapsed = ref(window.innerWidth < 1360)
const isMobile = ref(window.innerWidth <= 960)
const mobileMenuOpen = ref(false)

const canAccess = (roles) => !roles || roles.includes(userStore.userInfo?.role)

const defaultRoute = computed(() =>
  ['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role) ? '/' : '/bim'
)

const filteredNavItems = computed(() =>
  navItems
    .map((item) => {
      if (!item.children) {
        return canAccess(item.roles) ? item : null
      }

      const children = item.children.filter((child) => canAccess(child.roles))
      return children.length ? { ...item, children } : null
    })
    .filter(Boolean)
)

const mobileNavItems = computed(() => {
  const preferredOrder = ['/', '/projects', '/bim', '/embedded-parts', '/scan', '/project-statistics', '/manual']
  const leafItems = filteredNavItems.value.flatMap((item) => item.children || item)

  return preferredOrder
    .map((index) => leafItems.find((item) => item.index === index))
    .filter(Boolean)
})

const activeIndex = computed(() => route.path)
const menuCollapsed = computed(() => !isMobile.value && sidebarCollapsed.value)
const matchedMeta = computed(() => pageMeta.find((item) => item.match(route.path)) || pageMeta[0])
const pageTitle = computed(() => matchedMeta.value.title)
const pageSubtitle = computed(() => matchedMeta.value.subtitle)
const avatarFallback = computed(() => userStore.userInfo?.name?.slice(0, 1) || 'U')
const roleLabel = computed(() => roleTextMap[userStore.userInfo?.role] || '平台用户')
const currentDateLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
)

const updateViewport = () => {
  const nextIsMobile = window.innerWidth <= 960
  isMobile.value = nextIsMobile

  if (!nextIsMobile) {
    mobileMenuOpen.value = false
    sidebarCollapsed.value = window.innerWidth < 1360
  }
}

const handleNavigate = (path) => {
  if (!path || path === route.path) {
    mobileMenuOpen.value = false
    return
  }

  router.push(path)
  mobileMenuOpen.value = false
}

const handleMenuSelect = (index) => {
  if (!index.startsWith('/')) {
    return
  }

  handleNavigate(index)
}

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileMenuOpen.value = !mobileMenuOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false
  }
)

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
})
</script>

<style scoped>
.layout-shell {
  display: flex;
  min-height: 100vh;
  color: var(--app-text);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(8, 14, 27, 0.48);
  backdrop-filter: blur(6px);
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  width: 288px;
  height: 100vh;
  padding: 20px 16px 18px;
  background: var(--app-sidebar);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 30px 0 60px rgba(6, 14, 28, 0.14);
  transition: width 0.24s ease, transform 0.28s ease;
  z-index: 25;
}

.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 72%);
  pointer-events: none;
}

.sidebar.collapsed {
  width: 96px;
}

.brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 24px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-mark {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px;
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(7, 15, 29, 0.16));
}

.brand-panel.compact {
  justify-content: center;
  padding: 12px 10px;
}

.brand-panel.compact .brand-mark {
  width: 48px;
  height: 48px;
  padding: 6px;
  border-radius: 16px;
}

.brand-copy strong {
  display: block;
  color: #fff;
  font-size: 1.02rem;
  letter-spacing: 0.02em;
}

.brand-copy span {
  display: block;
  margin-top: 4px;
  color: var(--app-sidebar-muted);
  font-size: 0.78rem;
}

.sidebar-meta {
  position: relative;
  z-index: 1;
  margin: 18px 0 20px;
  padding: 0 10px;
}

.sidebar-meta-label {
  display: block;
  margin-bottom: 6px;
  color: rgba(198, 209, 226, 0.58);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.sidebar-meta strong {
  color: #f8fbff;
  font-size: 0.96rem;
}

.sidebar-menu {
  position: relative;
  z-index: 1;
  flex: 1;
  padding-right: 4px;
  background: transparent;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 48px;
  margin-bottom: 8px;
  color: rgba(224, 232, 243, 0.72);
  border-radius: 16px;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.24) 0%, rgba(37, 99, 235, 0.06) 100%);
  box-shadow: inset 0 0 0 1px rgba(74, 126, 255, 0.24);
}

.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background: transparent;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  color: rgba(211, 221, 234, 0.68);
  margin-left: 4px;
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-footer p {
  margin: 0 0 14px;
  color: rgba(223, 232, 243, 0.72);
  font-size: 0.86rem;
  line-height: 1.55;
}

.sidebar-footer-action {
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.main-panel {
  flex: 1;
  min-width: 0;
  padding: 20px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 94px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.sidebar-toggle {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--app-primary);
  cursor: pointer;
}

.page-copy h1 {
  margin: 0;
  font-size: clamp(1.6rem, 2vw, 2rem);
  letter-spacing: -0.03em;
}

.page-copy p:last-child {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 0.95rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(244, 247, 252, 0.88);
  border: 1px solid rgba(128, 145, 170, 0.16);
  color: var(--app-text-muted);
  font-size: 0.86rem;
  font-weight: 600;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--app-success);
  box-shadow: 0 0 0 6px rgba(19, 145, 109, 0.14);
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 6px 10px 6px 6px;
  border: 0;
  border-radius: 18px;
  background: rgba(247, 250, 253, 0.9);
  cursor: pointer;
  color: var(--app-text);
}

.user-trigger-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  text-align: left;
}

.user-trigger-copy strong {
  font-size: 0.95rem;
}

.user-trigger-copy small {
  margin-top: 2px;
  color: var(--app-text-soft);
  font-size: 0.78rem;
}

.content-wrapper {
  min-height: calc(100vh - 134px);
  overflow: auto;
}

.mobile-dock {
  display: none;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.24s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .topbar-chip-role {
    display: none;
  }
}

@media (max-width: 960px) {
  .layout-shell {
    display: block;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(84vw, 320px);
    transform: translateX(-100%);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-panel {
    padding: 12px 12px 88px;
  }

  .topbar {
    position: sticky;
    top: 12px;
    z-index: 10;
    min-height: auto;
    padding: 16px;
  }

  .topbar-chip-role,
  .topbar-chip-date {
    display: none;
  }

  .content-wrapper {
    min-height: auto;
    overflow: visible;
  }

  .mobile-dock {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 18;
    display: flex;
    gap: 8px;
    padding: 8px;
    overflow-x: auto;
    border-radius: 24px;
    background: rgba(12, 21, 38, 0.86);
    box-shadow: 0 24px 54px rgba(8, 20, 40, 0.26);
    backdrop-filter: blur(16px);
  }

  .mobile-dock-item {
    min-width: 72px;
    min-height: 60px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 18px;
    background: transparent;
    color: rgba(225, 233, 244, 0.72);
    cursor: pointer;
    flex-shrink: 0;
  }

  .mobile-dock-item.active {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  .mobile-dock-item span {
    font-size: 0.74rem;
    white-space: nowrap;
  }
}

@media (max-width: 640px) {
  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-left,
  .topbar-right {
    width: 100%;
  }

  .topbar-right {
    justify-content: space-between;
  }

  .user-trigger {
    flex: 1;
    justify-content: space-between;
  }
}
</style>
