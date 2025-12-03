<template>
  <div class="app-container">
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
                <el-dropdown-item>
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item>
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
  background-color: #001529;
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-collapsed {
  width: 64px;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #1f2f3d;
}

.logo h2 {
  margin: 0;
  color: #fff;
  font-size: 20px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: transparent;
}

.el-menu-item {
  color: rgba(255, 255, 255, 0.65) !important;
}

.el-menu-item:hover,
.el-menu-item.is-active {
  background-color: #1890ff !important;
  color: #fff !important;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部导航栏 */
.top-header {
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.menu-toggle {
  font-size: 20px;
  cursor: pointer;
  color: #1890ff;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-info span {
  margin-left: 8px;
  color: #333;
}

/* 内容区域 */
.content-wrapper {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background-color: #f5f7fa;
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
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 8px;
  }
  
  .top-header {
    padding: 0 12px;
  }
}
</style>