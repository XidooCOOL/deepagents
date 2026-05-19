<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理和配置自动化工作流">
      <template #extra>
        <n-space>
          <n-button @click="importWorkflow">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导入
          </n-button>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
            创建工作流
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 工作流类型选项卡 -->
    <n-card class="mb-6">
      <n-tabs v-model:value="activeTab" type="segment">
        <n-tab-pane name="all" tab="全部 ({{ workflows.length }})" />
        <n-tab-pane name="active" tab="运行中 ({{ activeWorkflows.length }})" />
        <n-tab-pane name="inactive" tab="已停止 ({{ inactiveWorkflows.length }})" />
      </n-tabs>
    </n-card>

    <!-- 工作流列表 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 l:3">
      <n-grid-item v-for="workflow in filteredWorkflows" :key="workflow.id">
        <n-card hoverable :bordered="false" class="workflow-card">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="getCategoryBg(workflow.category)">
                <n-icon :size="24" :color="getCategoryColor(workflow.category)"><component :is="getCategoryIcon(workflow.category)" /></n-icon>
              </div>
              <div>
                <div class="font-bold text-lg">{{ workflow.name }}</div>
                <div class="text-sm text-neutral-500">{{ workflow.description }}</div>
              </div>
            </div>
            <n-dropdown trigger="click">
              <template #trigger>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.EllipsisVertical" /></n-icon></template>
                </n-button>
              </template>
              <n-dropdown-option @click="editWorkflow(workflow)">
                <div class="flex items-center gap-2">
                  <n-icon><component :is="icons.Create" /></n-icon>
                  <span>编辑</span>
                </div>
              </n-dropdown-option>
              <n-dropdown-option @click="copyWorkflow(workflow)">
                <div class="flex items-center gap-2">
                  <n-icon><component :is="icons.Copy" /></n-icon>
                  <span>复制</span>
                </div>
              </n-dropdown-option>
              <n-dropdown-option @click="exportWorkflow(workflow)">
                <div class="flex items-center gap-2">
                  <n-icon><component :is="icons.Download" /></n-icon>
                  <span>导出</span>
                </div>
              </n-dropdown-option>
              <n-dropdown-option @click="deleteWorkflow(workflow)" type="error">
                <div class="flex items-center gap-2">
                  <n-icon><component :is="icons.Trash" /></n-icon>
                  <span>删除</span>
                </div>
              </n-dropdown-option>
            </n-dropdown>
          </div>

          <div class="space-y-3 mb-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">状态</span>
              <n-tag :type="workflow.status === '运行中' ? 'success' : 'default'" size="small">
                {{ workflow.status }}
              </n-tag>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">触发方式</span>
              <span>{{ workflow.trigger }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">上次执行</span>
              <span>{{ workflow.lastRun }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">执行次数</span>
              <span>{{ workflow.executions }} 次</span>
            </div>
          </div>

          <n-divider style="margin: 12px 0" />

          <div class="flex items-center justify-between">
            <n-space>
              <n-button size="small" @click="viewDetail(workflow)">
                <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                详情
              </n-button>
              <n-button size="small" @click="runWorkflow(workflow)">
                <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                运行
              </n-button>
            </n-space>
            <n-switch v-model:value="workflow.enabled" @update:value="toggleWorkflow(workflow)" />
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 创建工作流弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建工作流" style="width: 700px">
      <n-form :model="createForm" label-placement="left" label-width="100px">
        <n-form-item label="工作流名称">
          <n-input v-model:value="createForm.name" placeholder="请输入工作流名称" />
        </n-form-item>
        <n-form-item label="工作流描述">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="请输入工作流描述" />
        </n-form-item>
        <n-form-item label="分类">
          <n-select v-model:value="createForm.category" :options="categoryOptions" placeholder="请选择分类" />
        </n-form-item>
        <n-form-item label="触发方式">
          <n-select v-model:value="createForm.trigger" :options="triggerOptions" placeholder="请选择触发方式" />
        </n-form-item>
        <n-form-item label="从模板创建">
          <n-select v-model:value="createForm.template" :options="templateOptions" clearable placeholder="选择模板（可选）" />
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
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '工作流管理'
const activeTab = ref('all')
const showCreateModal = ref(false)

const createForm = ref({
  name: '',
  description: '',
  category: '',
  trigger: '',
  template: ''
})

const categoryOptions = [
  { label: '商品管理', value: 'product' },
  { label: '订单处理', value: 'order' },
  { label: '数据同步', value: 'sync' },
  { label: '数据分析', value: 'analysis' },
  { label: '通知提醒', value: 'notification' }
]

const triggerOptions = [
  { label: '定时触发', value: '定时触发' },
  { label: '手动触发', value: '手动触发' },
  { label: 'Webhook触发', value: 'Webhook触发' },
  { label: '事件触发', value: '事件触发' }
]

const templateOptions = [
  { label: '每日商品同步', value: 'daily_sync' },
  { label: '订单自动处理', value: 'auto_order' },
  { label: '库存监控告警', value: 'stock_alert' },
  { label: '数据日报生成', value: 'daily_report' }
]

const workflows = ref([
  { id: 1, name: '每日商品同步', description: '每天定时同步各平台商品信息', category: 'product', trigger: '定时触发', status: '运行中', lastRun: '2024-01-15 09:00', executions: 156, enabled: true },
  { id: 2, name: '订单自动处理', description: '自动处理新订单并发送通知', category: 'order', trigger: '事件触发', status: '运行中', lastRun: '2024-01-15 14:30', executions: 2345, enabled: true },
  { id: 3, name: '库存监控告警', description: '库存低于阈值时自动告警', category: 'notification', trigger: '定时触发', status: '已停止', lastRun: '2024-01-14 18:00', executions: 89, enabled: false },
  { id: 4, name: '数据日报生成', description: '每天生成销售数据日报', category: 'analysis', trigger: '定时触发', status: '运行中', lastRun: '2024-01-15 08:00', executions: 45, enabled: true },
  { id: 5, name: '商品自动上架', description: '新商品自动上架到所有平台', category: 'product', trigger: '事件触发', status: '已停止', lastRun: '2024-01-10 12:00', executions: 12, enabled: false }
])

const activeWorkflows = computed(() => workflows.value.filter(w => w.status === '运行中'))
const inactiveWorkflows = computed(() => workflows.value.filter(w => w.status === '已停止'))

const filteredWorkflows = computed(() => {
  if (activeTab.value === 'all') return workflows.value
  if (activeTab.value === 'active') return activeWorkflows.value
  return inactiveWorkflows.value
})

const getCategoryBg = (category: string) => {
  const map: Record<string, string> = {
    product: 'bg-blue-50 dark:bg-blue-900/30',
    order: 'bg-emerald-50 dark:bg-emerald-900/30',
    sync: 'bg-violet-50 dark:bg-violet-900/30',
    analysis: 'bg-orange-50 dark:bg-orange-900/30',
    notification: 'bg-pink-50 dark:bg-pink-900/30'
  }
  return map[category] || 'bg-gray-50 dark:bg-gray-800'
}

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    product: '#3b82f6',
    order: '#10b981',
    sync: '#8b5cf6',
    analysis: '#f59e0b',
    notification: '#ec4899'
  }
  return map[category] || '#6b7280'
}

