<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="批量执行店铺操作和数据提取">
      <template #extra>
        <n-space>
          <n-button @click="showCreateTask = true">
            <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
            创建批量任务
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 快速操作 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
      <n-grid-item>
        <n-card hoverable @click="batchExtractAll">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <n-icon :size="28" color="#3b82f6"><component :is="icons.CloudDownload" /></n-icon>
            </div>
            <div>
              <div class="font-bold">批量提取</div>
              <div class="text-sm text-neutral-500">提取所有店铺数据</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable @click="stopAllStores">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <n-icon :size="28" color="#ef4444"><component :is="icons.StopCircle" /></n-icon>
            </div>
            <div>
              <div class="font-bold">停止所有</div>
              <div class="text-sm text-neutral-500">停止所有店铺浏览器</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable @click="healthCheck">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <n-icon :size="28" color="#10b981"><component :is="icons.Heart" /></n-icon>
            </div>
            <div>
              <div class="font-bold">健康检查</div>
              <div class="text-sm text-neutral-500">检查所有店铺状态</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable @click="syncStores">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <n-icon :size="28" color="#f59e0b"><component :is="icons.Refresh" /></n-icon>
            </div>
            <div>
              <div class="font-bold">同步店铺</div>
              <div class="text-sm text-neutral-500">刷新店铺列表</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 批量任务列表 -->
    <n-card title="批量任务列表" class="mb-6">
      <template #header-extra>
        <n-space>
          <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="筛选状态" clearable style="width: 150px" />
          <n-select v-model:value="filterType" :options="typeOptions" placeholder="筛选类型" clearable style="width: 150px" />
        </n-space>
      </template>
      
      <n-data-table
        :columns="taskColumns"
        :data="tasks"
        :pagination="pagination"
        :row-class-name="getRowClassName"
      >
        <template #table-row="props">
          <tr :class="getRowClassName({ index: props.index })">
            <td>
              <n-checkbox :checked="props.row.selected" @update:checked="toggleSelect(props.row)" />
            </td>
            <td>
              <div class="flex items-center gap-2">
                <n-icon :size="18" :color="getTaskIconColor(props.row.type)">
                  <component :is="getTaskIcon(props.row.type)" />
                </n-icon>
                <span class="font-medium">{{ props.row.name }}</span>
              </div>
            </td>
            <td>
              <n-tag :type="getTypeTag(props.row.type)" size="small">
                {{ props.row.type }}
              </n-tag>
            </td>
            <td>
              <n-tag :type="getStatusTag(props.row.status)" size="small">
                {{ props.row.status }}
              </n-tag>
            </td>
            <td>
              <n-progress
                v-if="props.row.status === '进行中'"
                type="line"
                :percentage="props.row.progress"
                :show-indicator="true"
                :height="20"
              />
              <span v-else>{{ props.row.progress }}%</span>
            </td>
            <td>{{ props.row.storeCount }} 家店铺</td>
            <td>{{ props.row.createdAt }}</td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="viewTask(props.row)">
                  <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" @click="editTask(props.row)">
                  <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                </n-button>
                <n-button v-if="props.row.status === '待执行'" quaternary size="small" @click="executeTask(props.row)">
                  <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                </n-button>
                <n-button v-if="props.row.status === '进行中'" quaternary size="small" type="error" @click="stopTask(props.row)">
                  <template #icon><n-icon><component :is="icons.Stop" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" type="error" @click="deleteTask(props.row)">
                  <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
                </n-button>
              </n-space>
            </td>
          </tr>
        </template>
      </n-data-table>
      
      <div class="mt-4 flex items-center justify-between">
        <n-space>
          <n-checkbox v-model:checked="selectAll" @update:checked="handleSelectAll">全选</n-checkbox>
          <n-button size="small" @click="batchExecute">批量执行</n-button>
          <n-button size="small" type="error" @click="batchDelete">批量删除</n-button>
        </n-space>
        <n-button type="primary" @click="showCreateTask = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          新建任务
        </n-button>
      </div>
    </n-card>

    <!-- 店铺状态总览 -->
    <n-card title="店铺状态总览">
      <n-grid :x-gap="16" :y-gap="16" cols="1 s:2 m:3 l:4">
        <n-grid-item v-for="store in stores" :key="store.name">
          <n-card size="small" hoverable>
            <div class="flex items-center justify-between mb-3">
              <div class="font-medium">{{ store.name }}</div>
              <n-tag :type="store.status === '运行中' ? 'success' : 'default'" size="small">
                {{ store.status }}
              </n-tag>
            </div>
            <div class="text-sm text-neutral-500 mb-3">
              <div class="flex items-center gap-2 mb-1">
                <n-icon :size="14"><component :is="icons.Time" /></n-icon>
                <span>运行时长: {{ store.uptime }}</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <n-icon :size="14"><component :is="icons.CloudDone" /></n-icon>
                <span>最后同步: {{ store.lastSync }}</span>
              </div>
            </div>
            <n-space>
              <n-button size="tiny" @click="startStore(store)" :disabled="store.status === '运行中'">
                <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                启动
              </n-button>
              <n-button size="tiny" type="error" @click="stopStore(store)" :disabled="store.status !== '运行中'">
                <template #icon><n-icon><component :is="icons.Stop" /></n-icon></template>
                停止
              </n-button>
              <n-button size="tiny" @click="restartStore(store)">
                <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
                重启
              </n-button>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-card>

    <!-- 创建任务弹窗 -->
    <n-modal v-model:show="showCreateTask" preset="card" title="创建批量任务" style="width: 600px">
      <n-form :model="newTask" label-placement="left" label-width="120px">
        <n-form-item label="任务名称" required>
          <n-input v-model:value="newTask.name" placeholder="请输入任务名称" />
        </n-form-item>
        <n-form-item label="任务类型" required>
          <n-select v-model:value="newTask.type" :options="taskTypeOptions" placeholder="选择任务类型" />
        </n-form-item>
        <n-form-item label="选择店铺">
          <n-checkbox-group v-model:value="newTask.stores">
            <n-space vertical>
              <n-checkbox v-for="store in stores" :key="store.name" :value="store.name" :label="store.name" />
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="执行时间">
          <n-select v-model:value="newTask.scheduleType" :options="scheduleOptions" placeholder="选择执行时间" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="newTask.remark" type="textarea" placeholder="请输入备注信息" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateTask = false">取消</n-button>
          <n-button type="primary" @click="createTask">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '批量操作'
