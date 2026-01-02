<template>
  <div class="bim-visualization">
    <!-- 顶部工具栏 (桌面端) -->
    <div class="toolbar" v-if="!isMobile">
      <div class="toolbar-left">
        <el-select
          v-model="selectedProjectId"
          placeholder="选择项目"
          @change="handleProjectChange"
          style="width: 200px; margin-right: 10px"
        >
          <el-option
            v-for="project in projects"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>
        <el-select
          v-model="selectedFloorId"
          placeholder="选择楼层"
          @change="handleFloorChange"
          :disabled="!selectedProjectId"
          style="width: 150px; margin-right: 10px"
        >
          <el-option
            v-for="floor in floors"
            :key="floor.id"
            :label="floor.name"
            :value="floor.id"
          />
        </el-select>
        <el-select
          v-model="selectedModel"
          placeholder="选择3D模型"
          value-key="id"
          @change="handleModelChange"
          :disabled="!selectedFloorId"
          style="width: 250px; margin-right: 10px"
        >
          <el-option
            v-for="model in filteredModels"
            :key="model.id"
            :label="model.name"
            :value="model"
          />
        </el-select>

      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshViewer" icon="Refresh">
          刷新模型
        </el-button>
      </div>
    </div>

    <!-- 移动端悬浮菜单按钮 -->
    <div class="mobile-menu-btn" v-if="isMobile" @click="mobileDrawerVisible = true">
      <el-icon><Menu /></el-icon>
      <span>菜单</span>
    </div>

    <!-- 移动端控制面板抽屉 -->
    <el-drawer
      v-model="mobileDrawerVisible"
      title="BIM控制面板"
      direction="ltr"
      size="85%"
      :with-header="true"
      class="mobile-drawer"
    >
      <div class="mobile-controls">
        <div class="control-group">
          <h3>项目选择</h3>
          <el-select v-model="selectedProjectId" placeholder="选择项目" @change="handleProjectChange" class="mobile-select">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </div>
        
        <div class="control-group">
          <h3>楼层选择</h3>
          <el-select v-model="selectedFloorId" placeholder="选择楼层" @change="handleFloorChange" :disabled="!selectedProjectId" class="mobile-select">
             <el-option v-for="floor in floors" :key="floor.id" :label="floor.name" :value="floor.id" />
          </el-select>
        </div>
        
        <div class="control-group">
          <h3>模型选择</h3>
          <el-select v-model="selectedModel" placeholder="选择3D模型" value-key="id" @change="handleModelChange" :disabled="!selectedFloorId" class="mobile-select">
             <el-option v-for="model in filteredModels" :key="model.id" :label="model.name" :value="model" />
          </el-select>
        </div>
        
        <el-divider />
        
        <div class="mobile-embedded-list">
          <div class="panel-header">
             <h3>预埋件列表 ({{ filteredEmbeddedParts.length }})</h3>
             <el-button type="primary" size="small" icon="RefreshRight" @click="refreshEmbeddedPartsIn3D" v-if="filteredEmbeddedParts.length > 0">刷新3D</el-button>
          </div>
          
           <el-input
            v-model="embeddedPartSearch"
            placeholder="搜索预埋件"
            clearable
            size="small"
            prefix-icon="Search"
            class="search-input-full"
          />
          
          <div class="status-filter mobile-filter">
             <el-checkbox-group v-model="statusFilter" size="small">
              <el-checkbox label="待安装" value="pending" />
              <el-checkbox label="已安装" value="installed" />
              <el-checkbox label="已验收" value="inspected" />
              <el-checkbox label="已完成" value="completed" />
            </el-checkbox-group>
          </div>
          
          <div class="embedded-parts-list mobile-list-scroll">
            <div
              v-for="embeddedPart in filteredEmbeddedParts"
              :key="embeddedPart.id"
              class="embedded-part-item"
              :class="{
                'status-pending': embeddedPart.status === 'pending',
                'status-installed': embeddedPart.status === 'installed',
                'status-inspected': embeddedPart.status === 'inspected',
                'status-completed': embeddedPart.status === 'completed'
              }"
              @click="highlightEmbeddedPart(embeddedPart); mobileDrawerVisible = false"
            >
              <div class="item-content">
                <div class="item-main">
                  <div class="item-title">
                    <span class="item-name">{{ embeddedPart.name }}</span>
                    <span class="item-code">{{ embeddedPart.code }}</span>
                  </div>
                  <div class="item-info">
                     <span class="info-value">{{ embeddedPart.location }}</span>
                  </div>
                </div>
                 <el-tag :type="getStatusTagType(embeddedPart.status)" size="small">
                  {{ getStatusLabel(embeddedPart.status) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 主要内容区域 -->
    <div class="page-content">
    <!-- 模型显示区域 -->
    <div class="model-container">
      <!-- 模型视图切换 -->
      <div class="view-switcher">
        <el-radio-group v-model="currentView" size="small">
          <el-radio-button label="2d">2D CAD视图</el-radio-button>
          <el-radio-button label="3d">3D BIM视图</el-radio-button>
          <el-radio-button label="dualAlign">双视图对齐</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 未选择模型时的提示 -->
      <div class="model-placeholder" v-if="!selectedModel">
        <el-icon size="64">
          <Document />
        </el-icon>
        <p>请选择一个项目和模型</p>
      </div>
      <!-- 双视图对齐模式 - 分步骤展示 -->
      <div class="dual-align-container" v-else-if="currentView === 'dualAlign'">
        <!-- 阶段0: 2D CAD视图 - 全屏选点 -->
        <div class="stage-view-container" v-if="alignmentStage === 0">
          <div class="view-title">
            <span>步骤1: 在2D图纸上标记参考点</span>
            <div class="title-actions">
              <el-tag type="info" size="small">已标记 {{ referencePoints2D.length }} 个点</el-tag>
              <el-button 
                type="primary" 
                size="small" 
                :disabled="referencePoints2D.length < 2"
                @click="goToStage1"
              >
                下一步: 3D选点
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="full-view-container">
            <DualViewCanvas
              ref="dualCanvasRef"
              :enabled="alignmentStage === 0"
              :show-controls="true"
              :show-axis="showReferenceAxisIn2D"
              :zoom-factor="currentZoomFactor"
              :view-offset="currentViewOffset"
              @point-selected="onPointSelected"
              @points-cleared="onPointsCleared"
              @point-removed="onPointRemoved"
              @coordinate-update="onCoordinateUpdate"
            >
              <MlCadViewer
                v-if="localCadFile && showDualCadViewer"
                ref="dualCadViewerRef"
                :key="'dual-' + dualCadViewerKey"
                :local-file="localCadFile"
                :use-main-thread-draw="false"
                base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
                locale="zh"
                @loaded="onDualViewerLoaded"
                @error="onViewerError"
              />
              <div v-else class="dual-cad-placeholder">
                <el-icon size="48"><Document /></el-icon>
                <p>正在加载2D图纸...</p>
              </div>
            </DualViewCanvas>
          </div>
        </div>
        
        <!-- 阶段1: 3D BIM视图 - 全屏选点 -->
        <div class="stage-view-container" v-else-if="alignmentStage === 1">
          <div class="view-title">
            <span>步骤2: 在3D模型上标记对应点</span>
            <div class="title-actions">
              <el-button size="small" @click="goToStage0">
                <el-icon><ArrowLeft /></el-icon>
                上一步
              </el-button>
              <el-tag type="info" size="small">已标记 {{ referencePoints3D.length }} 个点</el-tag>
              <el-button 
                type="success" 
                size="small" 
                :disabled="referencePoints3D.length < 2"
                @click="goToStage2"
              >
                完成对齐
                <el-icon><Check /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="full-view-container">
            <div class="bim-viewer-full" ref="dualBimViewerRef">
              <!-- 3D点击提示 -->
              <div class="click-hint" v-if="referencePoints3D.length < referencePoints2D.length">
                <el-icon><Aim /></el-icon>
                点击3D模型标记第 {{ referencePoints3D.length + 1 }} 个对应点
              </div>
            </div>
            <!-- 3D视图控制按钮 -->
            <div class="view-controls-overlay">
              <el-button-group size="small">
                <el-button @click="setViewAngle('front')">前视图</el-button>
                <el-button @click="setViewAngle('top')">俯视图</el-button>
                <el-button @click="setViewAngle('side')">侧视图</el-button>
                <el-button @click="resetDualView3D">
                  <el-icon><RefreshRight /></el-icon>
                  复位
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
        
        <!-- 阶段2: 确认对齐结果 -->
        <div class="stage-view-container" v-else-if="alignmentStage === 2">
          <div class="view-title">
            <span>步骤3: 确认对齐参数</span>
            <div class="title-actions">
              <el-button size="small" @click="goToStage1">
                <el-icon><ArrowLeft /></el-icon>
                上一步
              </el-button>
            </div>
          </div>
          <div class="confirmation-container">
            <el-card class="result-card">
              <template #header>
                <div class="card-header">
                  <span>对齐结果</span>
                  <el-tag type="success">已完成</el-tag>
                </div>
              </template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="2D参考点">{{ referencePoints2D.length }} 个</el-descriptions-item>
                <el-descriptions-item label="3D参考点">{{ referencePoints3D.length }} 个</el-descriptions-item>
                <el-descriptions-item label="缩放比例">{{ alignmentParams.scale.toFixed(4) }}</el-descriptions-item>
                <el-descriptions-item label="旋转角度">{{ alignmentParams.rotation.toFixed(2) }}°</el-descriptions-item>
                <el-descriptions-item label="X偏移">{{ alignmentParams.offsetX.toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="Y偏移">{{ alignmentParams.offsetY.toFixed(2) }}</el-descriptions-item>
              </el-descriptions>
              <div class="action-buttons">
                <el-button @click="resetAlignment">
                  <el-icon><RefreshLeft /></el-icon>
                  重新对齐
                </el-button>
                <el-button type="primary" @click="confirmAlignment">
                  <el-icon><Check /></el-icon>
                  确认并保存
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </div>

      <!-- CAD查看器（2D视图） -->
      <div class="cad-viewer-wrapper" v-else-if="selectedModel.type === '2d'">
        <div class="view-title">
          2D CAD视图: {{ selectedModel?.name || '未命名' }}
          <span v-if="localCadFile" style="font-size: 12px; color: #909399; margin-left: 10px;">
            ({{ (localCadFile.size / 1024 / 1024).toFixed(2) }} MB)
          </span>
        </div>
        <div v-if="!localCadFile" class="cad-placeholder">
          <el-icon size="64">
            <Document />
          </el-icon>
          <p>正在加载模型文件...</p>
        </div>
        <div v-else class="cad-container">
          <!-- 使用条件渲染来避免初始化问题 -->
          <div v-if="!showCadViewer" class="cad-placeholder">
            <el-icon size="64">
              <Document />
            </el-icon>
            <p>正在初始化查看器...</p>
          </div>
          <div v-else class="cad-viewer-container" ref="cadContainerRef">
            <MlCadViewer
          ref="cadViewerRef"
          :key="cadViewerKey"
          :local-file="localCadFile"
          :use-main-thread-draw="false"
          base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
          locale="zh"
          @loaded="onViewerLoaded"
          @error="onViewerError"
        />
          </div>
        </div>
      </div>

      <!-- 3D BIM模型视图 -->
      <div class="bim-viewer-wrapper" v-else-if="selectedModel.type === '3d'">
        <div class="view-title">3D BIM视图</div>
        <div class="bim-viewer-container" ref="bimViewerRef">
        </div>
      </div>
    </div>

    <!-- 预埋件列表 (桌面端) -->
    <div class="embedded-parts-panel" v-if="!isMobile">
      <div class="panel-header">
        <div class="header-title">
          <h3>预埋件列表</h3>
          <span class="count-badge">{{ filteredEmbeddedParts.length }}</span>
        </div>
        <el-button 
          type="primary" 
          size="small" 
          icon="RefreshRight" 
          @click="refreshEmbeddedPartsIn3D"
          v-if="filteredEmbeddedParts.length > 0"
          :disabled="!scene || !isThreeJsInitialized"
          style="margin-bottom: 8px"
        >
          刷新3D
        </el-button>
      </div>
      
      <!-- 搜索和筛选 -->
      <div class="search-filter-section">
        <el-input
          v-model="embeddedPartSearch"
          placeholder="搜索预埋件名称/编号"
          clearable
          size="small"
          prefix-icon="Search"
          class="search-input-full"
        />
        <div class="status-filter">
          <el-checkbox-group v-model="statusFilter" size="small">
            <el-checkbox label="待安装" value="pending" />
            <el-checkbox label="已安装" value="installed" />
            <el-checkbox label="已验收" value="inspected" />
            <el-checkbox label="已完成" value="completed" />
          </el-checkbox-group>
        </div>
      </div>
      <div class="embedded-parts-list">
        <div
          v-for="embeddedPart in filteredEmbeddedParts"
          :key="embeddedPart.id"
          class="embedded-part-item"
          :class="{
            'status-pending': embeddedPart.status === 'pending',
            'status-installed': embeddedPart.status === 'installed',
            'status-inspected': embeddedPart.status === 'inspected',
            'status-completed': embeddedPart.status === 'completed'
          }"
          @click="highlightEmbeddedPart(embeddedPart)"
        >
          <div class="item-content">
            <div class="item-main">
              <div class="item-title">
                <span class="item-name">{{ embeddedPart.name }}</span>
                <span class="item-code">{{ embeddedPart.code }}</span>
              </div>
              <div class="item-info">
                <span class="info-label">型号:</span>
                <span class="info-value">{{ embeddedPart.modelNumber }}</span>
                <span class="info-divider">|</span>
                <span class="info-label">位置:</span>
                <span class="info-value">{{ embeddedPart.location }}</span>
              </div>
            </div>
            <el-tag 
              :type="getStatusTagType(embeddedPart.status)" 
              size="small"
              class="status-tag"
            >
              {{ getStatusLabel(embeddedPart.status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
    </div> <!-- 关闭page-content -->



    <!-- 图层管理对话框 -->
    <el-dialog
      v-model="layersDialogVisible"
      title="图层管理"
      width="40%"
    >
      <div class="layers-list">
        <el-scrollbar height="400px">
          <div v-for="layer in layers" :key="layer.id" class="layer-item">
            <el-checkbox v-model="layer.visible">{{ layer.name }}</el-checkbox>
          </div>
        </el-scrollbar>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="layersDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyLayerChanges">应用</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预埋件详情与操作对话框 -->
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
      <div v-if="targetEmbeddedPart" class="part-details-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="名称">{{ targetEmbeddedPart.name }}</el-descriptions-item>
          <el-descriptions-item label="编号">{{ targetEmbeddedPart.code }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ targetEmbeddedPart.modelNumber }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ targetEmbeddedPart.type }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ targetEmbeddedPart.location }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(targetEmbeddedPart.status)">
              {{ getStatusLabel(targetEmbeddedPart.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ projects.find(p => p.id === targetEmbeddedPart.projectId)?.name || targetEmbeddedPart.projectId }}</el-descriptions-item>
          <el-descriptions-item label="所属楼层">{{ floors.find(f => f.id === targetEmbeddedPart.floorId)?.name || targetEmbeddedPart.floorId }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ targetEmbeddedPart.notes || targetEmbeddedPart.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="dialog-actions-area" style="margin-top: 20px; text-align: center;">
          <el-button 
            type="warning" 
            v-if="targetEmbeddedPart.status === 'pending' && ['projectManager', 'admin', 'projectEngineer', 'installer'].includes(userStore.userRole)"
            @click="handleConfirmInstallation"
            :loading="actionLoading"
          >
            确认安装
          </el-button>
          
          <el-button 
            type="primary" 
            v-if="targetEmbeddedPart.status === 'installed' && ['projectManager', 'admin', 'projectEngineer', 'qualityInspector'].includes(userStore.userRole)"
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

<script setup>
import { ref, shallowRef, reactive, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, UploadFilled, Refresh, FullScreen, Grid, Collection, RefreshRight, ArrowRight, ArrowLeft, Check, Aim, RefreshLeft } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { useUserStore } from '../stores/index.js'
import { useRoute } from 'vue-router'
import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import config from '../config/index.js'
// 导入Three.js相关模块
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
// 导入坐标转换引擎
import { CoordinateMapper, createDefaultMapper } from '../utils/coordinateMapper.js'
// 导入双视图整合组件
import DualViewCanvas from '../components/DualViewCanvas.vue'
import AlignmentWorkflow from '../components/AlignmentWorkflow.vue'
import ScreenshotTool from '../components/ScreenshotTool.vue'
// 导入视图对齐工具
import {
  calculateBestViewAngle,
  resetView as resetViewAlignment,
  drawReferenceAxis,
  removeReferenceAxis,
  animateCameraTo,
  createReferencePointMarkers,
  removeReferencePointMarkers,
  calculateScaleFactor,
  calculateRotationAngle
} from '../utils/viewAlignment.js'

// --- 【核心修复补丁】开始 ---
// 解决 TypeError: u.addUpdateRange is not a function 报错
if (THREE.BufferAttribute && !THREE.BufferAttribute.prototype.addUpdateRange) {
  THREE.BufferAttribute.prototype.addUpdateRange = function(start, count) {
    const updateRange = this.updateRange;
    if (updateRange.count === -1) {
      updateRange.offset = start;
      updateRange.count = count;
    } else {
      const oldEnd = updateRange.offset + updateRange.count;
      const newEnd = start + count;
      updateRange.offset = Math.min(updateRange.offset, start);
      updateRange.count = Math.max(oldEnd, newEnd) - updateRange.offset;
    }
  };
  console.log('✅ 已成功注入 addUpdateRange 补丁');
}
// --- 【核心修复补丁】结束 ---

// 创建userStore实例
const userStore = useUserStore()
// 获取路由实例用于处理URL参数（二维码扫描跳转）
const route = useRoute()

// 目标预埋件ID（从URL参数获取，用于QR码扫描跳转）
const targetPartId = ref(null)

// 组件引用
const cadViewerRef = shallowRef(null)
const bimViewerRef = ref(null)

// Three.js相关状态 - 使用普通变量，避免Vue响应式系统干扰
let scene = null
let camera = null
let renderer = null
let controls = null
let gridHelper = null // 保存3D网格对象引用
let highlightedMesh = null // 当前高亮的预埋件网格
let pulseAnimationId = null // 脉冲动画ID
// 只有需要响应式的状态才使用ref
const bimModels = ref([]) // 存储加载的BIM模型
const bimModelObjects = ref({}) // 存储模型对象，用于高亮

// 环境变量 - 在script部分获取，然后在模板中使用
const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

// 坐标转换器实例
let coordinateMapper = null

// 状态管理
const selectedProjectId = ref('')
const selectedFloorId = ref('')
const selectedModelId = ref('')
const selectedStatuses = ref(['pending', 'installed', 'inspected', 'completed'])
const showGrid = ref(true)
const embeddedPartSearch = ref('')
const currentView = ref('2d') // 2d, 3d, both
const enableCoordinateSync = ref(true) // 启用2D/3D坐标同步
const locale = ref('zh') // 语言设置，修复i18n错误
const isBimModelLoaded = ref(false)
const isThreeJsInitialized = ref(false)
const refreshTimer = ref(null) // 自动刷新定时器
// CAD查看器控制
const showCadViewer = ref(false)
const cadViewerKey = ref(0)

// 数据
const projects = ref([])
const floors = ref([])
const models = ref([])
const embeddedParts = ref([])
const layers = ref([])

// 模型文件
const modelFile = ref(null)
const localCadFile = shallowRef(null)
const selectedModel = ref(null)

// 模型信息
const modelInfo = ref({
  name: '',
  layers: 0,
  entities: 0,
  embeddedParts: 0
})

// 选中的预埋件
const selectedEmbeddedPart = ref(null)

// 可见的预埋件（根据当前楼层过滤）
const visibleEmbeddedParts = ref([])

// ==================== 双视图对齐模式状态 ====================
// 双视图组件引用
const dualCanvasRef = ref(null)
const dualCadViewerRef = shallowRef(null)
const dualBimViewerRef = ref(null)
const alignmentWorkflowRef = ref(null)

// 双视图Three.js状态
let dualScene = null
let dualCamera = null
let dualRenderer = null
let dualControls = null
let dualAnimationFrameId = null

// 对齐工作流状态
const showAlignmentWorkflow = ref(true)
const alignmentStage = ref(0)  // 0: 标记点, 1: 调整视角, 2: 确认
const showScreenshotMode = ref(false)
const showReferenceAxisIn2D = ref(false)

// 双视图CAD查看器独立控制
const showDualCadViewer = ref(false)
const dualCadViewerKey = ref(0)

// 参考点数据
const referencePoints2D = ref([])  // 2D参考点 [{id, x, y, label}, ...]
const referencePoints3D = ref([])  // 3D参考点 [{id, x, y, z, label}, ...]

// 对齐参数
const alignmentParams = reactive({
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0
})

// 视口状态跟踪
const currentZoomFactor = ref(1)
const currentViewOffset = ref({ x: 0, y: 0 })

// 对齐锁定状态
const isAlignmentLocked = ref(false)

// 状态筛选
const statusFilter = ref(['pending', 'installed', 'inspected', 'completed'])

// 判断用户是否是安装人员或质检人员
const isRestrictedUser = computed(() => {
  const role = userStore.userRole || ''
  return role === 'installer' || role === 'qualityInspector'
})

// 获取用户可访问的项目ID
const userProjects = computed(() => {
  return userStore.userInfo?.projects || []
})

const updateVisibleEmbeddedParts = () => {
  visibleEmbeddedParts.value = embeddedParts.value.filter(ep => 
    ep.floorId === selectedFloorId.value
  )
}



// 监听楼层变化，更新可见预埋件
watch(selectedFloorId, () => {
  updateVisibleEmbeddedParts()
})

// 对话框
const layersDialogVisible = ref(false)
const detailsDialogVisible = ref(false)
const inspectionDialogVisible = ref(false)
const targetEmbeddedPart = ref(null) // 专门用于详情弹窗的预埋件对象
const inspectionNotes = ref('')
const actionLoading = ref(false)

// 处理确认安装
const handleConfirmInstallation = async () => {
  if (!targetEmbeddedPart.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要确认安装预埋件：${targetEmbeddedPart.value.name} (${targetEmbeddedPart.value.code}) 吗？`,
      '确认安装',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    actionLoading.value = true
    // 调用API确认安装 - 使用通用更新状态API替代移动端API
    await api.embeddedPart.updateScanStatus(targetEmbeddedPart.value.id, 'installed', '')
    
    // 更新本地状态
    targetEmbeddedPart.value.status = 'installed'
    
    // 同时也更新列表中的状态
    const partInList = embeddedParts.value.find(p => p.id === targetEmbeddedPart.value.id)
    if (partInList) {
      partInList.status = 'installed'
    }
    
    ElMessage.success('安装确认成功')
    
    // 刷新3D中的颜色
    refreshEmbeddedPartsIn3D()
    
  } catch (error) {
    if (error === 'cancel') return
    console.error('安装确认失败:', error)
    ElMessage.error('安装确认失败: ' + (error.response?.data?.message || '未知错误'))
  } finally {
    actionLoading.value = false
  }
}

// 处理确认验收点击
const handleConfirmInspection = () => {
  inspectionNotes.value = ''
  inspectionDialogVisible.value = true
}

// 提交验收
const submitInspection = async () => {
  if (!targetEmbeddedPart.value) return
  
  try {
    actionLoading.value = true
    // 调用API确认验收 - 使用通用更新状态API替代移动端API
    await api.embeddedPart.updateScanStatus(targetEmbeddedPart.value.id, 'inspected', inspectionNotes.value)
    
    // 更新本地状态
    targetEmbeddedPart.value.status = 'inspected'
    
    // 同时也更新列表中的状态
    const partInList = embeddedParts.value.find(p => p.id === targetEmbeddedPart.value.id)
    if (partInList) {
      partInList.status = 'inspected'
    }
    
    ElMessage.success('验收确认成功')
    inspectionDialogVisible.value = false
    
    // 刷新3D中的颜色
    refreshEmbeddedPartsIn3D()
    
  } catch (error) {
    console.error('验收确认失败:', error)
    ElMessage.error('验收确认失败: ' + (error.response?.data?.message || '未知错误'))
  } finally {
    actionLoading.value = false
  }
}

// 显示详情弹窗
const showEmbeddedPartDetails = (part) => {
  targetEmbeddedPart.value = part
  detailsDialogVisible.value = true
}

// 计算属性
const filteredEmbeddedParts = computed(() => {
  let result = embeddedParts.value

  // 按楼层筛选
  if (selectedFloorId.value) {
    result = result.filter(ep => ep.floorId === selectedFloorId.value)
  }

  // 按状态筛选
  if (selectedStatuses.value.length > 0) {
    result = result.filter(ep => selectedStatuses.value.includes(ep.status))
  }

  // 按名称或编号筛选
  if (embeddedPartSearch.value) {
    const keyword = embeddedPartSearch.value.toLowerCase()
    result = result.filter(ep => 
      ep.name.toLowerCase().includes(keyword) || 
      ep.code.toLowerCase().includes(keyword)
    )
  }

  return result
})



// 生命周期
onMounted(() => {
  // 配置CAD查看器UI设置
  AcApSettingManager.instance.isShowCommandLine = false
  AcApSettingManager.instance.isShowToolbar = config.cadViewer.showToolbars
  AcApSettingManager.instance.isShowCoordinate = true
  AcApSettingManager.instance.isShowMainMenu = false
  AcApSettingManager.instance.isShowStats = false
  AcApSettingManager.instance.isShowEntityInfo = false
  AcApSettingManager.instance.isShowLanguageSelector = false

  // 获取项目列表
  getProjects()
  
  // 处理URL参数中的partId（来自QR码扫描跳转）
  const partIdFromUrl = route.query.partId
  if (partIdFromUrl) {
    targetPartId.value = partIdFromUrl
    console.log('📱 检测到QR码扫描跳转，目标预埋件ID:', partIdFromUrl)
    // 获取预埋件详情并显示
    handleQRCodeNavigation(partIdFromUrl)
  }
  
  // 添加窗口大小调整监听
  window.addEventListener('resize', handleWindowResize)
  
  // 添加localStorage监听器，监听模型相关事件
  window.addEventListener('storage', (event) => {
    const modelEvents = ['modelUploaded', 'modelUpdated', 'modelDeleted', 'modelConverted']
    if (modelEvents.includes(event.key)) {
      try {
        const data = JSON.parse(event.newValue || '{}')
        // 如果事件涉及的项目与当前选中的项目匹配，刷新模型列表
        if (data.projectId === selectedProjectId.value) {
          getModels(selectedProjectId.value)
        }
      } catch (error) {
        console.error(`解析模型${event.key}事件失败:`, error)
      }
    }
  })
  
  // 添加定时自动刷新模型列表（每30秒）
  refreshTimer.value = setInterval(() => {
    if (selectedProjectId.value) {
      getModels(selectedProjectId.value)
    }
  }, 30000)
})

// 监听组件卸载，清理资源
onUnmounted(() => {
  cleanupThreeJs()
  window.removeEventListener('resize', handleWindowResize)
  // 清理定时器
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
  // 清理localStorage监听器
  window.removeEventListener('storage', (event) => {
    // 监听器函数被移除，无需具体实现
  })
  // 释放 Blob URL
  if (localCadFile.value && typeof localCadFile.value === 'string') {
    URL.revokeObjectURL(localCadFile.value);
  }
})

// 根据选中的楼层过滤模型
const filteredModels = computed(() => {
  if (!selectedFloorId.value) {
    return models.value
  }
  // 只显示选中楼层的模型 或 未绑定楼层的通用模型
  return models.value.filter(model => model.floorId === selectedFloorId.value || !model.floorId)
})

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'installed': 'success',
    'inspected': 'primary',
    'completed': ''
  }
  return typeMap[status] || ''
}

// 获取状态标签文字
const getStatusLabel = (status) => {
  const labelMap = {
    'pending': '待安装',
    'installed': '已安装',
    'inspected': '已验收',
    'completed': '已完成'
  }
  return labelMap[status] || status
}

// 监听视图切换 - 直接放在script setup中，而不是onMounted中
watch(currentView, (newView) => {
  if (selectedModel.value) {
    if (newView !== '2d' && selectedModel.value.type === '3d') {
      nextTick(() => {
        loadBimModel()
      })
    } else if (newView === '2d' && selectedModel.value.type === '2d') {
      // 2D视图已经通过CAD查看器加载
    } else {
      // 清理不相关的视图资源
      cleanupThreeJs()
    }
  }
})

// 监听坐标同步开关 - 直接放在script setup中，而不是onMounted中
watch(enableCoordinateSync, (newValue) => {
  if (newValue && selectedModel.value && selectedModel.value.type === '3d') {
    loadBimModel()
  }
})

// 监听模型变化 - 直接放在script setup中，而不是onMounted中
watch(selectedModel, (newModel) => {
  if (newModel) {
    if (newModel.type === '3d') {
      // 3D模型，直接加载
      nextTick(() => {
        loadBimModel()
      })
    } else if (newModel.type === '2d') {
      // 2D模型，清理3D资源
      cleanupThreeJs()
    }
  } else {
    // 清理之前的模型
    cleanupThreeJs()
  }
})
// 1. 定义 ref
const cadContainerRef = ref(null)

// 2. 监听容器出现，添加"防滚动"补丁
watch(cadContainerRef, (dom) => {
  if (dom) {
    // 核心逻辑：添加 wheel 事件监听，强行阻止浏览器默认行为
    // 注意：必须加 { passive: false }，否则无法阻止
    dom.addEventListener('wheel', (e) => {
      e.preventDefault(); 
    }, { passive: false });
    
    console.log('✅ 已启用鼠标滚轮独占模式 (防止页面滚动)');
  }
})

// 方法
const getProjects = async () => {
  try {
    // 添加详细的调试日志
    console.log('开始获取项目列表...')
    console.log('当前用户角色:', userStore.userRole)
    console.log('是否为受限用户:', isRestrictedUser.value)
    console.log('用户关联项目列表:', userProjects.value)
    
    const response = await api.project.getProjects()
    
    // 添加更详细的调试日志
    console.log('获取项目列表成功，原始响应:', response)
    
    // 确保response是数组
    const projectList = Array.isArray(response) ? response : []
    
    // 根据用户角色过滤项目列表
    const userProjectList = userProjects.value || []
    if (isRestrictedUser.value && userProjectList.length > 0) {
      // 安装人员和质检人员只能看到自己注册的项目
      projects.value = projectList.filter(project => userProjectList.includes(project.id))
      console.log('受限用户，过滤后项目列表:', projects.value)
    } else {
      // 其他角色可以看到所有项目
      projects.value = projectList
      console.log('管理员/项目管理员，项目列表:', projects.value)
    }
    
    // 如果是受限用户，且没有QR码参数，自动选择他们的项目
    if (isRestrictedUser.value && projects.value.length > 0 && !route.query.partId) {
      selectedProjectId.value = projects.value[0].id
      console.log('自动选择项目:', selectedProjectId.value)
      await handleProjectChange(selectedProjectId.value)
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    console.error('错误详情:', error.response || error.message)
    ElMessage.error({
      message: '获取项目列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    // 发生错误时确保projects是数组
    projects.value = []
  }
}

// 处理QR码扫描跳转导航
const handleQRCodeNavigation = async (partId) => {
  try {
    console.log('📱 正在加载预埋件详情...', partId)
    // 通过API获取预埋件详情
    const response = await api.embeddedPart.getEmbeddedPart(partId)
    const embeddedPart = response.data || response
    
    if (!embeddedPart) {
      ElMessage.error('未找到预埋件信息')
      return
    }
    
    console.log('📱 预埋件信息:', embeddedPart)
    
    // 1. 设置项目
    if (embeddedPart.projectId) {
      // 始终重新加载项目数据，确保模型列表已获取 (解决Race Condition)
      console.log('📱 切换项目上下文:', embeddedPart.projectId)
      selectedProjectId.value = embeddedPart.projectId
      await handleProjectChange(embeddedPart.projectId)
    }
    
    // 2. 设置楼层
    if (embeddedPart.floorId) {
      selectedFloorId.value = embeddedPart.floorId
      // 手动触发楼层变化逻辑，更新预埋件列表
      await handleFloorChange(embeddedPart.floorId)
    }
    
    // 3. 自动选择并加载3D模型
    // 在当前楼层的模型中查找3D模型
    console.log('🔍 正在查找3D模型. 候选模型数量:', filteredModels.value.length)
    console.log('🔍 候选模型列表:', JSON.parse(JSON.stringify(filteredModels.value)))
    
    // 宽松匹配：3d 或 bim 类型
    const model3D = filteredModels.value.find(m => m.type === '3d' || m.type === 'bim')
    
    if (model3D) {
      console.log('📱 自动选择3D模型:', model3D.name, '类型:', model3D.type)
      
      // 切换到3D视图模式
      currentView.value = '3d'
      
      // 选择模型（这将触发模型加载）
      if (selectedModel.value?.id !== model3D.id) {
        await handleModelChange(model3D)
      } else {
        // 如果已经是当前模型，确保它已加载
        if (!isBimModelLoaded.value) {
          await loadBimModel()
        }
      }
      
      // 4. 等待模型加载完成并高亮预埋件
      const waitForModelAndHighlight = () => {
        if (isBimModelLoaded.value && scene && isThreeJsInitialized.value) {
          // 延迟一点点确保渲染已就绪
          setTimeout(() => {
            // 确保高亮对象存在
            if (bimModelObjects.value[embeddedPart.id]) {
              highlightEmbeddedPart(embeddedPart)
            } else {
              // 尝试刷新与重建
              refreshEmbeddedPartsIn3D()
              setTimeout(() => {
                if (bimModelObjects.value[embeddedPart.id]) {
                  highlightEmbeddedPart(embeddedPart)
                } else {
                  ElMessage.warning('无法在3D视图中定位该预埋件')
                }
              }, 500)
            }
            // 💡 高亮完成后，显示带有操作按钮的详情弹窗
            showEmbeddedPartDetails(embeddedPart)
          }, 500)
        } else {
          // 继续等待
          setTimeout(waitForModelAndHighlight, 500)
        }
      }
      
      // 开始等待
      ElMessage.success('正在加载模型并定位预埋件...')
      waitForModelAndHighlight()
      
    } else {
      console.warn('❌ 未找到匹配的3D模型. Filtered Models:', filteredModels.value)
      ElMessage.warning('该楼层未找到3D模型，无法展示3D定位')
      // 即使没有3D模型，也显示详情弹窗
      showEmbeddedPartDetails(embeddedPart)
    }

  } catch (error) {
    console.error('获取预埋件详情失败:', error)
    ElMessage.error('获取预埋件详情失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

const getFloors = async (projectId) => {
  try {
    // 传入 suppress403: true 以抑制全局的403错误提示
    const response = await api.floor.getFloors(projectId, { suppress403: true }) // 直接传入projectId，不是对象
    floors.value = response
    
    // 初始化坐标转换器
    if (floors.value && floors.value.length > 0) {
      coordinateMapper = createDefaultMapper(floors.value)
      console.log('✅ 坐标转换器已初始化，楼层数:', floors.value.length)
    }
  } catch (error) {
    // 如果是403错误，静默处理（可能是安装/质检人员没有查看楼层列表的权限）
    if (error.response && error.response.status === 403) {
      console.warn('用户没有权限获取楼层列表 (403)，已静默处理')
      floors.value = []
      return
    }

    console.error('获取楼层列表失败:', error)
    ElMessage.error({
      message: '获取楼层列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    floors.value = [] // 发生错误时确保floors是数组
  }
}

const getModels = async (projectId) => {
  try {
    if (!projectId) {
      models.value = []
      return
    }
    
    // 传入 suppress403: true 以抑制全局的403错误提示
    const response = await api.bimModel.getBIMModels({ projectId }, { suppress403: true }) 
    const modelsData = Array.isArray(response) ? response : (response.data || [])
    models.value = Array.isArray(modelsData) ? modelsData : []

    console.log('✅ 获取模型列表成功. 数量:', models.value.length)
    if (models.value.length > 0) {
      console.log('📦 模型列表内容:', JSON.parse(JSON.stringify(models.value)))
    } else {
      console.warn('⚠️ 后端返回了空模型列表')
    }
    
    // 如果当前选中的模型不在列表中，清空选中状态
    if (selectedModel.value && !models.value.find(m => m.id === selectedModel.value.id)) {
      selectedModel.value = null
      modelFile.value = null
      isBimModelLoaded.value = false
      selectedModelId.value = ''
    }
  } catch (error) {
    // 如果是403错误，静默处理（可能是安装/质检人员没有查看模型列表的权限）
    if (error.response && error.response.status === 403) {
      console.warn('用户没有权限获取模型列表 (403)，已静默处理')
      models.value = []
      return
    }

    console.error('获取模型列表失败:', error)
    ElMessage.error({
      message: '获取模型列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    models.value = [] // 发生错误时确保models是数组
  }
}

const getEmbeddedParts = async (projectId, floorId = '') => {
  try {
    if (!projectId) {
      embeddedParts.value = []
      return
    }
    const params = { projectId }
    if (floorId) params.floorId = floorId
    const response = await api.embeddedPart.getEmbeddedParts(params) // 正确，传入对象
    // 确保embeddedParts始终是数组
    embeddedParts.value = Array.isArray(response) ? response : []
    
    console.log('✅ 获取到预埋件数据:', embeddedParts.value.length, '个')
    
    // 🔧 修复：如果3D场景已初始化且有预埋件，重新创建预埋件球体
    if (scene && isThreeJsInitialized.value && embeddedParts.value.length > 0) {
      console.log('🎯 3D场景已存在，重新创建预埋件球体')
      
      // 清除现有的预埋件球体
      Object.values(bimModelObjects.value).forEach(mesh => {
        if (mesh.userData.embeddedPartId) {
          scene.remove(mesh)
          if (mesh.geometry) mesh.geometry.dispose()
          if (mesh.material) mesh.material.dispose()
        }
      })
      bimModelObjects.value = {}
      
      // 重新创建预埋件球体
      createEmbeddedPartSpheres()
    }
  } catch (error) {
    console.error('获取预埋件列表失败:', error)
    ElMessage.error({
      message: '获取预埋件列表失败，请稍后重试',
      duration: 3000,
      type: 'error'
    })
    // 发生错误时也确保embeddedParts是数组
    embeddedParts.value = []
  }
}

const getModelFile = async (modelId) => {
  try {
    // 1. Basic Validation
    if (!modelId) {
      throw new Error('模型ID不能为空')
    }
    
    const model = models.value.find(m => m.id === modelId)
    if (!model) {
      throw new Error('未找到指定模型')
    }
    
    selectedModel.value = model
    selectedEmbeddedPart.value = null
    isBimModelLoaded.value = false
    
    // Release previous URL to prevent memory leaks
    if (localCadFile.value && typeof localCadFile.value === 'string') {
       URL.revokeObjectURL(localCadFile.value)
    }
    
    const loadingMessage = ElMessage({
      message: '正在加载模型文件...',
      duration: 0,
      type: 'info'
    })
    
    // Skip for 3D models
    if (model.type === '3d') {
      loadingMessage.close()
      isBimModelLoaded.value = false
      return
    }
    
    // --- Step 1: Fetch Data (Bypassing Axios) ---
    const url = `/api/models/${modelId}/download?useLightweight=${model.isLightweight ? 'true' : 'false'}`;
    const token = localStorage.getItem('token');

    console.log('正在尝试使用原生 Fetch 下载:', url);

    const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        }
    });

    if (!fetchResponse.ok) {
        throw new Error(`文件下载失败: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const finalBlob = await fetchResponse.blob(); // Define ONCE here

    // --- Step 2: Diagnostic & Correction ---
    // Read first 6 bytes to check header
    const buffer = await finalBlob.slice(0, 6).arrayBuffer();
    const header = new TextDecoder().decode(buffer);
    
    console.log('====== 文件格式诊断 ======');
    console.log('1. 文件头(String):', header);
    
    // Auto-correct extension based on header
    let realExtension = '.dwg'; // Default
    
    // DXF Detection: Starts with "  0" or "0\n"
    if (header.includes('0') && (header.includes('S') || header.includes('s'))) {
        realExtension = '.dxf';
        console.log('🔍 自动检测：这是一个 DXF 文件，强制修正后缀为 .dxf');
    } else if (header.startsWith('AC')) {
        realExtension = '.dwg';
        console.log('🔍 自动检测：这是一个 DWG 文件');
    }

    if (finalBlob.size === 0) {
      throw new Error('服务器返回空文件');
    }

    // Create File with CORRECT extension
    const baseName = selectedModel.value?.name || 'temp_model';
    // Ensure filename ends with correct extension
    const finalFileName = baseName.toLowerCase().endsWith(realExtension) 
        ? baseName 
        : (baseName + realExtension);
    
    console.log('📄 最终传给组件的文件名:', finalFileName);

    const finalFile = new File([finalBlob], finalFileName, { type: 'application/octet-stream' });

    // --- Step 3: Assign to Component ---
    localCadFile.value = markRaw(finalFile);

    // Load parts
    await getEmbeddedParts(selectedProjectId.value, selectedFloorId.value)
    
    loadingMessage.close()

  } catch (error) {
    console.error('获取模型文件失败:', error)
    if (ElMessage.closeAll) ElMessage.closeAll()
    ElMessage.error({
      message: `获取模型文件失败: ${error.message}`,
      duration: 3000,
      type: 'error'
    })
    selectedModel.value = null
    localCadFile.value = null
  }
}

// 事件处理
const handleProjectChange = async (projectId) => {
  if (!projectId) return
  
  selectedProjectId.value = projectId
  selectedFloorId.value = ''
  selectedModelId.value = ''
  selectedModel.value = null
  
  await getFloors(projectId)
  await getModels(projectId)
  await getEmbeddedParts(projectId)
}

const handleFloorChange = async (floorId) => {
  if (!floorId) return
  
  selectedFloorId.value = floorId
  await getEmbeddedParts(selectedProjectId.value, floorId)
  
  console.log('🔄 楼层切换，当前预埋件:', embeddedParts.value.length, '个')
}

const handleModelChange = async (model) => {
  if (!model) return
  
  const modelId = model.id
  selectedModelId.value = modelId
  selectedModel.value = model
  
  // 1. 【关键】彻底销毁组件，并清理资源
  showCadViewer.value = false
  // 释放旧的 URL 对象，防止内存泄漏
  if (localCadFile.value && typeof localCadFile.value === 'string') {
    URL.revokeObjectURL(localCadFile.value)
  }
  localCadFile.value = null 
  cadViewerKey.value++ // 强制 Key 变化
  
  // 2. 获取新数据
  // 注意：getModelFile 内部现在是用 fetch 获取 Blob URL
  await getModelFile(modelId)
  
  // 3. 【关键】增加延迟，给 Vue 和 CAD 库足够的销毁时间
  // 之前的 nextTick 可能太快了，导致旧的 command stack 还没释放
  if (selectedModel.value) {
    if (selectedModel.value.type === '2d') {
      currentView.value = '2d'
      
      setTimeout(() => {
        showCadViewer.value = true
      }, 100) // 给 100ms 的缓冲时间让旧实例彻底卸载
    } else if (selectedModel.value.type === '3d') {
      currentView.value = '3d'
      showCadViewer.value = false
      await loadBimModel()
    }
  }
}

const handleStatusFilterChange = () => {
  // 筛选状态变化时自动更新列表
}



// 查看器相关方法
const onViewerError = (error) => {
  console.error('CAD查看器错误:', error)
  
  // 检查是否是 draw 方法相关的错误
  if (error.message && (
    error.message.includes('draw is not a function') || 
    error.message.includes('batchConvert') ||
    error.message.includes('TypeError') ||
    error.message.includes('n.draw')
  )) {
    console.warn('检测到渲染相关错误，尝试重新初始化...')
    ElMessage.warning('渲染初始化遇到问题，正在重新配置...')
    
    // 重新初始化查看器配置
    setTimeout(() => {
      refreshViewer()
    }, 1500)
    return
  }
  
  ElMessage.error(`CAD查看器加载失败: ${error.message || '未知错误'}`)
}

// 查看器相关方法
const onViewerLoaded = () => {
  console.log('Viewer loaded')
  ElMessage.success('模型加载成功')
  
  // 模拟加载后获取模型信息
  setTimeout(() => {
    modelInfo.value = {
      name: selectedModel.value?.name || '未命名模型',
      layers: 4,
      entities: 1250,
      embeddedParts: embeddedParts.value.length
    }
  }, 500)
  
  // 如果启用了坐标同步，初始化BIM模型
  if (enableCoordinateSync.value && currentView.value !== '2d') {
    loadBimModel()
  }
}

const onViewerClick = (event) => {
  console.log('Viewer clicked:', event)
  
  // 处理点击事件，高亮选中的预埋件
  if (cadViewerRef.value) {
    // 获取点击位置的实体信息
    const entityInfo = cadViewerRef.value.getEntityAt(event.clientX, event.clientY)
    if (entityInfo) {
      // 查找对应的预埋件
      const clickedEmbeddedPart = embeddedParts.value.find(ep => ep.code === entityInfo.entityId || ep.name === entityInfo.name)
      if (clickedEmbeddedPart) {
        selectedEmbeddedPart.value = clickedEmbeddedPart
        highlightEmbeddedPart(clickedEmbeddedPart)
        
        // 如果启用了坐标同步，在3D视图中高亮对应位置
        if (enableCoordinateSync.value && bimViewerRef.value) {
          highlightInBimViewer(clickedEmbeddedPart)
        }
      }
    }
  }
}

const highlightEmbeddedPart = (embeddedPart) => {
  console.log('==================== highlightEmbeddedPart ====================')
  console.log('🎯 点击的预埋件:', embeddedPart.name, 'ID:', embeddedPart.id)
  console.log('📍 当前视图模式:', currentView.value)
  console.log('📊 bimModelObjects总数:', Object.keys(bimModelObjects.value).length)
  console.log('📊 bimModelObjects的所有ID:', Object.keys(bimModelObjects.value))
  
  // 🔧 修复：只在3D或双视图模式下才需要3D对象
  const need3DHighlight = currentView.value === '3d' || currentView.value === 'both'
  console.log('🔍 是否需要3D高亮:', need3DHighlight)
  
  if (need3DHighlight) {
    // 检查是否有3D对象
    const has3DObject = bimModelObjects.value[embeddedPart.id]
    console.log('🔍 查找ID为', embeddedPart.id, '的3D对象:', has3DObject ? '找到了！' : '未找到')
    
    if (!has3DObject && scene && isThreeJsInitialized.value) {
      console.warn('❌ 未找到预埋件3D对象:', embeddedPart.id)
      console.log('💡 提示：尝试点击"刷新3D显示"按钮')
      
      ElMessage.warning({
        message: `预埋件 "${embeddedPart.name}" 在3D场景中不可见。请点击"刷新3D显示"按钮`,
        duration: 4000
      })
      return // 如果找不到就直接返回，不要继续
    }
  }
  
  ElMessage.info(`已定位到预埋件: ${embeddedPart.name}`)
  
  // 在2D CAD视图中，暂时只显示提示信息
  // TODO: 后续可以添加CAD查看器的高亮功能（需要查看CAD查看器文档）
  
  // 如果启用了坐标同步且在3D/双视图模式，在3D视图中高亮
  if (enableCoordinateSync.value && bimViewerRef.value && need3DHighlight && scene) {
    console.log('✅ 准备调用highlightInBimViewer')
    highlightInBimViewer(embeddedPart)
  }
  console.log('==============================================================')
}



const zoomToExtent = () => {
  if (cadViewerRef.value) {
    // 调用CAD查看器的zoomToExtent方法
    cadViewerRef.value.zoomToExtent()
  }
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  
  // 处理2D视图网格
  if (cadViewerRef.value) {
    cadViewerRef.value.setGridVisible(showGrid.value)
  }
  
  // 处理3D视图网格
  if (gridHelper) {
    gridHelper.visible = showGrid.value
  }
}

const toggleLayers = () => {
  if (cadViewerRef.value) {
    // 从CAD查看器获取图层信息
    const viewerLayers = cadViewerRef.value.getLayers()
    layers.value = viewerLayers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible
    }))
  }
  layersDialogVisible.value = true
}

const applyLayerChanges = () => {
  if (cadViewerRef.value) {
    // 应用图层变化到CAD查看器
    layers.value.forEach(layer => {
      cadViewerRef.value.setLayerVisible(layer.id, layer.visible)
    })
  }
  layersDialogVisible.value = false
}

const refreshViewer = () => {
  if (cadViewerRef.value) {
    // 调用CAD查看器的refresh方法
    cadViewerRef.value.refresh()
  }
}

// 刷新预埋件3D显示
const refreshEmbeddedPartsIn3D = () => {
  if (!scene || !isThreeJsInitialized.value) {
    ElMessage.warning({
      message: '请先切换到"3D BIM视图"或"双视图"模式以初始化3D场景',
      duration: 3000
    })
    return
  }
  
  if (embeddedParts.value.length === 0) {
    ElMessage.info('当前没有预埋件数据')
    return
  }
  
  console.log('🔄 手动刷新预埋件3D显示，预埋件数量:', embeddedParts.value.length)
  
  // 清除现有的预埋件球体
  Object.values(bimModelObjects.value).forEach(mesh => {
    if (mesh.userData.embeddedPartId) {
      scene.remove(mesh)
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) mesh.material.dispose()
    }
  })
  bimModelObjects.value = {}
  
  // 重新创建预埋件球体
  createEmbeddedPartSpheres()
  
  ElMessage.success(`已刷新 ${embeddedParts.value.length} 个预埋件的3D显示`)
}

// 新添加的方法
// 鼠标移动事件处理（用于坐标同步）
const onViewerMouseMove = (event) => {
  if (!enableCoordinateSync || !bimViewerRef.value) return
  
  // 获取鼠标位置的坐标信息
  if (cadViewerRef.value) {
    const coordinate = cadViewerRef.value.getCoordinateAt(event.clientX, event.clientY)
    if (coordinate) {
      // 在3D视图中同步显示坐标
      console.log('同步坐标:', coordinate)
      // 实际项目中，这里应该更新3D视图的相机位置
    }
  }
}

// 初始化Three.js场景
const initThreeJs = () => {
  if (!bimViewerRef.value) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f7fa)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(10, 10, 10)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = '' // 清空容器
  container.appendChild(renderer.domElement)
  
  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7.5)
  scene.add(directionalLight)
  
  // 添加网格辅助线
  gridHelper = new THREE.GridHelper(100, 100)
  gridHelper.visible = showGrid.value // 根据当前showGrid状态设置初始可见性
  scene.add(gridHelper)
  
  // 添加坐标轴辅助线
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
  
  isThreeJsInitialized.value = true
  
  // 🔧 优化：3D场景初始化后立即同步创建预埋件球体
  if (embeddedParts.value.length > 0) {
    console.log('🎯 3D场景初始化完成，立即创建预埋件球体')
    createEmbeddedPartSpheres()
  }
  
  // 开始动画循环
  animate()
}

