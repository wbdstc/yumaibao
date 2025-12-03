<template>
  <div class="dashboard-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>仪表盘</h2>
      <p>欢迎回来，{{ userStore.userInfo?.name || '用户' }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ projectStats.totalProjects }}</div>
            <div class="stat-label">总项目数</div>
          </div>
          <div class="stat-icon project-icon">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ embeddedPartStats.totalParts }}</div>
            <div class="stat-label">总预埋件数</div>
          </div>
          <div class="stat-icon part-icon">
            <el-icon><Box /></el-icon>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ embeddedPartStats.installedParts }}</div>
            <div class="stat-label">已安装</div>
          </div>
          <div class="stat-icon installed-icon">
            <el-icon><Check /></el-icon>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ embeddedPartStats.pendingParts }}</div>
            <div class="stat-label">待安装</div>
          </div>
          <div class="stat-icon pending-icon">
            <el-icon><Time /></el-icon>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 最近项目和扫描记录 -->
    <div class="dashboard-content">
      <!-- 最近项目 -->
      <el-card class="content-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>最近项目</h3>
            <el-button type="text" @click="navigateToProjects">查看全部</el-button>
          </div>
        </template>
        <div class="recent-projects">
          <div v-for="project in recentProjects" :key="project.id" class="project-item" @click="viewProject(project)">
            <div class="project-info">
              <h4>{{ project.name }}</h4>
              <p class="project-description">{{ project.description || '无描述' }}</p>
              <div class="project-meta">
                <el-tag :type="project.status === 'active' ? 'success' : 'info'" size="small">{{ project.status === 'active' ? '进行中' : '已完成' }}</el-tag>
                <span class="project-date">{{ formatDate(project.updatedAt) }}</span>
              </div>
            </div>
          </div>
          <div v-if="recentProjects.length === 0" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p>暂无项目记录</p>
          </div>
        </div>
      </el-card>

      <!-- 最近扫描记录 -->
      <el-card class="dashboard-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>最近扫描记录</span>
            <el-button type="text" @click="navigateToScan">查看全部</el-button>
          </div>
        </template>
        <div class="recent-scans">
          <el-timeline>
            <el-timeline-item
              v-for="record in recentScanRecords"
              :key="record.id"
              :type="getScanTypeColor(record.action)"
              :timestamp="formatDate(record.scanTime)"
            >
              <div class="scan-record">
                <div class="scan-info">
                  <div class="scan-action">{{ getScanActionText(record.action) }}</div>
                  <div class="scan-details">
                    <span class="scan-part">预埋件: {{ record.embeddedPartName }}</span>
                    <span class="scan-user">操作人: {{ record.userName }}</span>
                  </div>
                </div>
                <el-tag :type="getScanStatusColor(record.status)">{{ getScanStatusText(record.status) }}</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-if="recentScanRecords.length === 0" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p>暂无扫码记录</p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore, useEmbeddedPartStore } from '../stores/index'
import {
  OfficeBuilding,
  Box,
  Check,
  Document
} from '@element-plus/icons-vue'

