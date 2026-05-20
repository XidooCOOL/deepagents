<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="测试后端核心 API 接口">
      <template #extra>
        <n-space>
          <n-button @click="clearHistory">
            <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
            清空历史
          </n-button>
          <n-button type="primary" @click="runAllTests">
            <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
            运行所有测试
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-grid :x-gap="20" :y-gap="20" cols="1 l:3">
      <!-- 左侧：API 列表 -->
      <n-grid-item span="1" l-span="1">
        <n-card title="API 接口列表">
          <n-tabs v-model:value="activeCategory" type="line" class="mb-4">
            <n-tab-pane name="pdd" tab="拼多多" />
            <n-tab-pane name="tasks" tab="任务管理" />
            <n-tab-pane name="products" tab="商品管理" />
            <n-tab-pane name="orders" tab="订单管理" />
            <n-tab-pane name="system" tab="系统管理" />
          </n-tabs>
          <n-list>
            <n-list-item
              v-for="api in filteredApis"
              :key="api.path"
              :clickable="true"
              :class="{ 'bg-gray-100 dark:bg-gray-800': selectedApi?.path === api.path }"
              @click="selectApi(api)"
            >
              <div class="flex items-center gap-3 w-full">
                <n-tag :type="getMethodTag(api.method)" size="small" style="width: 70px">
                  {{ api.method }}
                </n-tag>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">{{ api.name }}</div>
                  <div class="text-xs text-neutral-500">{{ api.path }}</div>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>

      <!-- 右侧：测试区域 -->
      <n-grid-item span="1" l-span="2">
        <n-card :title="selectedApi?.name || '选择 API'" :bordered="false">
          <!-- 请求配置 -->
          <div v-if="selectedApi" class="space-y-6">
            <div class="flex items-center gap-4">
              <n-tag :type="getMethodTag(selectedApi.method)" size="large" style="width: 80px">
                {{ selectedApi.method }}
              </n-tag>
              <n-input :value="apiUrl" disabled class="flex-1" />
              <n-button @click="copyUrl">
                <template #icon><n-icon><component :is="icons.Copy" /></n-icon></template>
              </n-button>
            </div>

            <!-- 请求参数 -->
            <n-form :model="requestParams" label-placement="left" label-width="100px">
              <n-form-item v-for="param in selectedApi.params" :key="param.name" :label="param.name" :required="param.required">
                <n-input v-model:value="requestParams[param.name]" :placeholder="param.description" />
              </n-form-item>
              <n-form-item v-if="selectedApi.method === 'POST'" label="请求体">
                <n-input v-model:value="requestBody" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" placeholder="JSON 请求体" class="font-mono text-sm" />
              </n-form-item>
            </n-form>

            <!-- 发送按钮 -->
            <div class="flex items-center justify-between">
              <n-space>
                <n-tag v-if="lastResponseTime" size="small">
                  响应时间: {{ lastResponseTime }}ms
                </n-tag>
              </n-space>
              <n-space>
                <n-button @click="resetParams">
                  <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
                  重置参数
                </n-button>
                <n-button type="primary" @click="sendRequest" :loading="isLoading">
                  <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
                  发送请求
                </n-button>
              </n-space>
            </div>

            <!-- 响应结果 -->
            <n-divider />
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">响应结果</span>
                <n-tag :type="responseStatus === 200 ? 'success' : 'error'" size="small">
                  {{ responseStatus }}
                </n-tag>
              </div>
              <n-input v-model:value="responseBody" type="textarea" :autosize="{ minRows: 8, maxRows: 20 }" disabled class="font-mono text-sm bg-gray-50 dark:bg-gray-800" />
            </div>
          </div>

          <div v-else class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <n-icon :size="32" color="#a3a3a3"><component :is="icons.List" /></n-icon>
            </div>
            <p class="text-neutral-500">请从左侧选择一个 API 接口进行测试</p>
          </div>
        </n-card>

        <!-- 测试历史 -->
        <n-card title="测试历史" class="mt-6">
          <n-data-table
            :columns="historyColumns"
            :data="history"
            :pagination="{ pageSize: 5 }"
          >
            <template #table-row="props">
              <tr>
                <td>
                  <n-tag :type="getMethodTag(props.row.method)" size="small">
                    {{ props.row.method }}
                  </n-tag>
                </td>
                <td>{{ props.row.name }}</td>
                <td>{{ props.row.path }}</td>
                <td>
                  <n-tag :type="props.row.status === 200 ? 'success' : 'error'" size="small">
                    {{ props.row.status }}
                  </n-tag>
                </td>
                <td>{{ props.row.time }}ms</td>
                <td>{{ props.row.timestamp }}</td>
                <td>
                  <n-button size="small" @click="replayRequest(props.row)">
                    <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                  </n-button>
                </td>
              </tr>
            </template>
          </n-data-table>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 测试报告弹窗 -->
    <n-modal v-model:show="showReport" preset="card" title="测试报告" style="width: 800px">
      <n-card title="测试结果汇总">
        <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4">
          <n-grid-item>
            <n-card>
              <div class="text-center">
                <div class="text-3xl font-bold text-emerald-500">{{ testResults.passed }}</div>
                <div class="text-sm text-neutral-500 mt-1">通过</div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="text-center">
                <div class="text-3xl font-bold text-red-500">{{ testResults.failed }}</div>
                <div class="text-sm text-neutral-500 mt-1">失败</div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="text-center">
                <div class="text-3xl font-bold text-neutral-800">{{ testResults.total }}</div>
                <div class="text-sm text-neutral-500 mt-1">总测试数</div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-500">{{ testResults.avgTime }}ms</div>
                <div class="text-sm text-neutral-500 mt-1">平均响应</div>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>

        <n-divider />

        <n-card title="测试详情">
          <n-timeline>
            <n-timeline-item
              v-for="result in testResults.details"
              :key="result.name"
              :type="result.passed ? 'success' : 'error'"
              :title="result.name"
            >
              <div class="flex items-center justify-between">
                <span>{{ result.path }}</span>
                <span class="text-sm">{{ result.time }}ms</span>
              </div>
            </n-timeline-item>
          </n-timeline>
        </n-card>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = 'API 测试'