// 动画循环
let animationFrameId = null
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  try {
    if (controls) {
      controls.update()
    }
    
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  } catch (error) {
    console.error('Three.js动画循环错误:', error)
    // 停止动画循环
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    // 清理Three.js资源
    cleanupThreeJs()
    // 显示错误信息
    ElMessage.error('3D模型渲染失败，已切换到演示模式')
    // 创建演示模型作为备选
    // createDemoModel()
  }
}

// 调整窗口大小
const handleWindowResize = () => {
  if (!bimViewerRef.value || !camera || !renderer) return
  
  const container = bimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
}

// 清理Three.js资源
const cleanupThreeJs = () => {
  // 停止动画循环
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 停止脉冲动画
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
  
  if (renderer && renderer.domElement) {
    renderer.dispose()
    if (bimViewerRef.value) {
      bimViewerRef.value.innerHTML = ''
    }
  }
  
  // 清理场景中的对象
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose()
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  
  scene = null
  camera = null
  renderer = null
  controls = null
  gridHelper = null
  highlightedMesh = null
  bimModels.value = []
  bimModelObjects.value = {}
  isThreeJsInitialized.value = false
  isBimModelLoaded.value = false
}

// 加载3D BIM模型
const loadBimModel = async () => {
  if (!selectedModel.value || !bimViewerRef.value) return
  
  console.log('加载3D BIM模型:', selectedModel.value.name)
  isBimModelLoaded.value = false
  
  // 检查模型转换状态 - 仅对需要转换的模型类型进行检查
  if (!selectedModel.value.conversionStatus) {
    // 对于直接是glb/gltf格式的3D模型，默认设置为已完成
    if (selectedModel.value.format === 'glb' || selectedModel.value.format === 'gltf') {
      selectedModel.value.conversionStatus = 'completed'
    } else {
      selectedModel.value.conversionStatus = 'pending' // 默认状态
    }
  }
  
  if (selectedModel.value.conversionStatus === 'pending') {
    console.log('模型尚未转换，无法加载3D视图')
    ElMessage.warning('该模型尚未转换为3D格式，请在模型管理页面先完成转换')
    return
  }
  
  if (selectedModel.value.conversionStatus === 'converting') {
    console.log('模型正在转换中，无法加载3D视图')
    ElMessage.info('该模型正在转换中，请稍候再试')
    return
  }
  
  if (selectedModel.value.conversionStatus === 'failed') {
    console.log('模型转换失败，无法加载3D视图')
    ElMessage.error('该模型转换失败，请在模型管理页面重新尝试转换')
    return
  }
  
  // 确保Three.js已初始化
  if (!isThreeJsInitialized.value) {
    initThreeJs()
  }
  
  // 直接使用模型的fileUrl加载，不再通过API下载
      if (selectedModel.value.fileUrl) {
        try {
          // 清空现有模型
          bimModels.value.forEach(model => {
            scene.remove(model)
          })
          bimModels.value = []
          bimModelObjects.value = {}
          
          // 确保fileUrl包含完整的协议前缀
          let modelUrl = selectedModel.value.fileUrl
          if (modelUrl.startsWith('localhost:')) {
            modelUrl = `http://${modelUrl}`
          } else if (!modelUrl.startsWith('http://') && !modelUrl.startsWith('https://')) {
            modelUrl = `http://${modelUrl}`
          }
          
          // 修复文件路径编码问题
          // 将URL分解为各个部分，对路径部分进行正确编码
          const urlParts = new URL(modelUrl)
          // 解析路径，确保中文文件名正确编码
          const pathParts = urlParts.pathname.split('/').map(part => {
            // 如果已经编码过，先解码，然后重新编码
            try {
              // 尝试解码，如果成功则重新编码，否则直接编码
              const decoded = decodeURIComponent(part)
              return encodeURIComponent(decoded)
            } catch (e) {
              // 如果解码失败，直接编码
              return encodeURIComponent(part)
            }
          })
          // 重新构建路径
          urlParts.pathname = pathParts.join('/')
          // 重新构建完整URL
          modelUrl = urlParts.toString()
          
          console.log('直接使用模型URL加载3D模型:', modelUrl)
          
          // 保存当前的scene引用，避免回调函数中scene变为null
          const currentScene = scene
          const currentCamera = camera
          const currentControls = controls
          
          // 使用GLTFLoader直接从URL加载模型
          const loader = new GLTFLoader()
          loader.load(
            modelUrl,
            (gltf) => {
              // 模型加载成功
              if (!currentScene || !currentCamera || !currentControls) {
                console.error('Scene, camera or controls is null when model loaded, skipping...')
                return
              }
              
              const model = gltf.scene
              
              // 缩放模型：根据用户反馈调整 (0.01)
              model.scale.set(0.1, 0.1, 0.1)

              // 使用markRaw确保Three.js对象不会被Vue的响应式系统转换
              const nonReactiveModel = markRaw(model)
              
              currentScene.add(nonReactiveModel)
              bimModels.value.push(nonReactiveModel)
              
              // 🔧 修复：不要从模型中提取预埋件ID，避免覆盖我们创建的预埋件球体
              // 模型只是用于展示建筑结构，预埋件由我们单独创建的球体表示
              console.log('📦 GLTF模型已添加到场景')
              
              // 调整相机位置以适合模型
              const box = new THREE.Box3().setFromObject(model)
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              const fov = currentCamera.fov * (Math.PI / 180)
              let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
              cameraZ *= 1.5
              
              currentCamera.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
              currentControls.target.copy(center)
              currentControls.update()
              
              // 🔧 关键修复：模型加载完成后，重新创建预埋件球体
              // 这样可以确保预埋件球体在最上层，不会被模型对象覆盖
              console.log('📍 GLTF模型加载完成，重新创建预埋件球体以确保可见性')
              
              // 先清除bimModelObjects（移除旧的预埋件球体）
              Object.keys(bimModelObjects.value).forEach(id => {
                const mesh = bimModelObjects.value[id]
                if (mesh && mesh.userData && mesh.userData.embeddedPartId) {
                  currentScene.remove(mesh)
                  if (mesh.geometry) mesh.geometry.dispose()
                  if (mesh.material) mesh.material.dispose()
                }
              })
              bimModelObjects.value = {}
              
              // 重新创建预埋件球体
              if (embeddedParts.value.length > 0) {
                createEmbeddedPartSpheres()
              }
              
              isBimModelLoaded.value = true
              console.log('3D BIM模型加载完成')
              ElMessage.success('3D BIM模型加载完成')
            },
            (progress) => {
              // 模型加载进度
              console.log('模型加载进度:', (progress.loaded / progress.total) * 100, '%')
            },
            (error) => {
              // 模型加载失败
              console.error('加载3D BIM模型失败:', error)
              ElMessage.error('加载3D BIM模型失败')
              isBimModelLoaded.value = false
              
              // 如果加载失败，创建演示模型作为备选
              // createDemoModel()
              isBimModelLoaded.value = true
            }
          )
        } catch (error) {
          console.error('加载3D BIM模型失败:', error)
          ElMessage.error('加载3D BIM模型失败')
          
          // 如果获取模型文件失败，创建演示模型作为备选
          // createDemoModel()
          isBimModelLoaded.value = true
        }
      } else {
        // 如果没有fileUrl，创建演示模型
        console.log('模型没有fileUrl，不显示模型')
        // createDemoModel()
        isBimModelLoaded.value = true
      }
}

