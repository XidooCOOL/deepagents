<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理已发布到各平台的商品">
      <template #extra>
        <n-space>
          <n-button @click="exportData">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出
          </n-button>
          <n-button type="primary" @click="syncProducts">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            同步商品
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
              <n-icon :size="20" color="#3b82f6"><component :is="icons.CheckmarkDone" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">已发布</div>
              <div class="text-2xl font-bold">248</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#f59e0b"><component :is="icons.Warning" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">待审核</div>
              <div class="text-2xl font-bold">12</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#ef4444"><component :is="icons.Close" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">已下架</div>
              <div class="text-2xl font-bold">35</div>
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
              <div class="text-sm text-neutral-500">在售商品</div>
              <div class="text-2xl font-bold">201</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 筛选和搜索 -->
    <n-card class="mb-6">
      <n-form inline>
        <n-form-item label="平台">
          <n-select v-model:value="filters.platform" :options="platformOptions" clearable placeholder="全部平台" style="width: 150px" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="filters.status" :options="statusOptions" clearable placeholder="全部状态" style="width: 150px" />
        </n-form-item>
        <n-form-item label="店铺">
          <n-select v-model:value="filters.store" :options="storeOptions" clearable placeholder="全部店铺" style="width: 200px" />
        </n-form-item>
        <n-form-item>
          <n-input v-model:value="filters.keyword" placeholder="搜索商品名称..." clearable style="width: 300px">
            <template #prefix>
              <n-icon><component :is="icons.Search" /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="applyFilters">
              <template #icon><n-icon><component :is="icons.Search" /></n-icon></template>
              搜索
            </n-button>
            <n-button @click="resetFilters">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>

    <!-- 商品列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="filteredProducts"
        :pagination="pagination"
        :row-selection="rowSelection"
        :loading="loading"
      >
        <template #table-row="props">
          <tr>
            <td>
              <n-checkbox :checked="props.checked" @update:checked="props.onChange" />
            </td>
            <td>
              <div class="flex items-center gap-3">
                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <n-icon :size="24" color="#a3a3a3"><component :is="icons.Image" /></n-icon>
                </div>
                <div>
                  <div class="font-medium">{{ props.row.name }}</div>
                  <div class="text-sm text-neutral-500">{{ props.row.sku }}</div>
                </div>
              </div>
            </td>
            <td>
              <n-tag :type="getPlatformType(props.row.platform)">
                {{ props.row.platform }}
              </n-tag>
            </td>
            <td>{{ props.row.store }}</td>
            <td class="font-bold text-orange-500">{{ props.row.price }}</td>
            <td>{{ props.row.stock }}</td>
            <td>
              <n-tag :type="getStatusType(props.row.status)">
                {{ props.row.status }}
              </n-tag>
            </td>
            <td>{{ props.row.publishedAt }}</td>
            <td>{{ props.row.views }}</td>
            <td>{{ props.row.sales }}</td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="viewDetail(props.row)">
                  <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" @click="editProduct(props.row)">
                  <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                </n-button>
                <n-dropdown trigger="click">
                  <template #trigger>
                    <n-button quaternary size="small">
                      <template #icon><n-icon><component :is="icons.EllipsisVertical" /></n-icon></template>
                    </n-button>
                  </template>
                  <n-dropdown-option @click="syncSingle(props.row)">
                    <div class="flex items-center gap-2">
                      <n-icon><component :is="icons.Refresh" /></n-icon>
                      <span>同步状态</span>
                    </div>
                  </n-dropdown-option>
                  <n-dropdown-option @click="copyLink(props.row)">
                    <div class="flex items-center gap-2">
                      <n-icon><component :is="icons.Link" /></n-icon>
                      <span>复制链接</span>
                    </div>
                  </n-dropdown-option>
                  <n-dropdown-option @click="offlineProduct(props.row)" type="error">
                    <div class="flex items-center gap-2">
                      <n-icon><component :is="icons.ArrowDown" /></n-icon>
                      <span>下架商品</span>
                    </div>
                  </n-dropdown-option>
                </n-dropdown>
              </n-space>
            </td>
          </tr>
        </template>
      </n-data-table>
    </n-card>

    <!-- 商品详情抽屉 -->
    <n-drawer v-model:show="showDetail" width="600" placement="right">
      <n-drawer-content title="商品详情" native-scrollbar>
        <div v-if="selectedProduct" class="space-y-6">
          <div class="flex gap-4">
            <div class="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <n-icon :size="48" color="#a3a3a3"><component :is="icons.Image" /></n-icon>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold mb-2">{{ selectedProduct.name }}</h3>
              <div class="text-2xl font-bold text-orange-500 mb-2">{{ selectedProduct.price }}</div>
              <div class="flex gap-2">
                <n-tag :type="getPlatformType(selectedProduct.platform)">{{ selectedProduct.platform }}</n-tag>
                <n-tag :type="getStatusType(selectedProduct.status)">{{ selectedProduct.status }}</n-tag>
              </div>
            </div>
          </div>

          <n-divider />

          <n-descriptions :column="1" bordered>
            <n-descriptions-item label="商品SKU">{{ selectedProduct.sku }}</n-descriptions-item>
            <n-descriptions-item label="所属店铺">{{ selectedProduct.store }}</n-descriptions-item>
            <n-descriptions-item label="库存">{{ selectedProduct.stock }}</n-descriptions-item>
            <n-descriptions-item label="发布时间">{{ selectedProduct.publishedAt }}</n-descriptions-item>
            <n-descriptions-item label="浏览量">{{ selectedProduct.views }}</n-descriptions-item>
            <n-descriptions-item label="销量">{{ selectedProduct.sales }}</n-descriptions-item>
          </n-descriptions>

          <n-divider />

          <div>
            <div class="text-sm font-medium mb-2">商品链接</div>
            <n-input readonly :value="selectedProduct.url">
              <template #suffix>
                <n-button quaternary size="small" @click="copyLink(selectedProduct)">
                  <template #icon><n-icon><component :is="icons.Copy" /></n-icon></template>
                </n-button>
              </template>
            </n-input>
          </div>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showDetail = false">关闭</n-button>
            <n-button type="primary" @click="editProduct(selectedProduct)">编辑</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '已发布商品'
