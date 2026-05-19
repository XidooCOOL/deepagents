<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理定时任务">
      <template #extra>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          创建定时任务
        </n-button>
      </template>
    </n-page-header>

    <!-- 定时任务列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="tasks"
        :pagination="{ pageSize: 10 }"
      >
        <template #table-row>
          <tr v-for="task in tasks" :key="task.id">
            <td>
              <div class="flex items-center gap-3">
                <div>
                  <div class="font-medium">{{ task.name }}</div>
                  <div class="text-xs text-neutral-500">{{ task.description }}</div>
                </div>
              </div>
            </td>
            <td>{{ task.store }}</td>
            <td>{{ task.type }}</td>
            <td>
              <n-tag type="default">{{ task.cron }}</n-tag>
            </td>
            <td>
              <n-tag :type="task.status === '运行中' ? 'success' : 'default'">
                {{ task.status }}
              </n-tag>
            </td>
            <td>{{ task.lastRun }}</td>
            <td>{{ task.nextRun }}</td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="handleRun(task)">
                  <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" @click="handleToggle(task)">
                  <template #icon><n-icon><component :is="task.status === '运行中' ? icons.Pause : icons.Play" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" type="error">
                  <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
                </n-button>
              </n-space>
            </td>
          </tr>
        </template>
      </n-data-table>
    </n-card>

    <!-- 创建定时任务弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建定时任务" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="任务名称">
          <n-input v-model:value="form.name" placeholder="请输入任务名称" />
        </n-form-item>
        <n-form-item label="任务描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入任务描述" />
        </n-form-item>
        <n-form-item label="选择店铺">
          <n-select v-model:value="form.store" :options="storeOptions" placeholder="请选择店铺" />
        </n-form-item>
        <n-form-item label="任务类型">
          <n-select v-model:value="form.type" :options="taskTypeOptions" placeholder="请选择任务类型" />
        </n-form-item>
        <n-form-item label="Cron 表达式">
          <n-input v-model:value="form.cron" placeholder="例如: 0 9 * * *" />
        </n-form-item>
        <n-form-item label="预设时间">
          <n-radio-group v-model:value="form.preset" @update:value="handlePresetChange">
            <n-space>
              <n-radio value="daily">每天 09:00</n-radio>
              <n-radio value="hourly">每小时</n-radio>
              <n-radio value="custom">自定义</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '定时任务'
const showCreateModal = ref(false)

const form = reactive({
  name: '',
  description: '',
  store: '',
  type: '',
  cron: '',
  preset: 'daily'
})

const storeOptions = [
  { label: '抖音店铺', value: 1 },
  { label: '拼多多测试店', value: 2 }
]

const taskTypeOptions = [
  { label: '商品发布', value: 'publish' },
  { label: '数据抓取', value: 'fetch_data' },
  { label: '数据同步', value: 'sync_data' }
]

const columns = [
  { title: '任务信息', key: 'name', minWidth: 200 },
  { title: '店铺', key: 'store', width: 150 },
  { title: '类型', key: 'type', width: 120 },
  { title: 'Cron', key: 'cron', width: 150 },
  { title: '状态', key: 'status', width: 100 },
  { title: '上次执行', key: 'lastRun', width: 180 },
  { title: '下次执行', key: 'nextRun', width: 180 },
  { title: '操作', key: 'actions', width: 200 }
]

const tasks = ref([
  { id: 1, name: '每日数据同步', description: '每天同步销售数据', store: '抖音店铺', type: '数据同步', cron: '0 9 * * *', status: '运行中', lastRun: '2024-01-01 09:00:00', nextRun: '2024-01-02 09:00:00' },
  { id: 2, name: '订单数据抓取', description: '每小时抓取新订单', store: '抖音店铺', type: '数据抓取', cron: '0 * * * *', status: '运行中', lastRun: '2024-01-01 14:00:00', nextRun: '2024-01-01 15:00:00' },
  { id: 3, name: '库存监控', description: '监控库存告警', store: '拼多多测试店', type: '商品发布', cron: '0 */6 * * *', status: '已暂停', lastRun: '2024-01-01 12:00:00', nextRun: '-' }
])

const handlePresetChange = (value: string) => {
  if (value === 'daily') {
    form.cron = '0 9 * * *'
  } else if (value === 'hourly') {
    form.cron = '0 * * * *'
  }
}

const handleCreate = () => {
  message.success('定时任务创建成功')
  showCreateModal.value = false
}

const handleRun = (task: any) => {
  message.info(`正在执行任务: ${task.name}`)
}

const handleToggle = (task: any) => {
  task.status = task.status === '运行中' ? '已暂停' : '运行中'
  message.success(`任务${task.status === '运行中' ? '已启动' : '已暂停'}`)
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