// 创建预埋件球体（当模型中没有预埋件对象时使用）
const createEmbeddedPartSpheres = () => {
  if (!scene) {
    console.error('❌ 无法创建预埋件球体: scene为null')
    return
  }
  
  console.log('🎨 开始创建预埋件球体，预埋件数量:', embeddedParts.value.length)
  
  let createdCount = 0
  let withCoordinatesCount = 0
  let withoutCoordinatesCount = 0
  
  embeddedParts.value.forEach((ep) => {
    let position = null
    
    // 尝试使用坐标转换器计算3D位置
    if (ep.coordinates2D && coordinateMapper) {
      const coord3D = coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) {
        position = coord3D
        withCoordinatesCount++
        console.log(`✅ 预埋件 ${ep.name} (${ep.id}) 使用真实坐标:`, coord3D)
      }
    }
    
    // 如果没有2D坐标或转换失败，使用随机位置（兼容旧数据）
    if (!position) {
      position = getRandomPosition()
      withoutCoordinatesCount++
      console.warn(`⚠️ 预埋件 ${ep.name} (${ep.id}) 缺少坐标信息，使用随机位置`, position)
    }
    
    const embeddedPartGeometry = new THREE.SphereGeometry(0.02, 32, 32)
    const embeddedPartMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const embeddedPartMesh = new THREE.Mesh(embeddedPartGeometry, embeddedPartMaterial)
    embeddedPartMesh.position.set(position.x, position.y, position.z)
    embeddedPartMesh.userData = { 
      embeddedPartId: ep.id,
      embeddedPartName: ep.name,
      embeddedPartCode: ep.code
    }
    
    // 使用markRaw确保Three.js对象不会被Vue的响应式系统转换
    const nonReactiveMesh = markRaw(embeddedPartMesh)
    
    scene.add(nonReactiveMesh)
    bimModelObjects.value[ep.id] = nonReactiveMesh
    createdCount++
  })
  
  console.log(`✅ 预埋件球体创建完成！总数: ${createdCount}, 有坐标: ${withCoordinatesCount}, 无坐标: ${withoutCoordinatesCount}`)
  console.log('📊 bimModelObjects:', Object.keys(bimModelObjects.value))
}

