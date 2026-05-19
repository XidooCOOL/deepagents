<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理您的自动化任务">
      <template #extra>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          创建任务
        </n-button>
      </template>
    </n-page-header>

    <!-- 任务过滤器 -->
    <n-card class="mb-6">
      <n-space>
        <n-select v-model:value="statusFilter" :options="statusOptions" style="width: 150px" clearable />
        <n-input v-model:value="searchKeyword" placeholder="搜索任务..." style="width: 250px" clearable />
        <n-button type="primary">
          <template #icon><n-icon><component :is="icons.Search" /></n-icon></template>
          搜索
        </n-button>
      </n-space>
    </n-card>

    <!-- 任务列表 -->
    <n-card>
      <n-space vertical style="width: 100%">
        <n-timeline>
          <n-timeline-item type="success" title="商品批量发布" time="2分钟前">
            <div class="mb-2">
              <n-tag size="small" type="success">已完成</n-tag>
              <span class="ml-2 text-sm text-neutral-500">进度: 100%</span>
            </div>
            <div class="text-sm text-neutral-600 dark:text-neutral-400">
              成功发布 24 个商品到抖音店铺
            </div>
          </n-timeline-item>
          <n-timeline-item type="warning" title="订单数据导出" time="5分钟前">
            <div class="mb-2">
              <n-tag size="small" type="warning">运行中</n-tag>
              <span class="ml-2 text-sm text-neutral-500">进度: 45%</span>
            </div>
            <n-progress :percentage="45" :status="'processing'" style="width: 300px" />
          </n-timeline-item>
          <n-timeline-item type="default" title="商品库存同步" time="10分钟前">
            <div class="mb-2">
              <n-tag size="small" type="default">等待中</n-tag>
              <span class="ml-2 text-sm text-neutral-500">进度: 0%</span>
            </div>
            <div class="text-sm text-neutral-600 dark:text-neutral-400">
              等待上一个任务完成后开始执行
            </div>
          </n-timeline-item>
          <n-timeline-item type="error" title="好评批量发布" time="1小时前">
            <div class="mb-2">
              <n-tag size="small" type="error">失败</n-tag>
              <span class="ml-2 text-sm text-neutral-500">进度: 15%</span>
            </div>
            <div class="text-sm text-neutral-600 dark:text-neutral-400">
              网络连接超时，请检查网络后重试
            </div>
          </n-timeline-item>
        </n-timeline>
      </n-space>
    </n-card>

    <!-- 创建任务弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建新任务" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="100px">
        <n-form-item label="选择店铺">
          <n-select v-model:value="form.store" :options="storeOptions" placeholder="请选择店铺" />
        </n-form-item>
        <n-form-item label="任务类型">
          <n-select v-model:value="form.type" :options="taskTypeOptions" placeholder="请选择任务类型" />
        </n-form-item>
        <n-form-item label="任务名称">
          <n-input v-model:value="form.name" placeholder="请输入任务名称" />
        </n-form-item>
        <n-form-item label="执行时间">
          <n-radio-group v-model:value="form.schedule">
            <n-space>
              <n-radio value="now">立即执行</n-radio>
              <n-radio value="schedule">定时执行</n-radio>
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
const pageTitle = '任务管理'
const showCreateModal = ref(false)
const statusFilter = ref('')
const searchKeyword = ref('')

const form = reactive({
  store: '',
  type: '',
  name: '',
  schedule: 'now'
})

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '等待中', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '已失败', value: 'failed' }
]

const storeOptions = [
  { label: '抖音店铺', value: 1 },
  { label: '拼多多测试店', value: 2 }
]

const taskTypeOptions = [
  { label: '商品发布', value: 'publish' },
  { label: '好评发布', value: 'good_review' },
  { label: '数据抓取', value: 'fetch_data' },
  { label: '数据分析', value: 'analyze' }
]

const handleCreate = () => {
  message.success('任务创建成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
