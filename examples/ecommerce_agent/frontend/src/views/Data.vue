<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="数据统计和分析">
      <template #extra>
        <n-space>
          <n-select v-model:value="timeRange" :options="timeRangeOptions" style="width: 150px" />
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
              <n-icon :size="20" color="#3b82f6"><component :is="icons.Wallet" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总销售额</div>
              <div class="text-xl font-bold">¥128,560</div>
              <div class="text-xs text-green-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
                12.5%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#10b981"><component :is="icons.Cart" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总订单</div>
              <div class="text-xl font-bold">1,248</div>
              <div class="text-xs text-green-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
                8.3%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#8b5cf6"><component :is="icons.Person" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总访客</div>
              <div class="text-xl font-bold">3,456</div>
              <div class="text-xs text-green-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
                15.2%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#f59e0b"><component :is="icons.TrendingUp" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">转化率</div>
              <div class="text-xl font-bold">3.8%</div>
              <div class="text-xs text-red-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowDown" /></n-icon>
                0.2%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 图表区域 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 m:2" class="mb-6">
      <n-grid-item>
        <n-card title="销售趋势" :bordered="false">
          <div class="h-64 flex items-center justify-center text-neutral-400">
            <div class="text-center">
              <n-icon :size="48"><component :is="icons.BarChart" /></n-icon>
              <p class="mt-2">图表组件待接入</p>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="平台分布" :bordered="false">
          <div class="h-64 flex items-center justify-center text-neutral-400">
            <div class="text-center">
              <n-icon :size="48"><component :is="icons.PieChart" /></n-icon>
              <p class="mt-2">图表组件待接入</p>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 热销商品 -->
    <n-card title="热销商品 TOP 10" :bordered="false">
      <n-data-table :columns="columns" :data="topProducts" :pagination="false" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as icons from '@vicons/ionicons5'

const pageTitle = '数据分析'
const timeRange = ref('week')

const timeRangeOptions = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全年', value: 'year' }
]

const columns = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '商品名称', key: 'name', minWidth: 200 },
  { title: '销量', key: 'sales', width: 120 },
  { title: '销售额', key: 'revenue', width: 120 },
  { title: '占比', key: 'percentage', width: 100 }
]

const topProducts = ref([
  { rank: 1, name: '无线蓝牙耳机 高品质音效 长续航', sales: 428, revenue: '¥55,212', percentage: '42.9%' },
  { rank: 2, name: '快速无线充电器 15W快充', sales: 156, revenue: '¥13,884', percentage: '10.8%' },
  { rank: 3, name: '手机数据线套装 Type-C/Micro', sales: 892, revenue: '¥43,708', percentage: '34.0%' },
  { rank: 4, name: '手机支架 桌面通用款', sales: 1024, revenue: '¥29,696', percentage: '23.1%' }
])
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