// createDemoModel removed

// 根据状态获取颜色 - 使用更鲜明的颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 0xff9800 // 橙色 - 待安装
    case 'installed':
      return 0x4caf50 // 绿色 - 已安装
    case 'inspected':
      return 0x2196f3 // 蓝色 - 已验收
    case 'completed':
      return 0x9e9e9e // 灰色 - 已完成
    default:
      return 0xff9800
  }
}

// 在3D BIM视图中高亮预埋件 - 带脉冲定位效果
const highlightInBimViewer = (embeddedPart) => {
  if (!bimViewerRef.value || !scene) return
  
  console.log('在3D视图中高亮:', embeddedPart.name)
  
  // 停止之前的脉冲动画
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId)
    pulseAnimationId = null
  }
  
  // 恢复之前高亮的预埋件
  if (highlightedMesh) {
    highlightedMesh.material.emissive.set(0x000000)
    highlightedMesh.material.emissiveIntensity = 0
    highlightedMesh.scale.set(1, 1, 1)
  }
  
  // 获取目标对象
  const targetObject = bimModelObjects.value[embeddedPart.id]
  if (!targetObject) {
    console.warn('未找到预埋件对应的3D对象:', embeddedPart.id)
    return
  }
  
  highlightedMesh = targetObject
  
  // 保存原始颜色和大小
  if (!targetObject.userData.originalColor) {
    targetObject.userData.originalColor = targetObject.material.color.clone()
    targetObject.userData.originalScale = targetObject.scale.clone()
  }
  
  // 设置高亮颜色（亮黄色）
  targetObject.material.emissive.set(0xffff00)
  targetObject.material.emissiveIntensity = 1
  
  // 相机平滑移动到预埋件位置
  const targetPosition = targetObject.position
  const distance = 10 // 相机距离
  
  // 计算相机新位置（在预埋件上方偏后）
  const newCameraPosition = {
    x: targetPosition.x + distance * 0.5,
    y: targetPosition.y + distance * 0.7,
    z: targetPosition.z + distance * 0.5
  }
  
  // 平滑移动相机
  const startCameraPos = camera.position.clone()
  const startTargetPos = controls.target.clone()
  const duration = 1000 // 1秒
  const startTime = Date.now()
  
  const smoothMove = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数（ease-out）
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    // 插值相机位置
    camera.position.lerpVectors(
      startCameraPos,
      new THREE.Vector3(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z),
      easeProgress
    )
    
    // 插值控制器目标
    controls.target.lerpVectors(
      startTargetPos,
      targetPosition,
      easeProgress
    )
    
    controls.update()
    
    if (progress < 1) {
      requestAnimationFrame(smoothMove)
    }
  }
  
  smoothMove()
  
  // 脉冲动画效果
  let pulseTime = 0
  const pulseDuration = 3000 // 脉冲持续3秒
  const pulseStartTime = Date.now()
  
  const pulseAnimation = () => {
    const elapsed = Date.now() - pulseStartTime
    
    if (elapsed > pulseDuration) {
      // 动画结束，保持高亮状态
      targetObject.scale.set(1, 1, 1)
      return
    }
    
    pulseTime += 0.05
    
    // 缩放脉冲（呼吸效果）
    const scaleMultiplier = 1 + Math.sin(pulseTime * 3) * 0.2
    targetObject.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier)
    
    // 发光强度脉冲
    const intensity = 0.5 + Math.sin(pulseTime * 3) * 0.5
    targetObject.material.emissiveIntensity = intensity
    
    pulseAnimationId = requestAnimationFrame(pulseAnimation)
  }
  
  pulseAnimation()
  
  ElMessage.success({
    message: `已定位到预埋件: ${embeddedPart.name}`,
    duration: 2000
  })
}

