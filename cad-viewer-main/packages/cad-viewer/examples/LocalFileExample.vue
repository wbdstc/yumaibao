<!--
  本地文件上传示例
  展示如何通过文件选择器加载本地CAD文件
-->
<script setup lang="ts">
import { ref } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
import { ElMessage } from 'element-plus'

// 本地文件引用
const localFile = ref<File | null>(null)

// 文件加载状态
const isLoading = ref(false)
const loadError = ref<string | null>(null)

// 处理文件选择变化
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    
    // 检查文件类型
    if (file.type === 'application/acad' || file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) {
      loadFile(file)
    } else {
      ElMessage.error('请选择有效的DWG或DXF文件！')
    }
    
    // 重置input，允许选择相同文件
    target.value = ''
  }
}

// 加载文件
const loadFile = (file: File) => {
  isLoading.value = true
  loadError.value = null
  
  // 设置文件引用
  localFile.value = file
  
  // 模拟加载延迟
  setTimeout(() => {
    isLoading.value = false
    ElMessage.success(`文件 "${file.name}" 加载成功！`)
  }, 500)
}

// 处理文件加载错误
const handleFileLoadError = (error: Error) => {
  isLoading.value = false
  loadError.value = error.message
  ElMessage.error(`文件加载失败: ${error.message}`)
}

// 清除当前文件
const clearFile = () => {
  localFile.value = null
  loadError.value = null
  ElMessage.info('已清除当前文件')
}

// 拖拽事件处理
const isDragging = ref(false)

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    
    // 检查文件类型
    if (file.type === 'application/acad' || file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) {
      loadFile(file)
    } else {
      ElMessage.error('请拖放有效的DWG或DXF文件！')
    }
  }
}
</script>

<template>
  <div class="example-container">
    <h2>本地文件上传示例</h2>
    <p>此示例展示如何通过文件选择器上传本地CAD文件或使用拖放功能。</p>
    
    <!-- 文件选择区域 -->
    <div class="file-selection">
      <!-- 传统文件选择按钮 -->
      <div class="button-group">
        <label for="fileUpload" class="file-button">
          选择CAD文件
          <input 
            id="fileUpload"
            type="file" 
            accept=".dwg,.dxf" 
            @change="handleFileChange" 
            style="display: none"
          />
        </label>
        
        <button v-if="localFile" @click="clearFile" :disabled="isLoading">
          清除文件
        </button>
      </div>
      
      <!-- 已选择文件信息 -->
      <div v-if="localFile" class="file-info">
        <span><strong>已选择文件：</strong>{{ localFile.name }}</span>
        <span><strong>大小：</strong>{{ (localFile.size / 1024 / 1024).toFixed(2) }} MB</span>
      </div>
      
      <!-- 拖放区域 -->
      <div 
        class="drop-area" 
        :class="{ 'dragging': isDragging }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div class="drop-icon">📁</div>
        <p>将DWG或DXF文件拖放到此处</p>
        <small>或</small>
        <label for="dropFileUpload" class="drop-button">
          浏览文件
          <input 
            id="dropFileUpload"
            type="file" 
            accept=".dwg,.dxf" 
            @change="handleFileChange" 
            style="display: none"
          />
        </label>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="loadError" class="error-message">
      <strong>错误：</strong>{{ loadError }}
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-message">
      正在加载文件，请稍候...
    </div>
    
    <!-- CAD查看器 -->
    <div class="viewer-wrapper">
      <MlCadViewer 
        locale="zh" 
        :local-file="localFile"
        :is-show-toolbar="true"
        :is-show-coordinate="true"
        @file-load-error="handleFileLoadError"
      />
    </div>
    
    <div class="usage-hint">
      <h3>使用说明：</h3>
      <ul>
        <li>点击"选择CAD文件"按钮选择本地文件</li>
        <li>或直接将DWG/DXF文件拖放到拖放区域</li>
        <li>支持的文件格式：.dwg, .dxf</li>
        <li>文件大小建议不超过50MB，以确保良好的加载性能</li>
        <li>点击"清除文件"可移除当前加载的文件</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.example-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.file-selection {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.file-button, .drop-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #409eff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.file-button:hover, .drop-button:hover {
  background-color: #66b1ff;
}

.button-group button {
  padding: 10px 20px;
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button-group button:hover:not(:disabled) {
  background-color: #f78989;
}

.button-group button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.file-info {
  background-color: #f0f9ff;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #bae7ff;
  margin-bottom: 15px;
}

.file-info span {
  margin-right: 20px;
}

.drop-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s;
  background-color: #fafafa;
}

.drop-area.dragging {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.drop-area p {
  font-size: 18px;
  color: #606266;
  margin: 0 0 10px 0;
}

.drop-area small {
  display: block;
  color: #909399;
  margin-bottom: 15px;
}

.drop-button {
  background-color: #67c23a;
  font-size: 14px;
}

.drop-button:hover {
  background-color: #85ce61;
}

.error-message {
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #fbc4c4;
}

.loading-message {
  background-color: #f0f9ff;
  color: #409eff;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #bae7ff;
  text-align: center;
}

.viewer-wrapper {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

:deep(.ml-cad-viewer) {
  width: 100%;
  height: 100%;
}

.usage-hint {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}
</style>