<template>
  <div class="project-statistics">
    <div class="header">
      <h2>项目统计</h2>
      <div class="project-selector">
        <el-select 
          v-model="selectedProjectId" 
          placeholder="选择项目" 
          @change="handleProjectChange"
          :filterable="!isRestrictedUser"
          :disabled="isRestrictedUser"
        >
          <el-option
            v-for="project in projects"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>
      </div>
    </div>

    <div v-if="selectedProject" class="content">
      <div class="project-info">
        <h3>{{ selectedProject.name }}</h3>
        <p><strong>项目编码：</strong>{{ selectedProject.code }}</p>
        <p><strong>项目状态：</strong>{{ getProjectStatusLabel(selectedProject.status) }}</p>
        <p><strong>项目位置：</strong>{{ selectedProject.location }}</p>
        <p><strong>开始日期：</strong>{{ formatDate(selectedProject.startDate) }}</p>
        <p><strong>结束日期：</strong>{{ formatDate(selectedProject.endDate) }}</p>
      </div>

      <div class="statistics-section">
        <h3>预埋件统计</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ totalParts }}</div>
            <div class="stat-label">总预埋件数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ pendingParts }}</div>
            <div class="stat-label">待安装</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ installedParts }}</div>
            <div class="stat-label">已安装</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ inspectedParts }}</div>
            <div class="stat-label">已验收</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ rejectedParts }}</div>
            <div class="stat-label">已拒收</div>
          </div>
          <div class="stat-card overdue-card">
            <div class="stat-number overdue-number">{{ overdueInstallParts }}</div>
            <div class="stat-label">超时未安装</div>
          </div>
          <div class="stat-card overdue-card">
            <div class="stat-number overdue-number">{{ overdueInspectParts }}</div>
            <div class="stat-label">超时未验收</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ completionRate }}%</div>
            <div class="stat-label">完成率</div>
          </div>
        </div>
      </div>

      <div class="statistics-section">
        <h3>楼层统计</h3>
        <el-table :data="floorStatistics" style="width: 100%">
          <el-table-column prop="floorName" label="楼层" width="180" />
          <el-table-column prop="total" label="总数量" />
          <el-table-column prop="pending" label="待安装" />
          <el-table-column prop="installed" label="已安装" />
          <el-table-column prop="inspected" label="已验收" />
          <el-table-column prop="rejected" label="已拒收" />
          <el-table-column label="超时未安装">
            <template #default="scope">
              <el-tag v-if="scope.row.overdueInstall > 0" type="danger" size="small">{{ scope.row.overdueInstall }}</el-tag>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column label="超时未验收">
            <template #default="scope">
              <el-tag v-if="scope.row.overdueInspect > 0" type="warning" size="small">{{ scope.row.overdueInspect }}</el-tag>
              <span v-else>0</span>
            </template>
          </el-table-column>
          <el-table-column prop="completionRate" label="完成率" />
        </el-table>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="请选择一个项目进行统计" />
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index'
import { useUserStore } from '../stores/index.js'

