<template>
  <div class="home">
    <div class="connection-status">
      <el-tag v-if="connected" type="success" size="small">
        <el-icon><CircleCheck /></el-icon>
        实时连接已建立
      </el-tag>
      <el-tag v-else type="warning" size="small">
        <el-icon><Loading /></el-icon>
        正在连接...
      </el-tag>
      <span class="connection-info" v-if="resourceUsage">
        CPU: {{ resourceUsage.cpu?.percent || 0 }}% |
        内存: {{ resourceUsage.memory?.percent || 0 }}%
      </span>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon tasks">
            <el-icon><component :is="icons.List" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dashboardStats.tasks?.today || 0 }}</div>
            <div class="stat-label">今日任务</div>
            <div class="stat-sub">{{ dashboardStats.tasks?.running || 0 }} 运行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon success">
            <el-icon><component :is="icons.CircleCheck" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dashboardStats.tasks?.completed || 0 }}</div>
            <div class="stat-label">完成任务</div>
            <div class="stat-sub">成功率 {{ dashboardStats.tasks?.success_rate || 0 }}%</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon stores">
            <el-icon><component :is="icons.OfficeBuilding" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dashboardStats.stores?.active_today || 0 }}</div>
            <div class="stat-label">活跃店铺</div>
            <div class="stat-sub">共 {{ dashboardStats.stores?.total || 0 }} 个</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon alerts" :class="{ 'has-alerts': systemAlerts.length > 0 }">
            <el-icon><component :is="icons.BellFilled" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ systemAlerts.length }}</div>
            <div class="stat-label">待处理告警</div>
            <div class="stat-sub">{{ failedTasks }} 个失败任务</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card title="运行中任务" class="task-list-card">
          <template #header>
            <div class="card-header">
              <span>运行中任务</span>
              <el-tag type="info" size="small">{{ activeTasks.length }} 个</el-tag>
            </div>
          </template>
          <div v-if="activeTasks.length === 0" class="empty-state">
            <el-icon :size="48"><Finished /></el-icon>
            <p>暂无运行中的任务</p>
          </div>
          <div v-else class="task-list">
            <div v-for="task in activeTasks" :key="task.task_id" class="task-item">
              <div class="task-info">
                <span class="task-name">{{ task.task_name }}</span>
                <el-tag size="small" type="primary">Step {{ task.current_step }}/{{ task.total_steps }}</el-tag>
              </div>
              <el-progress :percentage="task.progress || 0" :stroke-width="8" />
              <div class="task-message">{{ task.message || '处理中...' }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="系统状态" class="system-status-card">
          <template #header>
            <div class="card-header">
              <span>系统状态</span>
              <el-button size="small" @click="refreshStatus" :loading="loadingStatus">刷新</el-button>
            </div>
          </template>
          <el-table :data="systemStatus" border size="small">
            <el-table-column prop="name" label="服务" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === '运行中' ? 'success' : 'danger'" size="small">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="cpu" label="CPU" width="80">
              <template #default="scope">
                <span :class="{ 'high-usage': parseFloat(scope.row.cpu) > 80 }">
                  {{ scope.row.cpu }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="memory" label="内存" />
          </el-table>

          <el-divider>实时资源</el-divider>
          <div class="resource-bars">
            <div class="resource-item">
              <span class="resource-label">CPU</span>
              <el-progress :percentage="resourceUsage?.cpu?.percent || 0" :stroke-width="10"
                :color="getResourceColor(resourceUsage?.cpu?.percent)" />
              <span class="resource-value">{{ resourceUsage?.cpu?.percent || 0 }}%</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">内存</span>
              <el-progress :percentage="resourceUsage?.memory?.percent || 0" :stroke-width="10"
                :color="getResourceColor(resourceUsage?.memory?.percent)" />
              <span class="resource-value">{{ resourceUsage?.memory?.percent || 0 }}%</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">磁盘</span>
              <el-progress :percentage="resourceUsage?.disk?.percent || 0" :stroke-width="10"
                :color="getResourceColor(resourceUsage?.disk?.percent)" />
              <span class="resource-value">{{ resourceUsage?.disk?.percent || 0 }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card title="最近活动" class="activity-card">
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
              <el-tag size="small">{{ recentLogs.length }} 条</el-tag>
            </div>
          </template>
          <div v-if="recentLogs.length === 0" class="empty-state">
            <p>暂无活动记录</p>
          </div>
          <el-timeline v-else>
            <el-timeline-item
              v-for="log in recentLogs.slice(0, 10)"
              :key="log.id"
              :timestamp="formatTime(log.timestamp)"
              :type="getLogType(log.level)"
            >
              <div class="log-content">
                <el-tag size="small" :type="getLogType(log.level)">{{ log.level?.toUpperCase() }}</el-tag>
                <span>{{ log.message }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="浏览器状态" class="browser-card">
          <template #header>
            <div class="card-header">
              <span>浏览器状态</span>
              <el-tag type="info" size="small">{{ browserCount }} 个已打开</el-tag>
            </div>
          </template>
          <div v-if="Object.keys(browserStatus).length === 0" class="empty-state">
            <el-icon :size="48"><Monitor /></el-icon>
            <p>暂无已打开的浏览器</p>
          </div>
          <div v-else class="browser-list">
            <div v-for="(status, storeId) in browserStatus" :key="storeId" class="browser-item">
              <div class="browser-info">
                <span class="browser-name">{{ status.store_name || `店铺 ${storeId}` }}</span>
                <el-tag :type="status.status === 'open' ? 'success' : 'info'" size="small">
                  {{ status.status === 'open' ? '已打开' : '已关闭' }}
                </el-tag>
              </div>
              <div class="browser-time" v-if="status.openedAt">
                打开时间: {{ formatTime(status.openedAt) }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card title="告警信息" class="alerts-card" v-if="systemAlerts.length > 0">
          <template #header>
            <div class="card-header">
              <span>告警信息</span>
              <el-button size="small" type="danger" @click="clearAlerts">清除全部</el-button>
            </div>
          </template>
          <el-alert
            v-for="(alert, index) in systemAlerts.slice(0, 5)"
            :key="index"
            :title="alert.title"
            :description="alert.message"
            :type="getAlertType(alert.level)"
            :closable="true"
            style="margin-bottom: 10px;"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as icons from '@element-plus/icons-vue'
import { useRealtime, realtimeClient } from '@/composables/useRealtime'
import axios from 'axios'

const {
  connected,
  resourceUsage,
  activeTasks,
  systemAlerts,
  browserStatus,
  recentLogs
} = useRealtime()

const dashboardStats = ref<any>({
  tasks: { today: 0, running: 0, completed: 0, success_rate: 0 },
  stores: { total: 0, active_today: 0 },
  resources: {}
})

const loadingStatus = ref(false)
let refreshInterval: number | null = null

const browserCount = computed(() => {
  return Object.values(browserStatus.value).filter(b => b.status === 'open').length
})

const failedTasks = computed(() => {
  return activeTasks.value.filter(t => t.status === 'failed').length
})

const systemStatus = computed(() => [
  { name: '浏览器服务', status: '运行中', cpu: `${resourceUsage.value?.cpu?.percent || 0}%`, memory: formatMemory(resourceUsage.value?.memory?.used) },
  { name: 'API服务', status: connected.value ? '运行中' : '断开', cpu: '-', memory: '-' },
  { name: '实时监控', status: connected.value ? '运行中' : '断开', cpu: '-', memory: '-' },
  { name: '任务调度', status: '运行中', cpu: '-', memory: '-' },
])

const getResourceColor = (percent: number) => {
  if (percent > 80) return '#F56C6C'
  if (percent > 60) return '#E6A23C'
  return '#67C23A'
}

const getLogType = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'error': return 'danger'
    case 'warning': return 'warning'
    case 'success': return 'success'
    default: return 'primary'
  }
}

const getAlertType = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'info'
  }
}

const formatTime = (timestamp: string | number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleString('zh-CN')
}

const formatMemory = (bytes: number) => {
  if (!bytes) return '-'
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`
}

const refreshStatus = async () => {
  loadingStatus.value = true
  try {
    const res = await axios.get('/api/status/dashboard')
    dashboardStats.value = res.data
  } catch (e) {
    console.error('获取状态失败:', e)
  }
  loadingStatus.value = false
}

const clearAlerts = () => {
  systemAlerts.value = []
}

onMounted(async () => {
  await refreshStatus()

  refreshInterval = window.setInterval(async () => {
    await refreshStatus()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.home {
  @apply p-6 bg-gray-50 min-h-screen;
}

.connection-status {
  @apply flex items-center gap-4 mb-5 p-3 bg-white rounded-lg shadow-sm;
  border-left: 3px solid var(--color-primary);
}

.connection-info {
  @apply text-gray-400 text-xs;
}

.stat-card {
  @apply flex items-center gap-4 p-5;
}

.stat-icon {
  @apply w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform hover:scale-105;
}

.stat-icon.tasks { @apply bg-blue-100 text-blue-600; }
.stat-icon.success { @apply bg-green-100 text-green-600; }
.stat-icon.stores { @apply bg-amber-100 text-amber-600; }
.stat-icon.alerts { @apply bg-red-100 text-red-600; }
.stat-icon.alerts.has-alerts {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.stat-content { @apply flex-1; }

.stat-value {
  @apply text-3xl font-bold text-gray-800;
}

.stat-label {
  @apply text-sm text-gray-500;
}

.stat-sub {
  @apply text-xs text-gray-400 mt-1;
}

.card-header {
  @apply flex justify-between items-center;
}

.task-list-card,
.system-status-card,
.activity-card,
.browser-card,
.alerts-card {
  @apply rounded-xl;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-48 text-gray-400;
}

.empty-state p { @apply mt-3; }

.task-list {
  @apply max-h-64 overflow-y-auto;
}

.task-item {
  @apply p-3 border-b border-gray-100 last:border-0;
}

.task-info {
  @apply flex justify-between items-center mb-2;
}

.task-name {
  @apply font-semibold text-gray-700;
}

.task-message {
  @apply text-xs text-gray-400 mt-1;
}

.resource-bars {
  @apply py-3;
}

.resource-item {
  @apply flex items-center gap-3 mb-3;
}

.resource-label {
  @apply w-10 text-xs text-gray-500;
}

.resource-value {
  @apply w-12 text-right text-xs text-gray-500;
}

.high-usage {
  @apply text-red-500 font-bold;
}

.log-content {
  @apply flex items-center gap-2;
}

.browser-list {
  @apply max-h-64 overflow-y-auto;
}

.browser-item {
  @apply p-3 border-b border-gray-100 last:border-0;
}

.browser-info {
  @apply flex justify-between items-center;
}

.browser-name {
  @apply font-semibold text-gray-700;
}

.browser-time {
  @apply text-xs text-gray-400 mt-1;
}
</style>
