<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="提取拼多多平台的各类数据">
      <template #extra>
        <n-space>
          <n-button @click="refreshStores">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            刷新店铺
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 销售数据提取 -->
      <n-tab-pane name="sales" tab="销售数据">
        <n-card class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold mb-1">销售数据提取</h3>
              <p class="text-sm text-neutral-500">从拼多多商家后台提取订单、销售额等数据</p>
            </div>
            <div class="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center">
              <n-icon :size="32" color="#3b82f6"><component :is="icons.TrendingUp" /></n-icon>
            </div>
          </div>
          <n-form :model="salesForm" label-placement="left" label-width="100">
            <n-form-item label="选择店铺">
              <n-select v-model:value="salesForm.storeName" :options="storeOptions" placeholder="选择店铺" style="width: 300px" />
            </n-form-item>
            <n-form-item label="日期范围">
              <n-date-picker v-model:value="salesForm.dateRange" type="daterange" clearable style="width: 300px" />
            </n-form-item>
            <n-form-item label="数据类型">
              <n-checkbox-group v-model:value="salesForm.dataTypes">
                <n-space>
                  <n-checkbox value="orders" label="订单数据" />
                  <n-checkbox value="amount" label="销售额" />
                  <n-checkbox value="refunds" label="退款数据" />
                  <n-checkbox value="products" label="商品销量" />
                </n-space>
              </n-checkbox-group>
            </n-form-item>
          </n-form>
          <n-space justify="end">
            <n-button @click="previewSales">
              <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
              预览
            </n-button>
            <n-button type="primary" @click="extractSales" :loading="salesLoading">
              <template #icon><n-icon><component :is="icons.CloudDownload" /></n-icon></template>
              开始提取
            </n-button>
          </n-space>
        </n-card>

        <!-- 提取结果预览 -->
        <n-card v-if="salesData.length > 0" title="数据预览">
          <n-data-table
            :columns="salesColumns"
            :data="salesData"
            :pagination="pagination"
          />
        </n-card>
      </n-tab-pane>

      <!-- 客服数据提取 -->
      <n-tab-pane name="service" tab="客服数据">
        <n-card class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold mb-1">客服绩效提取</h3>
              <p class="text-sm text-neutral-500">提取客服响应率、满意度等绩效数据</p>
            </div>
            <div class="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center">
              <n-icon :size="32" color="#10b981"><component :is="icons.Headset" /></n-icon>
            </div>
          </div>
          <n-form :model="serviceForm" label-placement="left" label-width="100">
            <n-form-item label="选择店铺">
              <n-select v-model:value="serviceForm.storeName" :options="storeOptions" placeholder="选择店铺" style="width: 300px" />
            </n-form-item>
            <n-form-item label="日期范围">
              <n-date-picker v-model:value="serviceForm.dateRange" type="daterange" clearable style="width: 300px" />
            </n-form-item>
            <n-form-item label="客服人员">
              <n-select v-model:value="serviceForm.staffId" :options="staffOptions" placeholder="全部客服" clearable style="width: 300px" />
            </n-form-item>
          </n-form>
          <n-space justify="end">
            <n-button type="primary" @click="extractService" :loading="serviceLoading">
              <template #icon><n-icon><component :is="icons.CloudDownload" /></n-icon></template>
              开始提取
            </n-button>
          </n-space>
        </n-card>

        <!-- 客服统计卡片 -->
        <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#3b82f6"><component :is="icons.Chatbubbles" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">咨询量</div>
                  <div class="text-2xl font-bold">1,248</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#10b981"><component :is="icons.CheckmarkDone" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">响应率</div>
                  <div class="text-2xl font-bold">98.5%</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#f59e0b"><component :is="icons.Star" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">满意度</div>
                  <div class="text-2xl font-bold">4.9</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#8b5cf6"><component :is="icons.Time" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">平均响应</div>
                  <div class="text-2xl font-bold">12s</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-tab-pane>

      <!-- 推广数据提取 -->
      <n-tab-pane name="ads" tab="推广数据">
        <n-card class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold mb-1">推广效果提取</h3>
              <p class="text-sm text-neutral-500">提取多多进宝、推广快车等广告数据</p>
            </div>
            <div class="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center">
              <n-icon :size="32" color="#f59e0b"><component :is="icons.Megaphone" /></n-icon>
            </div>
          </div>
          <n-form :model="adsForm" label-placement="left" label-width="100">
            <n-form-item label="选择店铺">
              <n-select v-model:value="adsForm.storeName" :options="storeOptions" placeholder="选择店铺" style="width: 300px" />
            </n-form-item>
            <n-form-item label="日期范围">
              <n-date-picker v-model:value="adsForm.dateRange" type="daterange" clearable style="width: 300px" />
            </n-form-item>
            <n-form-item label="推广类型">
              <n-checkbox-group v-model:value="adsForm.adTypes">
                <n-space>
                  <n-checkbox value="jinbao" label="多多进宝" />
                  <n-checkbox value="express" label="推广快车" />
                  <n-checkbox value="search" label="搜索推广" />
                  <n-checkbox value="scene" label="场景推广" />
                </n-space>
              </n-checkbox-group>
            </n-form-item>
          </n-form>
          <n-space justify="end">
            <n-button type="primary" @click="extractAds" :loading="adsLoading">
              <template #icon><n-icon><component :is="icons.CloudDownload" /></n-icon></template>
              开始提取
            </n-button>
          </n-space>
        </n-card>

        <!-- 推广效果统计 -->
        <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#3b82f6"><component :is="icons.Eye" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">曝光量</div>
                  <div class="text-2xl font-bold">125.8万</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#10b981"><component :is="icons.Person" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">点击量</div>
                  <div class="text-2xl font-bold">8,520</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#f59e0b"><component :is="icons.Cash" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">花费</div>
                  <div class="text-2xl font-bold">¥2,580</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
          <n-grid-item>
            <n-card>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#8b5cf6"><component :is="icons.TrendingUp" /></n-icon>
                </div>
                <div>
                  <div class="text-sm text-neutral-500">ROI</div>
                  <div class="text-2xl font-bold">3.2</div>
                </div>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-tab-pane>
    </n-tabs>

    <!-- 提取历史 -->
    <n-card title="提取历史" class="mt-6">
      <n-timeline>
        <n-timeline-item v-for="item in extractHistory" :key="item.id" :type="item.status === '成功' ? 'success' : item.status === '进行中' ? 'info' : 'warning'" :time="item.time" :title="item.title">
          <div class="text-sm text-neutral-600 dark:text-neutral-400">{{ item.description }}</div>
          <n-space class="mt-2">
            <n-tag size="small" :type="item.type === '销售' ? 'info' : item.type === '客服' ? 'success' : 'warning'">
              {{ item.type }}
            </n-tag>
            <n-button v-if="item.status === '成功'" size="small" quaternary @click="viewData(item)">
              查看数据
            </n-button>
          </n-space>
        </n-timeline-item>
      </n-timeline>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '数据提取'
