<template>
  <div class="home-container">
    <!-- 状态栏 -->
    <div class="status-section mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 状态卡片 1 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-emerald-600"><CircleCheck /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Status</div>
              <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Healthy</div>
            </div>
          </div>
        </div>
        
        <!-- 状态卡片 2 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-neutral-600 dark:text-neutral-400"><Cpu /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Compute</div>
              <el-tag size="small" type="info">N/A</el-tag>
            </div>
          </div>
        </div>
        
        <!-- 状态卡片 3 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-neutral-600 dark:text-neutral-400"><Connection /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">GitHub</div>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">No repository connected</div>
            </div>
          </div>
        </div>
        
        <!-- 状态卡片 4 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-neutral-600 dark:text-neutral-400"><Guide /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Recent Branch</div>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">No branches</div>
            </div>
          </div>
        </div>
        
        <!-- 状态卡片 5 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-neutral-600 dark:text-neutral-400"><Box /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Last Migration</div>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">No migrations</div>
            </div>
          </div>
        </div>
        
        <!-- 状态卡片 6 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <el-icon :size="20" class="text-neutral-600 dark:text-neutral-400"><Delete /></el-icon>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Last Backup</div>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">No backups</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 数据看板区域 -->
    <div class="dashboard-section mt-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <el-icon :size="18" class="text-neutral-500"><List /></el-icon>
          0 Total Requests
        </h2>
        <el-select v-model="selectedPeriod" size="small" style="width: 140px;">
          <el-option label="Last 60 minutes" value="60min" />
          <el-option label="Last 24 hours" value="24h" />
          <el-option label="Last 7 days" value="7d" />
        </el-select>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 数据卡片 1 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Database Requests</div>
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">0</div>
          <div class="h-32 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
            <div class="text-center">
              <el-icon :size="24" class="text-neutral-400"><DataAnalysis /></el-icon>
              <div class="text-xs text-neutral-500 mt-2">No data for selected period</div>
            </div>
          </div>
        </div>
        
        <!-- 数据卡片 2 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Auth Requests</div>
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">0</div>
          <div class="h-32 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
            <div class="text-center">
              <el-icon :size="24" class="text-neutral-400"><DataAnalysis /></el-icon>
              <div class="text-xs text-neutral-500 mt-2">No data for selected period</div>
            </div>
          </div>
        </div>
        
        <!-- 数据卡片 3 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Storage Requests</div>
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">0</div>
          <div class="h-32 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
            <div class="text-center">
              <el-icon :size="24" class="text-neutral-400"><DataAnalysis /></el-icon>
              <div class="text-xs text-neutral-500 mt-2">No data for selected period</div>
            </div>
          </div>
        </div>
        
        <!-- 数据卡片 4 -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Realtime Requests</div>
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">0</div>
          <div class="h-32 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
            <div class="text-center">
              <el-icon :size="24" class="text-neutral-400"><DataAnalysis /></el-icon>
              <div class="text-xs text-neutral-500 mt-2">No data for selected period</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 原有内容区域 -->
    <div class="existing-content mt-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div class="flex justify-between items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <span class="font-medium text-neutral-900 dark:text-neutral-100">运行中任务</span>
            <el-tag type="info" size="small">{{ activeTasks.length }} 个</el-tag>
          </div>
          <div class="p-5">
            <div v-if="activeTasks.length === 0" class="flex flex-col items-center justify-center h-48 text-neutral-400">
              <el-icon :size="48"><Finished /></el-icon>
              <p class="mt-3">暂无运行中的任务</p>
            </div>
            <div v-else class="max-h-64 overflow-y-auto">
              <div v-for="task in activeTasks" :key="task.task_id" class="p-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-semibold text-neutral-700 dark:text-neutral-300">{{ task.task_name }}</span>
                  <el-tag size="small" type="primary">Step {{ task.current_step }}/{{ task.total_steps }}</el-tag>
                </div>
                <el-progress :percentage="task.progress || 0" :stroke-width="8" />
                <div class="text-xs text-neutral-400 mt-1">{{ task.message || '处理中...' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div class="flex justify-between items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <span class="font-medium text-neutral-900 dark:text-neutral-100">系统状态</span>
            <el-button size="small" @click="refreshStatus" :loading="loadingStatus">刷新</el-button>
          </div>
          <div class="p-5">
            <div class="overflow-x-auto">
              <el-table :data="systemStatus" border size="small">
                <el-table-column prop="name" label="服务" min-width="100" />
                <el-table-column prop="status" label="状态" min-width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '运行中' ? 'success' : 'danger'" size="small">
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="cpu" label="CPU" min-width="60">
                  <template #default="scope">
                    <span :class="{ 'text-red-500 font-bold': parseFloat(scope.row.cpu) > 80 }">
                      {{ scope.row.cpu }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="memory" label="内存" min-width="100" />
              </el-table>
            </div>

            <el-divider>实时资源</el-divider>
            <div class="py-3">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="text-neutral-500">CPU</span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ resourceUsage?.cpu?.percent || 0 }}%</span>
                <span class="text-neutral-300">·</span>
                <span class="text-neutral-500">磁盘</span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ resourceUsage?.disk?.percent || 0 }}%</span>
                <span class="text-neutral-300">·</span>
                <span class="text-neutral-500">内存</span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ resourceUsage?.memory?.percent || 0 }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Cpu, Connection, Guide, Box, Delete, List, DataAnalysis, Finished } from '@element-plus/icons-vue'
import { useRealtime } from '@/composables/useRealtime'
import axios from 'axios'

const {
  connected,
  resourceUsage,
  activeTasks
} = useRealtime()

const selectedPeriod = ref('60min')

const loadingStatus = ref(false)
let refreshInterval: number | null = null

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

const formatMemory = (bytes: number) => {
  if (!bytes) return '-'
  return `${(bytes / 1024 / 1024).toFixed(0)}MB`
}

const refreshStatus = async () => {
  loadingStatus.value = true
  try {
    await axios.get('/api/status/dashboard')
  } catch (e) {
    console.error('获取状态失败:', e)
  }
  loadingStatus.value = false
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
.home-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
