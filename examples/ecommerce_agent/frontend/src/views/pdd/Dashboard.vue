<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="拼多多店铺数据概览">
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
          <div class="text-sm text-neutral-500 mb-1">今日销售额</div>
          <div class="text-2xl font-bold text-neutral-900">¥12,580</div>
          <div class="text-sm text-green-500 flex items-center gap-1 mt-1">
            <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
            +15.2%
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="text-sm text-neutral-500 mb-1">今日订单</div>
          <div class="text-2xl font-bold text-neutral-900">86</div>
          <div class="text-sm text-green-500 flex items-center gap-1 mt-1">
            <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
            +8.5%
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="text-sm text-neutral-500 mb-1">在售商品</div>
          <div class="text-2xl font-bold text-neutral-900">245</div>
          <div class="text-sm text-neutral-500 mt-1">
            较昨日 +3
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="text-sm text-neutral-500 mb-1">访客数</div>
          <div class="text-2xl font-bold text-neutral-900">1,258</div>
          <div class="text-sm text-red-500 flex items-center gap-1 mt-1">
            <n-icon :size="14"><component :is="icons.ArrowDown" /></n-icon>
            -3.2%
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 数据图表 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 m:2">
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
        <n-card title="热销商品TOP5" :bordered="false">
          <n-list>
            <n-list-item v-for="(item, index) in topProducts" :key="item.id">
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3">
                  <n-tag :type="index < 3 ? 'success' : 'default'">{{ index + 1 }}</n-tag>
                  <span>{{ item.name }}</span>
                </div>
                <span class="font-medium">¥{{ item.sales.toLocaleString() }}</span>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as icons from '@vicons/ionicons5'

const pageTitle = '数据概览'
const timeRange = ref('today')

const timeRangeOptions = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
]

const topProducts = ref([
  { id: 1, name: '无线蓝牙耳机', sales: 3580 },
  { id: 2, name: '手机数据线套装', sales: 2450 },
  { id: 3, name: '快充充电器', sales: 1980 },
  { id: 4, name: '手机支架', sales: 1250 },
  { id: 5, name: '钢化膜', sales: 980 }
])
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
