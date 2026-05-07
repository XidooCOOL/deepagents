<template>
  <div class="published-products">
    <div class="page-header">
      <h2>📋 已发布商品</h2>
      <p class="subtitle">查看和管理所有已发布的商品</p>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">商品总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card published">
          <div class="stat-value">{{ stats.published }}</div>
          <div class="stat-label">已上架</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card offline">
          <div class="stat-value">{{ stats.offline }}</div>
          <div class="stat-label">已下架</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.totalSales }}</div>
          <div class="stat-label">总销量</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品..."
              style="width: 200px;"
              clearable
              @keyup.enter="searchProducts"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="filterPlatform" placeholder="筛选平台" clearable style="width: 120px;">
              <el-option label="抖音" value="douyin" />
              <el-option label="拼多多" value="pinduoduo" />
              <el-option label="淘宝" value="taobao" />
              <el-option label="京东" value="jd" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="筛选状态" clearable style="width: 120px;">
              <el-option label="已上架" value="published" />
              <el-option label="已下架" value="offline" />
            </el-select>
            <el-button type="primary" @click="searchProducts" icon="Search">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="products" border stripe v-loading="loading">
        <el-table-column type="index" width="50" />
        <el-table-column label="商品信息" min-width="250">
          <template #default="scope">
            <div class="product-info">
              <el-image
                v-if="scope.row.images && scope.row.images.length > 0"
                :src="getImageUrl(scope.row.images[0])"
                fit="cover"
                style="width: 60px; height: 60px; border-radius: 4px;"
              />
              <div v-else class="no-image">无图</div>
              <div class="product-details">
                <div class="product-title">{{ scope.row.title }}</div>
                <div class="product-id">{{ scope.row.platform_product_id }}</div>
                <el-tag size="small" :type="getPlatformTagType(scope.row.platform)">
                  {{ getPlatformName(scope.row.platform) }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="120">
          <template #default="scope">
            <div class="price">¥{{ scope.row.price }}</div>
            <div v-if="scope.row.original_price" class="original-price">
              ¥{{ scope.row.original_price }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="平台商品ID" min-width="180">
          <template #default="scope">
            <div class="platform-id">{{ scope.row.platform_product_id }}</div>
            <el-link
              v-if="scope.row.platform_url"
              :href="scope.row.platform_url"
              target="_blank"
              type="primary"
              size="small"
            >
              打开链接
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="店铺" width="120">
          <template #default="scope">
            {{ scope.row.store_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="SKU" width="80" align="center">
          <template #default="scope">
            {{ scope.row.sku_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.published_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row)">
              详情
            </el-button>
            <el-button
              v-if="scope.row.status === 'published'"
              size="small"
              type="warning"
              @click="offlineProduct(scope.row)"
            >
              下架
            </el-button>
            <el-button
              v-else
              size="small"
              type="success"
              @click="relistProduct(scope.row)"
            >
              上架
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadProducts"
        @size-change="loadProducts"
        style="margin-top: 20px; justify-content: center;"
      />
    </el-card>

    <!-- 商品详情对话框 -->
    <el-dialog v-model="showDetail" title="商品详情" width="800px">
      <div v-if="selectedProduct" class="product-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商品标题" :span="2">
            {{ selectedProduct.title }}
          </el-descriptions-item>
          <el-descriptions-item label="平台商品ID">
            {{ selectedProduct.platform_product_id }}
          </el-descriptions-item>
          <el-descriptions-item label="平台">
            <el-tag>{{ getPlatformName(selectedProduct.platform) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="价格">
            ¥{{ selectedProduct.price }}
          </el-descriptions-item>
          <el-descriptions-item label="原价">
            ¥{{ selectedProduct.original_price || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="店铺">
            {{ selectedProduct.store_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedProduct.status)">
              {{ getStatusText(selectedProduct.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="SKU数量">
            {{ selectedProduct.sku_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="发布时间" :span="2">
            {{ formatDate(selectedProduct.published_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="商品链接" :span="2">
            <el-link v-if="selectedProduct.platform_url" :href="selectedProduct.platform_url" target="_blank" type="primary">
              {{ selectedProduct.platform_url }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>商品图片</el-divider>
        <div class="images-gallery">
          <el-image
            v-for="(img, index) in selectedProduct.images"
            :key="index"
            :src="getImageUrl(img)"
            fit="cover"
            style="width: 100px; height: 100px; margin: 5px; border-radius: 4px;"
            :preview-src-list="selectedProduct.images.map(i => getImageUrl(i))"
          />
          <span v-if="!selectedProduct.images || selectedProduct.images.length === 0">暂无图片</span>
        </div>

        <el-divider>SKU 信息</el-divider>
        <el-table v-if="selectedProduct.sku_data && selectedProduct.sku_data.length > 0" :data="selectedProduct.sku_data" border size="small">
          <el-table-column prop="skuId" label="SKU编号" />
          <el-table-column prop="specs" label="规格" />
          <el-table-column prop="stock" label="库存" />
        </el-table>
        <span v-else>暂无 SKU 信息</span>

        <el-divider>来源信息</el-divider>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="来源文件夹">
            {{ selectedProduct.source_folder || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="发布模板">
            {{ selectedProduct.template_id || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="任务ID">
            {{ selectedProduct.task_id || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import axios from 'axios'

const loading = ref(false)
const products = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchKeyword = ref('')
const filterPlatform = ref('')
const filterStatus = ref('')

const showDetail = ref(false)
const selectedProduct = ref<any>(null)

const stats = ref({
  total: 0,
  published: 0,
  offline: 0,
  totalSales: 0
})

const loadProducts = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    if (filterPlatform.value) {
      params.platform = filterPlatform.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    const response = await axios.get('/api/published/products', { params })
    products.value = response.data
    total.value = response.data.length // 简化，实际应该从接口返回 total
  } catch (error) {
    console.error('加载商品失败:', error)
    // 使用模拟数据
    products.value = generateMockData()
    total.value = products.value.length
  }
  loading.value = false
}

const loadStats = async () => {
  try {
    const response = await axios.get('/api/published/stats')
    stats.value = response.data
  } catch (error) {
    // 使用模拟数据
    stats.value = {
      total: products.value.length,
      published: products.value.filter(p => p.status === 'published').length,
      offline: products.value.filter(p => p.status === 'offline').length,
      totalSales: 156
    }
  }
}

const searchProducts = () => {
  currentPage.value = 1
  loadProducts()
}

const viewDetail = (product: any) => {
  selectedProduct.value = product
  showDetail.value = true
}

const offlineProduct = async (product: any) => {
  try {
    await ElMessageBox.confirm(
      `确定下架商品 "${product.title}" 吗？`,
      '下架确认',
      {
        confirmButtonText: '确定下架',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await axios.post(`/api/published/offline/${product.id}`)
    ElMessage.success('商品已下架')
    loadProducts()
    loadStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('下架失败')
    }
  }
}

const relistProduct = async (product: any) => {
  try {
    await axios.post(`/api/published/relist/${product.id}`)
    ElMessage.success('商品已重新上架')
    loadProducts()
    loadStats()
  } catch (error) {
    ElMessage.error('上架失败')
  }
}

const getPlatformName = (platform: string): string => {
  const names: Record<string, string> = {
    'douyin': '抖音',
    'pinduoduo': '拼多多',
    'taobao': '淘宝',
    'jd': '京东',
    '抖音': '抖音',
    '拼多多': '拼多多',
    '淘宝': '淘宝',
    '京东': '京东'
  }
  return names[platform] || platform
}

const getPlatformTagType = (platform: string): string => {
  const types: Record<string, string> = {
    'douyin': 'danger',
    'pinduoduo': 'warning',
    'taobao': 'primary',
    'jd': 'danger'
  }
  return types[platform] || 'info'
}

const getStatusType = (status: string): string => {
  const types: Record<string, string> = {
    'published': 'success',
    'offline': 'warning',
    'deleted': 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    'published': '已上架',
    'offline': '已下架',
    'deleted': '已删除'
  }
  return texts[status] || status
}

const formatDate = (date: string): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

const getImageUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/product-library/image?filename=${encodeURIComponent(path)}`
}

const generateMockData = () => {
  return [
    {
      id: 1,
      title: '2024夏季新款运动鞋透气跑步鞋',
      platform_product_id: 'DY-1718001234567-100',
      platform_url: 'https://creator.douyin.com/product/DY-1718001234567-100',
      platform: 'douyin',
      store_name: '抖音旗舰店',
      price: 299.00,
      original_price: 399.00,
      sku_count: 3,
      sku_data: [
        { skuId: 'SKU001', specs: '红色/M', stock: 100 },
        { skuId: 'SKU002', specs: '红色/L', stock: 80 },
        { skuId: 'SKU003', specs: '蓝色/M', stock: 120 }
      ],
      images: [],
      status: 'published',
      published_at: '2024-06-10T10:30:00'
    },
    {
      id: 2,
      title: '智能蓝牙耳机Pro降噪耳机',
      platform_product_id: 'PPD-1718002345678-200',
      platform_url: 'https://mms.pinduoduo.com/goods/PPD-1718002345678-200',
      platform: 'pinduoduo',
      store_name: '拼多多专营店',
      price: 199.00,
      original_price: 299.00,
      sku_count: 2,
      sku_data: [
        { skuId: 'SKU004', specs: '黑色/标准版', stock: 50 },
        { skuId: 'SKU005', specs: '白色/升级版', stock: 30 }
      ],
      images: [],
      status: 'published',
      published_at: '2024-06-11T14:20:00'
    },
    {
      id: 3,
      title: '家用收纳箱套装大容量储物盒',
      platform_product_id: 'TB-1718003456789-300',
      platform_url: 'https://upload.taobao.com/item/TB-1718003456789-300',
      platform: 'taobao',
      store_name: '淘宝皇冠店',
      price: 89.00,
      original_price: 129.00,
      sku_count: 1,
      sku_data: [
        { skuId: 'SKU006', specs: '标准装', stock: 200 }
      ],
      images: [],
      status: 'offline',
      published_at: '2024-06-08T09:15:00'
    }
  ]
}

// 监听筛选条件变化
watch([filterPlatform, filterStatus], () => {
  searchProducts()
})

onMounted(() => {
  loadProducts()
  loadStats()
})
</script>

<style scoped>
.published-products {
  @apply p-6 bg-gray-50 min-h-screen;
}

.page-header {
  @apply mb-8;
}

.page-header h2 {
  @apply m-0 mb-2 text-2xl font-bold text-gray-800;
}

.subtitle {
  @apply text-gray-400 m-0;
}

.stats-row {
  @apply mb-5;
}

.stat-card {
  @apply text-center p-5 rounded-xl;
}

.stat-card .stat-value {
  @apply text-3xl font-bold text-blue-500;
}

.stat-card .stat-label {
  @apply text-gray-400 mt-1;
}

.stat-card.published .stat-value { @apply text-green-500; }
.stat-card.offline .stat-value { @apply text-yellow-500; }

.card-header {
  @apply flex justify-between items-center;
}

.header-actions {
  @apply flex gap-3 items-center;
}

.product-info {
  @apply flex gap-3;
}

.product-details {
  @apply flex-1;
}

.product-title {
  @apply font-medium mb-1;
}

.product-id {
  @apply text-xs text-gray-400 mb-1;
}

.no-image {
  @apply w-14 h-14 bg-gray-100 flex items-center justify-center rounded text-gray-400 text-xs;
}

.price {
  @apply font-bold text-red-500 text-lg;
}

.original-price {
  @apply line-through text-gray-400 text-xs;
}

.platform-id {
  font-family: 'JetBrains Mono', monospace;
  @apply text-sm text-gray-500 mb-1;
}

.product-detail {
  @apply p-3;
}

.images-gallery {
  @apply flex flex-wrap gap-3;
}
</style>
