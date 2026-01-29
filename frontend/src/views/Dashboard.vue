<template>
  <div class="dashboard-container page-transition blueprint-bg">
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
      <el-card class="stat-card construction-card" shadow="hover">
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

      <el-card class="stat-card construction-card" shadow="hover">
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

      <el-card class="stat-card construction-card" shadow="hover">
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

      <el-card class="stat-card construction-card" shadow="hover">
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

      <el-card class="stat-card construction-card" shadow="hover">
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

      <el-card class="stat-card construction-card" shadow="hover">
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
          <el-select v-model="reportForm.reportType" placeholder="选择报告类型">
            <el-option label="项目进度报告" value="project-progress" />
            <el-option label="预埋件状态报告" value="embedded-parts-status" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="reportForm.selectedProject" placeholder="选择项目" clearable>
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="报告格式">
          <el-checkbox-group v-model="reportForm.reportFormats">
            <el-checkbox label="pdf" border>PDF</el-checkbox>
            <el-checkbox label="excel" border>Excel</el-checkbox>
            <el-checkbox label="word" border>Word</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="报告内容">
          <el-checkbox-group v-model="reportForm.reportContents">
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
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import { ElMessage } from 'element-plus'
import api from '../api/index'

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
      pendingParts: 0,
      rejectedParts: 0,
      completedParts: 0
    })

    // 最近项目和扫描记录
    const recentProjects = ref([])
    const recentScanRecords = ref([])
    
    // 项目列表
    const projects = ref([])
    
    // 报告对话框
    const reportDialogVisible = ref(false)
    const reportLoading = ref(false)
    const reportForm = reactive({
      reportType: 'project-progress',
      selectedProject: '',
      selectedStatus: '',
      reportFormats: ['pdf', 'excel'],
      reportContents: ['统计图表', '详细数据']
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
      
      // 确保图表在初始化后正确调整大小
      resizeCharts()
    }

    // 监听窗口大小变化，使用防抖函数
    let resizeTimer = null
    const resizeCharts = () => {
      // 清除之前的定时器
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
      
      // 设置新的定时器，延迟执行resize
      resizeTimer = setTimeout(() => {
        // 确保DOM元素存在且图表实例可用
        if (statusChartRef.value && statusChart) {
          try {
            statusChart.resize()
          } catch (error) {
            console.error('Failed to resize status chart:', error)
          }
        }
        if (trendChartRef.value && trendChart) {
          try {
            trendChart.resize()
          } catch (error) {
            console.error('Failed to resize trend chart:', error)
          }
        }
      }, 100) // 100ms防抖
    }

    window.addEventListener('resize', resizeCharts)
    
    // 组件卸载时清理
    onUnmounted(() => {
      window.removeEventListener('resize', resizeCharts)
      // 销毁图表实例
      if (statusChart) {
        statusChart.dispose()
        statusChart = null
      }
      if (trendChart) {
        trendChart.dispose()
        trendChart = null
      }
    })

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
          data: ['待安装', '已安装', '已验收', '已拒绝', '已完成']
        },
        color: ['#fa541c', '#1890ff', '#52c41a', '#f5222d', '#909399'],
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
              { value: embeddedPartStats.rejectedParts, name: '已拒绝' },
              { value: embeddedPartStats.completedParts, name: '已完成' }
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
    // 数据存储
    const dashboardData = ref([])

    // 监听图表类型变化
    watch(statusChartType, () => {
      if (statusChart) {
        updateStatusChart()
      }
    })

    watch(trendChartType, () => {
      if (trendChart) {
        updateTrendChart()
      }
    })

    // 更新安装进度趋势图
    const updateTrendChart = () => {
      const days = 7
      const dates = []
      const installedData = []
      const inspectedData = []
      
      // 生成最近7天的日期
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.getMonth() + 1 + '-' + date.getDate())
      }
      
      // 初始化数据数组
      const dailyData = dates.reduce((acc, date) => {
        acc[date] = { installed: 0, inspected: 0 }
        return acc
      }, {})
      
      // 从预埋件数据中提取状态变更记录
      const allEmbeddedParts = dashboardData.value || []
      allEmbeddedParts.forEach(part => {
        if (part.statusHistory) {
          part.statusHistory.forEach(record => {
            const recordDate = new Date(record.timestamp)
            const dateKey = recordDate.getMonth() + 1 + '-' + recordDate.getDate()
            
            // 检查记录日期是否在我们的日期范围内
            if (dailyData[dateKey] !== undefined) {
              if (record.status === 'installed') {
                dailyData[dateKey].installed++
              } else if (record.status === 'inspected') {
                dailyData[dateKey].inspected++
              }
            }
          })
        }
      })
      
      // 填充安装和验收数据数组
      dates.forEach(date => {
        installedData.push(dailyData[date].installed)
        inspectedData.push(dailyData[date].inspected)
      })

      // 处理图表类型：ECharts不支持直接的 'area' 类型，需要配置 areaStyle
      const isArea = trendChartType.value === 'area'
      const seriesType = isArea ? 'line' : trendChartType.value

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
            type: seriesType,
            data: installedData,
            smooth: true,
            itemStyle: { color: '#1890ff' },
            ...(isArea ? { areaStyle: { opacity: 0.3 } } : {})
          },
          {
            name: '验收数量',
            type: seriesType,
            data: inspectedData,
            smooth: true,
            itemStyle: { color: '#52c41a' },
            ...(isArea ? { areaStyle: { opacity: 0.3 } } : {})
          }
        ]
      }

      trendChart.setOption(option, true)
    }


    // 加载数据
    const loadDashboardData = async () => {
      try {
        loading.value = true
        
        // 获取项目数据
        const allProjects = await api.project.getProjects()
        
        // 获取预埋件数据 - 获取更多数据以确保统计准确
        const response = await api.embeddedPart.getEmbeddedParts({ limit: 10000 })
        
        // 处理API响应格式 - 后端可能返回 {total, data} 或直接返回数组
        let embeddedPartsArray = []
        let totalPartsCount = 0
        
        if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            embeddedPartsArray = response.data
            totalPartsCount = response.total || embeddedPartsArray.length
          } else if (Array.isArray(response)) {
            embeddedPartsArray = response
            totalPartsCount = embeddedPartsArray.length
          }
        }
        
        // 更新本地数据引用，供图表使用
        dashboardData.value = embeddedPartsArray
        
        // 计算项目统计
        projectStats.totalProjects = allProjects.length
        projectStats.activeProjects = allProjects.filter(p => p.status === 'under_construction' || p.status === 'active').length
        projectStats.completedProjects = allProjects.filter(p => p.status === 'completed').length
        
        // 计算预埋件统计
        embeddedPartStats.totalParts = totalPartsCount
        embeddedPartStats.installedParts = embeddedPartsArray.filter(p => p.status === 'installed').length
        embeddedPartStats.inspectedParts = embeddedPartsArray.filter(p => p.status === 'inspected').length
        embeddedPartStats.pendingParts = embeddedPartsArray.filter(p => p.status === 'pending').length
        // 增加已拒绝和已完成（如果有）的统计，确保数据完整性
        embeddedPartStats.rejectedParts = embeddedPartsArray.filter(p => p.status === 'rejected').length
        embeddedPartStats.completedParts = embeddedPartsArray.filter(p => p.status === 'completed').length
        
        // 最近项目（按更新时间排序，取前3个）
        recentProjects.value = [...allProjects]
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 3)
        
        // 最近扫描记录（从预埋件中提取安装/质检记录，按时间排序）
        recentScanRecords.value = embeddedPartsArray
          .filter(p => p.statusHistory && p.statusHistory.length > 0)
          .flatMap(part => {
            return part.statusHistory.map(record => ({
              id: `${part.id}-${record.timestamp}`,
              action: record.status === 'installed' ? 'install' : record.status === 'inspected' ? 'inspect' : 'verify',
              status: 'completed',
              embeddedPartName: part.name || part.identifier || part.id,
              userName: record.updatedBy || '未知用户',
              scanTime: record.timestamp
            }))
          })
          .sort((a, b) => new Date(b.scanTime) - new Date(a.scanTime))
          .slice(0, 3)
        
        // 项目列表（带预埋件统计）
        projects.value = allProjects.map(project => {
          const projectParts = embeddedPartsArray.filter(p => p.projectId === project.id)
          return {
            ...project,
            code: project.code || `PRJ-${project.id.slice(-6).toUpperCase()}`,
            totalEmbeddedParts: projectParts.length,
            installedCount: projectParts.filter(p => p.status === 'installed').length,
            inspectedCount: projectParts.filter(p => p.status === 'inspected').length
          }
        })
        
        loading.value = false
        initCharts()
      } catch (error) {
        console.error('加载仪表盘数据失败:', error)
        loading.value = false
      }
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
    const submitReport = async () => {
      try {
        // 验证是否选择了项目
        if (!reportForm.selectedProject) {
          ElMessage.warning('请先选择一个项目')
          return
        }
        
        reportLoading.value = true
        
        let reportData = null
        
        // 根据报告类型调用相应的API
        if (reportForm.reportType === 'project-progress') {
          // 生成项目进度报告
          reportData = await api.report.generateProjectReport(
            reportForm.selectedProject, 
            {
              startDate: dateRange.value[0],
              endDate: dateRange.value[1]
            }
          )
        } else if (reportForm.reportType === 'embedded-parts-status') {
          // 生成预埋件状态报告
          reportData = await api.report.generateEmbeddedPartReport({
            projectId: reportForm.selectedProject,
            startDate: dateRange.value[0],
            endDate: dateRange.value[1],
            status: reportForm.selectedStatus
          })
        }
        
        if (reportData && reportData.title) {
          // 直接下载报告数据为 JSON 文件（临时方案）
          const jsonString = JSON.stringify(reportData, null, 2)
          const blob = new Blob([jsonString], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Report_${reportData.title}_${new Date().getTime()}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          
          ElMessage.success('报告生成成功')
        } else {
          ElMessage.error('报告生成失败：' + (reportData?.message || '未知错误'))
        }
        
        reportDialogVisible.value = false
      } catch (error) {
        console.error('生成报告失败:', error)
        ElMessage.error('生成报告失败，请稍后重试')
      } finally {
        reportLoading.value = false
      }
    }
    
    // 生成项目报告
    const generateProjectReport = async (project) => {
      try {
        reportLoading.value = true
        
        // 生成项目进度报告
        const reportData = await api.report.generateProjectReport(
          project.id, 
          {
            startDate: dateRange.value[0],
            endDate: dateRange.value[1]
          }
        )
        
        if (reportData && reportData.success) {
          // 默认生成PDF格式报告
          const fileResponse = await api.report.generateReportFile(reportData.data, 'pdf')
          
          // 下载报告文件
          const blob = new Blob([fileResponse], { type: 'application/pdf' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Project_Report_${project.name}_${new Date().getTime()}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          
          ElMessage.success('项目报告生成成功')
        } else {
          ElMessage.error('项目报告生成失败：' + (reportData?.message || '未知错误'))
        }
      } catch (error) {
        console.error('生成项目报告失败:', error)
        ElMessage.error('生成项目报告失败，请稍后重试')
      } finally {
        reportLoading.value = false
      }
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

    // 辅助函数：获取文件扩展名
    const getExtension = (format) => {
      switch (format) {
        case 'pdf': return 'pdf'
        case 'excel': return 'xlsx'
        case 'word': return 'docx'
        default: return 'pdf'
      }
    }
    
    // 辅助函数：获取Blob类型
    const getBlobType = (format) => {
      switch (format) {
        case 'pdf': return 'application/pdf'
        case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        case 'word': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        default: return 'application/pdf'
      }
    }
    
    return {
      userStore,
      loading,
      reportLoading,
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

/* 页面头部 - 建筑风格 */
.page-header {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--steel-silver);
  position: relative;
}

.page-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 120px;
  height: 3px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--safety-orange) 100%);
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 26px;
  color: var(--construction-blue);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.page-header p {
  margin: 0;
  color: var(--concrete-gray);
  font-size: 14px;
}

/* 统计卡片 - 建筑风格 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--steel-silver);
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--construction-blue);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--construction-blue-light);
}

.stat-card:hover::before {
  opacity: 1;
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
  font-size: 36px;
  font-weight: 700;
  color: var(--construction-blue);
  margin-bottom: 4px;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 14px;
  color: var(--concrete-gray);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 统计图标 - 建筑行业风格 */
.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28px;
  position: relative;
}

.project-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: var(--construction-blue);
  border: 1px solid #93c5fd;
}

