<template>
  <div class="coordinate-config-panel">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><Setting /></el-icon>
            项目坐标系统配置
          </span>
          <el-tag :type="isConfigured ? 'success' : 'warning'" size="small">
            {{ isConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </template>
      
      <el-form :model="config" label-width="140px" size="default">
        <!-- CAD坐标系配置 -->
        <el-divider content-position="left">
          <el-icon><Document /></el-icon>
          CAD图纸坐标系
        </el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="原点 X 坐标">
              <el-input-number
                v-model="config.cadConfig.originX"
                :precision="2"
                :step="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原点 Y 坐标">
              <el-input-number
                v-model="config.cadConfig.originY"
                :precision="2"
                :step="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="旋转角度">
              <el-input-number
                v-model="config.cadConfig.rotation"
                :precision="2"
                :min="-180"
                :max="180"
                :step="1"
                style="width: 100%"
              >
                <template #suffix>°</template>
              </el-input-number>
              <div class="form-tip">与真北的夹角（顺时针为正）</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="坐标单位">
              <el-select v-model="config.cadConfig.unit" style="width: 100%">
                <el-option label="毫米 (mm)" value="mm" />
                <el-option label="厘米 (cm)" value="cm" />
                <el-option label="米 (m)" value="m" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Y轴方向">
          <el-switch
            v-model="config.cadConfig.yAxisUp"
            active-text="向上（CAD标准）"
            inactive-text="向下（屏幕坐标）"
          />
        </el-form-item>
        
        <!-- 3D模型配置 -->
        <el-divider content-position="left">
          <el-icon><Box /></el-icon>
          3D模型变换
        </el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="偏移 X">
              <el-input-number
                v-model="config.modelConfig.offsetX"
                :precision="2"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="偏移 Y">
              <el-input-number
                v-model="config.modelConfig.offsetY"
                :precision="2"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="偏移 Z">
              <el-input-number
                v-model="config.modelConfig.offsetZ"
                :precision="2"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="缩放比例">
              <el-input-number
                v-model="config.modelConfig.scale"
                :precision="4"
                :min="0.0001"
                :max="1000"
                :step="0.1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="旋转 X">
              <el-input-number
                v-model="config.modelConfig.rotationX"
                :precision="1"
                :min="-180"
                :max="180"
                :step="5"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="旋转 Y">
              <el-input-number
                v-model="config.modelConfig.rotationY"
                :precision="1"
                :min="-180"
                :max="180"
                :step="5"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="旋转 Z">
              <el-input-number
                v-model="config.modelConfig.rotationZ"
                :precision="1"
                :min="-180"
                :max="180"
                :step="5"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- GPS配置（可选） -->
        <el-divider content-position="left">
          <el-icon><Location /></el-icon>
          GPS基准点（可选）
        </el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input-number
                v-model="gpsLatitude"
                :precision="6"
                :step="0.0001"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input-number
                v-model="gpsLongitude"
                :precision="6"
                :step="0.0001"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="海拔高度">
          <el-input-number
            v-model="gpsAltitude"
            :precision="2"
            :step="1"
            style="width: 200px"
          />
          <span style="margin-left: 8px">米</span>
        </el-form-item>
        
        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置默认
          </el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
        </div>
      </el-form>
      
      <!-- 配置状态信息 -->
      <div class="config-info" v-if="config.lastUpdated">
        <el-text type="info" size="small">
          最后更新: {{ formatDate(config.lastUpdated) }}
          <span v-if="config.configuredBy">（配置人: {{ config.configuredBy }}）</span>
        </el-text>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, type PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Document, Box, Location, RefreshLeft, Check } from '@element-plus/icons-vue'
import api from '../api/index.js'

/**
 * 坐标配置接口
 */
interface ProjectCoordinateConfig {
  isConfigured: boolean
  gpsOrigin?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  cadConfig: {
    originX: number
    originY: number
    rotation: number
    unit: 'mm' | 'cm' | 'm'
    unitToMeter: number
    yAxisUp: boolean
  }
  modelConfig: {
    offsetX: number
    offsetY: number
    offsetZ: number
    scale: number
    rotationX: number
    rotationY: number
    rotationZ: number
  }
  lastUpdated?: string
  configuredBy?: string
}

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits<{
  'config-saved': [config: ProjectCoordinateConfig]
  'config-loaded': [config: ProjectCoordinateConfig]
}>()

// 状态
const saving = ref(false)
const loading = ref(false)

// 配置数据
const config = reactive<ProjectCoordinateConfig>({
  isConfigured: false,
  cadConfig: {
    originX: 0,
    originY: 0,
    rotation: 0,
    unit: 'mm',
    unitToMeter: 0.001,
    yAxisUp: true
  },
  modelConfig: {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    scale: 1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  }
})

// GPS配置（分开处理避免undefined问题）
const gpsLatitude = ref<number>(0)
const gpsLongitude = ref<number>(0)
const gpsAltitude = ref<number>(0)

// 计算属性
const isConfigured = computed(() => config.isConfigured)

// 加载配置
const loadConfig = async () => {
  if (!props.projectId) return
  
  loading.value = true
  try {
    const data = await api.project.getCoordinateConfig(props.projectId) as any
    
    // 更新配置
    Object.assign(config, {
      isConfigured: data.isConfigured || false,
      cadConfig: { ...config.cadConfig, ...data.cadConfig },
      modelConfig: { ...config.modelConfig, ...data.modelConfig },
      lastUpdated: data.lastUpdated,
      configuredBy: data.configuredBy
    })
    
    // 更新GPS
    if (data.gpsOrigin) {
      gpsLatitude.value = data.gpsOrigin.latitude || 0
      gpsLongitude.value = data.gpsOrigin.longitude || 0
      gpsAltitude.value = data.gpsOrigin.altitude || 0
    }
    
    emit('config-loaded', config)
  } catch (error) {
    console.warn('加载坐标配置失败，使用默认值:', error)
  } finally {
    loading.value = false
  }
}

// 保存配置
const handleSave = async () => {
  saving.value = true
  
  try {
    // 根据单位更新unitToMeter
    const unitToMeterMap: Record<string, number> = {
      'mm': 0.001,
      'cm': 0.01,
      'm': 1
    }
    config.cadConfig.unitToMeter = unitToMeterMap[config.cadConfig.unit]
    
    // 构建保存数据
    const saveData: ProjectCoordinateConfig = {
      ...config,
      gpsOrigin: (gpsLatitude.value !== 0 || gpsLongitude.value !== 0) ? {
        latitude: gpsLatitude.value,
        longitude: gpsLongitude.value,
        altitude: gpsAltitude.value
      } : undefined
    }
    
    const response = await api.project.updateCoordinateConfig(props.projectId, saveData) as any
    
    if (response?.data) {
      Object.assign(config, response.data)
    }
    config.isConfigured = true
    
    emit('config-saved', config)
    ElMessage.success('坐标配置已保存')
  } catch (error) {
    console.error('保存坐标配置失败:', error)
    ElMessage.error('保存坐标配置失败')
  } finally {
    saving.value = false
  }
}

// 重置为默认值
const handleReset = () => {
  Object.assign(config.cadConfig, {
    originX: 0,
    originY: 0,
    rotation: 0,
    unit: 'mm',
    unitToMeter: 0.001,
    yAxisUp: true
  })
  
  Object.assign(config.modelConfig, {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    scale: 1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
  })
  
  gpsLatitude.value = 0
  gpsLongitude.value = 0
  gpsAltitude.value = 0
  
  ElMessage.info('已重置为默认值')
}

// 格式化日期
const formatDate = (date: string | undefined) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 监听项目ID变化
watch(() => props.projectId, () => {
  loadConfig()
}, { immediate: true })

// 暴露方法
defineExpose({
  loadConfig,
  getConfig: () => config
})
</script>

<style scoped>
.coordinate-config-panel {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
}

.config-info {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
  text-align: right;
}
</style>
