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

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, var(--construction-blue) 0%, #0f1e30 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  border-right: 1px solid var(--steel-silver);
}

.sidebar-collapsed {
  width: 64px;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
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
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
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
  background-color: #1e3a5f;
}

.sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  border-left: 3px solid transparent;
  transition: all 0.3s ease;
  padding: 12px 16px;
  font-size: 14px;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  color: #ffffff;
  transition: all 0.3s ease;
  padding: 12px 16px;
  font-size: 14px;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background-color: #1b3c92;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  background-color: #1b3c92;
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
  background-color: rgba(255, 115, 22, 0.2);
  color: #fff;
  border-left-color: var(--safety-orange);
  font-weight: 600;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  background-color: rgba(255, 115, 22, 0.2);
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
  background-color: #f8f9fa;
}

/* 顶部导航栏 */
.top-header {
  height: 60px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f2f5 100%);
  border-bottom: 1px solid var(--steel-silver);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.top-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--safety-orange) 100%);
}

.menu-toggle {
  font-size: 24px;
  cursor: pointer;
  color: var(--construction-blue);
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 4px;
}

.menu-toggle:hover {
  color: var(--safety-orange);
  background-color: rgba(249, 115, 22, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.user-info span {
  margin-left: 8px;
  color: var(--construction-blue);
  font-weight: 500;
}

/* 内容区域 */
.content-wrapper {
  flex: 1;
  padding: clamp(16px, 2vw, 24px);
  overflow-y: auto;
  background-color: #f8f9fa;
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