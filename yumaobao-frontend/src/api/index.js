// src/api/index.js

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index' // 保留，响应拦截器需要用到
import router from '../router/index'

// 创建axios实例
const api = axios.create({
  baseURL: '/api', // 设置为'/api'，确保请求路径符合代理配置要求
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 【已修复】
api.interceptors.request.use(
  config => {
    // 【关键修改】直接从 localStorage 读取 token，避免时机问题
    const token = localStorage.getItem('token')
    
    // 如果 token 存在，则添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('请求拦截器：成功添加 token', token.substring(0, 20) + '...') // 打印前20个字符用于调试
    } else {
      console.log('请求拦截器：未找到 token，请求可能失败')
    }
    
    return config
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 响应拦截器 - 保持不变
api.interceptors.response.use(
  response => {
    // 对响应数据做点什么，直接返回响应体
    return response.data
  },
  error => {
    // 对响应错误做点什么
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore = useUserStore() // 在这里使用是安全的
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

// API请求封装 - 保持不变
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
    },
    deleteProfile() {
      return api.delete('/users/profile')
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
  // 楼层相关API
  floor: {
    getFloors(projectId) {
      return projectId ? api.get(`/projects/${projectId}/floors`) : Promise.resolve([])
    },
    getFloor(projectId, floorId) {
      return api.get(`/projects/${projectId}/floors/${floorId}`)
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
    },
    batchCreateEmbeddedParts(data) {
      return api.post('/embedded-parts/batch', data)
    },
    generateQRCode(id) {
      return api.get(`/embedded-parts/${id}/qrcode`)
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
    downloadBIMModel(id, useLightweight = true) {
      return api.get(`/models/${id}/download`, { 
        responseType: 'blob',
        params: { useLightweight } 
      })
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
  },
  // 报告生成相关API
  report: {
    // 生成项目进度报告
    generateProjectReport(projectId, dateRange) {
      return api.post(`/reports/project-progress/${projectId}`, { dateRange })
    },
    // 生成预埋件状态报告
    generateEmbeddedPartReport(filters) {
      return api.post('/reports/embedded-parts-status', filters)
    },
    // 生成报告文件
    generateReportFile(reportData, format) {
      return api.post('/reports/generate-file', { reportData, format }, {
        responseType: 'blob' // 重要：设置响应类型为blob以接收文件
      })
    }
  }
}
