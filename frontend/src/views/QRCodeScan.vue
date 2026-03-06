<template>
  <div class="qr-code-scan">
    <div class="page-header">
      <h2>二维码扫描</h2>
    </div>

    <el-card class="scan-card">
      <div class="scan-container">
        <!-- 扫描区域 -->
        <div class="scan-area" ref="scanArea">
          <div v-if="!scanning" class="scan-placeholder">
            <el-icon class="scan-icon"><Camera /></el-icon>
            <h3>点击开始扫描</h3>
            <p>扫描预埋件上的二维码</p>
            <div class="scan-tips">
              <el-tag size="small" type="info">支持从相册选择图片</el-tag>
              <el-tag size="small" type="success">自动识别，无需手动对焦</el-tag>
            </div>
          </div>
          <video
            ref="videoElement"
            v-if="scanning"
            autoplay
            playsinline
            class="scan-video"
          ></video>
          <!-- 扫描框 -->
          <div v-if="scanning" class="scan-frame">
            <div class="scan-line"></div>
            <!-- 四角装饰 -->
            <div class="scan-corner top-left"></div>
            <div class="scan-corner top-right"></div>
            <div class="scan-corner bottom-left"></div>
            <div class="scan-corner bottom-right"></div>
          </div>
          <!-- 扫描提示 -->
          <div v-if="scanning" class="scan-instructions">
            <p>请将二维码对准扫描区域</p>
            <p class="scan-hint">系统将自动识别二维码</p>
          </div>
        </div>

        <!-- 扫描控制按钮 -->
        <div class="scan-controls">
          <el-button
            type="primary"
            size="large"
            @click="toggleScan"
            :icon="scanning ? 'VideoPause' : 'VideoPlay'"
          >
            {{ scanning ? '暂停扫描' : '开始扫描' }}
          </el-button>
          <el-button
            type="success"
            size="large"
            @click="selectImage"
            icon="Picture"
          >
            从相册选择
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 扫描结果 -->
    <el-card class="result-card" v-if="scanResult">
      <template #header>
        <div class="result-header">
          <h3>
            <el-icon><CircleCheck /></el-icon>
            扫描成功
          </h3>
          <el-tag :type="getStatusType(scanResult.status)" size="large">
            {{ getStatusText(scanResult.status) }}
          </el-tag>
        </div>
      </template>
      
      <div class="result-content">
        <!-- 基本信息 -->
        <el-descriptions border :column="2" class="part-info">
          <el-descriptions-item label="名称" :span="2">
            <span class="highlight-text">{{ scanResult.name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="编号">{{ scanResult.code }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ scanResult.modelNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ scanResult.type }}</el-descriptions-item>
          <el-descriptions-item label="楼层">{{ getFloorName(scanResult.floorId) }}</el-descriptions-item>
          <el-descriptions-item label="位置" :span="2">{{ scanResult.location || '未指定' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 坐标信息（如果有） -->
        <div class="coordinate-info" v-if="hasCoordinates(scanResult)">
          <el-divider content-position="left">
            <el-icon><Location /></el-icon>
            位置坐标
          </el-divider>
          <div class="coord-grid">
            <div class="coord-item" v-if="scanResult.coordinates2D">
              <span class="coord-label">图纸坐标</span>
              <span class="coord-value">
                X: {{ formatCoord(scanResult.coordinates2D?.x) }}, 
                Y: {{ formatCoord(scanResult.coordinates2D?.y) }}
              </span>
            </div>
            <div class="coord-item" v-if="scanResult.axisDistanceX || scanResult.axisDistanceY">
              <span class="coord-label">轴线距离</span>
              <span class="coord-value">
                <span v-if="scanResult.axisDistanceX" class="axis-x">
                  距{{ scanResult.nearestAxisX || 'X轴' }}: {{ scanResult.axisDistanceX }}mm
                </span>
                <span v-if="scanResult.axisDistanceY" class="axis-y">
                  距{{ scanResult.nearestAxisY || 'Y轴' }}: {{ scanResult.axisDistanceY }}mm
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <!-- 主要操作 -->
          <el-button
            type="primary"
            size="large"
            @click="viewInBIM"
            :icon="View"
          >
            在BIM中查看
          </el-button>
          
          <!-- 状态操作 -->
          <el-button
            type="success"
            size="large"
            @click="showPhotoDialog('install')"
            v-if="scanResult.status === 'pending' && canInstall"
          >
            📷 拍照确认安装
          </el-button>
          <el-button
            type="warning"
            size="large"
            @click="showPhotoDialog('inspect')"
            v-if="scanResult.status === 'installed' && canInspect"
          >
            📷 拍照确认验收
          </el-button>
          
          <!-- 继续扫描 -->
          <el-button
            size="large"
            @click="resetScan"
            :icon="RefreshRight"
          >
            继续扫描
          </el-button>
        </div>

        <!-- 已有照片展示 -->
        <div class="photo-gallery" v-if="scanResult.installationPhotos && scanResult.installationPhotos.length > 0">
          <el-divider content-position="left">安装打卡照片</el-divider>
          <div class="photo-list">
            <el-image
              v-for="(photo, index) in scanResult.installationPhotos"
              :key="'install-' + index"
              :src="photo"
              :preview-src-list="scanResult.installationPhotos"
              :initial-index="index"
              fit="cover"
              class="photo-thumb"
            />
          </div>
        </div>
        <div class="photo-gallery" v-if="scanResult.inspectionPhotos && scanResult.inspectionPhotos.length > 0">
          <el-divider content-position="left">验收打卡照片</el-divider>
          <div class="photo-list">
            <el-image
              v-for="(photo, index) in scanResult.inspectionPhotos"
              :key="'inspect-' + index"
              :src="photo"
              :preview-src-list="scanResult.inspectionPhotos"
              :initial-index="index"
              fit="cover"
              class="photo-thumb"
            />
          </div>
        </div>

        <!-- 备注输入（已移入对话框） -->
      </div>
    </el-card>

    <!-- 拍照打卡对话框 -->
    <el-dialog
      v-model="photoDialogVisible"
      :title="photoDialogType === 'install' ? '📷 安装拍照打卡' : '📷 验收拍照打卡'"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="photo-dialog-content">
        <el-alert
          :title="photoDialogType === 'install' ? '请拍摄安装现场照片作为打卡凭证' : '请拍摄验收现场照片作为打卡凭证'"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <el-upload
          v-model:file-list="photoFileList"
          list-type="picture-card"
          :auto-upload="false"
          accept="image/*"
          :limit="5"
          :on-exceed="handlePhotoExceed"
          :on-preview="handlePhotoPreview"
          :on-remove="handlePhotoRemove"
        >
          <el-icon style="font-size: 28px; color: #909399"><Plus /></el-icon>
          <template #tip>
            <div class="el-upload__tip">最多上传5张照片，支持拍照或从相册选择</div>
          </template>
        </el-upload>

        <!-- 验收时增加备注 -->
        <div v-if="photoDialogType === 'inspect'" style="margin-top: 16px">
          <el-form-item label="备注">
            <el-input
              v-model="photoDialogNotes"
              type="textarea"
              placeholder="请输入验收备注信息"
              rows="3"
            />
          </el-form-item>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="photoDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitPhotoConfirm"
            :disabled="photoFileList.length === 0"
            :loading="photoSubmitting"
          >
            {{ photoFileList.length === 0 ? '请先拍照' : '确认提交' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 照片预览 -->
    <el-dialog v-model="previewDialogVisible" title="照片预览" width="60%">
      <img :src="previewImageUrl" style="width: 100%" />
    </el-dialog>

    <!-- 操作历史 -->
    <el-card class="history-card">
      <div class="card-header">
        <h3>操作历史</h3>
        <el-button link type="primary" @click="clearHistory">清空历史</el-button>
      </div>
      <el-divider></el-divider>
      <div class="history-list">
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in scanHistory"
            :key="index"
            :timestamp="item.time"
            :type="item.type === 'success' ? 'success' : 'warning'"
          >
            <div class="history-item">
              <div class="history-title">{{ item.title }}</div>
              <div class="history-description">{{ item.description }}</div>
            </div>
          </el-timeline-item>
          <el-timeline-item v-if="scanHistory.length === 0" type="info">
            暂无操作历史
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>

    <!-- 文件上传input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageUpload"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { Camera, VideoPlay, VideoPause, Picture, RefreshRight, CircleCheck, Location, View, Plus } from '@element-plus/icons-vue'
import jsQR from 'jsqr'
import api from '../api/index.js'
import { useUserStore } from '../stores/index.js'

const router = useRouter()

// 扫描状态
const scanning = ref(false)
const videoElement = ref(null)
const scanArea = ref(null)
const fileInput = ref(null)
const loading = ref(null)

// 扫描结果
const scanResult = ref(null)
const showNotesInput = ref(false)
const notesForm = ref({ notes: '' })
const lastScanTime = ref(0)
const scanDelay = ref(200) // 扫描间隔(ms)，优化扫描性能

// 拍照打卡相关
const photoDialogVisible = ref(false)
const photoDialogType = ref('install') // 'install' or 'inspect'
const photoFileList = ref([])
const photoDialogNotes = ref('')
const photoSubmitting = ref(false)
const previewDialogVisible = ref(false)
const previewImageUrl = ref('')

// 扫描历史
const scanHistory = ref([])

// 摄像头配置
const cameraConfig = ref({
  resolution: 'medium', // high, medium, low
  facingMode: 'environment'
})

// 视频流
let stream = null
let scanTimeout = null
let animationFrameId = null

// 分辨率选项
const resolutionOptions = {
  high: { width: { ideal: 1920 }, height: { ideal: 1080 } },
  medium: { width: { ideal: 1280 }, height: { ideal: 720 } },
  low: { width: { ideal: 640 }, height: { ideal: 480 } }
}

// 辅助函数：状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '待安装',
    installed: '已安装',
    inspected: '已验收',
    completed: '已完成'
  }
  return statusMap[status] || status
}

// 辅助函数：状态类型
const getStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    installed: 'success',
    inspected: 'warning',
    completed: 'success'
  }
  return typeMap[status] || 'info'
}

// 辅助函数：获取楼层名称
const getFloorName = (floorId) => {
  // 简化处理，后续可从缓存或API获取
  return floorId || '未指定'
}

// 辅助函数：检查是否有坐标
const hasCoordinates = (part) => {
  return part?.coordinates2D || part?.axisDistanceX || part?.axisDistanceY
}

// 辅助函数：格式化坐标
const formatCoord = (value) => {
  if (value === undefined || value === null) return '-'
  return typeof value === 'number' ? value.toFixed(2) : value
}

// 权限检查
const canInstall = computed(() => {
  const role = userStore.userRole
  return ['installer', 'projectEngineer', 'projectManager', 'admin'].includes(role)
})

const canInspect = computed(() => {
  const role = userStore.userRole
  return ['qualityInspector', 'projectManager', 'admin'].includes(role)
})

// 在BIM中查看
const viewInBIM = () => {
  if (scanResult.value?.id) {
    router.push({
      path: '/bim',
      query: { 
        partId: scanResult.value.id,
        projectId: scanResult.value.projectId 
      }
    })
  }
}

// 开始/停止扫描
const toggleScan = async () => {
  if (scanning.value) {
    stopScan()
  } else {
    try {
      loading.value = ElLoading.service({
        lock: true,
        text: '正在初始化摄像头...',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      await startScan()
    } catch (error) {
      console.error('摄像头初始化失败:', error)
      ElMessage.error('无法访问摄像头，请检查权限设置或设备状态')
    } finally {
      if (loading.value) {
        loading.value.close()
      }
    }
  }
}

// 开始扫描
const startScan = async () => {
  try {
    // 检查安全上下文 (浏览器限制：非Localhost必须使用HTTPS)
    const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecureContext && location.protocol !== 'https:') {
        throw new Error('浏览器安全限制：摄像头仅在 HTTPS 或 Localhost 下可用。当前为非安全环境，无法访问。');
    }

    // 获取摄像头权限
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: cameraConfig.value.facingMode,
        ...resolutionOptions[cameraConfig.value.resolution]
      }
    })

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      scanning.value = true
      
      // 预加载画布和上下文以提升首次扫描速度
      const canvas = document.createElement('canvas')
      canvas.getContext('2d')
      
      startQRScan()
      ElMessage.success('扫描已开始，将自动识别二维码')
    }
  } catch (error) {
    console.error('无法访问摄像头:', error)
    ElMessage.error('无法访问摄像头，请检查权限设置')
    scanning.value = false
    throw error
  }
}

