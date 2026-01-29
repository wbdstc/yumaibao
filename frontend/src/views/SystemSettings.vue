<template>
  <div class="system-settings-container">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>
    
    <el-card class="settings-card">
      <div class="settings-section">
        <h3 class="section-title">界面设置</h3>
        
        <el-form label-width="150px" class="settings-form">
          <el-form-item label="主题模式">
            <el-radio-group v-model="settings.theme">
              <el-radio-button label="light">亮色</el-radio-button>
              <el-radio-button label="dark">暗色</el-radio-button>
              <el-radio-button label="auto">跟随系统</el-radio-button>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="侧边栏风格">
            <el-radio-group v-model="settings.sidebarStyle">
              <el-radio-button label="expanded">展开</el-radio-button>
              <el-radio-button label="collapsed">折叠</el-radio-button>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="语言">
            <el-select v-model="settings.language" placeholder="选择语言">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="日期格式">
            <el-select v-model="settings.dateFormat" placeholder="选择日期格式">
              <el-option label="YYYY-MM-DD" value="YYYY-MM-DD" />
              <el-option label="MM/DD/YYYY" value="MM/DD/YYYY" />
              <el-option label="DD/MM/YYYY" value="DD/MM/YYYY" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">通知设置</h3>
        
        <el-form label-width="150px" class="settings-form">
          <el-form-item label="接收通知">
            <el-switch v-model="settings.enableNotifications" />
          </el-form-item>
          
          <el-form-item label="安装提醒">
            <el-switch v-model="settings.installationReminders" :disabled="!settings.enableNotifications" />
          </el-form-item>
          
          <el-form-item label="验收提醒">
            <el-switch v-model="settings.inspectionReminders" :disabled="!settings.enableNotifications" />
          </el-form-item>
          
          <el-form-item label="项目更新提醒">
            <el-switch v-model="settings.projectUpdateReminders" :disabled="!settings.enableNotifications" />
          </el-form-item>
          
          <el-form-item label="系统公告">
            <el-switch v-model="settings.systemNotifications" :disabled="!settings.enableNotifications" />
          </el-form-item>
        </el-form>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">数据管理</h3>
        
        <el-form label-width="150px" class="settings-form">
          <el-form-item label="自动备份">
            <el-switch v-model="settings.autoBackup" />
          </el-form-item>
          
          <el-form-item label="备份频率" v-if="settings.autoBackup">
            <el-select v-model="settings.backupFrequency" placeholder="选择备份频率">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="manualBackup" :loading="backingUp">手动备份数据</el-button>
            <el-button type="warning" @click="exportData" :loading="exporting">导出数据</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="settings-section">
        <h3 class="section-title">演示数据</h3>
        <p style="margin-left: 150px; color: #606266; margin-bottom: 20px;">
          在此处生成或清除模拟数据，用于展示系统功能。生成的数据将归类于"演示项目"中。
        </p>
        <el-form label-width="150px" class="settings-form">
          <el-form-item>
            <el-button type="success" @click="generateDemoData" :loading="generatingDemoData">生成演示数据</el-button>
            <el-button type="danger" @click="clearDemoData" :loading="clearingDemoData">清除演示数据</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">系统信息</h3>
        
        <div class="system-info">
          <div class="info-item">
            <span class="info-label">系统版本：</span>
            <span class="info-value">v1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间：</span>
            <span class="info-value">2023-12-01</span>
          </div>
          <div class="info-item">
            <span class="info-label">开发团队：</span>
            <span class="info-value">预埋宝开发组</span>
          </div>
          <div class="info-item">
            <span class="info-label">技术支持：</span>
            <span class="info-value">support@yumaobao.com</span>
          </div>
        </div>
      </div>
      
      <div class="settings-actions">
        <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
        <el-button @click="resetSettings">恢复默认</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index'

