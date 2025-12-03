import { createPinia } from 'pinia'
import { defineStore } from 'pinia'

// 创建Pinia实例
const pinia = createPinia()

// 用户Store
export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    userRole: (state) => state.userInfo?.role || ''
  },
  actions: {
    login(user, token) {
      this.userInfo = user
      this.token = token
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    },
    logout() {
      this.userInfo = null
      this.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
    updateUserInfo(info) {
      this.userInfo = { ...this.userInfo, ...info }
      localStorage.setItem('user', JSON.stringify(this.userInfo))
    }
  }
})

// 项目Store
export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [],
    currentProject: null,
    selectedModel: null
  }),
  actions: {
    setProjects(projects) {
      this.projects = projects
    },
    selectProject(project) {
      this.currentProject = project
    },
    selectModel(model) {
      this.selectedModel = model
    },
    addProject(project) {
      this.projects.push(project)
    },
    updateProject(updatedProject) {
      const index = this.projects.findIndex(p => p.id === updatedProject.id)
      if (index !== -1) {
        this.projects[index] = updatedProject
      }
      if (this.currentProject?.id === updatedProject.id) {
        this.currentProject = updatedProject
      }
    }
  }
})

// 预埋件Store
export const useEmbeddedPartStore = defineStore('embeddedPart', {
  state: () => ({
    embeddedParts: [],
    currentEmbeddedPart: null,
    scanHistory: []
  }),
  actions: {
    setEmbeddedParts(parts) {
      this.embeddedParts = parts
    },
    selectEmbeddedPart(part) {
      this.currentEmbeddedPart = part
    },
    addEmbeddedPart(part) {
      this.embeddedParts.push(part)
    },
    updateEmbeddedPart(updatedPart) {
      const index = this.embeddedParts.findIndex(p => p.id === updatedPart.id)
      if (index !== -1) {
        this.embeddedParts[index] = updatedPart
      }
      if (this.currentEmbeddedPart?.id === updatedPart.id) {
        this.currentEmbeddedPart = updatedPart
      }
    },
    addScanRecord(record) {
      this.scanHistory.unshift(record)
    },
    updateScanStatus(partId, status, notes = '') {
      const part = this.embeddedParts.find(p => p.id === partId)
      if (part) {
        part.status = status
        part.lastUpdated = new Date().toISOString()
        part.notes = notes
      }
    }
  }
})

export default pinia