const showCreateTask = ref(false)
const selectAll = ref(false)
const filterStatus = ref('')
const filterType = ref('')

const statusOptions = [
  { label: '待执行', value: '待执行' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
  { label: '已失败', value: '已失败' }
]

const typeOptions = [
  { label: '数据提取', value: '数据提取' },
  { label: '批量发布', value: '批量发布' },
  { label: '数据同步', value: '数据同步' }
]

const taskTypeOptions = [
  { label: '销售数据提取', value: '销售数据提取' },
  { label: '客服数据提取', value: '客服数据提取' },
  { label: '推广数据提取', value: '推广数据提取' },
  { label: '批量商品发布', value: '批量商品发布' }
]

const scheduleOptions = [
  { label: '立即执行', value: 'now' },
  { label: '定时执行', value: 'schedule' },
  { label: '每天定时', value: 'daily' },
  { label: '每周定时', value: 'weekly' }
]

const newTask = ref({
  name: '',
  type: '',
  stores: [],
  scheduleType: 'now',
  remark: ''
})

const tasks = ref([
  { id: 1, name: '每日销售数据提取', type: '数据提取', status: '进行中', progress: 65, storeCount: 3, createdAt: '2024-01-15 09:00', selected: false },
  { id: 2, name: '客服绩效周报', type: '数据提取', status: '待执行', progress: 0, storeCount: 2, createdAt: '2024-01-14 18:30', selected: false },
  { id: 3, name: '新品批量发布', type: '批量发布', status: '已完成', progress: 100, storeCount: 3, createdAt: '2024-01-14 10:00', selected: false },
  { id: 4, name: '推广数据同步', type: '数据同步', status: '已失败', progress: 45, storeCount: 1, createdAt: '2024-01-13 15:20', selected: false }
])

const stores = ref([
  { name: 'XIDOO隐形眼镜旗舰店', status: '运行中', uptime: '2小时30分', lastSync: '5分钟前' },
  { name: '瞳粉美瞳专营店', status: '运行中', uptime: '1小时15分', lastSync: '3分钟前' },
  { name: 'JEWELRY DOLL旗舰店', status: '已停止', uptime: '-', lastSync: '2小时前' }
])

const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const taskColumns = [
  { type: 'selection', width: 50 },
  { title: '任务名称', key: 'name', width: 250 },
  { title: '类型', key: 'type', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '进度', key: 'progress', width: 180 },
  { title: '店铺数', key: 'storeCount', width: 100 },
  { title: '创建时间', key: 'createdAt', width: 160 },
  { title: '操作', key: 'actions', width: 250, fixed: 'right' }
]

const getRowClassName = ({ index }: { index: number }) => {
  const task = tasks.value[index]
  if (task?.status === '已失败') return 'error-row'
  if (task?.status === '进行中') return 'process-row'
  return ''
}

const getTaskIcon = (type: string) => {
  const map: Record<string, any> = {
    '数据提取': icons.CloudDownload,
    '批量发布': icons.CloudUpload,
    '数据同步': icons.Refresh
  }
  return map[type] || icons.List
}

const getTaskIconColor = (type: string) => {
  const map: Record<string, string> = {
    '数据提取': '#3b82f6',
    '批量发布': '#10b981',
    '数据同步': '#f59e0b'
  }
  return map[type] || '#6b7280'
}

const getTypeTag = (type: string) => {
  const map: Record<string, any> = {
    '数据提取': 'info',
    '批量发布': 'success',
    '数据同步': 'warning'
  }
  return map[type] || 'default'
}

const getStatusTag = (status: string) => {
  const map: Record<string, any> = {
    '待执行': 'default',
    '进行中': 'info',
    '已完成': 'success',
    '已失败': 'error'
  }
  return map[status] || 'default'
}

const toggleSelect = (task: any) => {
  task.selected = !task.selected
}

const handleSelectAll = (checked: boolean) => {
  tasks.value.forEach(task => {
    task.selected = checked
  })
}

const batchExecute = () => {
  const selected = tasks.value.filter(t => t.selected)
  if (selected.length === 0) {
    message.warning('请先选择要执行的任务')
    return
  }
  message.success(`开始批量执行 ${selected.length} 个任务`)
}

const batchDelete = () => {
  const selected = tasks.value.filter(t => t.selected)
  if (selected.length === 0) {
    message.warning('请先选择要删除的任务')
    return
  }
  message.success(`已删除 ${selected.length} 个任务`)
}

const batchExtractAll = () => {
  message.info('开始批量提取所有店铺数据...')
}

const stopAllStores = () => {
  message.warning('正在停止所有店铺浏览器...')
}

const healthCheck = () => {
  message.success('健康检查完成，所有店铺状态正常')
}

const syncStores = () => {
  message.success('店铺列表已同步')
}

const viewTask = (task: any) => {
  message.info(`查看任务: ${task.name}`)
}

const editTask = (task: any) => {
  message.info(`编辑任务: ${task.name}`)
}

const executeTask = (task: any) => {
  task.status = '进行中'
  message.success(`任务已启动: ${task.name}`)
}

const stopTask = (task: any) => {
  task.status = '待执行'
  task.progress = 0
  message.warning(`任务已停止: ${task.name}`)
}

const deleteTask = (task: any) => {
  const index = tasks.value.findIndex(t => t.id === task.id)
  if (index > -1) {
    tasks.value.splice(index, 1)
    message.success(`已删除任务: ${task.name}`)
  }
}

const startStore = (store: any) => {
  store.status = '运行中'
  message.success(`已启动: ${store.name}`)
}

const stopStore = (store: any) => {
  store.status = '已停止'
  message.warning(`已停止: ${store.name}`)
}

const restartStore = (store: any) => {
  store.status = '运行中'
  message.success(`已重启: ${store.name}`)
}

const createTask = () => {
  if (!newTask.value.name || !newTask.value.type) {
    message.warning('请填写完整的任务信息')
    return
  }
  const task = {
    id: tasks.value.length + 1,
    name: newTask.value.name,
    type: newTask.value.type,
    status: newTask.value.scheduleType === 'now' ? '进行中' : '待执行',
    progress: newTask.value.scheduleType === 'now' ? 0 : 0,
    storeCount: newTask.value.stores.length,
    createdAt: new Date().toLocaleString(),
    selected: false
  }
  tasks.value.unshift(task)
  showCreateTask.value = false
  newTask.value = { name: '', type: '', stores: [], scheduleType: 'now', remark: '' }
  message.success('任务创建成功')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}

:deep(.error-row) {
  background-color: #fef2f2;
}

:deep(.process-row) {
  background-color: #eff6ff;
}
</style>
