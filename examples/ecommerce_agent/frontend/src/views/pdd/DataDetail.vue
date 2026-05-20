<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" :subtitle="`${currentStore} - ${dataTypeLabel}`">
      <template #extra>
        <n-space>
          <n-button @click="exportData">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出数据
          </n-button>
          <n-button @click="refreshData">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            刷新
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 数据类型选择 -->
    <n-card class="mb-6">
      <n-tabs v-model:value="activeTab" type="segment" @update:value="handleTabChange">
        <n-tab-pane name="sales" tab="销售数据" />
        <n-tab-pane name="service" tab="客服数据" />
        <n-tab-pane name="ads" tab="推广数据" />
      </n-tabs>
    </n-card>

    <!-- 销售数据视图 -->
    <div v-if="activeTab === 'sales'">
      <!-- 统计概览 -->
      <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#3b82f6"><component :is="icons.Cart" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总订单数</div>
                <div class="text-2xl font-bold">1,248</div>
                <div class="text-xs text-emerald-500">↑ 12.5%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#10b981"><component :is="icons.Cash" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总销售额</div>
                <div class="text-2xl font-bold">¥128,560</div>
                <div class="text-xs text-emerald-500">↑ 8.3%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#f59e0b"><component :is="icons.Refresh" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">退款金额</div>
                <div class="text-2xl font-bold">¥3,420</div>
                <div class="text-xs text-red-500">↑ 5.2%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#8b5cf6"><component :is="icons.TrendingUp" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">转化率</div>
                <div class="text-2xl font-bold">8.5%</div>
                <div class="text-xs text-emerald-500">↑ 0.3%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 销售趋势图 -->
      <n-card title="销售趋势" class="mb-6">
        <n-date-picker v-model:value="salesDateRange" type="daterange" clearable @update:value="loadSalesTrend" />
        <div class="mt-4 h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-center text-neutral-500">
            <n-icon :size="48"><component :is="icons.TrendingUp" /></n-icon>
            <p class="mt-2">销售趋势图表</p>
            <p class="text-sm">展示近期的销售变化趋势</p>
          </div>
        </div>
      </n-card>

      <!-- 销售明细表格 -->
      <n-card title="销售明细">
        <template #header-extra>
          <n-space>
            <n-input v-model:value="salesKeyword" placeholder="搜索商品..." clearable style="width: 200px">
              <template #prefix>
                <n-icon><component :is="icons.Search" /></n-icon>
              </template>
            </n-input>
            <n-button @click="showFilterSales = true">
              <template #icon><n-icon><component :is="icons.Filter" /></n-icon></template>
              筛选
            </n-button>
          </n-space>
        </template>
        
        <n-data-table
          :columns="salesColumns"
          :data="salesDetailData"
          :pagination="pagination"
          :loading="salesLoading"
        />
      </n-card>
    </div>

    <!-- 客服数据视图 -->
    <div v-if="activeTab === 'service'">
      <!-- 客服统计 -->
      <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#3b82f6"><component :is="icons.Chatbubbles" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总咨询量</div>
                <div class="text-2xl font-bold">3,580</div>
                <div class="text-xs text-emerald-500">↑ 15.2%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#10b981"><component :is="icons.CheckmarkDone" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">响应率</div>
                <div class="text-2xl font-bold">98.5%</div>
                <div class="text-xs text-emerald-500">↑ 1.2%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#f59e0b"><component :is="icons.Star" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">满意度</div>
                <div class="text-2xl font-bold">4.9</div>
                <div class="text-xs text-emerald-500">↑ 0.1</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#8b5cf6"><component :is="icons.Time" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">平均响应</div>
                <div class="text-2xl font-bold">12s</div>
                <div class="text-xs text-emerald-500">↓ 3s</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 客服人员列表 -->
      <n-card title="客服绩效排名">
        <n-data-table
          :columns="serviceColumns"
          :data="serviceData"
          :pagination="pagination"
        />
      </n-card>
    </div>

    <!-- 推广数据视图 -->
    <div v-if="activeTab === 'ads'">
      <!-- 推广统计 -->
      <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#3b82f6"><component :is="icons.Eye" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总曝光</div>
                <div class="text-2xl font-bold">125.8万</div>
                <div class="text-xs text-emerald-500">↑ 25.3%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#10b981"><component :is="icons.Person" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总点击</div>
                <div class="text-2xl font-bold">8,520</div>
                <div class="text-xs text-emerald-500">↑ 18.7%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#f59e0b"><component :is="icons.Cash" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">总花费</div>
                <div class="text-2xl font-bold">¥2,580</div>
                <div class="text-xs text-red-500">↑ 8.5%</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <n-icon :size="28" color="#8b5cf6"><component :is="icons.TrendingUp" /></n-icon>
              </div>
              <div>
                <div class="text-sm text-neutral-500">平均ROI</div>
                <div class="text-2xl font-bold">3.2</div>
                <div class="text-xs text-emerald-500">↑ 0.5</div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 推广计划列表 -->
      <n-card title="推广计划">
        <n-data-table
          :columns="adsColumns"
          :data="adsData"
          :pagination="pagination"
        />
      </n-card>
    </div>

    <!-- 筛选弹窗 -->
    <n-modal v-model:show="showFilterSales" preset="card" title="筛选条件" style="width: 500px">
      <n-form :model="salesFilter" label-placement="left" label-width="100px">
        <n-form-item label="日期范围">
          <n-date-picker v-model:value="salesFilter.dateRange" type="daterange" clearable style="width: 100%" />
        </n-form-item>
        <n-form-item label="订单状态">
          <n-checkbox-group v-model:value="salesFilter.status">
            <n-space>
              <n-checkbox value="paid" label="已付款" />
              <n-checkbox value="shipped" label="已发货" />
              <n-checkbox value="completed" label="已完成" />
              <n-checkbox value="refunded" label="已退款" />
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="价格区间">
          <n-input-group>
            <n-input v-model:value="salesFilter.minPrice" placeholder="最低价" />
            <n-input-number :show-button="false" placeholder="最高价" />
          </n-input-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="resetSalesFilter">重置</n-button>
          <n-button @click="applySalesFilter">应用</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const pageTitle = '数据详情'