// ==================== 双视图对齐模式方法 ====================

// 监听视图切换到双视图对齐模式
watch(currentView, async (newView, oldView) => {
  if (newView === 'dualAlign') {
    // 切换前先隐藏所有CAD查看器
    showCadViewer.value = false
    showDualCadViewer.value = false
    
    // 等待DOM完全更新，确保旧的CAD实例被销毁
    await nextTick()
    
    // 延迟初始化，确保旧的CAD实例已完全销毁
    setTimeout(async () => {
      // 先初始化3D场景
      initDualView3D()
      
      // 确保2D CAD文件已加载（异步等待）
      await loadDualView2DCad()
      
      // 使用独立的key和显示标志
      dualCadViewerKey.value++
      await nextTick()
      
      // 延迟显示双视图CAD查看器
      setTimeout(() => {
        showDualCadViewer.value = true
        console.log('✅ 双视图CAD查看器显示，key:', dualCadViewerKey.value)
      }, 300)
    }, 300)
  } else if (oldView === 'dualAlign' && newView !== 'dualAlign') {
    // 离开双视图模式时清理
    showDualCadViewer.value = false
    cleanupDualView3D()
    
    // 等待DOM更新
    await nextTick()
    
    // 延迟恢复普通CAD查看器
    setTimeout(() => {
      cadViewerKey.value++
      showCadViewer.value = true
    }, 300)
  }
})

