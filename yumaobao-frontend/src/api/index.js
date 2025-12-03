import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index'
import router from '../router/index'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端API基础URL
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    // 如果存在token则添加到请求头
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore = useUserStore()
          userStore.logout()
          router.push('/login')
          ElMessage.error('登录已过期，请重新登录')
          break
        case 403:
          ElMessage.error('没有权限访问此资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(`请求错误：${error.response.data.message || '未知错误'}`)
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      ElMessage.error('网络错误，服务器无响应')
    } else {
      // 请求配置错误
      ElMessage.error(`请求配置错误：${error.message}`)
    }
    return Promise.reject(error)
  }
)

// API请求封装
export default {
  // 用户相关API
  user: {
    login(data) {
      return api.post('/users/login', data)
    },
    register(data) {
      return api.post('/users/register', data)
    },
    getProfile() {
      return api.get('/users/profile')
    },
    updateProfile(data) {
      return api.put('/users/profile', data)
    },
    changePassword(data) {
      return api.put('/users/password', data)
    }
  },
  // 项目相关API
  project: {
    getProjects(params) {
      return api.get('/projects', { params })
    },
    getProject(id) {
      return api.get(`/projects/${id}`)
    },
    createProject(data) {
      return api.post('/projects', data)
    },
    updateProject(id, data) {
      return api.put(`/projects/${id}`, data)
    },
    deleteProject(id) {
      return api.delete(`/projects/${id}`)
    }
  },
  // 预埋件相关API
  embeddedPart: {
    getEmbeddedParts(params) {
      return api.get('/embedded-parts', { params })
    },
    getEmbeddedPart(id) {
      return api.get(`/embedded-parts/${id}`)
    },
    createEmbeddedPart(data) {
      return api.post('/embedded-parts', data)
    },
    updateEmbeddedPart(id, data) {
      return api.put(`/embedded-parts/${id}`, data)
    },
    deleteEmbeddedPart(id) {
      return api.delete(`/embedded-parts/${id}`)
    },
    scanEmbeddedPart(qrcode) {
      return api.post(`/embedded-parts/scan/${qrcode}`)
    },
    updateScanStatus(id, status, notes) {
      return api.put(`/embedded-parts/${id}/scan-status`, { status, notes })
    }
  },
  // BIM模型相关API
  bimModel: {
    getBIMModels(params) {
      return api.get('/models', { params })
    },
    getBIMModel(id) {
      return api.get(`/models/${id}`)
    },
    downloadBIMModel(id) {
      return api.get(`/models/${id}/download`, { responseType: 'blob' })
    },
    uploadBIMModel(data) {
      return api.post('/models/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    updateBIMModel(id, data) {
      return api.put(`/models/${id}`, data)
    },
    deleteBIMModel(id) {
      return api.delete(`/models/${id}`)
    }
  },
  // 移动端相关API
  mobile: {
    scanQRCode(data) {
      return api.post('/mobile/scan-qrcode', data)
    },
    installEmbeddedPart(id) {
      return api.post(`/mobile/embedded-parts/${id}/install`)
    },
    inspectEmbeddedPart(id) {
      return api.post(`/mobile/embedded-parts/${id}/inspect`)
    },
    getMobileProjects() {
      return api.get('/mobile/projects')
    },
    getProjectEmbeddedParts(projectId) {
      return api.get(`/mobile/projects/${projectId}/embedded-parts`)
    },
    getMobileTasks() {
      return api.get('/mobile/tasks')
    }
  }
}