const activeTab = ref('sales')
const currentStore = ref('全部店铺')
const salesLoading = ref(false)
const showFilterSales = ref(false)

const dataTypeLabel = computed(() => {
  const map: Record<string, string> = {
    sales: '销售数据',
    service: '客服数据',
    ads: '推广数据'
  }
  return map[activeTab.value] || ''
})

const salesDateRange = ref<[number, number] | null>(null)
const salesKeyword = ref('')

const salesFilter = ref({
  dateRange: null as [number, number] | null,
  status: ['paid', 'shipped', 'completed'],
  minPrice: '',
  maxPrice: ''
})

const salesColumns = [
  { title: '日期', key: 'date', width: 120 },
  { title: '订单号', key: 'orderId', width: 150 },
  { title: '商品名称', key: 'productName', minWidth: 200 },
  { title: '数量', key: 'quantity', width: 80 },
  { title: '单价', key: 'price', width: 100 },
  { title: '总价', key: 'total', width: 100 },
  { title: '订单状态', key: 'status', width: 100, render: (row: any) => {
    const type = row.status === '已完成' ? 'success' : row.status === '已发货' ? 'info' : row.status === '已退款' ? 'error' : 'warning'
    return h('n-tag', { type, size: 'small' }, { default: () => row.status })
  }},
  { title: '买家', key: 'buyer', width: 120 }
]

