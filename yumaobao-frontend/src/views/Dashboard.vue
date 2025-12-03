<template>
  <div class="dashboard-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>仪表盘</h2>
        <p>欢迎回来，{{ userStore.userInfo?.name || '用户' }}</p>
      </div>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :shortcuts="dateShortcuts"
          @change="handleDateRangeChange"
        />
        <el-button type="primary" @click="generateReport" icon="DocumentCopy">
          生成报告
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ projectStats.totalProjects }}</div>
            <div class="stat-label">项目总数</div>
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
            <div class="stat-label">预埋件总数</div>
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
            <div class="stat-value">{{ embeddedPartStats.inspectedParts }}</div>
            <div class="stat-label">已验收</div>
          </div>
          <div class="stat-icon inspected-icon">
            <el-icon><CircleCheck /></el-icon>
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
            <el-icon><Clock /></el-icon>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-value">{{ projectStats.completedProjects }}</div>
            <div class="stat-label">已完成项目</div>
          </div>
          <div class="stat-icon completed-icon">
            <el-icon><Finished /></el-icon>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <!-- 状态分布饼图 -->
      <el-card class="chart-card">
        <div class="chart-header">
          <h3>预埋件状态分布</h3>
          <el-select
            v-model="statusChartType"
            placeholder="选择图表类型"
            size="small"
            style="width: 120px"
          >
            <el-option label="饼图" value="pie" />
            <el-option label="条形图" value="bar" />
          </el-select>
        </div>
        <div class="chart-container">
          <div id="statusChart" ref="statusChartRef" class="chart"></div>
        </div>
      </el-card>

      <!-- 安装进度趋势图 -->
      <el-card class="chart-card">
        <div class="chart-header">
          <h3>安装进度趋势</h3>
          <el-select
            v-model="trendChartType"
            placeholder="选择图表类型"
            size="small"
            style="width: 120px"
          >
            <el-option label="折线图" value="line" />
            <el-option label="面积图" value="area" />
          </el-select>
        </div>
        <div class="chart-container">
          <div id="trendChart" ref="trendChartRef" class="chart"></div>
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

    <!-- 项目状态列表 -->
    <div class="projects-section">
      <el-card>
        <div class="section-header">
          <h3>项目状态概览</h3>
          <el-button type="primary" @click="viewAllProjects" icon="List">
            查看所有项目
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="projects"
          style="width: 100%"
          highlight-current-row
          @row-click="handleRowClick"
        >
          <el-table-column prop="name" label="项目名称" min-width="180" />
          <el-table-column prop="code" label="项目编号" width="120" />
          <el-table-column prop="status" label="项目状态" width="100">
            <template #default="scope">
              <el-tag
                :type="
                  scope.row.status === 'active' ? 'success' :
                  scope.row.status === 'pending' ? 'info' :
                  scope.row.status === 'completed' ? 'success' : 'warning'
                "
              >
                {{ scope.row.status === 'active' ? '进行中' :
                   scope.row.status === 'pending' ? '待开始' :
                   scope.row.status === 'completed' ? '已完成' : '暂停' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="totalEmbeddedParts" label="预埋件总数" width="120" />
          <el-table-column prop="installedCount" label="已安装" width="100" />
          <el-table-column prop="inspectedCount" label="已验收" width="100" />
          <el-table-column label="完成率" width="120">
            <template #default="scope">
              <el-progress
                :percentage="calculateCompletionRate(scope.row)"
                :format="formatPercentage"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click.stop="viewProjectDetail(scope.row)"
                icon="View"
              >
                查看详情
              </el-button>
              <el-button
                type="success"
                size="small"
                @click.stop="generateProjectReport(scope.row)"
                icon="DocumentCopy"
              >
                生成报告
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 报告生成对话框 -->
    <el-dialog
      v-model="reportDialogVisible"
      title="生成报告"
      width="50%"
    >
      <el-form :model="reportForm" label-width="100px">
        <el-form-item label="报告类型">
          <el-select v-model="reportForm.type" placeholder="选择报告类型">
            <el-option label="项目进度报告" value="project_progress" />
            <el-option label="预埋件状态报告" value="embedded_part_status" />
            <el-option label="验收统计报告" value="inspection_stats" />
            <el-option label="月度总结报告" value="monthly_summary" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="reportForm.projectId" placeholder="选择项目" clearable>
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="报告格式">
          <el-checkbox-group v-model="reportForm.formats">
            <el-checkbox label="pdf" border>PDF</el-checkbox>
            <el-checkbox label="excel" border>Excel</el-checkbox>
            <el-checkbox label="word" border>Word</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="报告内容">
          <el-checkbox-group v-model="reportForm.contents">
            <el-checkbox label="统计图表" border>统计图表</el-checkbox>
            <el-checkbox label="详细数据" border>详细数据</el-checkbox>
            <el-checkbox label="分析总结" border>分析总结</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitReport">生成</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore, useEmbeddedPartStore } from '../stores/index'
import {
  OfficeBuilding,
  Box,
  Check,
  Document,
  CircleCheck,
  Clock,
  Finished,
  DocumentCopy,
  List,
  View
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

export default {
  name: 'Dashboard',
  components: {
    OfficeBuilding,
    Box,
    Check,
    Document,
    CircleCheck,
    Clock,
    Finished,
    DocumentCopy,
    List,
    View
  },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const projectStore = useProjectStore()
    const embeddedPartStore = useEmbeddedPartStore()

    // 状态管理
    const loading = ref(true)
    const dateRange = ref([])
    const statusChartType = ref('pie')
    const trendChartType = ref('line')
    
    // 图表引用
    const statusChartRef = ref(null)
    const trendChartRef = ref(null)
    
    // 图表实例
    let statusChart = null
    let trendChart = null
    
    // 统计数据
    const projectStats = reactive({
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0
    })

    const embeddedPartStats = reactive({
      totalParts: 0,
      installedParts: 0,
      inspectedParts: 0,
      pendingParts: 0
    })

    // 最近项目和扫描记录
    const recentProjects = ref([])
    const recentScanRecords = ref([])
    
    // 项目列表
    const projects = ref([])
    
    // 报告对话框
    const reportDialogVisible = ref(false)
    const reportForm = reactive({
      type: 'project_progress',
      projectId: '',
      formats: ['pdf', 'excel'],
      contents: ['统计图表', '详细数据']
    })
    
    // 快捷日期范围
    const dateShortcuts = [
      { text: '最近7天', value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
        return [start, end]
      }},
      { text: '最近30天', value: () => {
        const end = new Date()
        const start = new Date()
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
        return [start, end]
      }},
      { text: '本月', value: () => {
        const end = new Date()
        const start = new Date(end.getFullYear(), end.getMonth(), 1)
        return [start, end]
      }},
      { text: '上月', value: () => {
        const end = new Date()
        const start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
        const lastDay = new Date(end.getFullYear(), end.getMonth(), 0)
        return [start, lastDay]
      }}
    ]

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

    // 初始化图表
    const initCharts = async () => {
      await nextTick()

      // 初始化状态分布图表
      statusChart = echarts.init(statusChartRef.value)
      updateStatusChart()

      // 初始化安装进度趋势图
      trendChart = echarts.init(trendChartRef.value)
      updateTrendChart()

      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        statusChart?.resize()
        trendChart?.resize()
      })
    }

    // 更新状态分布图表
    const updateStatusChart = () => {
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['待安装', '已安装', '已验收', '已完成']
        },
        color: ['#409eff', '#67c23a', '#e6a23c', '#909399'],
        series: [
          {
            name: '状态分布',
            type: statusChartType.value,
            radius: statusChartType.value === 'pie' ? ['40%', '70%'] : 'auto',
            center: statusChartType.value === 'pie' ? ['50%', '50%'] : undefined,
            data: [
              { value: embeddedPartStats.pendingParts, name: '待安装' },
              { value: embeddedPartStats.installedParts, name: '已安装' },
              { value: embeddedPartStats.inspectedParts, name: '已验收' },
              { value: embeddedPartStats.totalParts - embeddedPartStats.pendingParts - embeddedPartStats.installedParts - embeddedPartStats.inspectedParts, name: '已完成' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }

      statusChart.setOption(option)
    }

    // 更新安装进度趋势图
    const updateTrendChart = () => {
      const days = 7
      const dates = []
      const installedData = []
      const inspectedData = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.getMonth() + 1 + '-' + date.getDate())
        installedData.push(Math.floor(Math.random() * 50) + 10)
        inspectedData.push(Math.floor(Math.random() * 40) + 5)
      }

      const option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['安装数量', '验收数量']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '安装数量',
            type: trendChartType.value,
            data: installedData,
            smooth: true,
            areaStyle: trendChartType.value === 'area' ? {} : undefined,
            itemStyle: {
              color: '#67c23a'
            }
          },
          {
            name: '验收数量',
            type: trendChartType.value,
            data: inspectedData,
            smooth: true,
            areaStyle: trendChartType.value === 'area' ? {} : undefined,
            itemStyle: {
              color: '#e6a23c'
            }
          }
        ]
      }

      trendChart.setOption(option)
    }

    // 加载数据
    const loadDashboardData = () => {
      // 模拟数据加载
      setTimeout(() => {
        // 项目统计
        projectStats.totalProjects = 12
        projectStats.activeProjects = 8
        projectStats.completedProjects = 4

        // 预埋件统计
        embeddedPartStats.totalParts = 1560
        embeddedPartStats.installedParts = 1248
        embeddedPartStats.inspectedParts = 936
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

        // 项目列表
        projects.value = [
          {
            id: 1,
            name: '商业综合体项目',
            code: 'PRJ-2023-001',
            status: 'active',
            totalEmbeddedParts: 500,
            installedCount: 400,
            inspectedCount: 300
          },
          {
            id: 2,
            name: '高层住宅项目',
            code: 'PRJ-2023-002',
            status: 'active',
            totalEmbeddedParts: 800,
            installedCount: 640,
            inspectedCount: 480
          },
          {
            id: 3,
            name: '地铁站项目',
            code: 'PRJ-2023-003',
            status: 'completed',
            totalEmbeddedParts: 260,
            installedCount: 260,
            inspectedCount: 260
          }
        ]

        loading.value = false
        initCharts()
      }, 500)
    }
    
    // 计算完成率
    const calculateCompletionRate = (project) => {
      if (!project.totalEmbeddedParts) return 0
      return Math.round(((project.installedCount + project.inspectedCount) / (project.totalEmbeddedParts * 2)) * 100)
    }
    
    // 格式化百分比
    const formatPercentage = (percentage) => {
      return `${percentage}%`
    }
    
    // 生成报告
    const generateReport = () => {
      reportDialogVisible.value = true
    }
    
    // 提交报告生成
    const submitReport = () => {
      // 这里应该调用API生成报告
      console.log('生成报告:', reportForm)
      reportDialogVisible.value = false
    }
    
    // 生成项目报告
    const generateProjectReport = (project) => {
      console.log('生成项目报告:', project)
    }
    
    // 查看项目详情
    const viewProjectDetail = (project) => {
      router.push(`/projects/${project.id}`)
    }
    
    // 处理行点击
    const handleRowClick = (project) => {
      viewProject(project)
    }
    
    // 处理日期范围变化
    const handleDateRangeChange = () => {
      console.log('日期范围变化:', dateRange.value)
      // 这里应该重新加载数据
    }
    
    // 查看所有项目
    const viewAllProjects = () => {
      navigateToProjects()
    }
    
    // 监听图表类型变化
    watch(statusChartType, () => {
      updateStatusChart()
    })
    
    watch(trendChartType, () => {
      updateTrendChart()
    })

    onMounted(() => {
      loadDashboardData()
    })

    return {
      userStore,
      loading,
      dateRange,
      statusChartType,
      trendChartType,
      projectStats,
      embeddedPartStats,
      recentProjects,
      recentScanRecords,
      projects,
      reportDialogVisible,
      reportForm,
      statusChartRef,
      trendChartRef,
      dateShortcuts,
      formatDate,
      getScanTypeColor,
      getScanStatusColor,
      getScanActionText,
      getScanStatusText,
      navigateToProjects,
      navigateToScan,
      viewProject,
      calculateCompletionRate,
      formatPercentage,
      generateReport,
      submitReport,
      generateProjectReport,
      viewProjectDetail,
      handleRowClick,
      handleDateRangeChange,
      viewAllProjects
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

.inspected-icon {
  background-color: #f6ffed;
  color: #73d13d;
}

.completed-icon {
  background-color: #e6f7ff;
  color: #4096ff;
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

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
}

.chart-container {
  padding: 20px;
}

.chart {
  height: 300px;
}

/* 项目状态列表 */
.projects-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
}

/* 页面头部 */
.header-left {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
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
@media (max-width: 1200px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }
}
/* 对话框 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>