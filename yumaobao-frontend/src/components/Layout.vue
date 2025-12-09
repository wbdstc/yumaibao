<template>
  <div class="app-container page-transition">
    <!-- 侧边导航栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="logo">
        <h2 v-if="!sidebarCollapsed">预埋宝</h2>
        <h2 v-else>预</h2>
      </div>
      <el-menu
        :default-active="activeIndex"
        class="sidebar-menu"
        router
        :collapse="sidebarCollapsed"
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <template #title>
            <span>仪表盘</span>
          </template>
        </el-menu-item>
        <el-menu-item index="/projects">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>
            <span>项目管理</span>
          </template>
        </el-menu-item>
        <el-menu-item index="/bim">
          <el-icon><PictureFilled /></el-icon>
          <template #title>
            <span>BIM可视化</span>
          </template>
        </el-menu-item>
        <el-menu-item index="/embedded-parts">
          <el-icon><Box /></el-icon>
          <template #title>
            <span>预埋件管理</span>
          </template>
        </el-menu-item>
        <!-- 扫码管理菜单项暂不显示 -->
        <!-- <el-menu-item index="/scan">
          <el-icon><Scan /></el-icon>
          <span>扫码管理</span>
        </el-menu-item> -->
        <!-- 用户管理菜单项暂不显示 -->
        <!-- <el-menu-item index="/users" v-if="userStore.userInfo?.role === 'admin'">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item> -->
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
  SwitchButton
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
    SwitchButton
  },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const sidebarCollapsed = ref(false)
    
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

.logo h2 {
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: transparent;
}

:deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8) !important;
  border-left: 3px solid transparent;
  transition: all 0.3s ease !important;
  padding: 12px 16px !important;
  font-size: 14px !important;
}

:deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-left-color: var(--safety-orange) !important;
}

:deep(.el-menu-item.is-active) {
  background-color: rgba(255, 115, 22, 0.2) !important;
  color: #fff !important;
  border-left-color: var(--safety-orange) !important;
  font-weight: 600 !important;
}

/* 侧边栏图标样式 */
:deep(.el-icon) {
  font-size: 18px !important;
  margin-right: 8px !important;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(0);
  }
  
  .sidebar-collapsed {
    transform: translateX(-100%);
    width: 220px;
  }
  
  .main-content {
    width: 100%;
  }
  
  .content-wrapper {
    padding: 16px;
  }
  
  /* 移动端底部导航栏 */
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