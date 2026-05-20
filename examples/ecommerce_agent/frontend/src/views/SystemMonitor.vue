<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="监控后端服务状态和系统健康">
      <template #extra>
        <n-space>
          <n-button @click="refreshStatus">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            刷新状态
          </n-button>
          <n-button type="primary" @click="runHealthCheck">
            <template #icon><n-icon><component :is="icons.Heart" /></n-icon></template>
            健康检查
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 整体状态 -->
    <n-card class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-neutral-500">系统状态</div>
          <div class="flex items-center gap-2 mt-1">
            <n-tag :type="systemStatus.type" size="large">
              {{ systemStatus.label }}
            </n-tag>
            <span class="text-sm text-neutral-500">运行时间: {{ systemStatus.uptime }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-neutral-800">{{ activeConnections }}</div>
            <div class="text-sm text-neutral-500">活跃连接</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-neutral-800">{{ totalRequests }}</div>
            <div class="text-sm text-neutral-500">总请求数</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-neutral-800">{{ avgResponseTime }}ms</div>
            <div class="text-sm text-neutral-500">平均响应</div>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 服务状态卡片 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:3" class="mb-6">
      <n-grid-item v-for="service in services" :key="service.name">
        <n-card :class="{ 'border-red-500': service.status === 'down' }">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="service.bgClass">
                <n-icon :size="20" :color="service.iconColor"><component :is="service.icon" /></n-icon>
              </div>
              <div>
                <div class="font-bold">{{ service.name }}</div>
                <div class="text-sm text-neutral-500">{{ service.description }}</div>
              </div>
            </div>
            <n-tag :type="service.status === 'up' ? 'success' : 'error'" size="small">
              {{ service.status === 'up' ? '运行中' : '已停止' }}
            </n-tag>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-neutral-500">端口</span>
              <span>{{ service.port }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">延迟</span>
              <span>{{ service.latency }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">版本</span>
              <span>{{ service.version }}</span>
            </div>
          </div>
          <div v-if="service.status === 'down'" class="mt-3">
            <n-button size="small" type="primary" @click="startService(service)">
              <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
              启动服务
            </n-button>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 资源使用情况 -->
    <n-card title="资源使用情况" class="mb-6">
      <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4">
        <n-grid-item>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-neutral-500">CPU 使用率</span>
              <span class="font-bold">{{ cpuUsage }}%</span>
            </div>
            <n-progress type="line" :percentage="cpuUsage" :show-indicator="false" :height="8" />
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-neutral-500">内存使用</span>
              <span class="font-bold">{{ memoryUsage }}%</span>
            </div>
            <n-progress type="line" :percentage="memoryUsage" :show-indicator="false" :height="8" />
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-neutral-500">磁盘空间</span>
              <span class="font-bold">{{ diskUsage }}%</span>
            </div>
            <n-progress type="line" :percentage="diskUsage" :show-indicator="false" :height="8" />
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-neutral-500">网络带宽</span>
              <span class="font-bold">{{ networkUsage }}%</span>
            </div>
            <n-progress type="line" :percentage="networkUsage" :show-indicator="false" :height="8" />
          </div>
        </n-grid-item>
      </n-grid>
    </n-card>

    <!-- 数据库状态 -->
    <n-card title="数据库连接" class="mb-6">
      <n-space vertical>
        <n-descriptions :column="1" bordered>
          <n-descriptions-item label="数据库类型">
            <n-tag type="info">PostgreSQL</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="连接状态">
            <n-tag type="success">已连接</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="连接数">
            {{ dbConnections.active }} / {{ dbConnections.max }}
          </n-descriptions-item>
          <n-descriptions-item label="响应时间">
            {{ dbResponseTime }}ms
          </n-descriptions-item>
          <n-descriptions-item label="数据库大小">
            {{ dbSize }}
          </n-descriptions-item>
        </n-descriptions>
        <n-space>
          <n-button size="small" @click="testDbConnection">
            <template #icon><n-icon><component :is="icons.Cube" /></n-icon></template>
            测试连接
          </n-button>
          <n-button size="small" @click="optimizeDb">
            <template #icon><n-icon><component :is="icons.Settings" /></n-icon></template>
            优化数据库
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <!-- 最近日志 -->
    <n-card title="最近日志">
      <template #header-extra>
        <n-button size="small" @click="viewFullLogs">
          <template #icon><n-icon><component :is="icons.FileTray" /></n-icon></template>
          查看完整日志
        </n-button>
      </template>
      <n-log :rows="20" :log="recentLogs" class="log-container" :font-size="13" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '系统监控'

const systemStatus = ref({
  type: 'success' as const,
  label: '运行正常',
  uptime: '2 天 14 小时 32 分'
})

const activeConnections = ref(23)
const totalRequests = ref(12856)
const avgResponseTime = ref(45)

const cpuUsage = ref(42)
const memoryUsage = ref(68)
const diskUsage = ref(75)
const networkUsage = ref(35)

const dbConnections = ref({
  active: 8,
  max: 20
})
const dbResponseTime = ref(12)
const dbSize = ref('2.4 GB')

const services = ref([
  { name: 'API 服务', description: '主 REST API', port: '8000', latency: '12ms', version: '1.0.0', status: 'up', icon: icons.Server, bgClass: 'bg-green-50', iconColor: '#10b981' },
  { name: 'WebSocket 服务', description: '实时通信', port: '8001', latency: '5ms', version: '1.0.0', status: 'up', icon: icons.Radio, bgClass: 'bg-blue-50', iconColor: '#3b82f6' },
  { name: '定时任务服务', description: 'Scheduler', port: '-', latency: '3ms', version: '1.0.0', status: 'up', icon: icons.Time, bgClass: 'bg-orange-50', iconColor: '#f59e0b' },
  { name: '向量数据库', description: 'Vector Store', port: '6333', latency: '8ms', version: '1.0.0', status: 'up', icon: icons.Cube, bgClass: 'bg-purple-50', iconColor: '#8b5cf6' },
  { name: '浏览器服务', description: 'Playwright', port: '-', latency: '45ms', version: '1.0.0', status: 'down', icon: icons.Globe, bgClass: 'bg-red-50', iconColor: '#ef4444' },
  { name: 'Redis 缓存', description: 'Cache Service', port: '6379', latency: '2ms', version: '7.0', status: 'up', icon: icons.Cube, bgClass: 'bg-emerald-50', iconColor: '#10b981' }
])

const recentLogs = ref(`[2024-01-15 14:30:00] INFO  API 请求: /api/pdd/stores
[2024-01-15 14:30:01] INFO  数据库查询成功
[2024-01-15 14:30:02] INFO  API 请求: /api/tasks
[2024-01-15 14:30:05] WARN  浏览器服务未响应
[2024-01-15 14:30:08] INFO  API 请求: /api/orders
[2024-01-15 14:30:10] INFO  定时任务执行完成
[2024-01-15 14:30:15] ERROR 连接超时，正在重试
[2024-01-15 14:30:16] INFO  连接恢复成功
[2024-01-15 14:30:20] INFO  API 请求: /api/products
[2024-01-15 14:30:25] INFO  缓存命中: 85%
[2024-01-15 14:30:30] INFO  健康检查通过`)

const refreshStatus = () => {
  message.success('状态已刷新')
}

const runHealthCheck = () => {
  message.info('正在进行健康检查...')
  setTimeout(() => {
    message.success('健康检查完成，所有服务运行正常')
  }, 1500)
}

const startService = (service: any) => {
  service.status = 'up'
  service.bgClass = 'bg-green-50'
  service.iconColor = '#10b981'
  message.success(`${service.name} 已启动`)
}

const testDbConnection = () => {
  message.success('数据库连接测试成功')
}

const optimizeDb = () => {
  message.info('正在优化数据库...')
}

const viewFullLogs = () => {
  message.info('查看完整日志')
}

onMounted(() => {
  // 模拟实时更新
  setInterval(() => {
    cpuUsage.value = Math.floor(Math.random() * 30) + 30
    memoryUsage.value = Math.floor(Math.random() * 20) + 60
    activeConnections.value = Math.floor(Math.random() * 10) + 20
  }, 3000)
})
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