export default {
  name: 'SystemSettings',
  setup() {
    const saving = ref(false)
    const backingUp = ref(false)
    const exporting = ref(false)
    
    // 设置数据
    const settings = reactive({
      // 界面设置
      theme: 'light',
      sidebarStyle: 'expanded',
      language: 'zh-CN',
      dateFormat: 'YYYY-MM-DD',
      
      // 通知设置
      enableNotifications: true,
      installationReminders: true,
      inspectionReminders: true,
      projectUpdateReminders: true,
      systemNotifications: true,
      
      // 数据管理
      autoBackup: false,
      backupFrequency: 'weekly'
    })

    const generatingDemoData = ref(false)
    const clearingDemoData = ref(false)

    // 生成随机字符串
    const randomString = (length) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    // 生成过去30天内的随机日期
    const randomDate = (start, end) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    }

    // 生成模拟数据
    const generateDemoData = async () => {
      try {
        await ElMessageBox.confirm(
          '此操作将生成一个包含随机楼层和预埋件的演示项目，仅用于展示目的。确定要继续吗？',
          '生成演示数据',
          {
            confirmButtonText: '生成',
            cancelButtonText: '取消',
            type: 'info'
          }
        )

        generatingDemoData.value = true
        
        // 1. 生成逼真的项目名称和代码
        const projectNames = ['CBD金融中心一期', '滨江首府住宅区', '高新科技园B栋', '东部医疗中心住院部', '轨道交通12号线枢纽']
        const randomName = projectNames[Math.floor(Math.random() * projectNames.length)]
        const randomCode = `PRJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`
        
        const projectRes = await api.project.createProject({
          name: `${randomName}`,
          code: randomCode,
          description: '重点工程建设项目，包含地下室及地上主体结构。',
          location: '市中心商务区',
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          status: 'under_construction'
        })
        
        // 处理API响应结构
        const projectId = projectRes.data?.id || projectRes.id
        if (!projectId) throw new Error('创建项目失败，未获取到ID')
        
        // 保存生成的演示项目ID到本地存储
        const demoProjectIds = JSON.parse(localStorage.getItem('demoProjectIds') || '[]')
        demoProjectIds.push(projectId)
        localStorage.setItem('demoProjectIds', JSON.stringify(demoProjectIds))
        
        console.log('演示项目创建成功:', projectId)

        // 2. 创建楼层 (3-5层)
        const floors = []
        const floorCount = Math.floor(Math.random() * 3) + 3 // 3-5层
        for (let i = 1; i <= floorCount; i++) {
          const floorRes = await api.floor.createFloor(projectId, {
            name: `${i}F`,
            level: i,
            height: 3000,
            description: `主体结构 ${i}层`
          })
          const floorData = floorRes.data || floorRes
          floors.push(floorData)
        }
        console.log('演示楼层创建成功:', floors.length)

        // 3. 创建预埋件
        const partsToCreate = []
        const statuses = ['pending', 'installed', 'inspected', 'rejected', 'completed']
        const types = ['Givey', 'Bracket', 'Anchor', 'Plate']
        const models = ['M10', 'M12', 'M16', 'M20']
        
        for (const floor of floors) {
          const count = Math.floor(Math.random() * 10) + 10 // 10-20个
          
          for (let j = 0; j < count; j++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            const type = types[Math.floor(Math.random() * types.length)]
            const model = models[Math.floor(Math.random() * models.length)]
            
            // 简单的网格布局位置
            const x = (j % 5) * 2000 + Math.floor(Math.random() * 500)
            const y = Math.floor(j / 5) * 2000 + Math.floor(Math.random() * 500)
            
            // 生成逼真的历史记录
            const statusHistory = []
            let installationDate = null
            let inspectionDate = null
            let inspectorId = null
            
            // 基础时间点
            const baseDate = new Date()
            const installTime = new Date(baseDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000 - 3 * 24 * 60 * 60 * 1000) // 3-10天前
            const inspectTime = new Date(installTime.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000) // 安装后1-3天验收
            
            if (status === 'installed' || status === 'inspected' || status === 'completed' || status === 'rejected') {
              statusHistory.push({
                status: 'installed',
                timestamp: installTime,
                updatedBy: '张强 (施工员)', // 模拟安装人员
                note: '按图纸定位安装完成，位置偏差<5mm'
              })
              installationDate = installTime
            }
            
            if (status === 'inspected' || status === 'completed') {
              statusHistory.push({
                status: 'inspected',
                timestamp: inspectTime,
                updatedBy: '李明 (质检员)', // 模拟质检人员
                note: '验收合格，符合设计要求规范'
              })
              inspectionDate = inspectTime
              inspectorId = 'demo-inspector-001'
            }
            
            if (status === 'rejected') {
              statusHistory.push({
                status: 'rejected',
                timestamp: inspectTime,
                updatedBy: '李明 (质检员)', // 模拟质检人员
                note: '验收不合格：位置偏移过大，请重新调整'
              })
              inspectionDate = inspectTime
              inspectorId = 'demo-inspector-001'
            }
            
            if (status === 'completed') {
               // 模拟归档
               const completeTime = new Date(inspectTime.getTime() + 24 * 60 * 60 * 1000)
               statusHistory.push({
                status: 'completed',
                timestamp: completeTime,
                updatedBy: '系统自动归档',
                note: '流程结束，自动归档'
              })
            }

            const part = {
              projectId: projectId,
              floorId: floor.id,
              floorName: floor.name,
              name: `${type}-${model}-${randomString(4)}`,
              code: `EP-${floor.level}-${String(j + 1).padStart(3, '0')}`,
              type: type,
              modelNumber: model,
              status: status,
              location: `Grid ${String.fromCharCode(65 + (j % 5))}-${Math.floor(j / 5) + 1}`,
              description: '结构预埋件',
              coordinates: JSON.stringify({ x, y, z: floor.level * 3000 }),
              coordinates2D: JSON.stringify({ x, y }),
              statusHistory: statusHistory,
              installationDate: installationDate,
              inspectionDate: inspectionDate,
              inspectorId: inspectorId
            }
            partsToCreate.push(part)
          }
        }
        
        if (partsToCreate.length > 0) {
          await api.embeddedPart.batchCreateEmbeddedParts(partsToCreate)
          console.log(`成功创建 ${partsToCreate.length} 个演示预埋件`)
        }

        ElMessage.success(`成功生成演示数据：${randomName}`)
        
      } catch (error) {
        if (error !== 'cancel') {
          console.error('生成演示数据失败:', error)
          ElMessage.error('生成演示数据失败: ' + (error.response?.data?.message || error.message))
        }
      } finally {
        generatingDemoData.value = false
      }
    }

    // 清除模拟数据
    const clearDemoData = async () => {
      try {
        const demoProjectIds = JSON.parse(localStorage.getItem('demoProjectIds') || '[]')
        
        if (demoProjectIds.length === 0) {
          ElMessage.info('本地记录中没有需要清除的演示数据')
          return
        }

        await ElMessageBox.confirm(
          `检测到 ${demoProjectIds.length} 个由您生成的演示项目。确定要清除吗？这将永久删除这些数据。`,
          '清除演示数据',
          {
            confirmButtonText: '清除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        clearingDemoData.value = true
        
        // 逐个删除
        let deletedCount = 0
        const remainingIds = [...demoProjectIds]
        
        for (const id of demoProjectIds) {
          try {
            await api.project.deleteProject(id)
            deletedCount++
            // 从列表中移除
            const index = remainingIds.indexOf(id)
            if (index > -1) remainingIds.splice(index, 1)
          } catch (err) {
            console.warn(`删除项目 ${id} 失败:`, err)
            if (err.response && err.response.status === 404) {
               // 如果404，说明已经没了，也算删除成功，移除ID
               const index = remainingIds.indexOf(id)
               if (index > -1) remainingIds.splice(index, 1)
            }
          }
        }
        
        // 更新localStorage
        localStorage.setItem('demoProjectIds', JSON.stringify(remainingIds))
        
        if (deletedCount > 0) {
           ElMessage.success(`成功清除 ${deletedCount} 个演示项目`)
        } else {
           ElMessage.info('未清除任何项目（可能已被删除）')
        }
        
      } catch (error) {
         if (error !== 'cancel') {
          console.error('清除演示数据失败:', error)
          ElMessage.error('清除演示数据失败')
        }
      } finally {
        clearingDemoData.value = false
      }
    }
    
    // 初始化设置
    onMounted(() => {
      // 从localStorage加载设置
      const savedSettings = localStorage.getItem('systemSettings')
      if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings))
      }
    })
    
    // 保存设置
    const saveSettings = async () => {
      saving.value = true
      try {
        // 保存到localStorage
        localStorage.setItem('systemSettings', JSON.stringify(settings))
        
        // 应用主题设置
        applyTheme(settings.theme)
        
        // 应用语言设置
        applyLanguage(settings.language)
        
        ElMessage.success('设置保存成功')
      } catch (error) {
        console.error('保存设置失败:', error)
        ElMessage.error('保存设置失败，请稍后重试')
      } finally {
        saving.value = false
      }
    }
    
    // 恢复默认设置
    const resetSettings = () => {
      ElMessageBox.confirm('确定要恢复默认设置吗？所有自定义设置将丢失。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 重置为默认值
        settings.theme = 'light'
        settings.sidebarStyle = 'expanded'
        settings.language = 'zh-CN'
        settings.dateFormat = 'YYYY-MM-DD'
        settings.enableNotifications = true
        settings.installationReminders = true
        settings.inspectionReminders = true
        settings.projectUpdateReminders = true
        settings.systemNotifications = true
        settings.autoBackup = false
        settings.backupFrequency = 'weekly'
        
        ElMessage.success('已恢复默认设置')
      }).catch(() => {
        // 用户取消
      })
    }
    
    // 应用主题
    const applyTheme = (theme) => {
      const html = document.documentElement
      
      // 移除之前的主题类
      html.classList.remove('light-theme', 'dark-theme')
      
      if (theme === 'auto') {
        // 跟随系统设置
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        html.classList.add(prefersDark ? 'dark-theme' : 'light-theme')
      } else {
        // 使用指定主题
        html.classList.add(`${theme}-theme`)
      }
    }
    
    // 应用语言
    const applyLanguage = (language) => {
      // 这里可以添加语言切换的逻辑
      // 目前只是一个示例，实际项目中可能需要使用i18n库
      console.log('切换语言到:', language)
    }
    
    // 手动备份数据
    const manualBackup = async () => {
      backingUp.value = true
      try {
        // 模拟备份过程
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        ElMessage.success('数据备份成功')
      } catch (error) {
        console.error('备份数据失败:', error)
        ElMessage.error('备份数据失败，请稍后重试')
      } finally {
        backingUp.value = false
      }
    }
    
    // 导出数据
    const exportData = async () => {
      exporting.value = true
      try {
        // 模拟导出过程
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        ElMessage.success('数据导出成功')
      } catch (error) {
        console.error('导出数据失败:', error)
        ElMessage.error('导出数据失败，请稍后重试')
      } finally {
        exporting.value = false
      }
    }
    
    return {
      settings,
      saving,
      backingUp,
      exporting,
      saveSettings,
      resetSettings,
      manualBackup,
      exportData,
      generatingDemoData,
      clearingDemoData,
      generateDemoData,
      clearDemoData
    }
  }
}
</script>

<style scoped>
.system-settings-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 80px);
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.settings-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}

.settings-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-title {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
  font-weight: 500;
}

.settings-form {
  max-width: 600px;
}

.system-info {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  max-width: 600px;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  width: 100px;
  font-weight: 500;
  color: #606266;
}

.info-value {
  color: #303133;
}

.settings-actions {
  margin-top: 32px;
  max-width: 600px;
  display: flex;
  gap: 12px;
}
</style>