// 停止扫描
const stopScan = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (scanTimeout) {
    clearTimeout(scanTimeout)
    scanTimeout = null
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  scanning.value = false
}

// 开始QR码扫描
const startQRScan = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // 使用requestAnimationFrame优化扫描性能
  const scanFrame = () => {
    if (!scanning.value || !videoElement.value) return
    
    const video = videoElement.value
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameId = requestAnimationFrame(scanFrame)
      return
    }

    // 设置画布大小为视频的1/2以提高性能
    canvas.width = video.videoWidth / 2
    canvas.height = video.videoHeight / 2

    // 绘制视频帧到画布（缩小尺寸）
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // 扫描QR码，增加inversionAttempts提高识别率
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'both'
    })

    // 如果检测到QR码
    if (qrCode) {
      processScanResult(qrCode.data)
      stopScan()
    } else {
      // 继续扫描下一帧
      animationFrameId = requestAnimationFrame(scanFrame)
    }
  }
  
  // 开始扫描
  animationFrameId = requestAnimationFrame(scanFrame)
}

// 本地缓存的预埋件数据
const localCache = ref(new Map())
const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟缓存过期时间

// 用户信息和角色
const userStore = useUserStore()

// 判断用户是否是安装人员或质检人员
const isRestrictedUser = computed(() => {
  const role = userStore.userRole
  return role === 'installer' || role === 'qualityInspector'
})