export default {
  name: 'Dashboard',
  components: {
    OfficeBuilding,
    Box,
    Check,
    Document
  },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const projectStore = useProjectStore()
    const embeddedPartStore = useEmbeddedPartStore()

    // 统计数据
    const projectStats = reactive({
      totalProjects: 0,
      activeProjects: 0
    })

    const embeddedPartStats = reactive({
      totalParts: 0,
      installedParts: 0,
      pendingParts: 0
    })

    // 最近项目和扫描记录
    const recentProjects = ref([])
    const recentScanRecords = ref([])

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 获取扫描类型颜色
    const getScanTypeColor = (action) => {
      const colorMap = {
        'install': 'success',
        'inspect': 'warning',
        'verify': 'info'
      }
      return colorMap[action] || 'primary'
    }

    // 获取扫描状态颜色
    const getScanStatusColor = (status) => {
      const colorMap = {
        'completed': 'success',
        'pending': 'warning',
        'failed': 'danger',
        'verified': 'info'
      }
      return colorMap[status] || 'primary'
    }

    // 获取扫描动作文本
    const getScanActionText = (action) => {
      const textMap = {
        'install': '安装打卡',
        'inspect': '质检检查',
        'verify': '验证确认'
      }
      return textMap[action] || '未知操作'
    }

    // 获取扫描状态文本
    const getScanStatusText = (status) => {
      const textMap = {
        'completed': '已完成',
        'pending': '待处理',
        'failed': '失败',
        'verified': '已验证'
      }
      return textMap[status] || '未知状态'
    }

    // 导航到项目列表
    const navigateToProjects = () => {
      router.push('/projects')
    }

    // 导航到扫描页面
    const navigateToScan = () => {
      router.push('/scan')
    }

    // 查看项目详情
    const viewProject = (project) => {
      projectStore.selectProject(project)
      router.push(`/bim?projectId=${project.id}`)
    }

    // 加载数据
    const loadDashboardData = () => {
      // 模拟数据加载
      setTimeout(() => {
        // 项目统计
        projectStats.totalProjects = 12
        projectStats.activeProjects = 8

        // 预埋件统计
        embeddedPartStats.totalParts = 1560
        embeddedPartStats.installedParts = 1248
        embeddedPartStats.pendingParts = 312

        // 最近项目
        recentProjects.value = [
          {
            id: 1,
            name: '商业综合体项目',
            description: 'CBD地区大型商业综合体',
            status: 'active',
            updatedAt: '2023-10-15T14:30:00Z'
          },
          {
            id: 2,
            name: '高层住宅项目',
            description: '10栋30层高层住宅',
            status: 'active',
            updatedAt: '2023-10-14T09:15:00Z'
          },
          {
            id: 3,
            name: '地铁站项目',
            description: '城市轨道交通地铁站',
            status: 'completed',
            updatedAt: '2023-10-12T16:45:00Z'
          }
        ]

        // 最近扫描记录
        recentScanRecords.value = [
          {
            id: 1,
            action: 'install',
            status: 'completed',
            embeddedPartName: 'YP-2023-001-0001',
            userName: '张师傅',
            scanTime: '2023-10-15T14:20:00Z'
          },
          {
            id: 2,
            action: 'inspect',
            status: 'verified',
            embeddedPartName: 'YP-2023-001-0002',
            userName: '李质检',
            scanTime: '2023-10-15T13:45:00Z'
          },
          {
            id: 3,
            action: 'install',
            status: 'completed',
            embeddedPartName: 'YP-2023-001-0003',
            userName: '王师傅',
            scanTime: '2023-10-15T12:30:00Z'
          }
        ]
      }, 500)
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      userStore,
      projectStats,
      embeddedPartStats,
      recentProjects,
      recentScanRecords,
      formatDate,
      getScanTypeColor,
      getScanStatusColor,
      getScanActionText,
      getScanStatusText,
      navigateToProjects,
      navigateToScan,
      viewProject
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28px;
}

.project-icon {
  background-color: #e6f7ff;
  color: #1890ff;
}

.part-icon {
  background-color: #fff7e6;
  color: #fa8c16;
}

.installed-icon {
  background-color: #f6ffed;
  color: #52c41a;
}

.pending-icon {
  background-color: #fff2e8;
  color: #fa541c;
}

/* 内容卡片 */
.dashboard-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.content-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

/* 最近项目 */
.recent-projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.project-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.project-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.project-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-date {
  font-size: 12px;
  color: #999;
}

/* 最近扫描记录 */
.recent-scans {
  max-height: 400px;
  overflow-y: auto;
}

.scan-record {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.scan-info {
  flex: 1;
}

.scan-action {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.scan-details {
  font-size: 14px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #e8e8e8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>