const serviceColumns = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '客服姓名', key: 'name', width: 120 },
  { title: '咨询量', key: 'consults', width: 100 },
  { title: '响应率', key: 'responseRate', width: 100 },
  { title: '平均响应', key: 'avgResponse', width: 100 },
  { title: '满意度', key: 'satisfaction', width: 100 },
  { title: '成交量', key: 'orders', width: 100 },
  { title: '操作', key: 'actions', width: 150, render: () => {
    return h('n-button', { size: 'small', quaternary: true }, { default: () => '查看详情' })
  }}
]

const adsColumns = [
  { title: '计划名称', key: 'name', minWidth: 200 },
  { title: '推广类型', key: 'type', width: 120, render: (row: any) => {
    const type = row.type === '多多进宝' ? 'success' : row.type === '推广快车' ? 'info' : 'warning'
    return h('n-tag', { type, size: 'small' }, { default: () => row.type })
  }},
  { title: '花费', key: 'cost', width: 100 },
  { title: '曝光', key: 'views', width: 100 },
  { title: '点击', key: 'clicks', width: 100 },
  { title: '转化', key: 'conversions', width: 100 },
  { title: 'ROI', key: 'roi', width: 80 },
  { title: '状态', key: 'status', width: 100, render: (row: any) => {
    const type = row.status === '投放中' ? 'success' : row.status === '暂停' ? 'warning' : 'default'
    return h('n-tag', { type, size: 'small' }, { default: () => row.status })
  }}
]

const salesDetailData = ref([
  { date: '2024-01-15', orderId: 'ORD20240115001', productName: '隐形眼镜日抛30片装', quantity: 2, price: '¥89', total: '¥178', status: '已完成', buyer: '张*' },
  { date: '2024-01-15', orderId: 'ORD20240115002', productName: '美瞳彩色隐形眼镜', quantity: 1, price: '¥128', total: '¥128', status: '已发货', buyer: '李*' },
  { date: '2024-01-14', orderId: 'ORD20240114001', productName: '护理液120ml', quantity: 3, price: '¥45', total: '¥135', status: '已完成', buyer: '王*' },
  { date: '2024-01-14', orderId: 'ORD20240114002', productName: '隐形眼镜半年抛', quantity: 1, price: '¥199', total: '¥199', status: '已退款', buyer: '赵*' }
])

const serviceData = ref([
  { rank: 1, name: '张三', consults: 456, responseRate: '99.2%', avgResponse: '8s', satisfaction: '4.9', orders: 128 },
  { rank: 2, name: '李四', consults: 398, responseRate: '98.8%', avgResponse: '10s', satisfaction: '4.9', orders: 115 },
  { rank: 3, name: '王五', consults: 356, responseRate: '97.5%', avgResponse: '12s', satisfaction: '4.8', orders: 98 },
  { rank: 4, name: '赵六', consults: 312, responseRate: '96.8%', avgResponse: '15s', satisfaction: '4.7', orders: 85 }
])

const adsData = ref([
  { name: '新品推广计划', type: '推广快车', cost: '¥1,280', views: '58.6万', clicks: '3,890', conversions: 128, roi: 3.5, status: '投放中' },
  { name: '爆款引流', type: '多多进宝', cost: '¥850', views: '42.3万', clicks: '2,890', conversions: 95, roi: 3.2, status: '投放中' },
  { name: '限时促销', type: '场景推广', cost: '¥450', views: '25.0万', clicks: '1,740', conversions: 58, roi: 2.8, status: '暂停' }
])

const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const handleTabChange = (tab: string) => {
  activeTab.value = tab
  message.info(`切换到${dataTypeLabel.value}`)
}

const loadSalesTrend = () => {
  message.info('加载销售趋势数据...')
}

const exportData = () => {
  message.info('正在导出数据...')
}

const refreshData = () => {
  message.success('数据已刷新')
}

const resetSalesFilter = () => {
  salesFilter.value = {
    dateRange: null,
    status: ['paid', 'shipped', 'completed'],
    minPrice: '',
    maxPrice: ''
  }
  message.info('筛选条件已重置')
}

const applySalesFilter = () => {
  showFilterSales.value = false
  message.success('筛选条件已应用')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
