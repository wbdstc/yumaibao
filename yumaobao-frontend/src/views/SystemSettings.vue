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
      exportData
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