.part-icon {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: var(--safety-orange);
  border: 1px solid #fdba74;
}

.installed-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: var(--complete-green);
  border: 1px solid #86efac;
}

.pending-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: var(--warning-yellow);
  border: 1px solid #fcd34d;
}

.inspected-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
  border: 1px solid #6ee7b7;
}

.completed-icon {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #4f46e5;
  border: 1px solid #a5b4fc;
}

/* 内容卡片 - 建筑风格 */
.dashboard-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.content-card {
  border-radius: 8px;
  border: 1px solid var(--steel-silver);
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cement-texture);
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--construction-blue);
  font-weight: 600;
}

/* 最近项目 - 建筑风格 */
.recent-projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  padding: 16px;
  border: 1px solid var(--steel-silver);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
  position: relative;
}

.project-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--construction-blue);
  border-radius: 8px 0 0 8px;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.project-item:hover {
  border-color: var(--construction-blue-light);
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.project-item:hover::before {
  opacity: 1;
}

.project-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--construction-blue);
  font-weight: 600;
}

.project-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--concrete-gray);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-date {
  font-size: 12px;
  color: var(--concrete-light);
}

/* 最近扫描记录 */
.recent-scans {
  max-height: 400px;
  overflow-y: auto;
}

/* 图表区域 - 建筑蓝图风格 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.chart-card {
  box-shadow: var(--shadow-md);
  border-radius: 8px;
  border: 1px solid var(--steel-silver);
  background: linear-gradient(135deg, #ffffff 0%, var(--cement-light) 100%);
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--construction-blue) 0%, var(--safety-orange) 100%);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--cement-texture);
  background: linear-gradient(180deg, #ffffff 0%, var(--cement-light) 100%);
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

/* 表格容器 */
.projects-section {
  overflow-x: auto;
}

/* 对话框 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
    padding: 0 16px;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
    padding: 0 16px;
  }
  
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 16px;
    gap: 12px;
  }

  .dashboard-content {
    grid-template-columns: 1fr;
    padding: 0 16px;
  }

  .charts-section {
    padding: 0 16px;
    gap: 16px;
  }

  .projects-section {
    padding: 0 16px;
  }

  .stat-value {
    font-size: 24px;
  }

  .chart {
    height: 250px;
  }

  .chart-container {
    padding: 12px;
  }

  .project-item {
    padding: 12px;
  }

  .project-item h4 {
    font-size: 15px;
  }

  .project-description {
    font-size: 13px;
  }

  .card-header h3 {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 28px;
  }

  .chart {
    height: 200px;
  }

  .el-date-picker {
    width: 100%;
  }

  .header-actions .el-button {
    width: 100%;
    margin-top: 8px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .section-header h3 {
    font-size: 16px;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table-column {
    padding: 8px 4px;
  }

  .el-button--small {
    padding: 4px 8px;
    font-size: 12px;
  }
}
</style>