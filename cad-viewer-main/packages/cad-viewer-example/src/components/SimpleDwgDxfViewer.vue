<template>
  <div class="dwg-dxf-viewer-container">
    <!-- 文件上传区域 -->
    <div v-if="!selectedFile" class="file-upload-area">
      <h2>上传DWG或DXF文件</h2>
      <el-upload
        class="upload-demo"
        drag
        :auto-upload="false"
        accept=".dwg,.dxf"
        :on-change="handleFileChange"
      >
        <el-icon class="el-icon--upload" size="64">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          <p>拖放文件到此处，或 <em>点击选择文件</em></p>
        </div>
        <template #tip>
          <div class="el-upload__tip">支持的格式: DWG, DXF</div>
        </template>
      </el-upload>
    </div>

    <!-- CAD查看器区域 -->
    <div v-else class="viewer-area">
      <div class="viewer-header">
        <h3>{{ selectedFile.name }}</h3>
        <el-button @click="selectedFile = null" type="primary" size="small">
          重新上传
        </el-button>
      </div>
      
      <!-- 核心CAD查看器组件 -->
      <MlCadViewer
        locale="zh"
        :local-file="selectedFile"
        base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
        :useMainThreadDraw="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { ref } from 'vue'
import type { UploadFile, UploadProps } from 'element-plus'

// 文件状态管理
const selectedFile = ref<File | null>(null)

/**
 * 处理文件选择变化
 * @param uploadFile 上传的文件对象
 */
const handleFileChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw && isValidFile(uploadFile.raw)) {
    selectedFile.value = uploadFile.raw
  }
}

/**
 * 验证文件是否为有效的DWG或DXF文件
 * @param file 要验证的文件
 * @returns 是否为有效文件
 */
const isValidFile = (file: File): boolean => {
  const validExtensions = ['.dwg', '.dxf']
  const fileName = file.name.toLowerCase()
  return validExtensions.some(ext => fileName.endsWith(ext))
}
</script>

<style scoped>
.dwg-dxf-viewer-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.file-upload-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.file-upload-area h2 {
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.upload-demo {
  width: 100%;
  max-width: 600px;
}

.viewer-area {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  z-index: 10;
}

.viewer-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

/* 确保CAD查看器组件占满剩余空间 */
:deep(.ml-cad-viewer-container) {
  flex: 1;
  height: calc(100vh - 60px);
}
</style>