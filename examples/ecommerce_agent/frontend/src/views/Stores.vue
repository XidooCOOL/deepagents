<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理您的电商店铺">
      <template #extra>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          添加店铺
        </n-button>
      </template>
    </n-page-header>

    <n-card class="mb-6">
      <n-data-table
        :columns="columns"
        :data="stores"
        :pagination="{ pageSize: 10 }"
        :loading="loading"
      >
        <template #table-row>
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <n-avatar :size="32" round>
                  <component :is="icons.Storefront" />
                </n-avatar>
                <div>
                  <div class="font-medium">抖音店铺</div>
                  <div class="text-xs text-neutral-500">douyin.com</div>
                </div>
              </div>
            </td>
            <td><n-tag type="success">已连接</n-tag></td>
            <td>2024-01-01</td>
            <td>
              <n-space>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" type="error">
                  <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
                </n-button>
              </n-space>
            </td>
          </tr>
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <n-avatar :size="32" round>
                  <component :is="icons.Storefront" />
                </n-avatar>
                <div>
                  <div class="font-medium">拼多多测试店</div>
                  <div class="text-xs text-neutral-500">pinduoduo.com</div>
                </div>
              </div>
            </td>
            <td><n-tag type="warning">待连接</n-tag></td>
            <td>2024-01-15</td>
            <td>
              <n-space>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" type="error">
                  <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
                </n-button>
              </n-space>
            </td>
          </tr>
        </template>
      </n-data-table>
    </n-card>

    <!-- 创建店铺弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="添加新店铺" style="width: 500px">
      <n-form :model="form" label-placement="left" label-width="80px">
        <n-form-item label="店铺名称">
          <n-input v-model:value="form.name" placeholder="请输入店铺名称" />
        </n-form-item>
        <n-form-item label="平台">
          <n-select v-model:value="form.platform" :options="platformOptions" placeholder="请选择平台" />
        </n-form-item>
        <n-form-item label="用户名">
          <n-input v-model:value="form.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="请输入密码" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">确定</n-button>
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
const pageTitle = '店铺管理'
const loading = ref(false)
const showCreateModal = ref(false)

const form = reactive({
  name: '',
  platform: '',
  username: '',
  password: ''
})

const platformOptions = [
  { label: '抖音', value: 'douyin' },
  { label: '拼多多', value: 'pinduoduo' },
  { label: '淘宝', value: 'taobao' }
]

const columns = [
  { title: '店铺信息', key: 'name' },
  { title: '状态', key: 'status', width: 120 },
  { title: '添加时间', key: 'created', width: 180 },
  { title: '操作', key: 'actions', width: 180 }
]

const stores = [
  { id: 1, name: '抖音店铺', platform: 'douyin', status: 'connected', created: '2024-01-01' },
  { id: 2, name: '拼多多测试店', platform: 'pinduoduo', status: 'pending', created: '2024-01-15' }
]

const handleCreate = () => {
  message.success('店铺添加成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