const loading = ref(false)
const showDetail = ref(false)
const selectedProduct = ref<any>(null)

const filters = ref({
  platform: '',
  status: '',
  store: '',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.value.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.value.pageSize = pageSize
    pagination.value.page = 1
  }
})

const platformOptions = [
  { label: '抖音', value: '抖音' },
  { label: '拼多多', value: '拼多多' },
  { label: '淘宝', value: '淘宝' }
]

const statusOptions = [
  { label: '在售', value: '在售' },
  { label: '待审核', value: '待审核' },
  { label: '已下架', value: '已下架' },
  { label: '违规', value: '违规' }
]

const storeOptions = [
  { label: '抖音旗舰店', value: '抖音旗舰店' },
  { label: '拼多多专营店', value: '拼多多专营店' },
  { label: '淘宝C店', value: '淘宝C店' }
]

const products = ref([
  { id: 1, name: '无线蓝牙耳机 高品质音效 长续航', sku: 'SKU001', platform: '抖音', store: '抖音旗舰店', price: '¥129.00', stock: 156, status: '在售', publishedAt: '2024-01-10', views: 2580, sales: 428, url: 'https://example.com/product/1' },
  { id: 2, name: '快速无线充电器 15W快充', sku: 'SKU002', platform: '拼多多', store: '拼多多专营店', price: '¥89.00', stock: 89, status: '在售', publishedAt: '2024-01-09', views: 1890, sales: 156, url: 'https://example.com/product/2' },
  { id: 3, name: '手机数据线套装 Type-C/Micro', sku: 'SKU003', platform: '抖音', store: '抖音旗舰店', price: '¥49.00', stock: 320, status: '待审核', publishedAt: '2024-01-15', views: 0, sales: 0, url: 'https://example.com/product/3' },
  { id: 4, name: '手机支架 桌面通用款', sku: 'SKU004', platform: '淘宝', store: '淘宝C店', price: '¥29.00', stock: 1024, status: '已下架', publishedAt: '2024-01-05', views: 3240, sales: 1024, url: 'https://example.com/product/4' },
  { id: 5, name: '智能运动手表', sku: 'SKU005', platform: '抖音', store: '抖音旗舰店', price: '¥399.00', stock: 45, status: '在售', publishedAt: '2024-01-08', views: 5890, sales: 234, url: 'https://example.com/product/5' },
  { id: 6, name: '蓝牙音箱 重低音', sku: 'SKU006', platform: '拼多多', store: '拼多多专营店', price: '¥199.00', stock: 78, status: '违规', publishedAt: '2024-01-12', views: 1200, sales: 56, url: 'https://example.com/product/6' }
])

pagination.value.itemCount = products.value.length

const filteredProducts = computed(() => {
  return products.value.filter(item => {
    if (filters.value.platform && item.platform !== filters.value.platform) return false
    if (filters.value.status && item.status !== filters.value.status) return false
    if (filters.value.store && item.store !== filters.value.store) return false
    if (filters.value.keyword && !item.name.includes(filters.value.keyword)) return false
    return true
  })
})

const selectedRowKeys = ref<Array<string | number>>([])
const rowSelection = computed(() => {
  return {
    type: 'checkbox' as const,
    selectedRowKeys: selectedRowKeys.value,
    onUpdateSelectedRowKeys: (keys: Array<string | number>) => {
      selectedRowKeys.value = keys
    }
  }
})

const columns = [
  { type: 'selection', width: 50 },
  { title: '商品信息', key: 'name', width: 300 },
  { title: '平台', key: 'platform', width: 100 },
  { title: '店铺', key: 'store', width: 150 },
  { title: '价格', key: 'price', width: 120 },
  { title: '库存', key: 'stock', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '发布时间', key: 'publishedAt', width: 150 },
  { title: '浏览量', key: 'views', width: 100 },
  { title: '销量', key: 'sales', width: 100 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' as const }
]

const getPlatformType = (platform: string) => {
  const map: Record<string, any> = {
    '抖音': 'info',
    '拼多多': 'warning',
    '淘宝': 'success'
  }
  return map[platform] || 'default'
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '在售': 'success',
    '待审核': 'warning',
    '已下架': 'default',
    '违规': 'error'
  }
  return map[status] || 'default'
}

const applyFilters = () => {
  message.info('筛选已应用')
}

const resetFilters = () => {
  filters.value = { platform: '', status: '', store: '', keyword: '' }
  message.info('筛选已重置')
}

const viewDetail = (product: any) => {
  selectedProduct.value = product
  showDetail.value = true
}

const editProduct = (product: any) => {
  message.info(`编辑商品: ${product.name}`)
}

const syncProducts = async () => {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  loading.value = false
  message.success('商品同步完成')
}

const syncSingle = (product: any) => {
  message.success(`已同步: ${product.name}`)
}

const copyLink = (product: any) => {
  navigator.clipboard.writeText(product.url)
  message.success('链接已复制')
}

const offlineProduct = (product: any) => {
  message.warning(`已下架: ${product.name}`)
}

const exportData = () => {
  message.info('正在导出数据...')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