// 获取用户可访问的项目ID
const userProjects = computed(() => {
  return userStore.userInfo?.projects || []
})

// 处理扫描结果
const processScanResult = async (qrCodeData) => {
  try {
    loading.value = ElLoading.service({
      lock: true,
      text: '正在处理扫描结果...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    // 检查扫描结果是否为URL格式（新版二维码）
    let partId = null
    if (qrCodeData.startsWith('http://') || qrCodeData.startsWith('https://')) {
      try {
        const url = new URL(qrCodeData)
        partId = url.searchParams.get('partId')
        console.log('检测到URL格式二维码，partId:', partId)
      } catch (e) {
        console.error('解析URL失败:', e)
      }
    }

    // 如果从URL中提取到partId，优先使用partId查询
    if (partId) {
      // 检查本地缓存
      const cachedItem = localCache.value.get(partId)
      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_EXPIRY) {
        // 检查项目权限
        if (isRestrictedUser.value && !userProjects.value.includes(cachedItem.data.projectId)) {
          ElMessage.error('您没有权限查看该项目的预埋件')
          addToHistory('error', '扫描失败', '无权限查看该项目的预埋件')
          return
        }
        
        scanResult.value = cachedItem.data
        ElMessage.success('从本地缓存加载成功')
        addToHistory('success', '扫描成功', `扫描到预埋件: ${cachedItem.data.name} (${cachedItem.data.code})`)
        return
      }

      // 通过partId直接获取预埋件详情
      // const response = await api.embeddedPart.getEmbeddedPart(partId)
      // const data = response.data || response
      
      // 直接跳转到BIM可视化页面，而不是并在当前页面显示结果
      ElMessage.success('扫描成功，正在跳转到BIM可视化页面...')
      router.push({
        path: '/bim',
        query: { partId: partId }
      })
      return
    }

    // 兼容旧版二维码格式（非URL格式）
    // 首先检查本地缓存
    const cachedItem = localCache.value.get(qrCodeData)
    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_EXPIRY) {
      // 检查项目权限
      if (isRestrictedUser.value && !userProjects.value.includes(cachedItem.data.projectId)) {
        ElMessage.error('您没有权限查看该项目的预埋件')
        addToHistory('error', '扫描失败', '无权限查看该项目的预埋件')
        return
      }
      
      scanResult.value = cachedItem.data
      ElMessage.success('从本地缓存加载成功')
      addToHistory('success', '扫描成功', `扫描到预埋件: ${cachedItem.data.name} (${cachedItem.data.code})`)
      return
    }

    // 调用后端API验证二维码（旧版格式）
    const response = await api.mobile.scanQRCode({ qrCodeData })
    
    // 检查项目权限
    if (isRestrictedUser.value && !userProjects.value.includes(response.data.projectId)) {
      ElMessage.error('您没有权限查看该项目的预埋件')
      addToHistory('error', '扫描失败', '无权限查看该项目的预埋件')
      return
    }
    
    scanResult.value = response.data
    
    // 保存到本地缓存
    localCache.value.set(qrCodeData, {
      data: response.data,
      timestamp: Date.now()
    })
    
    ElMessage.success('扫描成功')

    // 添加到历史记录
    addToHistory('success', '扫描成功', `扫描到预埋件: ${response.data.name} (${response.data.code})`)
  } catch (error) {
    console.error('扫描失败:', error)
    let errorMsg = '扫描失败'
    
    if (error.response?.status === 404) {
      errorMsg = '未找到该预埋件信息'
    } else if (error.response?.status === 401) {
      errorMsg = '登录已过期，请重新登录'
    } else if (error.response?.data?.message) {
      errorMsg = `扫描失败: ${error.response.data.message}`
    } else if (!navigator.onLine) {
      errorMsg = '网络连接已断开，请检查网络设置'
    }
    
    ElMessage.error(errorMsg)
    addToHistory('error', '扫描失败', errorMsg)
  } finally {
    if (loading.value) {
      loading.value.close()
    }
  }
}