const activeCategory = ref('pdd')
const selectedApi = ref<any>(null)
const isLoading = ref(false)
const responseStatus = ref(0)
const responseBody = ref('')
const requestBody = ref('')
const lastResponseTime = ref(0)
const showReport = ref(false)

const apiUrl = computed(() => {
  if (!selectedApi.value) return ''
  return `http://localhost:8000${selectedApi.value.path}`
})

const requestParams = ref({})

const apis = ref([
  { category: 'pdd', name: '获取店铺列表', path: '/api/pdd/stores', method: 'GET', params: [] },
  { category: 'pdd', name: '添加店铺', path: '/api/pdd/stores', method: 'POST', params: [{ name: 'name', required: true, description: '店铺名称' }, { name: 'type', required: true, description: '店铺类型' }] },
  { category: 'pdd', name: '停止店铺', path: '/api/pdd/stores/:name/stop', method: 'POST', params: [{ name: 'name', required: true, description: '店铺名称' }] },
  { category: 'pdd', name: '提取销售数据', path: '/api/pdd/extract/sales', method: 'POST', params: [{ name: 'storeName', required: true, description: '店铺名称' }, { name: 'startDate', required: false, description: '开始日期' }, { name: 'endDate', required: false, description: '结束日期' }] },
  { category: 'pdd', name: '提取客服数据', path: '/api/pdd/extract/service', method: 'POST', params: [{ name: 'storeName', required: true, description: '店铺名称' }] },
  { category: 'pdd', name: '健康检查', path: '/api/pdd/health', method: 'GET', params: [] },
  
  { category: 'tasks', name: '获取任务列表', path: '/api/tasks', method: 'GET', params: [{ name: 'status', required: false, description: '任务状态' }] },
  { category: 'tasks', name: '创建任务', path: '/api/tasks', method: 'POST', params: [{ name: 'name', required: true, description: '任务名称' }, { name: 'type', required: true, description: '任务类型' }] },
  { category: 'tasks', name: '获取任务详情', path: '/api/tasks/:id', method: 'GET', params: [{ name: 'id', required: true, description: '任务ID' }] },
  { category: 'tasks', name: '执行任务', path: '/api/tasks/:id/run', method: 'POST', params: [{ name: 'id', required: true, description: '任务ID' }] },
  
  { category: 'products', name: '获取商品列表', path: '/api/products', method: 'GET', params: [] },
  { category: 'products', name: '获取商品详情', path: '/api/products/:id', method: 'GET', params: [{ name: 'id', required: true, description: '商品ID' }] },
  { category: 'products', name: '创建商品', path: '/api/products', method: 'POST', params: [{ name: 'name', required: true, description: '商品名称' }, { name: 'price', required: true, description: '价格' }] },
  
  { category: 'orders', name: '获取订单列表', path: '/api/orders', method: 'GET', params: [{ name: 'status', required: false, description: '订单状态' }] },
  { category: 'orders', name: '获取订单详情', path: '/api/orders/:id', method: 'GET', params: [{ name: 'id', required: true, description: '订单ID' }] },
  
  { category: 'system', name: '系统状态', path: '/api/status', method: 'GET', params: [] },
  { category: 'system', name: '触发任务', path: '/api/realtime/trigger', method: 'POST', params: [{ name: 'task', required: true, description: '任务名称' }] }
])

