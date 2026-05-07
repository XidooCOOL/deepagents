<template>
  <div class="task-detail-page">
    <div class="page-header">
      <el-button @click="$router.back()" icon="ArrowLeft">返回</el-button>
      <h2>任务详情</h2>
      <div class="header-actions">
        <el-tag :type="getStatusType(taskDetail.status)" size="large">
          {{ getStatusLabel(taskDetail.status) }}
        </el-tag>
        <el-button v-if="taskDetail.status === 'failed'" type="warning" @click="retryTask">
          🔄 重试任务
        </el-button>
        <el-button v-if="taskDetail.status === 'running'" type="danger" @click="stopTask">
          ⏹️ 停止
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="info-card">
          <template #header>
            <span>基本信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务名称">{{ taskDetail.name }}</el-descriptions-item>
            <el-descriptions-item label="任务类型">{{ taskDetail.task_type }}</el-descriptions-item>
            <el-descriptions-item label="当前步骤">{{ taskDetail.current_step || '-' }}</el-descriptions-item>
            <el-descriptions-item label="进度">
              <el-progress :percentage="taskDetail.progress || 0" :stroke-width="10" />
            </el-descriptions-item>
            <el-descriptions-item label="重试次数">
              <span v-if="taskDetail.retry_count > 0">
                <el-tag type="warning">{{ taskDetail.retry_count }}</el-tag> / {{ taskDetail.max_retries }}
              </span>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="开始时间">
              {{ formatTime(taskDetail.started_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时间" :span="2">
              {{ formatTime(taskDetail.completed_at) || '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="taskDetail.error_message" label="错误信息" :span="2">
              <el-alert type="error" :title="taskDetail.error_message" :closable="false" show-icon />
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="steps-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>执行步骤</span>
              <el-tag type="info">{{ stepSummary.length }} 个步骤</el-tag>
            </div>
          </template>
          <el-timeline v-if="stepSummary.length > 0">
            <el-timeline-item
              v-for="step in stepSummary"
              :key="step.step_id"
              :type="getStepType(step.status)"
              :hollow="step.status === 'running'"
            >
              <div class="step-item">
                <div class="step-header">
                  <strong>{{ step.name }}</strong>
                  <el-tag size="small" :type="getStepType(step.status)">
                    {{ step.status === 'completed' ? '✓ 完成' : step.status === 'failed' ? '✗ 失败' : step.status === 'running' ? '⟳ 运行中' : '○ 等待' }}
                  </el-tag>
                </div>
                <div class="step-meta">
                  <span v-if="step.duration > 0">⏱️ {{ step.duration.toFixed(2) }}秒</span>
                  <span v-if="step.error_count > 0">❌ {{ step.error_count }} 个错误</span>
                  <span v-if="step.warning_count > 0">⚠️ {{ step.warning_count }} 个警告</span>
                </div>
                <div v-if="step.first_error" class="step-error">
                  {{ step.first_error }}
                </div>
              </div>
            </el-timeline-item>
            <el-timeline-item v-if="taskDetail.status === 'running'" type="primary" hollow>
              <div class="step-item">
                <strong>⟳ 任务执行中...</strong>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-steps">
            暂无步骤信息
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="logs-card">
          <template #header>
            <div class="card-header">
              <span>执行日志</span>
              <el-select v-model="logFilter" size="small" style="width: 100px;">
                <el-option label="全部" value="" />
                <el-option label="错误" value="error" />
                <el-option label="警告" value="warning" />
                <el-option label="信息" value="info" />
              </el-select>
            </div>
          </template>
          <div class="logs-container" ref="logsContainer">
            <div v-if="loadingLogs" class="loading-logs">
              <el-icon class="is-loading"><Loading /></el-icon>
              加载中...
            </div>
            <div v-else-if="filteredLogs.length === 0" class="empty-logs">
              暂无日志
            </div>
            <div v-else class="log-list">
              <div
                v-for="log in filteredLogs"
                :key="log.id"
                class="log-item"
                :class="'log-' + log.level"
                @click="showLogDetail(log)"
              >
                <div class="log-header">
                  <el-tag size="small" :type="getLogType(log.level)" :hit="false">
                    {{ getLogLevelLabel(log.level) }}
                  </el-tag>
                  <span class="log-time">{{ formatLogTime(log.created_at) }}</span>
                </div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.screenshot" class="log-screenshot">
                  <el-tag size="small" type="info">📷 有截图</el-tag>
                </div>
              </div>
            </div>
          </div>
          <div class="logs-footer">
            <el-button size="small" @click="loadLogs" :loading="loadingLogs">
              🔄 刷新日志
            </el-button>
            <el-checkbox v-model="autoRefresh" size="small">
              自动刷新
            </el-checkbox>
          </div>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span>时间线</span>
          </template>
          <el-timeline v-if="timeline.length > 0">
            <el-timeline-item
              v-for="item in timeline.slice(0, 10)"
              :key="item.id"
              :type="getLogType(item.level)"
              :timestamp="formatLogTime(item.time)"
            >
              {{ item.message }}
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-timeline">
            暂无时间线数据
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showDetailDialog" title="日志详情" width="600px">
      <el-descriptions v-if="selectedLog" :column="1" border>
        <el-descriptions-item label="时间">
          {{ formatTime(selectedLog.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="级别">
          <el-tag :type="getLogType(selectedLog.level)">
            {{ getLogLevelLabel(selectedLog.level) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="步骤">
          {{ selectedLog.step_id || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="消息">
          {{ selectedLog.message }}
        </el-descriptions-item>
        <el-descriptions-item v-if="selectedLog.data" label="数据">
          <pre class="data-pre">{{ JSON.stringify(selectedLog.data, null, 2) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button v-if="selectedLog?.screenshot" type="primary" @click="viewScreenshot(selectedLog.screenshot)">
          查看截图
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showScreenshotDialog" title="执行截图" width="80%">
      <div class="screenshot-container">
        <img v-if="screenshotUrl" :src="screenshotUrl" alt="截图" />
        <div v-else class="no-screenshot">暂无截图</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const taskId = computed(() => Number(route.params.id))

const taskDetail = ref<any>({})
const logs = ref<any[]>([])
const stepSummary = ref<any[]>([])
const timeline = ref<any[]>([])
const loadingLogs = ref(false)
const autoRefresh = ref(true)
const logFilter = ref('')
const logsContainer = ref<HTMLElement | null>(null)
const showDetailDialog = ref(false)
const showScreenshotDialog = ref(false)
const selectedLog = ref<any>(null)
const screenshotUrl = ref('')

let refreshInterval: number | null = null

const filteredLogs = computed(() => {
  if (!logFilter.value) return logs.value
  return logs.value.filter(log => log.level === logFilter.value)
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

const getStepType = (status: string) => {
  const types: Record<string, string> = {
    completed: 'success', failed: 'danger', running: 'primary', waiting: 'info'
  }
  return types[status] || 'info'
}

const getLogType = (level: string) => {
  const types: Record<string, string> = {
    error: 'danger', warning: 'warning', info: 'primary', success: 'success', debug: 'info'
  }
  return types[level] || 'info'
}

const getLogLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    error: '错误', warning: '警告', info: '信息', success: '成功', debug: '调试'
  }
  return labels[level] || level
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const formatLogTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

const loadTaskDetail = async () => {
  try {
    const res = await axios.get(`/api/tasks/${taskId.value}/detail`)
    taskDetail.value = res.data
    logs.value = res.data.logs || []
    stepSummary.value = []
  } catch (e) {
    console.error('加载任务详情失败', e)
  }
}

const loadSteps = async () => {
  try {
    const res = await axios.get(`/api/tasks/${taskId.value}/steps`)
    stepSummary.value = res.data.steps || []
  } catch (e) {
    console.error('加载步骤失败', e)
  }
}

const loadTimeline = async () => {
  try {
    const res = await axios.get(`/api/tasks/${taskId.value}/timeline`)
    timeline.value = res.data.timeline || []
  } catch (e) {
    console.error('加载时间线失败', e)
  }
}

const loadLogs = async () => {
  loadingLogs.value = true
  try {
    const params: any = {}
    if (logFilter.value) params.level = logFilter.value
    const res = await axios.get(`/api/tasks/${taskId.value}/logs`, { params })
    logs.value = res.data || []
    await nextTick()
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  } catch (e) {
    console.error('加载日志失败', e)
  }
  loadingLogs.value = false
}

const showLogDetail = (log: any) => {
  selectedLog.value = log
  showDetailDialog.value = true
}

const viewScreenshot = (path: string) => {
  screenshotUrl.value = path
  showScreenshotDialog.value = true
}

const retryTask = async () => {
  try {
    await axios.post(`/api/tasks/${taskId.value}/retry`)
    ElMessage.success('任务已重新排队')
    await loadTaskDetail()
  } catch (e: any) {
    ElMessage.error('重试失败: ' + (e.response?.data?.detail || e.message))
  }
}

const stopTask = async () => {
  ElMessage.info('停止任务功能待实现')
}

watch(logFilter, () => {
  loadLogs()
})

onMounted(async () => {
  await loadTaskDetail()
  await loadSteps()
  await loadTimeline()
  await loadLogs()

  if (autoRefresh.value && taskDetail.value.status === 'running') {
    refreshInterval = window.setInterval(async () => {
      await loadTaskDetail()
      await loadSteps()
      await loadTimeline()
      await loadLogs()
    }, 3000)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.task-detail-page { padding: 20px; }

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h2 { margin: 0; flex: 1; }

.header-actions { display: flex; gap: 10px; align-items: center; }

.card-header { display: flex; justify-content: space-between; align-items: center; }

.step-item { padding: 5px 0; }

.step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }

.step-meta { font-size: 12px; color: #909399; display: flex; gap: 15px; }

.step-error { font-size: 12px; color: #f56c6c; margin-top: 5px; }

.logs-container {
  max-height: 500px;
  overflow-y: auto;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
}

.loading-logs, .empty-logs, .empty-steps, .empty-timeline {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.log-list { display: flex; flex-direction: column; gap: 8px; }

.log-item {
  background: white;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.log-item:hover { background: #ecf5ff; }

.log-error { border-left-color: #f56c6c; }
.log-warning { border-left-color: #e6a23c; }
.log-success { border-left-color: #67c23a; }

.log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }

.log-time { font-size: 11px; color: #909399; }

.log-message { font-size: 13px; color: #303133; word-break: break-all; }

.log-screenshot { margin-top: 4px; }

.logs-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.data-pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow: auto;
  font-size: 12px;
}

.screenshot-container {
  max-height: 70vh;
  overflow: auto;
  text-align: center;
}

.screenshot-container img { max-width: 100%; }

.no-screenshot { padding: 60px; color: #909399; }
</style>