// 选择图片
const selectImage = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 处理图片上传 - 支持图片压缩和批量识别
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 检查文件大小
  if (file.size > 10 * 1024 * 1024) { // 10MB
    ElMessage.warning('图片过大，将自动压缩')
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const image = new Image()
    image.onload = () => {
      // 计算压缩后的尺寸
      let targetWidth = image.width
      let targetHeight = image.height
      const maxDimension = 1280
      
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.floor(targetHeight * (maxDimension / targetWidth))
          targetWidth = maxDimension
        } else {
          targetWidth = Math.floor(targetWidth * (maxDimension / targetHeight))
          targetHeight = maxDimension
        }
      }

      // 创建canvas并绘制压缩后的图片
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      
      // 使用更优的缩放算法
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)

      // 扫描QR码 - 启用反向检测
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'both'
      })

      if (qrCode) {
        processScanResult(qrCode.data)
      } else {
        // 尝试不同的阈值处理
        try {
          // 对图像进行二值化处理，提高识别率
          const binaryData = binarizeImageData(imageData)
          const binaryQrCode = jsQR(binaryData, imageData.width, imageData.height, {
            inversionAttempts: 'both'
          })
          
          if (binaryQrCode) {
            processScanResult(binaryQrCode.data)
          } else {
            ElMessage.error('未在图片中找到二维码')
            addToHistory('error', '识别失败', '未在图片中找到二维码')
          }
        } catch (e) {
          ElMessage.error('未在图片中找到二维码')
          addToHistory('error', '识别失败', '未在图片中找到二维码')
        }
      }
    }
    image.src = e.target.result
  }
  reader.readAsDataURL(file)

  // 清空input
  event.target.value = ''
}

