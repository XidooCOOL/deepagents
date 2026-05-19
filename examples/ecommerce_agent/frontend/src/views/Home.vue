<template>
  <div class="home-container">
    <!-- 欢迎区域 -->
    <n-card class="welcome-card mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white m-0 mb-2">
            👋 欢迎回来！
          </h1>
          <p class="text-neutral-600 dark:text-neutral-400 m-0">
            今天的电商运营，就从这里开始吧。
          </p>
        </div>
        <n-space>
          <n-button type="primary" size="large" @click="$router.push('/agent')">
            <template #icon><n-icon><component :is="icons.Magic" /></n-icon></template>
            创建新任务
          </n-button>
          <n-button size="large" @click="$router.push('/ai')">
            <template #icon><n-icon><component :is="icons.Chatbubbles" /></n-icon></template>
            智能助手
          </n-button>
        </n-space>
      </div>
    </n-card>

    <!-- 统计卡片 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
      <n-grid-item>
        <n-card hoverable class="stat-card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <n-icon :size="24" color="white"><component :is="icons.Cart" /></n-icon>
            </div>
            <div class="flex-1">
              <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">今日订单</div>
              <div class="text-2xl font-bold text-neutral-900 dark:text-white">156</div>
              <div class="text-xs text-green-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
                +12.5%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <n-grid-item>
        <n-card hoverable class="stat-card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <n-icon :size="24" color="white"><component :is="icons.Pricetags" /></n-icon>
            </div>
            <div class="flex-1">
              <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">今日销售额</div>
              <div class="text-2xl font-bold text-neutral-900 dark:text-white">¥8,520</div>
              <div class="text-xs text-green-500 flex items-center gap-1">
                <n-icon :size="14"><component :is="icons.ArrowUp" /></n-icon>
                +8.2%
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <n-grid-item>
        <n-card hoverable class="stat-card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
              <n-icon :size="24" color="white"><component :is="icons.CheckmarkDone" /></n-icon>
            </div>
            <div class="flex-1">
              <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">已发布商品</div>
              <div class="text-2xl font-bold text-neutral-900 dark:text-white">248</div>
              <div class="text-xs text-neutral-500">较昨日不变</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <n-grid-item>
        <n-card hoverable class="stat-card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <n-icon :size="24" color="white"><component :is="icons.Time" /></n-icon>
            </div>
            <div class="flex-1">
              <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">运行中任务</div>
              <div class="text-2xl font-bold text-neutral-900 dark:text-white">3</div>
              <div class="text-xs text-orange-500 flex items-center gap-1">
                <n-spin :size="12" />
                正在执行
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 主要内容区 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 m:2" class="mb-6">
      <!-- 最近任务 -->
      <n-grid-item>
        <n-card title="最近任务" :bordered="false" :hoverable="true">
          <template #header-extra>
            <n-button quaternary size="small" @click="$router.push('/tasks')">
              查看全部
            </n-button>
          </template>
          <div class="space-y-3">
            <n-list>
              <n-list-item>
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3">
                    <n-tag type="success" size="small">完成</n-tag>
                    <span class="font-medium">商品批量发布</span>
                  </div>
                  <span class="text-sm text-neutral-500">2分钟前</span>
                </div>
              </n-list-item>
              <n-list-item>
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3">
                    <n-tag type="warning" size="small">运行中</n-tag>
                    <span class="font-medium">订单数据导出</span>
                  </div>
                  <span class="text-sm text-neutral-500">5分钟前</span>
                </div>
              </n-list-item>
              <n-list-item>
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-3">
                    <n-tag type="default" size="small">等待中</n-tag>
                    <span class="font-medium">商品库存同步</span>
                  </div>
                  <span class="text-sm text-neutral-500">10分钟前</span>
                </div>
              </n-list-item>
            </n-list>
          </div>
        </n-card>
      </n-grid-item>

      <!-- 快速操作 -->
      <n-grid-item>
        <n-card title="快捷操作" :bordered="false" :hoverable="true">
          <div class="grid grid-cols-2 gap-3">
            <n-card hoverable size="small" class="cursor-pointer" @click="$router.push('/product-publish')">
              <div class="flex items-center gap-2">
                <n-icon :size="20" color="#18a058"><component :is="icons.CloudUpload" /></n-icon>
                <span class="font-medium">发布商品</span>
              </div>
            </n-card>
            <n-card hoverable size="small" class="cursor-pointer" @click="$router.push('/orders')">
              <div class="flex items-center gap-2">
                <n-icon :size="20" color="#18a058"><component :is="icons.List" /></n-icon>
                <span class="font-medium">查看订单</span>
              </div>
            </n-card>
            <n-card hoverable size="small" class="cursor-pointer" @click="$router.push('/stores')">
              <div class="flex items-center gap-2">
                <n-icon :size="20" color="#18a058"><component :is="icons.Storefront" /></n-icon>
                <span class="font-medium">店铺管理</span>
              </div>
            </n-card>
            <n-card hoverable size="small" class="cursor-pointer" @click="$router.push('/data')">
              <div class="flex items-center gap-2">
                <n-icon :size="20" color="#18a058"><component :is="icons.StatsChart" /></n-icon>
                <span class="font-medium">数据分析</span>
              </div>
            </n-card>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 数据趋势图（占位） -->
    <n-card title="销售趋势" :bordered="false" :hoverable="true">
      <div class="h-48 flex items-center justify-center text-neutral-400">
        <div class="text-center">
          <n-icon :size="48"><component :is="icons.BarChart" /></n-icon>
          <p class="mt-2">图表组件待接入</p>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import * as icons from '@vicons/ionicons5'
</script>

<style scoped>
.home-container {
  width: 100%;
}

.welcome-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
  border: none !important;
}

:deep(.dark .welcome-card) {
  background: linear-gradient(135deg, #1f1f1f 0%, #1a2e1a 100%);
}

.stat-card {
  border: none !important;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

:deep(.n-list-item) {
  padding: 8px 0 !important;
}
</style>