export default {
  name: 'ProjectStatistics',
  setup() {
    // 用户存储
    const userStore = useUserStore()
    
    // 项目列表
    const projects = ref([])
    // 选中的项目ID
    const selectedProjectId = ref('')
    // 选中的项目详情
    const selectedProject = ref(null)
    // 预埋件数据
    const embeddedParts = ref([])
    // 楼层列表
    const floors = ref([])
    
    // 判断用户是否是安装人员或质检人员
    const isRestrictedUser = computed(() => {
      const role = userStore.userRole
      return role === 'installer' || role === 'qualityInspector'
    })
    
    // 获取用户可访问的项目ID
    const userProjects = computed(() => {
      return userStore.userInfo?.projects || []
    })

    // 获取项目列表
    const getProjects = async () => {
      try {
        const response = await api.project.getProjects()
        
        // 根据用户角色过滤项目列表
        const userProjectList = userProjects.value || []
        if (isRestrictedUser.value && userProjectList.length > 0) {
          // 安装人员和质检人员只能看到自己注册的项目
          projects.value = response.filter(project => userProjectList.includes(project.id))
        } else {
          // 其他角色可以看到所有项目
          projects.value = response
        }
        
        // 如果是受限用户，自动选择他们的项目
        if (isRestrictedUser.value && projects.value.length > 0) {
          selectedProjectId.value = projects.value[0].id
          await handleProjectChange()
        }
      } catch (error) {
        console.error('获取项目列表失败:', error)
        ElMessage.error('获取项目列表失败')
      }
    }

    // 获取项目详情
    const getProjectDetails = async (projectId) => {
      try {
        const response = await api.project.getProject(projectId)
        selectedProject.value = response
        floors.value = response.floors || []
      } catch (error) {
        console.error('获取项目详情失败:', error)
        ElMessage.error('获取项目详情失败')
      }
    }

    // 获取项目的预埋件数据
    const getProjectEmbeddedParts = async (projectId) => {
      try {
        // 获取预埋件数据 - 获取更多数据以确保统计准确
        const response = await api.embeddedPart.getEmbeddedParts({ projectId, limit: 10000 })
        
        // 处理API响应格式 - 后端返回 {total, data} 或直接返回数组
        let embeddedPartsArray = []
        
        if (response && typeof response === 'object') {
          if (Array.isArray(response.data)) {
            embeddedPartsArray = response.data
          } else if (Array.isArray(response)) {
            embeddedPartsArray = response
          }
        }
        embeddedParts.value = embeddedPartsArray
      } catch (error) {
        console.error('获取预埋件数据失败:', error)
        ElMessage.error('获取预埋件数据失败')
      }
    }

    // 处理项目选择变化
    const handleProjectChange = async () => {
      if (selectedProjectId.value) {
        await Promise.all([
          getProjectDetails(selectedProjectId.value),
          getProjectEmbeddedParts(selectedProjectId.value)
        ])
      } else {
        selectedProject.value = null
        embeddedParts.value = []
        floors.value = []
      }
    }

    // 计算统计数据
    const totalParts = computed(() => embeddedParts.value.length)
    const pendingParts = computed(() => 
      embeddedParts.value.filter(part => part.status === 'pending').length
    )
    const installedParts = computed(() => 
      embeddedParts.value.filter(part => part.status === 'installed').length
    )
    const inspectedParts = computed(() => 
      embeddedParts.value.filter(part => part.status === 'inspected').length
    )
    const rejectedParts = computed(() => 
      embeddedParts.value.filter(part => part.status === 'rejected').length
    )
    
    // 超时统计
    const OVERDUE_MS = 24 * 60 * 60 * 1000
    const overdueInstallParts = computed(() => {
      const now = new Date()
      return embeddedParts.value.filter(part => 
        part.status === 'pending' && part.createdAt && (now - new Date(part.createdAt)) > OVERDUE_MS
      ).length
    })
    const overdueInspectParts = computed(() => {
      const now = new Date()
      return embeddedParts.value.filter(part => 
        part.status === 'installed' && part.updatedAt && (now - new Date(part.updatedAt)) > OVERDUE_MS
      ).length
    })
    
    const completionRate = computed(() => {
      if (totalParts.value === 0) return 0
      return Math.round((inspectedParts.value / totalParts.value) * 100)
    })

    // 楼层统计数据
    const floorStatistics = computed(() => {
        const now = new Date()
      return floors.value.map(floor => {
        const floorParts = embeddedParts.value.filter(part => 
          part.floorId === floor.id
        )
        const floorTotal = floorParts.length
        const floorPending = floorParts.filter(part => part.status === 'pending').length
        const floorInstalled = floorParts.filter(part => part.status === 'installed').length
        const floorInspected = floorParts.filter(part => part.status === 'inspected').length
        const floorRejected = floorParts.filter(part => part.status === 'rejected').length
        const floorCompletionRate = floorTotal === 0 ? 0 : Math.round((floorInspected / floorTotal) * 100)

        return {
          floorName: floor.name,
          total: floorTotal,
          pending: floorPending,
          installed: floorInstalled,
          inspected: floorInspected,
          rejected: floorRejected,
          overdueInstall: floorParts.filter(part => part.status === 'pending' && part.createdAt && (now - new Date(part.createdAt)) > OVERDUE_MS).length,
          overdueInspect: floorParts.filter(part => part.status === 'installed' && part.updatedAt && (now - new Date(part.updatedAt)) > OVERDUE_MS).length,
          completionRate: `${floorCompletionRate}%`
        }
      })
    })

    // 获取项目状态标签
    const getProjectStatusLabel = (status) => {
      const statusMap = {
        'planning': '规划中',
        'underConstruction': '施工中',
        'completed': '已完成',
        'paused': '已暂停'
      }
      return statusMap[status] || status
    }

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString('zh-CN')
    }

    // 页面加载时获取项目列表
    onMounted(async () => {
      await getProjects()
    })

    return {
      projects,
      selectedProjectId,
      selectedProject,
      embeddedParts,
      floors,
      totalParts,
      pendingParts,
      installedParts,
      inspectedParts,
      rejectedParts,
      overdueInstallParts,
      overdueInspectParts,
      completionRate,
      floorStatistics,
      handleProjectChange,
      getProjectStatusLabel,
      formatDate
    }
  }
}
</script>

<style scoped>
.project-statistics {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.project-selector {
  width: 300px;
}

.content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.project-info {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.project-info h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.project-info p {
  margin: 8px 0;
  color: #606266;
}

.statistics-section {
  margin-bottom: 30px;
}

.statistics-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.empty-state {
  background-color: white;
  border-radius: 8px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.overdue-card {
  background-color: #fff5f5;
  border-color: #fca5a5;
}

.overdue-number {
  color: #dc2626 !important;
}
</style>