// 加载双视图的2D CAD文件
const loadDualView2DCad = async () => {
  // 如果已经有localCadFile，不需要重新加载
  if (localCadFile.value) {
    console.log('✅ 2D CAD文件已加载')
    return
  }
  
  // 查找当前项目中的2D模型
  const model2D = models.value.find(m => m.type === '2d')
  
  if (!model2D || !model2D.fileUrl) {
    console.log('没有找到2D CAD模型')
    return
  }
  
  try {
    console.log('📄 开始加载双视图2D CAD文件:', model2D.name)
    
    const fileUrl = model2D.fileUrl.startsWith('http') 
      ? model2D.fileUrl 
      : `${config.apiBaseUrl}${model2D.fileUrl}`
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const blob = await response.blob()
    const fileName = model2D.name || 'model.dwg'
    const file = new File([blob], fileName, { type: blob.type })
    
    localCadFile.value = file
    console.log('✅ 双视图2D CAD文件加载完成:', fileName)
  } catch (error) {
    console.error('加载2D CAD文件失败:', error)
  }
}

// 初始化双视图3D场景
const initDualView3D = () => {
  if (!dualBimViewerRef.value) return
  
  const container = dualBimViewerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  if (width === 0 || height === 0) {
    // 容器还没准备好，延迟初始化
    setTimeout(initDualView3D, 100)
    return
  }
  
  // 创建场景
  dualScene = new THREE.Scene()
  dualScene.background = new THREE.Color(0xf0f2f5)
  
  // 创建相机
  dualCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  dualCamera.position.set(15, 15, 15)
  
  // 创建渲染器
  dualRenderer = new THREE.WebGLRenderer({ antialias: true })
  dualRenderer.setSize(width, height)
  dualRenderer.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = ''
  container.appendChild(dualRenderer.domElement)
  
  // 创建控制器
  dualControls = new OrbitControls(dualCamera, dualRenderer.domElement)
  dualControls.enableDamping = true
  dualControls.dampingFactor = 0.05
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  dualScene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  dualScene.add(directionalLight)
  
  // 添加网格
  const gridHelper = new THREE.GridHelper(50, 50)
  dualScene.add(gridHelper)
  
  // 添加坐标轴
  const axesHelper = new THREE.AxesHelper(5)
  dualScene.add(axesHelper)
  
  // 添加简单建筑模型作为参考
  // createDualViewDemoBuilding()
  
  // 启动动画循环
  dualAnimate()
  
  // 加载实际的BIM模型（如果有的话）
  loadDualViewActualModel()
  
  console.log('✅ 双视图3D场景初始化完成')
}

