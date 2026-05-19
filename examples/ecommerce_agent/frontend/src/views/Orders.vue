<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="查看和管理您的订单">
      <template #extra>
        <n-space>
          <n-button>
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出
          </n-button>
          <n-button type="primary">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            刷新
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 统计卡片 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#3b82f6"><component :is="icons.Cart" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总订单</div>
              <div class="text-xl font-bold">1,248</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#f59e0b"><component :is="icons.AlertCircle" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">待发货</div>
              <div class="text-xl font-bold">45</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#10b981"><component :is="icons.CheckmarkDone" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">已完成</div>
              <div class="text-xl font-bold">1,089</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#8b5cf6"><component :is="icons.Wallet" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总销售额</div>
              <div class="text-xl font-bold">¥128,560</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 订单表格 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="orders"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as icons from '@vicons/ionicons5'

const pageTitle = '订单管理'

const columns = [
  { title: '订单号', key: 'orderId', width: 180 },
  { title: '商品', key: 'product', minWidth: 200 },
  { title: '买家', key: 'buyer', width: 120 },
  { title: '金额', key: 'amount', width: 120 },
  { title: '状态', key: 'status', width: 120 },
  { title: '时间', key: 'time', width: 180 }
]

const orders = ref([
  {
    orderId: 'DY20240101001',
    product: '蓝牙耳机 - 白色',
    buyer: '李**',
    amount: '¥129.00',
    status: '待发货',
    time: '2024-01-01 14:30'
  },
  {
    orderId: 'DY20240101002',
    product: '无线充电器',
    buyer: '张**',
    amount: '¥89.00',
    status: '已完成',
    time: '2024-01-01 15:20'
  },
  {
    orderId: 'DY20240101003',
    product: '数据线套装',
    buyer: '王**',
    amount: '¥49.00',
    status: '待发货',
    time: '2024-01-01 16:45'
  }
])
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
