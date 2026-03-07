// src/api/index.js

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/index' // 保留，响应拦截器需要用到
import router from '../router/index'

// 创建axios实例
const api = axios.create({
  baseURL: '/api', // 设置为'/api'，确保请求路径符合代理配置要求
  timeout: 60000 // 基础请求超时时间增加到60秒
  // 不设置全局Content-Type，让axios根据请求数据自动设置
})

// 不同请求类型的超时时间配置
const TIMEOUT_CONFIG = {
  default: 60000,     // 默认60秒
  upload: 300000,     // 文件上传5分钟
  download: 120000    // 文件下载2分钟
}

// 请求拦截器 - 【已修复】
api.interceptors.request.use(
  config => {
    let token = localStorage.getItem('token')
    if (!config.headers) {
      config.headers = {}
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      const headersCopy = { ...config.headers }
      if (headersCopy.Authorization) {
        headersCopy.Authorization = headersCopy.Authorization.substring(0, 30) + '...'
      }
    } else {
      console.log('请求拦截器：未找到 token，请求可能失败')
    }

    return config
  },
  error => {
    // 对请求错误做些什么
    console.error('请求拦截器：请求配置错误', error.message)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 修复404错误处理和blob响应
api.interceptors.response.use(
  response => {
    // 如果是blob类型，检查响应状态码再返回
    if (response.config.responseType === 'blob') {
      // 如果响应状态码不是2xx，抛出错误
      if (response.status < 200 || response.status >= 300) {
        // 创建错误对象
        const error = new Error(`Request failed with status code ${response.status}`)
        error.response = response
        return Promise.reject(error)
      }
      return response.data
    }
    // 对普通响应数据，直接返回响应体
    return response.data
  },
  error => {
    // 对响应错误做点什么
    console.error('响应拦截器：捕获到错误', error.message)

    // 添加详细的错误日志
    if (error.config) {
      console.error('请求URL:', error.config.url)
      console.error('请求方法:', error.config.method)
      console.error('请求参数:', error.config.params || error.config.data)
    }

    if (error.response) {
      console.error('响应拦截器：错误响应状态', error.response.status)
      console.error('响应拦截器：错误响应数据', error.response.data)

      let errorMessage = '请求失败，请稍后重试'

      switch (error.response.status) {
        case 401:
          // 未授权，添加更详细的日志
          console.error('响应拦截器：401未授权错误，当前token', localStorage.getItem('token') ? localStorage.getItem('token').substring(0, 20) + '...' : 'null')
          errorMessage = '登录已过期，请重新登录'
          // 延迟清除token和跳转到登录页，以便查看日志
          setTimeout(() => {
            const userStore = useUserStore() // 在这里使用是安全的
            userStore.logout()
            router.push('/login')
            ElMessage.error(errorMessage)
          }, 1000)
          break
        case 403:
          if (error.config && error.config.suppress403) {
            console.warn('响应拦截器：403错误被抑制', error.config.url)
          } else {
            errorMessage = '没有权限访问此资源'
            ElMessage.error(errorMessage)
          }
          break
        case 404:
          // 更详细的404错误信息
          if (error.config.url && error.config.url.includes('downloadBIMModel')) {
            errorMessage = '模型文件不存在或已被删除'
          } else {
            errorMessage = '请求的资源不存在'
          }
          ElMessage.error(errorMessage)
          break
        case 500:
          errorMessage = '服务器内部错误'
          if (error.response.data && error.response.data.message) {
            errorMessage = `服务器错误：${error.response.data.message}`
          }
          ElMessage.error({
            message: errorMessage,
            duration: 5000,
            showClose: true
          })
          break
        default:
          // 针对文件上传的错误，提供更具体的错误信息
          if (error.config.url && error.config.url.includes('/models') && error.config.method === 'post') {
            if (error.response.status === 413) {
              errorMessage = '文件过大，请选择较小的文件或压缩后重试'
            } else if (error.response.status === 415) {
              errorMessage = '不支持的文件格式，请选择支持的格式'
            } else if (error.response.status >= 500) {
              errorMessage = '服务器处理文件时出错，请稍后重试'
            } else {
              errorMessage = `文件上传失败：${error.response.data?.message || error.response.statusText || '未知错误'}`
            }
          } else {
            errorMessage = `请求错误：${error.response.data?.message || error.response.statusText || '未知错误'}`
          }

          ElMessage.error({
            message: errorMessage,
            duration: 6000,
            showClose: true
          })
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      // 如果是网络错误，提供更详细的诊断信息
      if (error.message && error.message.includes('timeout')) {
        errorMessage = `上传超时，请检查网络连接或文件是否过大。当前超时时间: ${TIMEOUT_CONFIG.upload / 1000}秒`
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '请求被取消，可能由于网络不稳定'
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = '网络连接错误，请检查网络设置或服务器状态'
      } else {
        errorMessage = `网络错误，服务器无响应: ${error.message || '未知错误'}`
      }

      ElMessage.error({
        message: errorMessage,
        duration: 8000,
        showClose: true
      })
    } else {
      // 请求配置错误
      console.error('响应拦截器：请求配置错误', error.message)
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
    },
    // 用户管理相关API
    getUsers(params) {
      return api.get('/users', { params })
    },
    getUser(id) {
      return api.get(`/users/${id}`)
    },
    createUser(data) {
      return api.post('/users', data)
    },
    updateUser(id, data) {
      return api.put(`/users/${id}`, data)
    },
    deleteUser(id) {
      return api.delete(`/users/${id}`)
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
    },
    // 坐标配置
    getCoordinateConfig(projectId) {
      return api.get(`/projects/${projectId}/coordinate-config`)
    },
    updateCoordinateConfig(projectId, config) {
      return api.put(`/projects/${projectId}/coordinate-config`, config)
    }
  },
  // 楼层相关API
  floor: {
    getFloors(projectId, config = {}) {
      return projectId ? api.get(`/projects/${projectId}/floors`, config) : Promise.resolve([])
    },
    getFloor(projectId, floorId) {
      return api.get(`/projects/${projectId}/floors/${floorId}`)
    },
    createFloor(projectId, floorData) {
      return api.post(`/projects/${projectId}/floors`, floorData)
    },
    updateFloor(projectId, floorId, floorData) {
      return api.put(`/projects/${projectId}/floors/${floorId}`, floorData)
    },
    deleteFloor(projectId, floorId) {
      return api.delete(`/projects/${projectId}/floors/${floorId}`)
    }
  },
  // 预埋件相关API
  embeddedPart: {
    getEmbeddedParts(params) {
      // 统一使用带有各种过滤参数和分页支持的通用查询API
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
    batchDeleteEmbeddedParts(ids) {
      return api.post('/embedded-parts/batch/delete', { ids })
    },
    generateQRCode(id) {
      return api.get(`/embedded-parts/${id}/qrcode`, { responseType: 'blob' })
    }
  },
  // BIM模型相关API
  bimModel: {
    getBIMModels(params, config = {}) {
      return api.get('/models', { params, ...config })
    },
    getBIMModel(id) {
      return api.get(`/models/${id}`)
    },
    downloadBIMModel(id, useLightweight = true) {
      return api.get(`/models/${id}/download`, {
        responseType: 'blob',
        params: { useLightweight },
        timeout: TIMEOUT_CONFIG.download
      })
    },
    uploadBIMModel(data, onUploadProgress) {
      return api.post('/models', data, {
        timeout: TIMEOUT_CONFIG.upload,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onUploadProgress || function (progressEvent) {
          // 默认进度回调
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            console.log(`上传进度: ${progress}%`)
          }
        }
      })
    },
    updateBIMModel(id, data) {
      return api.put(`/models/${id}`, data)
    },
    deleteBIMModel(id) {
      return api.delete(`/models/${id}`)
    },
    // IFC模型转换API
    convertIFCModel(id, params) {
      return api.post(`/models/${id}/convert`, params)
    }
  },
  // 移动端相关API
  mobile: {
    scanQRCode(data) {
      return api.post('/mobile/scan-qrcode', data)
    },
    installEmbeddedPart(id, photos = []) {
      const formData = new FormData()
      if (photos && photos.length > 0) {
        photos.forEach(f => formData.append('photos', f))
      }
      return api.post(`/mobile/embedded-parts/${id}/install`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    inspectEmbeddedPart(id, data = {}, photos = []) {
      const formData = new FormData()
      if (data.notes) formData.append('notes', data.notes)
      if (data.status) formData.append('status', data.status)
      if (photos && photos.length > 0) {
        photos.forEach(f => formData.append('photos', f))
      }
      return api.post(`/mobile/embedded-parts/${id}/inspect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
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
  },
  // 技术手册/信息中心API
  manual: {
    getManuals() {
      return api.get('/manuals')
    },
    getManualById(id) {
      return api.get(`/manuals/${id}`)
    },
    searchManuals(keyword) {
      return api.get('/manuals/search', { params: { keyword } })
    },
    seedManuals() {
      return api.post('/manuals/seed')
    }
  }
}
