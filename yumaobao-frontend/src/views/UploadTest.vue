<template>
  <div class="upload-test">
    <h1>上传功能测试</h1>
    
    <el-form :model="uploadForm" label-width="100px">
      <el-form-item label="项目ID">
        <el-input v-model="uploadForm.projectId" placeholder="请输入项目ID" />
      </el-form-item>
      
      <el-form-item label="楼层ID">
        <el-input v-model="uploadForm.floorId" placeholder="请输入楼层ID" />
      </el-form-item>
      
      <el-form-item label="模型名称">
        <el-input v-model="uploadForm.name" placeholder="请输入模型名称" />
      </el-form-item>
      
      <el-form-item label="模型文件">
        <el-upload
          class="upload-demo"
          action="#"
          :auto-upload="false"
          :on-change="handleFileUpload"
          :file-list="fileList"
          accept=".dwg,.dxf,.ifc,.rvt,.nwd,.3ds,.obj,.stp,.step"
        >
          <el-button type="primary">选择文件</el-button>
          <div class="el-upload__tip">支持的格式: DWG, DXF (CAD), IFC, RVT, NWD (BIM), 3DS, OBJ, STP, STEP (3D模型)</div>
        </el-upload>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitUpload" :loading="uploading">上传测试</el-button>
      </el-form-item>
    </el-form>
    
    <div class="test-results">
      <h2>测试结果</h2>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const fileList = ref([])
const uploading = ref(false)
const result = ref('')

const uploadForm = reactive({
  projectId: '',
  floorId: '',
  name: '',
  file: null
})

const handleFileUpload = (uploadFile) => {
  fileList.value = [uploadFile]
  if (uploadFile.raw) {
    uploadForm.file = uploadFile.raw
    result.value += `已选择文件: ${uploadFile.name}\n`
  }
}

const submitUpload = async () => {
  if (!uploadForm.projectId || !uploadForm.floorId || !uploadForm.name || !uploadForm.file) {
    ElMessage.error('请填写完整信息并选择文件')
    return
  }
  
  uploading.value = true
  result.value += '开始上传...\n'
  
  try {
    const formData = new FormData()
    formData.append('projectId', uploadForm.projectId)
    formData.append('floorId', uploadForm.floorId)
    formData.append('name', uploadForm.name)
    formData.append('file', uploadForm.file)
    
    // 直接调用上传API
    const response = await api.bimModel.uploadBIMModel(formData)
    
    result.value += `上传成功!\n响应: ${JSON.stringify(response, null, 2)}\n`
    ElMessage.success('上传成功')
  } catch (error) {
    result.value += `上传失败!\n错误: ${error.message}\n`
    console.error('上传测试失败:', error)
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.upload-test {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.test-results {
  margin-top: 30px;
  padding: 15px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}
</style>