const getCategoryIcon = (category: string) => {
  const map: Record<string, any> = {
    product: icons.Pricetags,
    order: icons.Cart,
    sync: icons.Refresh,
    analysis: icons.StatsChart,
    notification: icons.Notification
  }
  return map[category] || icons.Hammer
}

const toggleWorkflow = (workflow: any) => {
  workflow.status = workflow.enabled ? '运行中' : '已停止'
  message.success(`工作流已${workflow.enabled ? '启动' : '停止'}`)
}

const viewDetail = (workflow: any) => {
  message.info(`查看工作流: ${workflow.name}`)
}

const runWorkflow = (workflow: any) => {
  message.success(`正在运行: ${workflow.name}`)
}

const editWorkflow = (workflow: any) => {
  message.info(`编辑工作流: ${workflow.name}`)
}

const copyWorkflow = (workflow: any) => {
  message.success(`已复制: ${workflow.name}`)
}

const exportWorkflow = (workflow: any) => {
  message.info(`正在导出: ${workflow.name}`)
}

const deleteWorkflow = (workflow: any) => {
  const index = workflows.value.findIndex(w => w.id === workflow.id)
  if (index > -1) {
    workflows.value.splice(index, 1)
    message.success(`已删除: ${workflow.name}`)
  }
}

const importWorkflow = () => {
  message.info('导入功能')
}

const handleCreate = () => {
  if (!createForm.value.name) {
    message.warning('请输入工作流名称')
    return
  }
  message.success('工作流创建成功')
  showCreateModal.value = false
  createForm.value = { name: '', description: '', category: '', trigger: '', template: '' }
}
</script>

<style scoped>
.page-container {
  width: 100%;
}

.workflow-card {
  transition: all 0.3s ease;
}

.workflow-card:hover {
  transform: translateY(-2px);
}
</style>