// 图像二值化处理 - 提高低质量图片的识别率
const binarizeImageData = (imageData) => {
  const data = new Uint8ClampedArray(imageData.data.length)
  const threshold = 128 // 二值化阈值
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
    const value = avg > threshold ? 255 : 0
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = imageData.data[i + 3]
  }
  
  return data
}

// 打开拍照打卡对话框
const showPhotoDialog = (type) => {
  photoDialogType.value = type
  photoFileList.value = []
  photoDialogNotes.value = ''
  photoDialogVisible.value = true
}

// 照片数量超限
const handlePhotoExceed = () => {
  ElMessage.warning('最多只能上传5张照片')
}

// 照片预览
const handlePhotoPreview = (file) => {
  previewImageUrl.value = file.url
  previewDialogVisible.value = true
}

// 照片移除
const handlePhotoRemove = () => {
  // file-list 自动更新
}

// 提交拍照打卡确认
const submitPhotoConfirm = async () => {
  if (photoFileList.value.length === 0) {
    ElMessage.warning('请至少上传1张照片')
    return
  }

  photoSubmitting.value = true
  try {
    // 提取原始文件对象
    const photos = photoFileList.value.map(f => f.raw)

    if (photoDialogType.value === 'install') {
      // 安装确认
      await api.mobile.installEmbeddedPart(scanResult.value.id, photos)
      scanResult.value.status = 'installed'
      ElMessage.success('安装确认成功，照片已上传')
      addToHistory('success', '安装打卡', `已确认安装：${scanResult.value.name} (${scanResult.value.code})，上传${photos.length}张照片`)
    } else {
      // 验收确认
      await api.mobile.inspectEmbeddedPart(
        scanResult.value.id,
        { notes: photoDialogNotes.value, status: 'inspected' },
        photos
      )
      scanResult.value.status = 'inspected'
      ElMessage.success('验收确认成功，照片已上传')
      addToHistory('success', '验收打卡', `已确认验收：${scanResult.value.name} (${scanResult.value.code})，上传${photos.length}张照片`)
    }

    photoDialogVisible.value = false
  } catch (error) {
    console.error('拍照确认失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || '未知错误'))
  } finally {
    photoSubmitting.value = false
  }
}

// 重置扫描
const resetScan = () => {
  scanResult.value = null
  showNotesInput.value = false
  notesForm.value.notes = ''
}

// 添加到历史记录
const addToHistory = (type, title, description) => {
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  scanHistory.value.unshift({
    type,
    title,
    description,
    time: timeStr
  })

  // 限制历史记录数量
  if (scanHistory.value.length > 10) {
    scanHistory.value.pop()
  }
}

// 清空历史记录
const clearHistory = () => {
  scanHistory.value = []
}

// 页面卸载前清理资源
onBeforeUnmount(() => {
  stopScan()
})
</script>

<style scoped>
.qr-code-scan {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.scan-card {
  margin-bottom: 20px;
}

.scan-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scan-area {
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 400px;
  background-color: #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.scan-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.scan-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.scan-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-frame {
  position: absolute;
  top: 50px;
  left: 50px;
  width: calc(100% - 100px);
  height: calc(100% - 100px);
  border: 2px solid rgba(64, 158, 255, 0.5);
  border-radius: 8px;
  pointer-events: none;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #409eff, transparent);
  animation: scan 2s infinite linear;
  box-shadow: 0 0 10px #409eff;
}

/* 扫描框四角装饰 */
.scan-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #409eff;
  box-shadow: 0 0 10px #409eff;
}

.scan-corner.top-left {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
  border-radius: 4px 0 0 0;
}

.scan-corner.top-right {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 4px 0 0;
}

.scan-corner.bottom-left {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 4px;
}

.scan-corner.bottom-right {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 4px 0;
}

/* 扫描提示 */
.scan-instructions {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  text-align: center;
  color: white;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.scan-instructions p {
  margin: 4px 0;
  font-size: 16px;
  font-weight: 500;
}

.scan-hint {
  font-size: 14px !important;
  color: #409eff !important;
  opacity: 0.9;
}

@keyframes scan {
  0% {
    top: 0;
  }
  100% {
    top: 100%;
  }
}

.scan-controls {
  display: flex;
  gap: 16px;
}

.result-card {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #67c23a;
}

.result-content {
  padding: 0;
}

.part-info {
  margin-bottom: 16px;
}

.highlight-text {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

/* 坐标信息 */
.coordinate-info {
  margin: 16px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.coord-grid {
  display: grid;
  gap: 12px;
}

.coord-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coord-label {
  font-size: 13px;
  color: #909399;
  min-width: 70px;
}

.coord-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  color: #303133;
}

.axis-x {
  color: #e74c3c;
  margin-right: 12px;
}

.axis-y {
  color: #2ecc71;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.notes-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  padding: 8px;
}

.history-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.history-description {
  color: #606266;
  font-size: 14px;
}

/* 照片展示 */
.photo-gallery {
  margin-top: 16px;
}

.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  cursor: pointer;
}

.photo-thumb:hover {
  border-color: #409eff;
}

/* 拍照对话框 */
.photo-dialog-content {
  padding: 0 8px;
}

.dialog-footer {
  text-align: right;
}
</style>