// 加载双视图的实际BIM模型
const loadDualViewActualModel = async () => {
  if (!dualScene) return
  
  // 查找当前项目中的3D模型
  const model3D = models.value.find(m => m.type === '3d')
  
  if (!model3D || !model3D.fileUrl) {
    console.log('没有找到3D模型，不显示演示模型')
    // createDualViewDemoBuilding()
    return
  }
  
  try {
    // 构建模型URL
    const modelUrl = model3D.fileUrl.startsWith('http') 
      ? model3D.fileUrl 
      : `${config.apiBaseUrl}${model3D.fileUrl}`
    
    console.log('📦 开始加载双视图BIM模型:', modelUrl)
    
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        if (!dualScene) return
        
        const model = gltf.scene
        
        // 缩放模型：根据用户反馈调整 (0.01)
        model.scale.set(0.1, 0.1, 0.1)
        
        const nonReactiveModel = markRaw(model)
        dualScene.add(nonReactiveModel)
        
        // 调整相机位置
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = dualCamera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= 1.5
        
        dualCamera.position.set(center.x, center.y + size.y * 0.5, center.z + cameraZ)
        dualControls.target.copy(center)
        dualControls.update()
        
        // 添加预埋件标记球
        if (embeddedParts.value.length > 0) {
          createDualViewEmbeddedPartSpheres()
        }
        
        console.log('✅ 双视图BIM模型加载完成')
      },
      undefined,
      (error) => {
        console.error('加载双视图BIM模型失败:', error)
        // createDualViewDemoBuilding()
      }
    )
  } catch (error) {
    console.error('加载双视图BIM模型失败:', error)
    // createDualViewDemoBuilding()
  }
}

// 在双视图场景中创建预埋件球体标记
const createDualViewEmbeddedPartSpheres = () => {
  if (!dualScene) return
  
  embeddedParts.value.forEach((ep) => {
    let position = null
    
    if (ep.coordinates2D && coordinateMapper) {
      const coord3D = coordinateMapper.convert2DTo3D(ep.coordinates2D, ep.floorId)
      if (coord3D) position = coord3D
    }
    
    if (!position) {
      position = getRandomPosition()
    }
    
    const sphereGeometry = new THREE.SphereGeometry(0.02, 32, 32)
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
      color: getStatusColor(ep.status)
    })
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphereMesh.position.set(position.x, position.y, position.z)
    sphereMesh.userData = { 
      embeddedPartId: ep.id,
      embeddedPartName: ep.name
    }
    
    dualScene.add(sphereMesh)
  })
}

// 创建双视图演示建筑 (作为备选)
// createDualViewDemoBuilding removed

// 双视图动画循环
const dualAnimate = () => {
  dualAnimationFrameId = requestAnimationFrame(dualAnimate)
  
  if (dualControls) {
    dualControls.update()
  }
  
  if (dualRenderer && dualScene && dualCamera) {
    dualRenderer.render(dualScene, dualCamera)
  }
}

// 清理双视图3D资源
const cleanupDualView3D = () => {
  if (dualAnimationFrameId) {
    cancelAnimationFrame(dualAnimationFrameId)
    dualAnimationFrameId = null
  }
  
  if (dualRenderer && dualRenderer.domElement) {
    dualRenderer.dispose()
    if (dualBimViewerRef.value) {
      dualBimViewerRef.value.innerHTML = ''
    }
  }
  
  if (dualScene) {
    dualScene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  
  dualScene = null
  dualCamera = null
  dualRenderer = null
  dualControls = null
}

// 双视图CAD加载完成
const onDualViewerLoaded = () => {
  console.log('✅ 双视图2D CAD加载完成')
  ElMessage.success('双视图模式已启动')
}

// 当在2D视图中选择点时
const onPointSelected = (data) => {
  console.log('📍 选中点:', data)
  
  // 保存2D点
  referencePoints2D.value.push({
    id: data.point.id,
    x: data.worldCoords.x,
    y: data.worldCoords.y,
    label: data.point.label
  })
  
  // 转换为3D坐标并同步显示
  if (coordinateMapper) {
    const coord3D = coordinateMapper.convert2DTo3D(
      { x: data.worldCoords.x, y: data.worldCoords.y },
      selectedFloorId.value
    )
    
    if (coord3D) {
      referencePoints3D.value.push({
        id: data.point.id,
        x: coord3D.x,
        y: coord3D.y,
        z: coord3D.z,
        label: data.point.label
      })
      
      // 在3D视图中显示标记
      if (dualScene) {
        createReferencePointMarkers(dualScene, referencePoints3D.value)
      }
    }
  }
  
  // 更新对齐参数
  updateAlignmentParams()
}

// 当坐标更新时（鼠标移动）
const onCoordinateUpdate = (data) => {
  // 可以用于实时显示坐标
  // console.log('坐标更新:', data)
}

// 清除所有点
const onPointsCleared = () => {
  referencePoints2D.value = []
  referencePoints3D.value = []
  
  if (dualScene) {
    removeReferencePointMarkers(dualScene)
  }
  
  // 重置对齐参数
  alignmentParams.scale = 1
  alignmentParams.rotation = 0
  alignmentParams.offsetX = 0
  alignmentParams.offsetY = 0
}

// 移除单个点
const onPointRemoved = (data) => {
  const index = referencePoints2D.value.findIndex(p => p.id === data.point?.id)
  if (index > -1) {
    referencePoints2D.value.splice(index, 1)
    referencePoints3D.value.splice(index, 1)
    
    // 更新3D标记
    if (dualScene) {
      removeReferencePointMarkers(dualScene)
      if (referencePoints3D.value.length > 0) {
        createReferencePointMarkers(dualScene, referencePoints3D.value)
      }
    }
  }
}

// 工作流阶段变化
const onAlignmentStageChange = (data) => {
  alignmentStage.value = data.stage
  console.log('📊 对齐阶段:', data.stage, data.name)
  
  if (data.stage === 1) {
    // 进入3D选点阶段，初始化3D场景
    initDualView3D()
    if (dualScene) {
      drawReferenceAxis(dualScene, alignmentParams.rotation)
    }
  } else if (data.stage === 0) {
    // 返回2D标记阶段，清理3D
    if (dualScene) {
      removeReferenceAxis(dualScene)
    }
  }
}

// ==================== 阶段导航方法 ====================

// 从2D选点进入3D选点
const goToStage1 = async () => {
  if (referencePoints2D.value.length < 2) {
    ElMessage.warning('请至少标记2个参考点')
    return
  }
  
  alignmentStage.value = 1
  console.log('📊 进入3D选点阶段')
  
  // 等待DOM更新后初始化3D场景
  await nextTick()
  setTimeout(() => {
    initDualView3D()
  }, 100)
}

// 返回2D选点
const goToStage0 = () => {
  alignmentStage.value = 0
  console.log('📊 返回2D选点阶段')
  
  // 清理3D场景
  cleanupDualView3D()
}

// 进入确认阶段
const goToStage2 = () => {
  if (referencePoints3D.value.length < 2) {
    ElMessage.warning('请至少标记2个3D参考点')
    return
  }
  
  alignmentStage.value = 2
  console.log('📊 进入确认阶段')
  
  // 计算对齐参数
  updateAlignmentParams()
}

// 设置3D视角
const setViewAngle = (angle) => {
  if (!dualCamera || !dualControls) return
  
  const distance = 30
  const positions = {
    front: { x: 0, y: 5, z: distance },
    top: { x: 0, y: distance, z: 0.1 },
    side: { x: distance, y: 5, z: 0 },
    iso: { x: distance * 0.7, y: distance * 0.7, z: distance * 0.7 }
  }
  
  const pos = positions[angle] || positions.iso
  dualCamera.position.set(pos.x, pos.y, pos.z)
  dualControls.target.set(0, 5, 0)
  dualControls.update()
  
  ElMessage.info(`已切换到${angle === 'front' ? '前' : angle === 'top' ? '俯' : angle === 'side' ? '侧' : '等轴测'}视图`)
}

// 重置对齐流程
const resetAlignment = () => {
  ElMessageBox.confirm('确定要重新开始对齐流程吗？所有标记点将被清除。', '确认', {
    type: 'warning'
  }).then(() => {
    alignmentStage.value = 0
    referencePoints2D.value = []
    referencePoints3D.value = []
    alignmentParams.scale = 1
    alignmentParams.rotation = 0
    alignmentParams.offsetX = 0
    alignmentParams.offsetY = 0
    
    cleanupDualView3D()
    ElMessage.success('已重置对齐流程')
  }).catch(() => {})
}

// 确认对齐
const confirmAlignment = async () => {
  try {
    await ElMessageBox.confirm('确认应用当前对齐参数吗？', '确认对齐', {
      type: 'success'
    })
    
    // 保存对齐参数到coordinateMapper
    if (coordinateMapper) {
      coordinateMapper.updateConfig({
        scale: alignmentParams.scale,
        rotation: alignmentParams.rotation,
        offsetX: alignmentParams.offsetX,
        offsetY: alignmentParams.offsetY
      })
    }
    
    ElMessage.success('对齐参数已保存！')
    
    // 可以在这里保存到后端
    // await api.saveAlignmentParams(...)
    
    // 返回正常视图模式
    currentView.value = '3d'
  } catch {
    // 用户取消
  }
}

// 工作流点移除
const onWorkflowPointRemoved = (index) => {
  if (dualCanvasRef.value) {
    dualCanvasRef.value.undoLastPoint()
  }
}

// 工作流清除所有点
const onWorkflowPointsCleared = () => {
  if (dualCanvasRef.value) {
    dualCanvasRef.value.clearAllPoints()
  }
}

// 视角预设变化
const onViewAngleChange = (angle) => {
  if (!dualCamera || !dualControls) return
  
  const distance = 25
  let position = { x: 0, y: 0, z: 0 }
  let target = { x: 0, y: 6, z: 0 }
  
  switch (angle) {
    case 'front':
      position = { x: 0, y: 6, z: distance }
      break
    case 'top':
      position = { x: 0, y: distance, z: 0.1 }
      break
    case 'side':
      position = { x: distance, y: 6, z: 0 }
      break
    case 'iso':
    default:
      position = { x: distance * 0.7, y: distance * 0.5, z: distance * 0.7 }
      break
  }
  
  animateCameraTo(dualCamera, dualControls, position, target)
}

// 计算最佳视角
const onBestAngleRequested = () => {
  if (!dualCamera || !dualControls || referencePoints3D.value.length < 2) {
    ElMessage.warning('至少需要2个参考点才能计算最佳视角')
    return
  }
  
  const result = calculateBestViewAngle(referencePoints3D.value, dualCamera)
  if (result) {
    animateCameraTo(dualCamera, dualControls, 
      { x: result.position.x, y: result.position.y, z: result.position.z },
      { x: result.target.x, y: result.target.y, z: result.target.z }
    )
    ElMessage.success('已调整到最佳视角')
  }
}

// 重置视图
const onResetView = () => {
  if (!dualCamera || !dualControls) return
  
  resetViewAlignment(dualCamera, dualControls, 
    { x: 15, y: 15, z: 15 }, 
    { x: 0, y: 6, z: 0 }
  )
}

// 重置双视图3D
const resetDualView3D = () => {
  onResetView()
}

// 参考轴切换
const onReferenceAxisToggle = (show) => {
  if (!dualScene) return
  
  if (show) {
    drawReferenceAxis(dualScene, alignmentParams.rotation)
  } else {
    removeReferenceAxis(dualScene)
  }
}

// 对齐确认
const onAlignmentConfirm = (data) => {
  console.log('✅ 对齐确认:', data)
  
  isAlignmentLocked.value = data.locked
  
  // 保存对齐参数
  if (coordinateMapper) {
    coordinateMapper.updateConfig({
      alignment: {
        ...coordinateMapper.config.alignment,
        rotation: data.params.rotation,
        scale: data.params.scale
      }
    })
  }
  
  ElMessage.success({
    message: '对齐参数已保存' + (data.locked ? '并锁定' : ''),
    duration: 3000
  })
}

// 对齐解锁
const onAlignmentUnlock = () => {
  isAlignmentLocked.value = false
  alignmentStage.value = 0
}

// 切换截图模式
const toggleScreenshotMode = () => {
  showScreenshotMode.value = !showScreenshotMode.value
}

// 更新对齐参数
const updateAlignmentParams = () => {
  if (referencePoints2D.value.length >= 2 && referencePoints3D.value.length >= 2) {
    // 计算缩放比例
    alignmentParams.scale = calculateScaleFactor(
      referencePoints2D.value, 
      referencePoints3D.value
    )
    
    // 计算旋转角度
    alignmentParams.rotation = calculateRotationAngle(
      referencePoints2D.value, 
      referencePoints3D.value
    )
    
    // 计算偏移
    if (referencePoints2D.value.length > 0 && referencePoints3D.value.length > 0) {
      const p2D = referencePoints2D.value[0]
      const p3D = referencePoints3D.value[0]
      alignmentParams.offsetX = p3D.x - p2D.x * alignmentParams.scale
      alignmentParams.offsetY = p3D.z - p2D.y * alignmentParams.scale
    }
    
    // 更新工作流组件
    if (alignmentWorkflowRef.value) {
      alignmentWorkflowRef.value.updateAlignmentParams(alignmentParams)
    }
    
    console.log('📐 对齐参数更新:', alignmentParams)
  }
}

// 移动端适配状态
const isMobile = ref(false)
const mobileDrawerVisible = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

</script>

<style scoped>
.bim-visualization {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
}

.toolbar {
  background-color: #fff;
  padding: 14px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-shrink: 0;
  z-index: 10;
  align-items: center;
  gap: 20px;
}

.project-select,
.model-select {
  width: 200px;
}

.control-panel {
  grid-area: control;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.control-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.control-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
  color: #1E3A5F;
}

.view-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.page-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.model-container {
  flex: 1;
  background-color: #f5f7fa;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-switcher {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}

/* ==================== 双视图对齐布局 - 顺序式全屏 ==================== */
.dual-align-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f5f7fa;
}

/* 阶段视图容器 */
.stage-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stage-view-container .view-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(to right, #409eff, #66b1ff);
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.stage-view-container .view-title span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 全屏视图容器 */
.full-view-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fff;
  min-height: 400px;
}

.full-view-container :deep(.dual-view-canvas-wrapper) {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 确保MlCadViewer填充整个容器 */
.full-view-container :deep(.ml-cad-viewer),
.full-view-container :deep([class*="cad-viewer"]) {
  width: 100% !important;
  height: 100% !important;
}

/* 3D全屏视图 */
.bim-viewer-full {
  width: 100%;
  height: 100%;
  position: relative;
}

.bim-viewer-full canvas {
  width: 100% !important;
  height: 100% !important;
}

/* 3D点击提示 */
.click-hint {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(103, 194, 58, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
  animation: breathe 2s infinite;
  z-index: 100;
}

@keyframes breathe {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.03); }
}

/* 视图控制按钮叠加层 */
.view-controls-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 确认阶段容器 */
.confirmation-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
}

