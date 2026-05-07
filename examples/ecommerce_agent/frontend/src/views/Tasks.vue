<template>
  <div class="tasks-page">
    <div class="page-header">
      <h2>📋 任务管理</h2>
      <div class="header-actions">
        <el-select v-model="statusFilter" placeholder="筛选状态" clearable style="width: 120px;">
          <el-option label="全部" value="" />
          <el-option label="等待中" value="pending" />
          <el-option label="运行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="重试中" value="retrying" />
        </el-select>
        <el-button @click="loadTasks" icon="Refresh">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总任务数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card running">
          <div class="stat-value">{{ stats.running }}</div>
          <div class="stat-label">运行中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card failed">
          <div class="stat-value">{{ stats.failed }}</div>
          <div class="stat-label">失败</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <el-table :data="tasks" v-loading="loading" stripe border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="任务信息" min-width="200">
          <template #default="scope">
            <div class="task-info">
              <strong>{{ scope.row.name || `任务 #${scope.row.id}` }}</strong>
              <el-tag size="small" type="info">{{ getTaskTypeLabel(scope.row.task_type) }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
            <el-tag v-if="scope.row.retry_count > 0" type="warning" size="small" style="margin-left: 5px;">
              重试 {{ scope.row.retry_count }}/{{ scope.row.max_retries }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150">
          <template #default="scope">
            <el-progress
              :percentage="scope.row.progress || 0"
              :stroke-width="8"
              :color="getProgressColor(scope.row.progress)"
            />
            <span class="progress-text">
              {{ scope.row.completed_steps || 0 }} / {{ scope.row.total_steps || 0 }} 步骤
            </span>
          </template>
        </el-table-column>
        <el-table-column label="当前步骤" min-width="150">
          <template #default="scope">
            <span v-if="scope.row.current_step" class="current-step">{{ scope.row.current_step }}</span>
            <span v-else class="no-step">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="store_id" label="店铺" width="80">
          <template #default="scope">
            <el-tag size="small">{{ scope.row.store_id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="scope">
            <div class="time-info">
              <div>创建: {{ formatDate(scope.row.created_at) }}</div>
              <div v-if="scope.row.completed_at">完成: {{ formatDate(scope.row.completed_at) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row)" icon="View">详情</el-button>
            <el-button
              v-if="scope.row.status === 'failed'"
              size="small"
              type="warning"
              @click="retryTask(scope.row)"
              icon="Refresh"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadTasks"
        @current-change="loadTasks"
        style="margin-top: 20px; justify-content: center;"
      />
    </el-card>

    <el-card v-if="failedTasks.length > 0" class="failed-tasks-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>⚠️ 失败任务 ({{ failedTasks.length }})</span>
          <el-button size="small" type="warning" @click="batchRetry">批量重试</el-button>
        </div>
      </template>
      <el-checkbox-group v-model="selectedFailedTasks">
        <el-row :gutter="10">
          <el-col :span="8" v-for="task in failedTasks.slice(0, 9)" :key="task.id">
            <el-checkbox :value="task.id" class="failed-task-item">
              <el-card shadow="hover">
                <div class="failed-task-info">
                  <strong>{{ task.name || `任务 #${task.id}` }}</strong>
                  <div class="failed-task-meta">
                    <span>重试: {{ task.retry_count }}/{{ task.max_retries }}</span>
                    <span>错误: {{ task.error_message?.substring(0, 30) }}...</span>
                  </div>
                </div>
              </el-card>
            </el-checkbox>
          </el-col>
        </el-row>
      </el-checkbox-group>
      <div v-if="failedTasks.length > 9" style="margin-top: 10px; text-align: center; color: #909399;">
        还有 {{ failedTasks.length - 9 }} 个失败任务...
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const tasks = ref<any[]>([])
const failedTasks = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')
const selectedFailedTasks = ref<number[]>([])

const stats = computed(() => {
  const all = tasks.value
  return {
    total: total.value,
    running: all.filter(t => t.status === 'running' || t.status === 'retrying').length,
    completed: all.filter(t => t.status === 'completed').length,
    failed: all.filter(t => t.status === 'failed').length
  }
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'info', running: 'primary', completed: 'success',
    failed: 'danger', paused: 'warning', retrying: 'warning'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '等待中', running: '运行中', completed: '已完成',
    failed: '失败', paused: '已暂停', retrying: '重试中'
  }
  return labels[status] || status
}

const getTaskTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    publish: '商品发布', good_review: '好评回复', fetch_data: '数据采集', analyze: '数据分析'
  }
  return labels[type] || type
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return '#67c23a'
  if (progress >= 50) return '#409eff'
  return '#e6a23c'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const loadTasks = async () => {
  loading.value = true
  try {
    const params: any = { limit: pageSize.value, offset: (currentPage.value - 1) * pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value

    const res = await axios.get('/api/tasks', { params })
    tasks.value = res.data.tasks || []
    total.value = res.data.total || 0

    failedTasks.value = tasks.value.filter(t => t.status === 'failed')
  } catch (e) {
    console.error('加载任务失败', e)
    try {
      const res = await axios.get('/api/tasks/recent', { params: { limit: 100 } })
      tasks.value = res.data.tasks || []
      total.value = res.data.total || 0
      failedTasks.value = tasks.value.filter(t => t.status === 'failed')
    } catch (e2) {
      console.error('备用接口也失败', e2)
    }
  }
  loading.value = false
}

const loadRunningTasks = async () => {
  try {
    const res = await axios.get('/api/tasks/running')
    const running = res.data.tasks || []
    running.forEach((rt: any) => {
      const idx = tasks.value.findIndex(t => t.id === rt.id)
      if (idx >= 0) tasks.value[idx] = rt
      else if (tasks.value.length < pageSize.value) tasks.value.unshift(rt)
    })
  } catch {}
}

const viewDetail = (task: any) => {
  router.push(`/tasks/${task.id}`)
}

const retryTask = async (task: any) => {
  try {
    await ElMessageBox.confirm(`确定重试任务 "${task.name || task.id}" 吗？`, '确认重试', { type: 'warning' })
    await axios.post(`/api/tasks/${task.id}/retry`)
    ElMessage.success('任务已重新排队')
    await loadTasks()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error('重试失败')
  }
}

const batchRetry = async () => {
  if (selectedFailedTasks.value.length === 0) {
    ElMessage.warning('请先选择要重试的任务')
    return
  }

  try {
    await ElMessageBox.confirm(`确定重试选中的 ${selectedFailedTasks.value.length} 个任务吗？`, '确认批量重试', { type: 'warning' })

    let success = 0, failed = 0
    for (const taskId of selectedFailedTasks.value) {
      try {
        await axios.post(`/api/tasks/${taskId}/retry`)
        success++
      } catch {
        failed++
      }
    }

    ElMessage.success(`成功重试 ${success} 个任务${failed > 0 ? `，${failed} 个失败` : ''}`)
    selectedFailedTasks.value = []
    await loadTasks()
  } catch {}
}

watch(statusFilter, () => {
  currentPage.value = 1
  loadTasks()
})

onMounted(async () => {
  await loadTasks()

  setInterval(async () => {
    await loadRunningTasks()
  }, 10000)
})
</script>

<style scoped>
.tasks-page { padding: 20px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 { margin: 0; }

.header-actions { display: flex; gap: 10px; align-items: center; }

.stats-row { margin-bottom: 20px; }

.stat-card {
  text-align: center;
  padding: 10px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.stat-card.running .stat-value { color: #409eff; }
.stat-card.failed .stat-value { color: #f56c6c; }

.task-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.current-step {
  font-size: 12px;
  color: #606266;
}

.no-step { color: #c0c4cc; }

.progress-text {
  font-size: 11px;
  color: #909399;
  margin-top: 3px;
}

.time-info {
  font-size: 12px;
  color: #606266;
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.failed-task-item { width: 100%; margin-bottom: 10px; }

.failed-task-item :deep(.el-checkbox__label) { width: 100%; }

.failed-task-info strong { display: block; margin-bottom: 5px; }

.failed-task-meta {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: #909399;
}
</style>
