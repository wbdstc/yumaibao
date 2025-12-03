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
      <h3>扫描结果</h3>
      <el-divider></el-divider>
      <div class="result-content">
        <el-descriptions border column="2" :column="2">
          <el-descriptions-item label="名称">{{ scanResult.name }}</el-descriptions-item>
          <el-descriptions-item label="编号">{{ scanResult.code }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ scanResult.modelNumber }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ scanResult.type }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ scanResult.projectId }}</el-descriptions-item>
          <el-descriptions-item label="楼层">{{ scanResult.floorId }}</el-descriptions-item>
          <el-descriptions-item label="位置">{{ scanResult.location }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag
              :type="
                scanResult.status === 'pending' ? 'info' :
                scanResult.status === 'installed' ? 'success' :
                scanResult.status === 'inspected' ? 'warning' : 'success'
              "
            >
              {{ scanResult.status === 'pending' ? '待安装' :
                scanResult.status === 'installed' ? '已安装' :
                scanResult.status === 'inspected' ? '已验收' : '已完成' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="result-actions" v-if="scanResult.status !== 'completed'">
          <el-button
            type="success"
            size="large"
            @click="confirmInstallation"
            v-if="scanResult.status === 'pending'"
          >
            确认安装
          </el-button>
          <el-button
            type="warning"
            size="large"
            @click="confirmInspection"
            v-if="scanResult.status === 'installed'"
          >
            确认验收
          </el-button>
          <el-button
            type="primary"
            size="large"
            @click="resetScan"
          >
            继续扫描
          </el-button>
        </div>

        <!-- 备注输入 -->
        <el-form v-if="showNotesInput" :model="notesForm" class="notes-form">
          <el-form-item label="备注">
            <el-input
              v-model="notesForm.notes"
              type="textarea"
              placeholder="请输入备注信息"
              rows="3"
            />
          </el-form-item>
          <div class="notes-actions">
            <el-button @click="showNotesInput = false">取消</el-button>
            <el-button type="primary" @click="submitNotes">提交</el-button>
          </div>
        </el-form>
      </div>
    </el-card>

    <!-- 操作历史 -->
    <el-card class="history-card">
      <div class="card-header">
        <h3>操作历史</h3>
        <el-button type="text" @click="clearHistory">清空历史</el-button>
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Camera, VideoPlay, VideoPause, Picture } from '@element-plus/icons-vue'
import jsQR from 'jsqr'
import api from '../api/index.js'

// 扫描状态
const scanning = ref(false)
const videoElement = ref(null)
const scanArea = ref(null)
const fileInput = ref(null)

// 扫描结果
const scanResult = ref(null)
const showNotesInput = ref(false)
const notesForm = ref({ notes: '' })

// 扫描历史
const scanHistory = ref([])

// 视频流
let stream = null
let scanInterval = null

// 开始/停止扫描
const toggleScan = async () => {
  if (scanning.value) {
    stopScan()
  } else {
    await startScan()
  }
}

// 开始扫描
const startScan = async () => {
  try {
    // 获取摄像头权限
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment'
      }
    })

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      scanning.value = true
      startQRScan()
    }
  } catch (error) {
    console.error('无法访问摄像头:', error)
    ElMessage.error('无法访问摄像头，请检查权限设置')
    scanning.value = false
  }
}

// 停止扫描
const stopScan = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
  }
  scanning.value = false
}

// 开始QR码扫描
const startQRScan = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  scanInterval = setInterval(() => {
    if (scanning.value && videoElement.value) {
      const video = videoElement.value
      if (video.videoWidth === 0 || video.videoHeight === 0) return

      // 设置画布大小与视频一致
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // 绘制视频帧到画布
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 扫描QR码
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      })

      // 如果检测到QR码
      if (qrCode) {
        processScanResult(qrCode.data)
        stopScan()
      }
    }
  }, 100) // 每100ms扫描一次
}

// 处理扫描结果
const processScanResult = async (qrCodeData) => {
  try {
    // 调用后端API验证二维码
    const response = await api.mobile.scanQRCode({ qrCodeData })
    scanResult.value = response.data
    ElMessage.success('扫描成功')

    // 添加到历史记录
    addToHistory('success', '扫描成功', `扫描到预埋件: ${response.data.name} (${response.data.code})`)
  } catch (error) {
    console.error('扫描失败:', error)
    ElMessage.error('扫描失败: ' + (error.response?.data?.message || '未知错误'))
    addToHistory('error', '扫描失败', `无法识别的二维码或网络错误`)
  }
}

// 选择图片
const selectImage = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 处理图片上传
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const image = new Image()
    image.onload = () => {
      // 创建canvas并绘制图片
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = image.width
      canvas.height = image.height
      ctx.drawImage(image, 0, 0, image.width, image.height)

      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 扫描QR码
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      })

      if (qrCode) {
        processScanResult(qrCode.data)
      } else {
        ElMessage.error('未在图片中找到二维码')
        addToHistory('error', '识别失败', '未在图片中找到二维码')
      }
    }
    image.src = e.target.result
  }
  reader.readAsDataURL(file)

  // 清空input
  event.target.value = ''
}

// 确认安装
const confirmInstallation = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要确认安装预埋件：${scanResult.value.name} (${scanResult.value.code}) 吗？`,
      '确认安装',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用API确认安装
    await api.mobile.installEmbeddedPart(scanResult.value.id)
    scanResult.value.status = 'installed'
    ElMessage.success('安装确认成功')
    addToHistory('success', '安装确认', `已确认安装：${scanResult.value.name} (${scanResult.value.code})`)
  } catch (error) {
    if (error === 'cancel') return
    console.error('安装确认失败:', error)
    ElMessage.error('安装确认失败: ' + (error.response?.data?.message || '未知错误'))
  }
}

// 确认验收
const confirmInspection = () => {
  showNotesInput.value = true
}

// 提交备注
const submitNotes = async () => {
  try {
    // 调用API确认验收
    await api.mobile.inspectEmbeddedPart(scanResult.value.id, { notes: notesForm.value.notes })
    scanResult.value.status = 'inspected'
    showNotesInput.value = false
    notesForm.value.notes = ''
    ElMessage.success('验收确认成功')
    addToHistory('success', '验收确认', `已确认验收：${scanResult.value.name} (${scanResult.value.code})`)
  } catch (error) {
    console.error('验收确认失败:', error)
    ElMessage.error('验收确认失败: ' + (error.response?.data?.message || '未知错误'))
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
  border: 2px solid #409eff;
  border-radius: 4px;
  pointer-events: none;
  overflow: hidden;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #409eff;
  animation: scan 2s infinite linear;
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

.result-content {
  padding: 16px 0;
}

.result-actions {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  justify-content: center;
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
</style>