.result-card {
  width: 100%;
  max-width: 600px;
}

.result-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-card .action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* placeholder样式 */
.dual-cad-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.dual-cad-placeholder p {
  margin-top: 12px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .dual-align-container {
    flex-direction: column;
  }
  
  .dual-left, .dual-right {
    flex: none;
    height: 50%;
    min-height: 300px;
  }
  
  .alignment-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    width: 100%;
    max-height: 50vh;
    border-radius: 16px 16px 0 0;
  }
}

/* 添加上传提示样式 */
.upload-hint {
  margin-top: 8px;
  text-align: center;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.sync-checkbox {
  margin-left: 15px;
}

.view-title {
  padding: 8px 12px;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
  font-size: 14px;
}

.cad-viewer-wrapper {
  width: 100%;
  flex: 1;
  border: 1px solid #ebeef5;
  margin: 5px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.cad-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 确保MlCadViewer组件能够正确填充父容器 */
.cad-viewer-wrapper :deep(.ml-cad-canvas) {
  position: relative !important;
  height: calc(100% - 34px) !important; /* 减去标题栏高度 */
  width: 100% !important;
}

.cad-viewer-wrapper :deep(.ml-cad-viewer-container) {
  height: 100% !important;
  width: 100% !important;
}

.cad-viewer-wrapper :deep(.ml-cad-viewer-container > *) {
  position: relative !important;
}

/* 隐藏MlCadViewer组件的额外UI元素 */
.cad-viewer-wrapper :deep(.ml-cad-viewer-container header),
.cad-viewer-wrapper :deep(.ml-cad-viewer-container footer) {
  display: none;
}

.bim-viewer-wrapper {
  width: 100%;
  flex: 1;
  border: 1px solid #ebeef5;
  margin: 5px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  background-color: #f5f7fa;
}

.bim-viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.bim-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #606266;
}

/* 双视图布局 */
.model-container:has(.current-view-both) .cad-viewer-wrapper,
.model-container:has(.current-view-both) .bim-viewer-wrapper {
  width: calc(50% - 10px);
  height: calc(100% - 20px);
}

.model-container:has(.current-view-both) {
  flex-direction: row;
}

.model-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

/* 预埋件面板 */
.embedded-parts-panel {
  width: 380px;
  background-color: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
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
  padding: 0;
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

.status-filter .el-checkbox {
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

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.item-title {
  font-weight: bold;
}

.item-info {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: #606266;
}

.info-item {
  margin-bottom: 3px;
}

.layers-list {
  max-height: 400px;
  overflow-y: auto;
}

.layer-item {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}

/* ========== 响应式修复开始 ========== */

/* 平板设备适配 (1024px以下) */
@media (max-width: 1024px) {
  .bim-visualization {
    grid-template-areas: 
      "header header"
      "model parts";
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr;
    padding: 16px;
    gap: 16px;
  }
  
  .embedded-parts-panel {
    max-height: calc(100vh - 200px);
  }
}

/* 移动端适配 (768px及以下) - 修复这里的关键问题 */
@media (max-width: 768px) {
  .bim-visualization {
    /* 改为单列布局，确保所有内容都可见 */
    grid-template-areas:
      "header"
      "model"
      "parts";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 16px;
    padding: 16px;
    height: auto; /* 改为自动高度，支持滚动 */
    min-height: 100vh;
    overflow-y: auto; /* 允许垂直滚动 */
  }
  
  /* 按钮组适配 */
  .view-controls {
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-top: 12px;
  }
  
  .view-controls button {
    flex: 1;
    min-width: 0; /* 允许按钮缩小 */
    white-space: nowrap;
  }
  
  /* 模型容器 */
  .model-container {
    height: 500px; /* 固定高度，确保足够显示 */
    min-height: 500px;
    margin: 0;
  }
  
  /* 视图切换器 */
  .view-switcher {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 12px;
  }
  
  .sync-checkbox {
    margin-left: 0;
    margin-top: 0;
  }
  
  /* 预埋件面板 */
  .embedded-parts-panel {
    height: 400px; /* 固定高度 */
    min-height: 400px;
    margin: 0;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 0;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }
  
  .project-select {
    width: 100%;
  }
  
  .header-right {
    align-self: stretch;
  }
  
  .header-right .el-button {
    width: 100%;
  }
  
  .embedded-part-item {
    padding: 12px;
  }
  
  .item-info {
    font-size: 13px;
  }
}

/* 小屏幕移动端 (480px及以下) */
@media (max-width: 480px) {
  .bim-visualization {
    padding: 0; /* 移除内边距，全屏显示 */
    gap: 0;
  }
  
  /* 模型容器全屏 */
  .model-container {
    height: 100% !important;
    min-height: 100vh !important;
    border-radius: 0;
  }
  
  /* 视图切换按钮调整 */
  .view-switcher {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: 90%;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .el-radio-group {
    display: flex;
    width: 100%;
  }

  .el-radio-button {
    flex: 1;
  }

  /* 隐藏桌面端特有的头部边距等 */
  .page-header {
    display: none;
  }
}

/* 超小屏幕 (375px及以下) */
@media (max-width: 375px) {
  .view-controls button {
    padding: 6px 10px;
  }
}

/* 移动端悬浮按钮 */
.mobile-menu-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2000;
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: bold;
  color: #409eff;
}

.mobile-controls {
  padding: 10px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #606266;
}

.mobile-select {
  width: 100%;
}

.mobile-filter {
  margin: 10px 0;
  display: flex;
  flex-wrap: wrap;
}

.mobile-list-scroll {
  max-height: 400px; /* Limit height to allow scrolling within drawer */
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
</style>

