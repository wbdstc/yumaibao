<template>
  <div class="coordinate-input-panel">
    <el-card class="input-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><Location /></el-icon>
            坐标信息
          </span>
          <el-tag :type="hasValidCoordinates ? 'success' : 'warning'" size="small">
            {{ hasValidCoordinates ? '已配置' : '待配置' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 输入模式切换 -->
      <div class="input-mode-switch">
        <el-radio-group v-model="inputMode" size="small">
          <el-radio-button value="manual">手动输入</el-radio-button>
          <el-radio-button value="grid">轴线定位</el-radio-button>
          <el-radio-button value="pick" :disabled="!enablePicking">图纸选点</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 手动输入模式 -->
      <div v-if="inputMode === 'manual'" class="input-section">
        <el-form :model="formData" label-width="80px" size="small">
          <el-divider content-position="left">2D坐标（图纸）</el-divider>
          
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="X坐标">
                <el-input-number
                  v-model="formData.coord2D.x"
                  :precision="2"
                  :step="100"
                  placeholder="X"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Y坐标">
                <el-input-number
                  v-model="formData.coord2D.y"
                  :precision="2"
                  :step="100"
                  placeholder="Y"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="单位">
            <el-select v-model="formData.coord2D.unit" style="width: 100%">
              <el-option label="毫米 (mm)" value="mm" />
              <el-option label="厘米 (cm)" value="cm" />
              <el-option label="米 (m)" value="m" />
            </el-select>
          </el-form-item>
          
          <el-divider content-position="left">3D坐标（模型）</el-divider>
          
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="X">
                <el-input-number
                  v-model="formData.coord3D.x"
                  :precision="3"
                  :step="0.1"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Y">
                <el-input-number
                  v-model="formData.coord3D.y"
                  :precision="3"
                  :step="0.1"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Z">
                <el-input-number
                  v-model="formData.coord3D.z"
                  :precision="3"
                  :step="0.1"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="楼层">
            <el-select v-model="formData.floorId" placeholder="选择楼层" style="width: 100%">
              <el-option
                v-for="floor in floors"
                :key="floor.id"
                :label="floor.name"
                :value="floor.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 轴线定位模式 -->
      <div v-if="inputMode === 'grid'" class="input-section">
        <el-form :model="formData.gridRef" label-width="100px" size="small">
          <el-divider content-position="left">横向轴线</el-divider>
          
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="轴线">
                <el-select v-model="formData.gridRef.horizontalAxis" placeholder="选择轴线">
                  <el-option
                    v-for="axis in horizontalAxes"
                    :key="axis"
                    :label="axis + '轴'"
                    :value="axis"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="偏移(mm)">
                <el-input-number
                  v-model="formData.gridRef.horizontalOffset"
                  :precision="0"
                  :step="100"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-divider content-position="left">纵向轴线</el-divider>
          
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="轴线">
                <el-select v-model="formData.gridRef.verticalAxis" placeholder="选择轴线">
                  <el-option
                    v-for="axis in verticalAxes"
                    :key="axis"
                    :label="axis + '轴'"
                    :value="axis"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="偏移(mm)">
                <el-input-number
                  v-model="formData.gridRef.verticalOffset"
                  :precision="0"
                  :step="100"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-divider content-position="left">高度</el-divider>
          
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="楼层">
                <el-select v-model="formData.gridRef.floor" placeholder="选择楼层">
                  <el-option
                    v-for="floor in floors"
                    :key="floor.id"
                    :label="floor.name"
                    :value="floor.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="距地高(mm)">
                <el-input-number
                  v-model="formData.gridRef.heightFromFloor"
                  :precision="0"
                  :step="100"
                  :min="0"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 计算结果预览 -->
          <div class="calculated-result" v-if="calculatedFromGrid">
            <el-alert type="info" :closable="false" show-icon>
              <template #title>
                计算结果: {{ formatCoordinate3D(calculatedFromGrid) }}
              </template>
            </el-alert>
          </div>
        </el-form>
      </div>
      
      <!-- 图纸选点模式 -->
      <div v-if="inputMode === 'pick'" class="input-section pick-section">
        <div class="pick-status" :class="{ active: isPickingActive }">
          <el-icon v-if="isPickingActive" class="picking-icon"><Aim /></el-icon>
          <span v-if="isPickingActive">点击图纸选择坐标位置...</span>
          <span v-else>{{ pickedCoordinate ? '已选取坐标' : '点击下方按钮开始选点' }}</span>
        </div>
        
        <div v-if="pickedCoordinate" class="picked-result">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="X坐标">{{ pickedCoordinate.x.toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="Y坐标">{{ pickedCoordinate.y.toFixed(2) }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <el-button
          :type="isPickingActive ? 'danger' : 'primary'"
          @click="togglePicking"
          style="width: 100%; margin-top: 12px"
        >
          <el-icon><Aim /></el-icon>
          {{ isPickingActive ? '取消选点' : '开始选点' }}
        </el-button>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSave" :disabled="!hasValidInput">
          <el-icon><Check /></el-icon>
          保存坐标
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, type PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, Aim, Check } from '@element-plus/icons-vue'
import type { 
  Coordinate2D, 
  Coordinate3D, 
  GridReference,
  EmbeddedPartCoordinates,
  CoordinateUnit
} from '../types/coordinate'
import { 
  formatCoordinate3D, 
  isValidCoordinate2D, 
  isValidCoordinate3D,
  convertUnit 
} from '../types/coordinate'

/**
 * 楼层接口
 */
interface Floor {
  id: string
  name: string
  level: number
  height: number
}

/**
 * 轴线配置接口
 */
interface AxisConfig {
  horizontalAxes: string[]
  verticalAxes: string[]
  spacing: number
}

// Props
const props = defineProps({
  /** 初始坐标数据 */
  initialCoordinates: {
    type: Object as PropType<EmbeddedPartCoordinates>,
    default: () => ({})
  },
  /** 楼层列表 */
  floors: {
    type: Array as PropType<Floor[]>,
    default: () => []
  },
  /** 轴线配置 */
  axisConfig: {
    type: Object as PropType<AxisConfig>,
    default: () => ({
      horizontalAxes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      verticalAxes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      spacing: 6000
    })
  },
  /** 是否启用图纸选点 */
  enablePicking: {
    type: Boolean,
    default: false
  },
  /** 坐标转换函数（用于轴线定位计算） */
  coordinateTransformer: {
    type: Function,
    default: null
  }
})

// Emits
const emit = defineEmits<{
  'save': [coordinates: EmbeddedPartCoordinates]
  'pick-start': []
  'pick-cancel': []
  'coordinate-picked': [coord: Coordinate2D]
}>()

// 输入模式
type InputMode = 'manual' | 'grid' | 'pick'
const inputMode = ref<InputMode>('manual')

// 表单数据
const formData = reactive({
  coord2D: {
    x: 0,
    y: 0,
    unit: 'mm' as CoordinateUnit
  },
  coord3D: {
    x: 0,
    y: 0,
    z: 0
  },
  floorId: '',
  gridRef: {
    horizontalAxis: '',
    horizontalOffset: 0,
    verticalAxis: '',
    verticalOffset: 0,
    floor: '',
    heightFromFloor: 1500
  }
})

// 选点状态
const isPickingActive = ref(false)
const pickedCoordinate = ref<Coordinate2D | null>(null)

// 轴线列表
const horizontalAxes = computed(() => props.axisConfig.horizontalAxes)
const verticalAxes = computed(() => props.axisConfig.verticalAxes)

// 是否有有效坐标
const hasValidCoordinates = computed(() => {
  if (props.initialCoordinates.coordinates2D) {
    return isValidCoordinate2D(props.initialCoordinates.coordinates2D)
  }
  if (props.initialCoordinates.coordinates3D) {
    return isValidCoordinate3D(props.initialCoordinates.coordinates3D)
  }
  return false
})

// 是否有有效输入
const hasValidInput = computed(() => {
  if (inputMode.value === 'manual') {
    return formData.coord2D.x !== 0 || formData.coord2D.y !== 0 ||
           formData.coord3D.x !== 0 || formData.coord3D.y !== 0 || formData.coord3D.z !== 0
  }
  if (inputMode.value === 'grid') {
    return formData.gridRef.horizontalAxis && formData.gridRef.verticalAxis
  }
  if (inputMode.value === 'pick') {
    return pickedCoordinate.value !== null
  }
  return false
})

// 从轴线计算的坐标
const calculatedFromGrid = computed<Coordinate3D | null>(() => {
  if (!formData.gridRef.horizontalAxis || !formData.gridRef.verticalAxis) {
    return null
  }
  
  const spacing = props.axisConfig.spacing
  const hIndex = horizontalAxes.value.indexOf(formData.gridRef.horizontalAxis)
  const vIndex = verticalAxes.value.indexOf(formData.gridRef.verticalAxis)
  
  if (hIndex === -1 || vIndex === -1) return null
  
  // 计算基于轴线的坐标（mm）
  const x = vIndex * spacing + formData.gridRef.verticalOffset
  const y = hIndex * spacing + formData.gridRef.horizontalOffset
  
  // 获取楼层高度
  let z = 0
  if (formData.gridRef.floor) {
    const floor = props.floors.find(f => f.id === formData.gridRef.floor)
    if (floor) {
      z = floor.height * 1000 // 楼层高度转mm
    }
  }
  z += formData.gridRef.heightFromFloor || 0
  
  // 转换为米（3D模型单位）
  return {
    x: convertUnit(x, 'mm', 'm'),
    y: convertUnit(z, 'mm', 'm'), // Y轴是高度
    z: convertUnit(y, 'mm', 'm'),
    unit: 'm',
    referenceSystem: 'model'
  }
})

// 初始化表单数据
const initFormData = () => {
  if (props.initialCoordinates.coordinates2D) {
    formData.coord2D.x = props.initialCoordinates.coordinates2D.x || 0
    formData.coord2D.y = props.initialCoordinates.coordinates2D.y || 0
    formData.coord2D.unit = props.initialCoordinates.coordinates2D.unit || 'mm'
  }
  
  if (props.initialCoordinates.coordinates3D) {
    formData.coord3D.x = props.initialCoordinates.coordinates3D.x || 0
    formData.coord3D.y = props.initialCoordinates.coordinates3D.y || 0
    formData.coord3D.z = props.initialCoordinates.coordinates3D.z || 0
  }
  
  if (props.initialCoordinates.gridReference) {
    Object.assign(formData.gridRef, props.initialCoordinates.gridReference)
  }
}

// 切换选点
const togglePicking = () => {
  isPickingActive.value = !isPickingActive.value
  
  if (isPickingActive.value) {
    emit('pick-start')
  } else {
    emit('pick-cancel')
  }
}

// 接收外部选点结果
const setPickedCoordinate = (coord: Coordinate2D) => {
  pickedCoordinate.value = coord
  isPickingActive.value = false
  
  // 同步到手动输入
  formData.coord2D.x = coord.x
  formData.coord2D.y = coord.y
  formData.coord2D.unit = coord.unit || 'mm'
  
  emit('coordinate-picked', coord)
}

// 重置
const handleReset = () => {
  formData.coord2D = { x: 0, y: 0, unit: 'mm' }
  formData.coord3D = { x: 0, y: 0, z: 0 }
  formData.floorId = ''
  formData.gridRef = {
    horizontalAxis: '',
    horizontalOffset: 0,
    verticalAxis: '',
    verticalOffset: 0,
    floor: '',
    heightFromFloor: 1500
  }
  pickedCoordinate.value = null
  isPickingActive.value = false
}

// 保存
const handleSave = () => {
  const result: EmbeddedPartCoordinates = {
    validation: {
      isValid: true,
      source: inputMode.value === 'pick' ? 'manual' : 'manual',
      lastValidated: new Date().toISOString()
    }
  }
  
  if (inputMode.value === 'manual') {
    result.coordinates2D = {
      x: formData.coord2D.x,
      y: formData.coord2D.y,
      unit: formData.coord2D.unit,
      referenceSystem: 'cad'
    }
    
    if (formData.coord3D.x !== 0 || formData.coord3D.y !== 0 || formData.coord3D.z !== 0) {
      result.coordinates3D = {
        x: formData.coord3D.x,
        y: formData.coord3D.y,
        z: formData.coord3D.z,
        unit: 'm',
        referenceSystem: 'model'
      }
    }
  } else if (inputMode.value === 'grid') {
    result.gridReference = { ...formData.gridRef }
    
    if (calculatedFromGrid.value) {
      result.coordinates3D = { ...calculatedFromGrid.value }
    }
  } else if (inputMode.value === 'pick' && pickedCoordinate.value) {
    result.coordinates2D = { ...pickedCoordinate.value }
  }
  
  emit('save', result)
  ElMessage.success('坐标已保存')
}

// 监听初始数据变化
watch(() => props.initialCoordinates, () => {
  initFormData()
}, { immediate: true, deep: true })

// 暴露方法
defineExpose({
  setPickedCoordinate,
  resetForm: handleReset,
  getFormData: () => formData
})
</script>

<style scoped>
.coordinate-input-panel {
  width: 100%;
}

.input-card {
  border-radius: 8px;
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

.input-mode-switch {
  margin-bottom: 16px;
  text-align: center;
}

.input-section {
  margin-bottom: 16px;
}

.pick-section {
  text-align: center;
  padding: 20px;
}

.pick-status {
  padding: 20px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  transition: all 0.3s;
}

.pick-status.active {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
}

.picking-icon {
  animation: pulse 1.5s infinite;
  margin-right: 8px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.picked-result {
  margin-top: 16px;
}

.calculated-result {
  margin-top: 12px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  margin-top: 16px;
}
</style>
