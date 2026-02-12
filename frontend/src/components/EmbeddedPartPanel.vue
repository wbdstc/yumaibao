<template>
  <div class="embedded-parts-panel" :class="{ 'mobile-mode': isMobile }">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <h3>预埋件列表</h3>
        <span class="count-badge">{{ filteredParts.length }}</span>
      </div>
      <el-button 
        type="primary" 
        size="small" 
        icon="RefreshRight" 
        @click="handleRefresh3D"
        v-if="filteredParts.length > 0"
        :disabled="!canRefresh3D"
        style="margin-bottom: 8px"
      >
        刷新3D
      </el-button>
    </div>
    
    <!-- 搜索和筛选 -->
    <div class="search-filter-section">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索预埋件名称/编号"
        clearable
        size="small"
        prefix-icon="Search"
        class="search-input-full"
      />
      <div class="status-filter">
        <el-checkbox-group v-model="selectedStatuses" size="small">
          <el-checkbox label="待安装" value="pending" />
          <el-checkbox label="已安装" value="installed" />
          <el-checkbox label="已验收" value="inspected" />
          <el-checkbox label="已完成" value="completed" />
        </el-checkbox-group>
      </div>
    </div>
    
    <!-- 预埋件列表 -->
    <div class="embedded-parts-list">
      <div
        v-for="part in filteredParts"
        :key="part.id"
        class="embedded-part-item"
        :class="getStatusClass(part.status)"
        @click="handlePartClick(part)"
      >
        <div class="item-content">
          <div class="item-main">
            <div class="item-title">
              <span class="item-name">{{ part.name }}</span>
              <span class="item-code">{{ part.code }}</span>
            </div>
            <div class="item-info">
              <span class="info-label">型号:</span>
              <span class="info-value">{{ part.modelNumber }}</span>
              <span class="info-divider">|</span>
              <span class="info-label">位置:</span>
              <span class="info-value">{{ part.location }}</span>
            </div>
          </div>
          <el-tag 
            :type="getStatusTagType(part.status)" 
            size="small"
            class="status-tag"
          >
            {{ getStatusLabel(part.status) }}
          </el-tag>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredParts.length === 0" class="empty-state">
        <el-icon size="48"><Document /></el-icon>
        <p>暂无预埋件数据</p>
      </div>
    </div>
    
    <!-- 预埋件详情对话框 -->
    <el-dialog
      v-model="detailsDialogVisible"
      title="预埋件详情"
      width="500px"
      append-to-body
      destroy-on-close
      draggable
      :modal="false" 
      :close-on-click-modal="false"
      class="draggable-dialog"
    >
      <div v-if="selectedPart" class="part-details-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="名称">{{ selectedPart.name }}</el-descriptions-item>
          <el-descriptions-item label="编号">{{ selectedPart.code }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ selectedPart.modelNumber }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ selectedPart.type }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ selectedPart.location }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedPart.status)">
              {{ getStatusLabel(selectedPart.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ getProjectName(selectedPart.projectId) }}</el-descriptions-item>
          <el-descriptions-item label="所属楼层">{{ getFloorName(selectedPart.floorId) }}</el-descriptions-item>
          <el-descriptions-item label="2D坐标">
            <template v-if="selectedPart.coordinates2D">
              <span class="coord-value">X: {{ selectedPart.coordinates2D.x.toFixed(1) }}, Y: {{ selectedPart.coordinates2D.y.toFixed(1) }}</span>
            </template>
            <template v-else>
              <el-tag type="danger" size="small">未设置</el-tag>
            </template>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ selectedPart.notes || selectedPart.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="dialog-actions-area" style="margin-top: 20px; text-align: center;">
          <el-button 
            type="info" 
            @click="handleMarkPosition"
            icon="MapLocation"
          >
            在图纸上标记位置
          </el-button>
          
          <el-button 
            type="warning" 
            v-if="selectedPart.status === 'pending' && canConfirmInstallation"
            @click="handleConfirmInstallation"
            :loading="actionLoading"
          >
            确认安装
          </el-button>
          
          <el-button 
            type="primary" 
            v-if="selectedPart.status === 'installed' && canConfirmInspection"
            @click="handleConfirmInspection"
            :loading="actionLoading"
          >
            确认验收
          </el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 验收备注对话框 -->
    <el-dialog
      v-model="inspectionDialogVisible"
      title="验收备注"
      width="400px"
      append-to-body
    >
      <el-form>
        <el-form-item label="备注说明">
          <el-input
            v-model="inspectionNotes"
            type="textarea"
            :rows="3"
            placeholder="请输入验收备注（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="inspectionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitInspection" :loading="actionLoading">提交验收</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, RefreshRight, Search, MapLocation } from '@element-plus/icons-vue'

/**
 * 预埋件接口定义
 */
export interface EmbeddedPart {
  id: string
  projectId: string
  name: string
  code: string
  type: string
  modelNumber: string
  location: string
  floorId?: string
  status: 'pending' | 'installed' | 'inspected' | 'rejected' | 'completed'
  coordinates?: { x: number; y: number; z: number }
  coordinates2D?: { x: number; y: number }
  notes?: string
  description?: string
}

/**
 * 项目接口定义
 */
export interface Project {
  id: string
  name: string
}

/**
 * 楼层接口定义
 */
export interface Floor {
  id: string
  name: string
  projectId: string
}

// Props
const props = defineProps({
  embeddedParts: {
    type: Array as PropType<EmbeddedPart[]>,
    default: () => []
  },
  projects: {
    type: Array as PropType<Project[]>,
    default: () => []
  },
  floors: {
    type: Array as PropType<Floor[]>,
    default: () => []
  },
  selectedFloorId: {
    type: String,
    default: ''
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  canRefresh3D: {
    type: Boolean,
    default: true
  },
  canConfirmInstallation: {
    type: Boolean,
    default: true
  },
  canConfirmInspection: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits<{
  'part-select': [part: EmbeddedPart]
  'part-highlight': [part: EmbeddedPart]
  'status-change': [partId: string, status: string, notes?: string]
  'refresh-3d': []
  'mark-position': [part: EmbeddedPart]
}>()

// 状态
const searchKeyword = ref('')
const selectedStatuses = ref(['pending', 'installed', 'inspected', 'completed'])
const detailsDialogVisible = ref(false)
const inspectionDialogVisible = ref(false)
const selectedPart = ref<EmbeddedPart | null>(null)
const inspectionNotes = ref('')
const actionLoading = ref(false)

// 计算属性：过滤后的预埋件列表
const filteredParts = computed(() => {
  let result = props.embeddedParts

  // 按楼层筛选
  if (props.selectedFloorId) {
    result = result.filter(ep => ep.floorId === props.selectedFloorId)
  }

  // 按状态筛选
  if (selectedStatuses.value.length > 0) {
    result = result.filter(ep => selectedStatuses.value.includes(ep.status))
  }

  // 按名称或编号筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(ep => 
      ep.name.toLowerCase().includes(keyword) || 
      ep.code.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 获取状态CSS类
const getStatusClass = (status: string) => {
  return {
    'status-pending': status === 'pending',
    'status-installed': status === 'installed',
    'status-inspected': status === 'inspected',
    'status-completed': status === 'completed'
  }
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'installed': 'success',
    'inspected': 'primary',
    'completed': ''
  }
  return typeMap[status] || ''
}

// 获取状态标签文字
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    'pending': '待安装',
    'installed': '已安装',
    'inspected': '已验收',
    'completed': '已完成'
  }
  return labelMap[status] || status
}

// 获取项目名称
const getProjectName = (projectId: string | undefined) => {
  if (!projectId) return '-'
  const project = props.projects.find(p => p.id === projectId)
  return project?.name || projectId
}

// 获取楼层名称
const getFloorName = (floorId: string | undefined) => {
  if (!floorId) return '-'
  const floor = props.floors.find(f => f.id === floorId)
  return floor?.name || floorId
}

// 点击预埋件
const handlePartClick = (part: EmbeddedPart) => {
  selectedPart.value = part
  detailsDialogVisible.value = true
  emit('part-select', part)
  emit('part-highlight', part)
}

// 刷新3D显示
const handleRefresh3D = () => {
  emit('refresh-3d')
}

// 标记位置
const handleMarkPosition = () => {
  if (!selectedPart.value) return
  detailsDialogVisible.value = false
  emit('mark-position', selectedPart.value)
}

// 确认安装
const handleConfirmInstallation = async () => {
  if (!selectedPart.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要确认安装预埋件：${selectedPart.value.name} (${selectedPart.value.code}) 吗？`,
      '确认安装',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    actionLoading.value = true
    emit('status-change', selectedPart.value.id, 'installed', '')
    
    // 更新本地状态
    selectedPart.value.status = 'installed'
    
    ElMessage.success('安装确认成功')
    
  } catch (error) {
    if (error === 'cancel') return
    console.error('安装确认失败:', error)
  } finally {
    actionLoading.value = false
  }
}

// 确认验收点击
const handleConfirmInspection = () => {
  inspectionNotes.value = ''
  inspectionDialogVisible.value = true
}

// 提交验收
const submitInspection = async () => {
  if (!selectedPart.value) return
  
  try {
    actionLoading.value = true
    emit('status-change', selectedPart.value.id, 'inspected', inspectionNotes.value)
    
    // 更新本地状态
    selectedPart.value.status = 'inspected'
    
    ElMessage.success('验收确认成功')
    inspectionDialogVisible.value = false
    
  } catch (error) {
    console.error('验收确认失败:', error)
    ElMessage.error('验收确认失败')
  } finally {
    actionLoading.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  showPartDetails: (part: EmbeddedPart) => {
    selectedPart.value = part
    detailsDialogVisible.value = true
  }
})
</script>

<style scoped>
.embedded-parts-panel {
  width: 380px;
  background-color: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}

.embedded-parts-panel.mobile-mode {
  width: 100%;
  border-left: none;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  background: linear-gradient(to bottom, #ffffff, #fafbfc);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.header-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}

.count-badge {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.search-filter-section {
  padding: 0 20px 16px;
}

.search-input-full {
  width: 100%;
  margin-bottom: 14px;
}

.status-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-filter :deep(.el-checkbox) {
  margin-right: 0;
}

/* 预埋件列表 */
.embedded-parts-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background-color: #fafbfc;
}

.embedded-part-item {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.embedded-part-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.item-code {
  font-size: 12px;
  color: #909399;
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.item-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.info-label {
  color: #909399;
  font-weight: 500;
}

.info-value {
  color: #303133;
  margin-right: 6px;
}

.info-divider {
  color: #dcdfe6;
  margin: 0 6px;
}

.status-tag {
  flex-shrink: 0;
  font-weight: 600;
}

/* 状态颜色 */
.status-pending {
  border-left: 3px solid #ff9800;
}

.status-installed {
  border-left: 3px solid #4caf50;
}

.status-inspected {
  border-left: 3px solid #2196f3;
}

.status-completed {
  border-left: 3px solid #9e9e9e;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* 详情对话框 */
.part-details-content {
  padding: 10px 0;
}

.dialog-actions-area {
  margin-top: 20px;
  text-align: center;
}
</style>