const activeTab = ref('sales')
const salesLoading = ref(false)
const serviceLoading = ref(false)
const adsLoading = ref(false)

const storeOptions = ref([
  { label: 'XIDOO隐形眼镜旗舰店', value: 'XIDOO隐形眼镜旗舰店' },
  { label: '瞳粉美瞳专营店', value: '瞳粉美瞳专营店' },
  { label: 'JEWELRY DOLL旗舰店', value: 'JEWELRY DOLL旗舰店' }
])

const staffOptions = ref([
  { label: '张三', value: 'staff_001' },
  { label: '李四', value: 'staff_002' },
  { label: '王五', value: 'staff_003' }
])

const salesForm = ref({
  storeName: '',
  dateRange: null,
  dataTypes: ['orders', 'amount']
})

const serviceForm = ref({
  storeName: '',
  dateRange: null,
  staffId: ''
})

const adsForm = ref({
  storeName: '',
  dateRange: null,
  adTypes: ['jinbao']
})

const salesData = ref<any[]>([])

const salesColumns = [
  { title: '日期', key: 'date', width: 120 },
  { title: '订单数', key: 'orders', width: 100 },
  { title: '销售额', key: 'amount', width: 150 },
  { title: '退款额', key: 'refund', width: 150 },
  { title: '转化率', key: 'rate', width: 100 }
]

const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const extractHistory = ref([
  { id: 1, title: '销售数据提取', description: 'XIDOO隐形眼镜旗舰店 - 近7天数据', time: '2024-01-15 14:30', status: '成功', type: '销售' },
  { id: 2, title: '客服绩效提取', description: '瞳粉美瞳专营店 - 近30天数据', time: '2024-01-15 10:15', status: '成功', type: '客服' },
  { id: 3, title: '推广数据提取', description: 'JEWELRY DOLL旗舰店 - 昨日数据', time: '2024-01-14 09:00', status: '进行中', type: '推广' },
  { id: 4, title: '销售数据提取', description: 'XIDOO隐形眼镜旗舰店 - 近30天数据', time: '2024-01-13 18:20', status: '成功', type: '销售' }
])

const refreshStores = async () => {
  message.success('店铺列表已刷新')
}

const previewSales = () => {
  message.info('预览功能开发中')
}

const extractSales = async () => {
  if (!salesForm.value.storeName) {
    message.warning('请选择店铺')
    return
  }
  salesLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  salesData.value = [
    { date: '2024-01-15', orders: 156, amount: '¥12,580', refund: '¥320', rate: '8.5%' },
    { date: '2024-01-14', orders: 189, amount: '¥15,230', refund: '¥450', rate: '9.2%' },
    { date: '2024-01-13', orders: 201, amount: '¥18,560', refund: '¥280', rate: '8.8%' }
  ]
  salesLoading.value = false
  message.success('销售数据提取成功')
}

const extractService = async () => {
  if (!serviceForm.value.storeName) {
    message.warning('请选择店铺')
    return
  }
  serviceLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  serviceLoading.value = false
  message.success('客服数据提取成功')
}

const extractAds = async () => {
  if (!adsForm.value.storeName) {
    message.warning('请选择店铺')
    return
  }
  adsLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  adsLoading.value = false
  message.success('推广数据提取成功')
}

const viewData = (item: any) => {
  message.info(`查看 ${item.type} 数据详情`)
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
