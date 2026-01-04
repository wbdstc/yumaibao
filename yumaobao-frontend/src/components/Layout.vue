<template>
  <div class="app-container page-transition">
    <!-- 侧边导航栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="logo">
        <div class="logo-container">
          <img 
            v-if="!sidebarCollapsed" 
            src="../assets/logo-full.png" 
            alt="预埋宝"
            class="logo-img logo-img-full"
          />
          <span v-if="!sidebarCollapsed" class="logo-text">预埋宝</span>
          <img 
            v-else 
            src="../assets/logo-icon.png" 
            alt="预"
            class="logo-img logo-img-icon"
          />
        </div>
      </div>
      <el-menu
        :default-active="activeIndex"
        class="sidebar-menu"
        router
        :collapse="sidebarCollapsed"
      >
        <!-- 仪表盘菜单项 - 仅管理员、项目经理和工程师可见 -->
        <el-menu-item index="/" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
          <el-icon><House /></el-icon>
          <template #title>
            <span>仪表盘</span>
          </template>
        </el-menu-item>
        <!-- 项目管理菜单项 - 仅管理员、项目经理和工程师可见 -->
        <el-menu-item index="/projects" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>
            <span>项目管理</span>
          </template>
        </el-menu-item>
        <!-- BIM可视化子菜单 -->
        <el-sub-menu index="/bim">
          <template #title>
            <el-icon><PictureFilled /></el-icon>
            <span>BIM可视化</span>
          </template>
          <!-- BIM可视化主页面 - 所有角色可见 -->
          <el-menu-item index="/bim">
            <el-icon><Monitor /></el-icon>
            <span>模型查看</span>
          </el-menu-item>
          <!-- 模型管理页面 - 仅管理员、项目经理和工程师可见 -->
          <el-menu-item index="/model-management" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
            <el-icon><DocumentAdd /></el-icon>
            <span>模型管理</span>
          </el-menu-item>
        </el-sub-menu>
        <!-- 预埋件管理菜单项 - 仅管理员、项目经理和工程师可见 -->
        <el-menu-item index="/embedded-parts" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
          <el-icon><Box /></el-icon>
          <template #title>
            <span>预埋件管理</span>
          </template>
        </el-menu-item>
        <!-- 扫码管理菜单项 -->
        <el-menu-item index="/scan" v-if="['installer', 'qualityInspector', 'projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
          <el-icon><View /></el-icon>
          <template #title>
            <span>扫码管理</span>
          </template>
        </el-menu-item>
        <!-- 用户管理菜单项 -->
        <el-menu-item index="/users" v-if="userStore.userInfo?.role === 'admin'">
          <el-icon><User /></el-icon>
          <template #title>
            <span>用户管理</span>
          </template>
        </el-menu-item>
        <!-- 项目统计菜单项 - 所有角色可见 -->
        <el-menu-item index="/project-statistics">
          <el-icon><TrendCharts /></el-icon>
          <template #title>
            <span>项目统计</span>
          </template>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 顶部导航栏 -->
      <header class="top-header">
        <div class="header-left">
          <el-icon class="menu-toggle" @click="toggleSidebar"><Menu /></el-icon>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar || ''">{{ userStore.userInfo?.name?.[0] || '用' }}</el-avatar>
              <span>{{ userStore.userInfo?.name || '用户' }}</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$router.push('/profile')">
              <el-icon><User /></el-icon>
              个人信息
            </el-dropdown-item>
            <el-dropdown-item @click="$router.push('/settings')">
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

      <!-- 内容区域 -->
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>

    <!-- 移动端底部导航栏 -->
    <div class="mobile-bottom-nav">
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/' }" @click="$router.push('/')">
        <el-icon><House /></el-icon>
        <span>仪表盘</span>
      </div>
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/projects' }" @click="$router.push('/projects')" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
        <el-icon><OfficeBuilding /></el-icon>
        <span>项目管理</span>
      </div>
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/bim' }" @click="$router.push('/bim')" v-if="['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'].includes(userStore.userInfo?.role)">
        <el-icon><PictureFilled /></el-icon>
        <span>BIM可视化</span>
      </div>
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/embedded-parts' }" @click="$router.push('/embedded-parts')" v-if="['projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
        <el-icon><Box /></el-icon>
        <span>预埋件管理</span>
      </div>
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/scan' }" @click="$router.push('/scan')" v-if="['installer', 'qualityInspector', 'projectManager', 'admin', 'projectEngineer'].includes(userStore.userInfo?.role)">
        <el-icon><View /></el-icon>
        <span>扫码管理</span>
      </div>
      <div class="mobile-nav-item" :class="{ active: activeIndex === '/project-statistics' }" @click="$router.push('/project-statistics')">
        <el-icon><TrendCharts /></el-icon>
        <span>项目统计</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/index'
import {
  House,
  OfficeBuilding,
  PictureFilled,
  Box,
  Menu,
  ArrowDown,
  Setting,
  SwitchButton,
  View,
  User,
  TrendCharts
} from '@element-plus/icons-vue'

