<template>
  <div class="manual-center-container page-transition blueprint-bg">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>预埋件信息中心</h2>
        <p>全维度预埋件百科与施工规范指南</p>
      </div>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索知识点..."
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch" icon="Search">搜索</el-button>
        <el-button v-if="manuals.length === 0" plain @click="initializeData" :loading="loading">初始化数据</el-button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="manual-main-content">
      <!-- 左侧目录树 -->
      <div class="manual-sidebar glass-card">
        <div class="sidebar-header">
          <el-icon><Fold /></el-icon>
          <span>目录导航</span>
        </div>
        <el-scrollbar>
          <ul class="manual-menu">
            <li 
              v-for="item in manuals" 
              :key="item.id" 
              :class="['menu-item', { active: currentSection?.id === item.id }]"
              @click="setCurrentSection(item)"
            >
              <span class="item-order">{{ item.order }}</span>
              <span class="item-title text-ellipsis">{{ item.title }}</span>
            </li>
          </ul>
        </el-scrollbar>
      </div>

      <!-- 右侧内容渲染区 -->
      <div class="manual-content glass-card">
        <el-scrollbar v-loading="loading">
          <div v-if="currentSection" class="markdown-body">
            <h1 class="content-title">{{ currentSection.title }}</h1>
            <div class="content-meta">
              <el-tag size="small" effect="plain">{{ currentSection.category }}</el-tag>
              <span class="update-time">最后更新: {{ formatDate(currentSection.updatedAt) }}</span>
            </div>
            <div class="content-render" v-html="renderedContent"></div>
            
            <!-- 答疑页脚 -->
            <div class="content-footer">
              <el-divider />
              <div class="qa-nudge">
                <p>如对以上内容有疑问或在现场遇到特殊情况：</p>
                <div class="footer-buttons">
                  <el-button type="primary" plain icon="ChatDotRound" @click="contactExpert">咨询技术专家</el-button>
                  <el-button type="info" plain icon="Message" @click="feedbackIssue">问题反馈</el-button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-empty description="请从左侧选择一个章节进行查阅" />
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Fold, ChatDotRound, Message } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'

const loading = ref(false)
const searchKeyword = ref('')
const manuals = ref([])
const currentSection = ref(null)

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 渲染Markdown内容
const renderedContent = computed(() => {
  if (!currentSection.value?.content) return ''
  return marked.parse(currentSection.value.content)
})

// 获取数据
const fetchManuals = async () => {
  loading.value = true
  try {
    const response = await api.manual.getManuals()
    manuals.value = response || []
    if (manuals.value.length > 0 && !currentSection.value) {
      currentSection.value = manuals.value[0]
    }
  } catch (error) {
    console.error('获取手册失败:', error)
    ElMessage.error('获取信息中心数据失败')
  } finally {
    loading.value = false
  }
}

// 初始化数据
const initializeData = async () => {
  try {
    loading.value = true
    await api.manual.seedManuals()
    ElMessage.success('数据初始化成功')
    await fetchManuals()
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('初始化数据失败')
  } finally {
    loading.value = false
  }
}

// 切换章节
const setCurrentSection = (section) => {
  currentSection.value = section
}

// 搜索
const handleSearch = async () => {
  if (!searchKeyword.value) {
    await fetchManuals()
    return
  }
  loading.value = true
  try {
    const response = await api.manual.searchManuals(searchKeyword.value)
    manuals.value = response || []
    if (manuals.value.length > 0) {
      currentSection.value = manuals.value[0]
    } else {
      currentSection.value = null
    }
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 模拟咨询和反馈
const contactExpert = () => {
  ElMessageBox.alert('技术支持电话：400-888-9999 (工作日 9:00-18:00)', '咨询专家', {
    confirmButtonText: '知道了'
  })
}

const feedbackIssue = () => {
  ElMessage.success('感谢您的反馈，我们会尽快完善相关内容')
}

onMounted(() => {
  fetchManuals()
})
</script>

<style scoped>
.manual-center-container {
  min-height: 100vh;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h2 {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(0, 162, 255, 0.5);
}

.header-left p {
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.glass-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: all 0.3s ease;
}

.manual-main-content {
  display: flex;
  gap: 20px;
  height: calc(100vh - 160px);
}

.manual-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #409eff;
  font-weight: bold;
}

.manual-menu {
  list-style: none;
  padding: 10px 0;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 3px solid transparent;
  color: rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.menu-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.4s ease;
  z-index: 0;
}

.menu-item > * {
  position: relative;
  z-index: 1;
}

.menu-item:hover::before {
  transform: translateX(0);
}

.menu-item:hover {
  color: #409eff;
  padding-left: 25px;
}

.menu-item.active {
  background: rgba(64, 158, 255, 0.15);
  color: #409eff;
  border-left-color: #409eff;
  font-weight: 500;
  box-shadow: inset 0 0 10px rgba(64, 158, 255, 0.05);
}

.item-order {
  font-family: 'Outfit', sans-serif;
  font-weight: bold;
  font-size: 18px;
  margin-right: 15px;
  opacity: 0.5;
}

.item-title {
  font-size: 15px;
}

.manual-content {
  flex: 1;
  padding: 30px 40px;
}

.markdown-body {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.8;
}

.content-title {
  font-size: 32px;
  margin-bottom: 12px;
  color: #fff;
}

.content-meta {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* 覆盖 Markdown 默认字体颜色，防止在深色背景下不可见 */
.content-render :deep(p),
.content-render :deep(span),
.content-render :deep(li),
.content-render :deep(strong),
.content-render :deep(em),
.content-render :deep(a) {
  color: rgba(255, 255, 255, 0.85) !important;
}

.content-render :deep(a) {
  text-decoration: none;
  border-bottom: 1px dashed rgba(64, 158, 255, 0.5);
  transition: all 0.3s;
}

.content-render :deep(a:hover) {
  color: #409eff !important;
  border-bottom-color: #409eff;
}

.content-render :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #e6a23c !important;
  font-size: 0.9em;
}

/* Markdown样式定制 */
.content-render :deep(h1), 
.content-render :deep(h2), 
.content-render :deep(h3),
.content-render :deep(h4),
.content-render :deep(h5) {
  color: #409eff;
  margin-top: 30px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.content-render :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.02);
}

.content-render :deep(th), 
.content-render :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 15px;
  text-align: left;
}

.content-render :deep(th) {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.content-render :deep(ul), 
.content-render :deep(ol) {
  padding-left: 20px;
}

.content-render :deep(blockquote) {
  border-left: 4px solid #409eff;
  margin: 20px 0;
  padding: 10px 20px;
  background: rgba(64, 158, 255, 0.05);
  font-style: italic;
}

.content-footer {
  margin-top: 50px;
}

.qa-nudge {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(64, 158, 255, 0.02));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(64, 158, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.qa-nudge::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
  pointer-events: none;
}

.qa-nudge p {
  margin-bottom: 15px;
  font-size: 14px;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
