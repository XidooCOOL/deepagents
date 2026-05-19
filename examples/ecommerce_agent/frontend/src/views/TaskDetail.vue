<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" :subtitle="`任务 #${task.id}`">
      <template #extra>
        <n-space>
          <n-button @click="duplicateTask">
            <template #icon><n-icon><component :is="icons.Copy" /></n-icon></template>
            复制
          </n-button>
          <n-button @click="exportTask">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出
          </n-button>
          <n-button v-if="task.status !== '运行中'" type="primary" @click="runTask">
            <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
            运行
          </n-button>
          <n-button v-else type="warning" @click="pauseTask">
            <template #icon><n-icon><component :is="icons.Pause" /></n-icon></template>
            暂停
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-grid :x-gap="20" :y-gap="20" cols="1 l:3">
      <!-- 左侧：任务信息 -->
      <n-grid-item span="1" l-span="1">
        <n-card :bordered="false" class="mb-6">
          <div class="space-y-4">
            <div>
              <div class="text-sm text-neutral-500 mb-1">任务名称</div>
              <div class="font-bold text-lg">{{ task.name }}</div>
            </div>
            <div>
              <div class="text-sm text-neutral-500 mb-1">任务描述</div>
              <div class="text-neutral-700 dark:text-neutral-300">{{ task.description }}</div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-neutral-500 mb-1">状态</div>
                <n-tag :type="getStatusType(task.status)" size="large">
                  {{ task.status }}
                </n-tag>
              </div>
              <div>
                <div class="text-sm text-neutral-500 mb-1">优先级</div>
                <n-tag :type="getPriorityType(task.priority)" size="large">
                  {{ task.priority }}
                </n-tag>
              </div>
            </div>
          </div>
        </n-card>

        <n-card title="任务配置" :bordered="false" class="mb-6">
          <n-descriptions :column="1" bordered>
            <n-descriptions-item label="任务类型">{{ task.type }}</n-descriptions-item>
            <n-descriptions-item label="目标店铺">{{ task.store }}</n-descriptions-item>
            <n-descriptions-item label="触发方式">{{ task.trigger }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ task.createdAt }}</n-descriptions-item>
            <n-descriptions-item label="创建者">{{ task.creator }}</n-descriptions-item>
          </n-descriptions>
        </n-card>

        <n-card title="执行统计" :bordered="false">
          <n-space vertical style="width: 100%">
            <div class="flex items-center justify-between">
              <span class="text-neutral-500">执行次数</span>
              <span class="font-bold">{{ task.executions }} 次</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-500">成功次数</span>
              <span class="font-bold text-green-500">{{ task.successCount }} 次</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-500">失败次数</span>
              <span class="font-bold text-red-500">{{ task.failCount }} 次</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-500">成功率</span>
              <span class="font-bold text-emerald-500">{{ task.successRate }}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-500">平均耗时</span>
              <span class="font-bold">{{ task.avgDuration }}</span>
            </div>
          </n-space>
        </n-card>
      </n-grid-item>

      <!-- 中间：执行进度和日志 -->
      <n-grid-item span="1" l-span="2">
        <n-card title="执行进度" :bordered="false" class="mb-6">
          <div v-if="task.status === '运行中'" class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ currentStep }} / {{ totalSteps }}</span>
              <span class="text-neutral-500">{{ task.progress }}%</span>
            </div>
            <n-progress type="line" :percentage="task.progress" :status="task.progress === 100 ? 'success' : 'process'" :show-indicator="false" />
            <n-steps :current="currentStepIndex">
              <n-step v-for="(step, index) in steps" :key="index" :status="getStepStatus(step.status)" :title="step.name" :description="step.description" />
            </n-steps>
          </div>
          <div v-else class="text-center py-8 text-neutral-500">
            <n-icon :size="48"><component :is="icons.Time" /></n-icon>
            <p class="mt-2">任务未在运行中</p>
          </div>
        </n-card>

        <n-card title="执行日志" :bordered="false">
          <div class="flex items-center justify-between mb-4">
            <n-space>
              <n-select v-model:value="logLevel" :options="logLevelOptions" style="width: 120px" clearable placeholder="日志级别" />
              <n-input v-model:value="logSearch" placeholder="搜索日志..." clearable style="width: 240px">
                <template #prefix>
                  <n-icon><component :is="icons.Search" /></n-icon>
                </template>
              </n-input>
            </n-space>
            <n-space>
              <n-button size="small" @click="clearLogs">
                <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
                清空
              </n-button>
              <n-button size="small" @click="refreshLogs">
                <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
                刷新
              </n-button>
            </n-space>
          </div>
          <n-log :rows="20" :log="logs" class="log-container" :font-size="13" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 历史执行记录 -->
    <n-card title="历史执行记录" :bordered="false" class="mt-6">
      <n-data-table :columns="historyColumns" :data="taskHistory" :pagination="{ pageSize: 10 }" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '任务详情'
const logLevel = ref('')
const logSearch = ref('')

const task = ref({
  id: '12345',
  name: '商品批量发布',
  description: '将商品库中的商品批量发布到抖音店铺',
  status: '运行中',
  priority: '高',
  type: '商品发布',
  store: '抖音旗舰店',
  trigger: '手动触发',
  createdAt: '2024-01-15 14:30:00',
  creator: '张三',
  progress: 45,
  executions: 156,
  successCount: 142,
  failCount: 14,
  successRate: 91.0,
  avgDuration: '2分30秒'
})

