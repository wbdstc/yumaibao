<!--
  从URL加载CAD文件示例
  展示如何通过URL直接加载远程CAD文件
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import '@mlightcad/cad-viewer/lib/index.css'
import { ElMessage } from 'element-plus'

// CAD文件URL
const cadFileUrl = ref('https://example.com/sample.dwg')

// 加载状态
const isLoading = ref(false)
const loadError = ref<string | null>(null)

// 处理文件加载成功事件
const handleFileLoaded = () => {
  isLoading.value = false
  loadError.value = null
  ElMessage.success('CAD文件加载成功！')
}

// 处理文件加载错误事件
const handleFileLoadError = (error: Error) => {
  isLoading.value = false
  loadError.value = error.message
  ElMessage.error(`文件加载失败: ${error.message}`)
}

// 重新加载文件
const reloadFile = () => {
  isLoading.value = true
  loadError.value = null
  // 通过更新key来强制重新加载组件
  componentKey.value++
}

// 组件key，用于强制重新加载
const componentKey = ref(1)

// 模拟不同的示例URL
const exampleUrls = [
  { name: '示例图纸1', url: 'https://example.com/sample1.dwg' },
  { name: '示例图纸2', url: 'https://example.com/sample2.dxf' },
  { name: '示例图纸3', url: 'https://example.com/architectural.dwg' }
]

// 选择示例URL
const selectExampleUrl = (url: string) => {
  cadFileUrl.value = url
  reloadFile()
}

// 组件挂载后自动加载
onMounted(() => {
  // 注意：实际使用时请替换为真实的CAD文件URL
  // 此处仅为示例，example.com上可能没有实际的CAD文件
})
</script>

<template>
  <div class="example-container">
    <h2>从URL加载CAD文件示例</h2>
    <p>此示例展示如何通过URL属性直接加载远程CAD文件。</p>
    
    <!-- URL输入和控制区域 -->
    <div class="url-control">
      <div class="input-group">
        <label for="cadFileUrl">CAD文件URL：</label>
        <input 
          id="cadFileUrl"
          v-model="cadFileUrl" 
          type="text" 
          placeholder="输入CAD文件的URL地址"
        />
        <button @click="reloadFile" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '加载文件' }}
        </button>
      </div>
      
      <!-- 示例URL -->
      <div class="example-urls">
        <span>或选择示例文件：</span>
        <button 
          v-for="example in exampleUrls" 
          :key="example.url"
          @click="selectExampleUrl(example.url)"
          :disabled="isLoading"
        >
          {{ example.name }}
        </button>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="loadError" class="error-message">
      <strong>错误：</strong>{{ loadError }}
    </div>
    
    <!-- CAD查看器 -->
    <div class="viewer-wrapper">
      <MlCadViewer 
        :key="componentKey"
        locale="zh" 
        :url="cadFileUrl"
        :is-show-toolbar="true"
        :is-show-coordinate="true"
        @file-loaded="handleFileLoaded"
        @file-load-error="handleFileLoadError"
      />
    </div>
    
    <div class="usage-hint">
      <h3>使用说明：</h3>
      <ul>
        <li>输入有效的DWG或DXF文件URL地址</li>
        <li>确保服务器支持CORS（跨域资源共享）</li>
        <li>点击"加载文件"按钮开始加载</li>
        <li>加载完成后可以使用工具栏进行操作</li>
        <li>注意：示例URL可能不可用，请使用您自己的文件URL</li>
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

.url-control {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.input-group label {
  font-weight: bold;
  white-space: nowrap;
}

.input-group input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.input-group button {
  padding: 8px 20px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-group button:hover:not(:disabled) {
  background-color: #66b1ff;
}

.input-group button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.example-urls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.example-urls button {
  padding: 6px 15px;
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.example-urls button:hover:not(:disabled) {
  background-color: #409eff;
  color: white;
}

.error-message {
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #fbc4c4;
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