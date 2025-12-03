import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import ProjectManagement from '../views/ProjectManagement.vue'
// 以下组件暂未创建，先注释
// import BIMVisualization from '../views/BIMVisualization.vue'
// import EmbeddedPartManagement from '../views/EmbeddedPartManagement.vue'
// import QRCodeScan from '../views/QRCodeScan.vue'
// import UserManagement from '../views/UserManagement.vue'

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
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'projects',
        name: 'ProjectManagement',
        component: ProjectManagement,
        meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer'] }
      },
      // 以下组件暂未创建，先注释
      // {
      //   path: 'bim',
      //   name: 'BIMVisualization',
      //   component: BIMVisualization,
      //   meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector'] }
      // },
      // {
      //   path: 'embedded-parts',
      //   name: 'EmbeddedPartManagement',
      //   component: EmbeddedPartManagement,
      //   meta: { requiresRole: ['projectManager', 'admin', 'projectEngineer', 'qualityInspector'] }
      // },
      // {
      //   path: 'scan',
      //   name: 'QRCodeScan',
      //   component: QRCodeScan,
      //   meta: { requiresRole: ['installer', 'qualityInspector', 'projectManager'] }
      // },
      // {
      //   path: 'users',
      //   name: 'UserManagement',
      //   component: UserManagement,
      //   meta: { requiresRole: ['admin'] }
      // }
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
          // 没有权限，重定向到仪表板
          next({ name: 'Dashboard' })
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