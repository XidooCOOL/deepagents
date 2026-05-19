<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="创建和管理自动化任务">
      <template #extra>
        <n-space>
          <n-button>
            <template #icon><n-icon><component :is="icons.HelpCircle" /></n-icon></template>
            帮助
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-grid :x-gap="20" :y-gap="20" cols="1 m:2">
      <!-- 快速开始 -->
      <n-grid-item>
        <n-card title="快速开始" :bordered="false">
          <div class="space-y-4">
            <div class="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
              <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <n-icon :size="24" color="#10b981"><component :is="icons.CloudUpload" /></n-icon>
              </div>
              <div>
                <div class="font-medium">批量发布商品</div>
                <div class="text-sm text-neutral-500">快速将商品库中的商品发布到各个平台</div>
              </div>
            </div>
            <div class="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
              <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <n-icon :size="24" color="#3b82f6"><component :is="icons.Download" /></n-icon>
              </div>
              <div>
                <div class="font-medium">抓取订单数据</div>
                <div class="text-sm text-neutral-500">自动抓取各平台的订单数据</div>
              </div>
            </div>
            <div class="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
              <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <n-icon :size="24" color="#8b5cf6"><component :is="icons.Chatbubbles" /></n-icon>
              </div>
              <div>
                <div class="font-medium">智能AI助手</div>
                <div class="text-sm text-neutral-500">与AI对话，自动生成任务</div>
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>

      <!-- 任务模板 -->
      <n-grid-item>
        <n-card title="任务模板" :bordered="false">
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-emerald-500 transition">
              <div class="flex items-center gap-4">
                <n-icon :size="24" color="#f59e0b"><component :is="icons.Star" /></n-icon>
                <div>
                  <div class="font-medium">每日数据同步</div>
                  <div class="text-sm text-neutral-500">每天凌晨自动同步所有数据</div>
                </div>
              </div>
              <n-button type="primary" size="small">使用</n-button>
            </div>
            <div class="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-emerald-500 transition">
              <div class="flex items-center gap-4">
                <n-icon :size="24" color="#f59e0b"><component :is="icons.Star" /></n-icon>
                <div>
                  <div class="font-medium">库存监控告警</div>
                  <div class="text-sm text-neutral-500">库存低于阈值时自动发送告警</div>
                </div>
              </div>
              <n-button type="primary" size="small">使用</n-button>
            </div>
            <div class="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-emerald-500 transition">
              <div class="flex items-center gap-4">
                <n-icon :size="24" color="#a3a3a3"><component :is="icons.StarOutline" /></n-icon>
                <div>
                  <div class="font-medium">商品自动上架</div>
                  <div class="text-sm text-neutral-500">新商品自动上架到所有平台</div>
                </div>
              </div>
              <n-button type="primary" size="small">使用</n-button>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 创建自定义任务 -->
    <n-card class="mt-6" title="创建自定义任务" :bordered="false">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-grid :x-gap="20" :y-gap="20" cols="1 m:2">
          <n-grid-item>
            <n-form-item label="选择店铺">
              <n-select v-model:value="form.store" :options="storeOptions" placeholder="请选择店铺" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="任务类型">
              <n-select v-model:value="form.type" :options="taskTypeOptions" placeholder="请选择任务类型" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="任务名称">
              <n-input v-model:value="form.name" placeholder="请输入任务名称" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="执行时间">
              <n-select v-model:value="form.schedule" :options="scheduleOptions" placeholder="请选择执行时间" />
            </n-form-item>
          </n-grid-item>
        </n-grid>
        <n-form-item label="任务描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入任务描述" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" size="large" @click="handleCreate">
              <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
              创建任务
            </n-button>
            <n-button size="large" @click="handleTest">
              <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
              测试运行
            </n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = 'Agent工作台'

const form = reactive({
  store: '',
  type: '',
  name: '',
  schedule: 'now',
  description: ''
})

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

const scheduleOptions = [
  { label: '立即执行', value: 'now' },
  { label: '每小时', value: 'hourly' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

const handleCreate = () => {
  message.success('任务创建成功')
}

const handleTest = () => {
  message.info('开始测试运行')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