const steps = ref([
  { name: '登录店铺', description: '正在登录抖音商家后台', status: 'success' },
  { name: '验证身份', description: '身份验证通过', status: 'success' },
  { name: '上传商品', description: '正在上传商品信息 (5/12)', status: 'process' },
  { name: '提交审核', description: '等待平台审核', status: 'wait' },
  { name: '完成', description: '任务执行完成', status: 'wait' }
])

const currentStepIndex = computed(() => steps.value.findIndex(s => s.status === 'process'))
const currentStep = computed(() => currentStepIndex.value + 1)
const totalSteps = computed(() => steps.value.length)

const logs = ref(`[14:30:00] INFO 任务开始执行
[14:30:01] INFO 正在初始化浏览器
[14:30:03] INFO 正在访问登录页面
[14:30:05] INFO 输入用户名
[14:30:06] INFO 输入密码
[14:30:07] INFO 点击登录按钮
[14:30:10] SUCCESS 登录成功
[14:30:12] INFO 导航到商品发布页面
[14:30:15] INFO 开始处理商品 1/12
[14:30:20] SUCCESS 商品 1 上传成功
[14:30:22] INFO 开始处理商品 2/12
[14:30:27] SUCCESS 商品 2 上传成功
[14:30:29] INFO 开始处理商品 3/12
[14:30:34] SUCCESS 商品 3 上传成功
[14:30:36] INFO 开始处理商品 4/12
[14:30:41] SUCCESS 商品 4 上传成功
[14:30:43] INFO 开始处理商品 5/12
[14:30:48] SUCCESS 商品 5 上传成功
[14:30:50] INFO 开始处理商品 6/12`)

const logLevelOptions = [
  { label: '全部', value: '' },
  { label: 'INFO', value: 'info' },
  { label: 'SUCCESS', value: 'success' },
  { label: 'WARNING', value: 'warning' },
  { label: 'ERROR', value: 'error' }
]

const taskHistory = ref([
  { id: '1', startTime: '2024-01-15 14:30:00', endTime: '2024-01-15 14:35:20', status: '运行中', duration: '进行中', result: '-' },
  { id: '2', startTime: '2024-01-14 10:00:00', endTime: '2024-01-14 10:08:30', status: '成功', duration: '8分30秒', result: '发布12个商品' },
  { id: '3', startTime: '2024-01-13 15:20:00', endTime: '2024-01-13 15:27:15', status: '成功', duration: '7分15秒', result: '发布8个商品' },
  { id: '4', startTime: '2024-01-12 09:15:00', endTime: '2024-01-12 09:22:45', status: '失败', duration: '7分45秒', result: '网络连接超时' },
  { id: '5', startTime: '2024-01-11 11:30:00', endTime: '2024-01-11 11:39:20', status: '成功', duration: '9分20秒', result: '发布15个商品' }
])

const historyColumns = [
  { title: '执行ID', key: 'id', width: 100 },
  { title: '开始时间', key: 'startTime', width: 180 },
  { title: '结束时间', key: 'endTime', width: 180 },
  { title: '状态', key: 'status', width: 100, render: (row: any) => h('n-tag', { type: row.status === '成功' ? 'success' : row.status === '运行中' ? 'warning' : 'error' }, { default: () => row.status }) },
  { title: '耗时', key: 'duration', width: 120 },
  { title: '执行结果', key: 'result', minWidth: 200 },
  { title: '操作', key: 'actions', width: 150, render: (row: any) => h('n-space', null, {
    default: () => [
      h('n-button', { quaternary: true, size: 'small', onClick: () => viewHistory(row) }, { default: () => '查看' }),
      h('n-button', { quaternary: true, size: 'small', onClick: () => retryHistory(row) }, { default: () => '重试' })
    ]
  }) }
]

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '运行中': 'warning',
    '成功': 'success',
    '失败': 'error',
    '已暂停': 'default',
    '等待中': 'info'
  }
  return map[status] || 'default'
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = {
    '高': 'error',
    '中': 'warning',
    '低': 'info'
  }
  return map[priority] || 'default'
}

const getStepStatus = (status: string) => {
  const map: Record<string, any> = {
    'success': 'finish',
    'process': 'process',
    'wait': 'wait',
    'error': 'error'
  }
  return map[status] || 'wait'
}

const runTask = () => {
  message.success('任务已开始')
  task.value.status = '运行中'
}

const pauseTask = () => {
  message.warning('任务已暂停')
  task.value.status = '已暂停'
}

const duplicateTask = () => {
  message.success('任务已复制')
}

const exportTask = () => {
  message.info('正在导出任务...')
}

const clearLogs = () => {
  logs.value = ''
  message.success('日志已清空')
}

const refreshLogs = () => {
  message.success('日志已刷新')
}

const viewHistory = (row: any) => {
  message.info(`查看历史记录: ${row.id}`)
}

const retryHistory = (row: any) => {
  message.success(`正在重试: ${row.id}`)
}
</script>

<style scoped>
.page-container {
  width: 100%;
}

.log-container {
  border-radius: 8px;
  background: #1a1a1a;
}
</style>