const filteredApis = computed(() => apis.value.filter(api => api.category === activeCategory.value))

const history = ref([
  { id: 1, name: '获取店铺列表', path: '/api/pdd/stores', method: 'GET', status: 200, time: 12, timestamp: '2024-01-15 14:30:00' },
  { id: 2, name: '提取销售数据', path: '/api/pdd/extract/sales', method: 'POST', status: 200, time: 245, timestamp: '2024-01-15 14:28:00' },
  { id: 3, name: '获取任务列表', path: '/api/tasks', method: 'GET', status: 500, time: 45, timestamp: '2024-01-15 14:25:00' }
])

const historyColumns = [
  { title: '方法', key: 'method', width: 80 },
  { title: '名称', key: 'name', width: 150 },
  { title: '路径', key: 'path', width: 200 },
  { title: '状态', key: 'status', width: 80 },
  { title: '耗时', key: 'time', width: 80 },
  { title: '时间', key: 'timestamp', width: 180 },
  { title: '操作', key: 'actions', width: 80 }
]

const testResults = ref({
  passed: 0,
  failed: 0,
  total: 0,
  avgTime: 0,
  details: []
})

const getMethodTag = (method: string) => {
  const map: Record<string, any> = {
    'GET': 'success',
    'POST': 'info',
    'PUT': 'warning',
    'DELETE': 'error'
  }
  return map[method] || 'default'
}

const selectApi = (api: any) => {
  selectedApi.value = api
  requestParams.value = {}
  api.params.forEach((param: any) => {
    requestParams.value[param.name] = ''
  })
  requestBody.value = ''
  responseBody.value = ''
  responseStatus.value = 0
}

const copyUrl = () => {
  navigator.clipboard.writeText(apiUrl.value)
  message.success('URL 已复制')
}

const resetParams = () => {
  requestParams.value = {}
  selectedApi.value?.params.forEach((param: any) => {
    requestParams.value[param.name] = ''
  })
  requestBody.value = ''
}

const sendRequest = async () => {
  isLoading.value = true
  const startTime = Date.now()
  
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  
  const status = Math.random() > 0.8 ? 500 : 200
  responseStatus.value = status
  
  if (status === 200) {
    responseBody.value = JSON.stringify({
      code: 200,
      message: 'success',
      data: {
        stores: ['XIDOO隐形眼镜旗舰店', '瞳粉美瞳专营店', 'JEWELRY DOLL旗舰店'],
        count: 3
      }
    }, null, 2)
  } else {
    responseBody.value = JSON.stringify({
      code: 500,
      message: 'Internal Server Error',
      error: 'Something went wrong'
    }, null, 2)
  }
  
  lastResponseTime.value = Date.now() - startTime
  
  history.value.unshift({
    id: Date.now(),
    name: selectedApi.value.name,
    path: selectedApi.value.path,
    method: selectedApi.value.method,
    status,
    time: lastResponseTime.value,
    timestamp: new Date().toLocaleString()
  })
  
  isLoading.value = false
  message.success('请求已完成')
}

const replayRequest = (item: any) => {
  const api = apis.value.find(a => a.path === item.path)
  if (api) {
    selectApi(api)
    sendRequest()
  }
}

const clearHistory = () => {
  history.value = []
  message.success('历史记录已清空')
}

const runAllTests = async () => {
  message.info('正在运行所有测试...')
  testResults.value = { passed: 0, failed: 0, total: apis.value.length, avgTime: 0, details: [] }
  
  let totalTime = 0
  for (const api of apis.value) {
    const startTime = Date.now()
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
    const time = Date.now() - startTime
    totalTime += time
    
    const passed = Math.random() > 0.15
    testResults.value.passed += passed ? 1 : 0
    testResults.value.failed += passed ? 0 : 1
    
    testResults.value.details.push({
      name: api.name,
      path: api.path,
      passed,
      time
    })
  }
  
  testResults.value.avgTime = Math.round(totalTime / apis.value.length)
  showReport.value = true
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
