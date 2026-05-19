<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理商品库">
      <template #extra>
        <n-space>
          <n-button @click="handleImport">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导入商品
          </n-button>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
            添加商品
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 搜索和过滤 -->
    <n-card class="mb-6">
      <n-space>
        <n-input v-model:value="searchKeyword" placeholder="搜索商品..." style="width: 300px" clearable />
        <n-select v-model:value="categoryFilter" :options="categoryOptions" style="width: 150px" clearable placeholder="分类" />
        <n-select v-model:value="statusFilter" :options="statusOptions" style="width: 150px" clearable placeholder="状态" />
        <n-button type="primary">
          <template #icon><n-icon><component :is="icons.Search" /></n-icon></template>
          搜索
        </n-button>
      </n-space>
    </n-card>

    <!-- 商品网格 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:3 l:4">
      <n-grid-item v-for="item in products" :key="item.id">
        <n-card hoverable :bordered="false">
          <div class="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-4 flex items-center justify-center">
            <n-icon :size="48" color="#a3a3a3"><component :is="icons.Image" /></n-icon>
          </div>
          <div class="font-medium text-neutral-900 dark:text-white mb-1 truncate">{{ item.name }}</div>
          <div class="text-sm text-neutral-500 mb-2">{{ item.category }}</div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-lg font-bold text-orange-500">{{ item.price }}</span>
            <n-tag size="small" :type="item.status === '可发布' ? 'success' : 'default'">{{ item.status }}</n-tag>
          </div>
          <div class="flex items-center justify-between text-sm text-neutral-500">
            <span>库存: {{ item.stock }}</span>
            <span>成本: {{ item.cost }}</span>
          </div>
          <n-divider style="margin: 12px 0" />
          <n-space justify="end">
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
            </n-button>
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.CloudUpload" /></n-icon></template>
            </n-button>
            <n-button quaternary size="small" type="error">
              <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 分页 -->
    <div class="flex justify-center mt-6">
      <n-pagination :page-count="5" />
    </div>

    <!-- 添加商品弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="添加商品" style="width: 700px">
      <n-form :model="form" label-placement="left" label-width="100px">
        <n-grid :x-gap="20" :y-gap="20" cols="1 m:2">
          <n-grid-item>
            <n-form-item label="商品名称">
              <n-input v-model:value="form.name" placeholder="请输入商品名称" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="商品分类">
              <n-select v-model:value="form.category" :options="categoryOptions" placeholder="请选择分类" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="销售价格">
              <n-input v-model:value="form.price" placeholder="请输入销售价格" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="成本价格">
              <n-input v-model:value="form.cost" placeholder="请输入成本价格" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="库存数量">
              <n-input-number v-model:value="form.stock" :min="0" style="width: 100%" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="SKU编码">
              <n-input v-model:value="form.sku" placeholder="请输入SKU编码" />
            </n-form-item>
          </n-grid-item>
        </n-grid>
        <n-form-item label="商品描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入商品描述" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">添加</n-button>
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
const pageTitle = '商品库'
const showCreateModal = ref(false)
const searchKeyword = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')

const form = reactive({
  name: '',
  category: '',
  price: '',
  cost: '',
  stock: 0,
  sku: '',
  description: ''
})

const categoryOptions = [
  { label: '数码产品', value: 'digital' },
  { label: '服装', value: 'clothing' },
  { label: '食品', value: 'food' },
  { label: '家居', value: 'home' }
]

const statusOptions = [
  { label: '可发布', value: 'ready' },
  { label: '草稿', value: 'draft' },
  { label: '已下架', value: 'offline' }
]

const products = ref([
  { id: 1, name: '无线蓝牙耳机 高品质音效 长续航', category: '数码产品', price: '¥129.00', cost: '¥45.00', status: '可发布', stock: 156 },
  { id: 2, name: '快速无线充电器 15W快充', category: '数码产品', price: '¥89.00', cost: '¥25.00', status: '可发布', stock: 89 },
  { id: 3, name: '手机数据线套装 Type-C/Micro', category: '数码产品', price: '¥49.00', cost: '¥8.00', status: '草稿', stock: 320 },
  { id: 4, name: '手机支架 桌面通用款', category: '数码产品', price: '¥29.00', cost: '¥5.00', status: '已下架', stock: 1024 },
  { id: 5, name: '智能运动手表', category: '数码产品', price: '¥399.00', cost: '¥120.00', status: '可发布', stock: 45 }
])

const handleCreate = () => {
  message.success('商品添加成功')
  showCreateModal.value = false
}

const handleImport = () => {
  message.info('导入功能待实现')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
