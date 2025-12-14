import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import ProjectManagement from '../views/ProjectManagement.vue'
import BIMVisualization from '../views/BIMVisualization.vue'
import EmbeddedPartManagement from '../views/EmbeddedPartManagement.vue'
import QRCodeScan from '../views/QRCodeScan.vue'
import Profile from '../views/Profile.vue'
import SystemSettings from '../views/SystemSettings.vue'
import UploadTest from '../views/UploadTest.vue'
import UserManagement from '../views/UserManagement.vue'
import ProjectStatistics from '../views/ProjectStatistics.vue'
import ModelManagement from '../views/ModelManagement.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/',
    name: 'Layout',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      {        path: '',        name: 'Dashboard',        component: Dashboard,        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer'] }      },
      {
        path: 'projects',
        name: 'ProjectManagement',
        component: ProjectManagement,
        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer'] }
      },
      {
        path: 'bim',
        name: 'BIMVisualization',
        component: BIMVisualization,
        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'] }
      },
      {
        path: 'model-management',
        name: 'ModelManagement',
        component: ModelManagement,
        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer'] }
      },
      {        path: 'embedded-parts',        name: 'EmbeddedPartManagement',        component: EmbeddedPartManagement,        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer'] }      },
      {        path: 'scan',        name: 'QRCodeScan',        component: QRCodeScan,        meta: { requiresRole: ['installer', 'qualityInspector', 'projectManager', 'admin', 'projectEngineer'] }      },
      {
        path: 'profile',
        name: 'Profile',
        component: Profile
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: SystemSettings
      },
      {
        path: 'upload-test',
        name: 'UploadTest',
        component: UploadTest
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: UserManagement,
        meta: { requiresRole: ['admin', 'projectManager', 'projectEngineer'] }
      },
      {
        path: 'project-statistics',
        name: 'ProjectStatistics',
        component: ProjectStatistics,
        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 从本地存储获取用户信息
    const user = JSON.parse(localStorage.getItem('user'))
    
    if (!user) {
      // 未登录，重定向到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else {
      // 检查是否需要特定角色
      if (to.matched.some(record => record.meta.requiresRole)) {
        const requiresRole = to.meta.requiresRole
        if (requiresRole.includes(user.role)) {
          next()
        } else {
          // 没有权限，根据用户角色重定向到合适的页面
          if (['installer', 'qualityInspector'].includes(user.role)) {
            // 安装人员和质检人员重定向到BIM可视化页面
            next({ name: 'BIMVisualization' })
          } else {
            // 其他用户重定向到仪表盘
            next({ name: 'Dashboard' })
          }
        }
      } else {
        next()
      }
    }
  } else {
    next()
  }
})

export default router