export default {
  name: 'Layout',
  components: {
    House,
    OfficeBuilding,
    PictureFilled,
    Box,
    Menu,
    ArrowDown,
    Setting,
    SwitchButton,
    View,
    User,
    TrendCharts
  },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    // 在移动端默认隐藏侧边栏
    const sidebarCollapsed = ref(window.innerWidth <= 768)
    
    const activeIndex = computed(() => {
      return router.currentRoute.value.path
    })
    
    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
    
    const handleLogout = () => {
      userStore.logout()
      router.push('/login')
    }
    
    return {
      activeIndex,
      userStore,
      handleLogout,
      sidebarCollapsed,
      toggleSidebar
    }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 - 建筑工程风格 */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, var(--construction-blue) 0%, var(--construction-blue-dark) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  border-right: 3px solid var(--safety-orange);
  position: relative;
}

/* 侧边栏蓝图纹理叠加 */
.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

.sidebar-collapsed {
  width: 64px;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.15);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
  position: relative;
}

/* logo区域底部装饰线 */
.logo::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 20px;
  right: 20px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--safety-orange) 50%, transparent 100%);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo-text {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  text-transform: uppercase;
}

/* 图片logo样式 */
.logo-img {
  margin: 0;
  width: auto;
  height: auto;
  display: block;
}

/* 完整logo样式 */
.logo-img-full {
  width: 36px;
  height: 36px;
}

/* 折叠状态下的图标样式 */
.logo-img-icon {
  width: 32px;
  height: 32px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: transparent;
}

.sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.85);
  border-left: 3px solid transparent;
  transition: all 0.25s ease;
  padding: 14px 16px;
  font-size: 14px;
  margin: 2px 8px;
  border-radius: 4px;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.25s ease;
  padding: 14px 16px;
  font-size: 14px;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background-color: rgba(0, 0, 0, 0.15);
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  background-color: transparent;
  margin: 2px 8px;
  border-radius: 4px;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-left-color: var(--safety-orange);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-left-color: var(--safety-orange);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0.1) 100%);
  color: #fff;
  border-left-color: var(--safety-orange);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(234, 88, 12, 0.3);
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0.1) 100%);
  color: #fff;
  border-left-color: var(--safety-orange);
  font-weight: 600;
}

/* 侧边栏图标样式 */
.sidebar-menu :deep(.el-icon) {
  font-size: 18px;
  margin-right: 8px;
}

.sidebar-collapsed :deep(.el-icon) {
  margin-right: 0 !important;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--blueprint-bg);
}

/* 顶部导航栏 - 建筑风格 */
.top-header {
  height: 64px;
  background: linear-gradient(180deg, #ffffff 0%, var(--cement-light) 100%);
  border-bottom: 1px solid var(--steel-silver);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: var(--shadow-md);
  position: relative;
}

/* 顶部工程装饰条 */
.top-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--safety-orange) 100%);
}

.top-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--steel-silver) 50%, var(--construction-blue) 100%);
}

.menu-toggle {
  font-size: 24px;
  cursor: pointer;
  color: var(--construction-blue);
  transition: all 0.25s ease;
  padding: 10px;
  border-radius: 6px;
  background: transparent;
}

.menu-toggle:hover {
  color: var(--safety-orange);
  background-color: rgba(234, 88, 12, 0.08);
  transform: scale(1.05);
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--steel-silver);
}

.user-info:hover {
  background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  border-color: var(--construction-blue-light);
}

.user-info span {
  margin-left: 10px;
  color: var(--construction-blue);
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* 内容区域 */
.content-wrapper {
  flex: 1;
  padding: clamp(16px, 2vw, 24px);
  overflow-y: auto;
  background-color: var(--blueprint-bg);
  /* 内容区域蓝图网格 */
  background-image:
    linear-gradient(var(--blueprint-line-dark) 1px, transparent 1px),
    linear-gradient(90deg, var(--blueprint-line-dark) 1px, transparent 1px),
    linear-gradient(var(--blueprint-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--blueprint-line) 1px, transparent 1px);
  background-size: 
    100px 100px,
    100px 100px,
    20px 20px,
    20px 20px;
}

/* 移动端底部导航栏 - 默认隐藏 */
.mobile-bottom-nav {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  /* 移动端侧边栏 - 完全隐藏 */
  .sidebar {
    display: none;
  }
  
  .main-content {
    width: 100%;
  }
  
  .content-wrapper {
    padding: 16px;
  }
  
  /* 移动端底部导航栏 - 仅在移动端显示 */
  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 56px;
    background: linear-gradient(135deg, var(--construction-blue) 0%, #1a2f49 100%);
    border-top: 1px solid var(--steel-silver);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
    z-index: 999;
  }
  
  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 4px 0;
  }
  
  .mobile-nav-item:hover,
  .mobile-nav-item.active {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .mobile-nav-item .el-icon {
    font-size: 20px;
    margin-bottom: 4px;
  }
  
  .mobile-nav-item span {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 8px;
    margin-bottom: 56px; /* 为底部导航栏留出空间 */
  }
  
  .top-header {
    padding: 0 12px;
    height: 56px;
  }
  
  .logo h2 {
    font-size: 18px;
  }
  
  .menu-toggle {
    font-size: 20px;
  }
}
</style>