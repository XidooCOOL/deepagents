<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="批量发布商品到各个平台">
      <template #extra>
        <n-space>
          <n-button @click="handleSelectAll">
            <template #icon><n-icon><component :is="icons.CheckmarkDoneCircle" /></n-icon></template>
            全选
          </n-button>
          <n-button type="primary" @click="handlePublish" :loading="publishing">
            <template #icon><n-icon><component :is="icons.CloudUpload" /></n-icon></template>
            开始发布
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 发布配置 -->
    <n-card class="mb-6">
      <n-form :model="config" label-placement="left" label-width="120px">
        <n-grid :x-gap="20" :y-gap="20" cols="1 m:3">
          <n-grid-item>
            <n-form-item label="选择店铺">
              <n-select v-model:value="config.store" :options="storeOptions" placeholder="请选择店铺" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="发布平台">
              <n-select v-model:value="config.platforms" multiple :options="platformOptions" placeholder="请选择平台" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="发布模式">
              <n-select v-model:value="config.mode" :options="modeOptions" placeholder="请选择模式" />
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </n-form>
    </n-card>

    <!-- 商品列表 -->
    <n-card title="选择要发布的商品" :bordered="false">
      <n-data-table
        :columns="columns"
        :data="products"
        :row-key="(row) => row.id"
        :row-selection="rowSelection"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '批量发布'
const publishing = ref(false)

const config = reactive({
  store: '',
  platforms: [],
  mode: 'add'
})

const storeOptions = [
  { label: '抖音店铺', value: 1 },
  { label: '拼多多测试店', value: 2 }
]

const platformOptions = [
  { label: '抖音', value: 'douyin' },
  { label: '拼多多', value: 'pinduoduo' },
  { label: '淘宝', value: 'taobao' }
]

const modeOptions = [
  { label: '新增商品', value: 'add' },
  { label: '更新商品', value: 'update' },
  { label: '新增并更新', value: 'both' }
]

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
  { type: 'selection' as const },
  { title: '商品名称', key: 'name', minWidth: 200 },
  { title: '价格', key: 'price', width: 120 },
  { title: '库存', key: 'stock', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '已发布平台', key: 'platforms', width: 200 }
]

const products = ref([
  { id: 1, name: '无线蓝牙耳机 高品质音效 长续航', price: '¥129.00', stock: 156, status: '未发布', platforms: '-' },
  { id: 2, name: '快速无线充电器 15W快充', price: '¥89.00', stock: 89, status: '已发布', platforms: '抖音' },
  { id: 3, name: '手机数据线套装 Type-C/Micro', price: '¥49.00', stock: 320, status: '未发布', platforms: '-' },
  { id: 4, name: '手机支架 桌面通用款', price: '¥29.00', stock: 1024, status: '已发布', platforms: '抖音, 拼多多' }
])

const handleSelectAll = () => {
  if (selectedRowKeys.value.length === products.value.length) {
    selectedRowKeys.value = []
  } else {
    selectedRowKeys.value = products.value.map(p => p.id)
  }
}

const handlePublish = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要发布的商品')
    return
  }
  
  publishing.value = true
  
  // 模拟发布
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  message.success(`成功发布 ${selectedRowKeys.value.length} 个商品`)
  publishing.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
