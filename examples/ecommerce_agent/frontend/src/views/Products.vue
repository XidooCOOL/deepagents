<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理您的商品库">
      <template #extra>
        <n-space>
          <n-button @click="$router.push('/product-publish')">
            <template #icon><n-icon><component :is="icons.CloudUpload" /></n-icon></template>
            批量发布
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
        <n-select v-model:value="platformFilter" :options="platformOptions" style="width: 150px" clearable placeholder="平台" />
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
          <div class="flex items-center justify-between mb-3">
            <span class="text-lg font-bold text-orange-500">{{ item.price }}</span>
            <n-tag size="small" :type="item.status === '上架' ? 'success' : 'default'">{{ item.status }}</n-tag>
          </div>
          <div class="flex items-center justify-between text-sm text-neutral-500">
            <span>库存: {{ item.stock }}</span>
            <span>销量: {{ item.sales }}</span>
          </div>
          <n-divider style="margin: 12px 0" />
          <n-space justify="end">
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
            </n-button>
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.ShareSocial" /></n-icon></template>
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 分页 -->
    <div class="flex justify-center mt-6">
      <n-pagination :page-count="10" />
    </div>

    <!-- 添加商品弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="添加新商品" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="100px">
        <n-form-item label="商品名称">
          <n-input v-model:value="form.name" placeholder="请输入商品名称" />
        </n-form-item>
        <n-form-item label="商品分类">
          <n-select v-model:value="form.category" :options="categoryOptions" placeholder="请选择分类" />
        </n-form-item>
        <n-form-item label="商品价格">
          <n-input v-model:value="form.price" placeholder="请输入价格" />
        </n-form-item>
        <n-form-item label="库存数量">
          <n-input-number v-model:value="form.stock" :min="0" style="width: 100%" />
        </n-form-item>
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
const pageTitle = '商品管理'
const showCreateModal = ref(false)
const searchKeyword = ref('')
const platformFilter = ref('')
const statusFilter = ref('')

const form = reactive({
  name: '',
  category: '',
  price: '',
  stock: 0,
  description: ''
})

const platformOptions = [
  { label: '抖音', value: 'douyin' },
  { label: '拼多多', value: 'pinduoduo' },
  { label: '淘宝', value: 'taobao' }
]

const statusOptions = [
  { label: '上架', value: 'online' },
  { label: '下架', value: 'offline' }
]

const categoryOptions = [
  { label: '数码产品', value: 'digital' },
  { label: '服装', value: 'clothing' },
  { label: '食品', value: 'food' },
  { label: '家居', value: 'home' }
]

const products = ref([
  {
    id: 1,
    name: '无线蓝牙耳机 高品质音效 长续航',
    price: '¥129.00',
    status: '上架',
    stock: 156,
    sales: 428
  },
  {
    id: 2,
    name: '快速无线充电器 15W快充',
    price: '¥89.00',
    status: '上架',
    stock: 89,
    sales: 156
  },
  {
    id: 3,
    name: '手机数据线套装 Type-C/Micro',
    price: '¥49.00',
    status: '上架',
    stock: 320,
    sales: 892
  },
  {
    id: 4,
    name: '手机支架 桌面通用款',
    price: '¥29.00',
    status: '下架',
    stock: 0,
    sales: 1024
  }
])

const handleCreate = () => {
  message.success('商品添加成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
