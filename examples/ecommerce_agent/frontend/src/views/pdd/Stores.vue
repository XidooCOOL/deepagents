<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理拼多多店铺">
      <template #extra>
        <n-button type="primary" @click="showCreate = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          添加店铺
        </n-button>
      </template>
    </n-page-header>

    <!-- 店铺列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="stores"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>

    <!-- 添加店铺弹窗 -->
    <n-modal v-model:show="showCreate" preset="card" title="添加拼多多店铺" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="店铺名称">
          <n-input v-model:value="form.name" placeholder="请输入店铺名称" />
        </n-form-item>
        <n-form-item label="商家ID">
          <n-input v-model:value="form.mallId" placeholder="请输入商家ID" />
        </n-form-item>
        <n-form-item label="AccessToken">
          <n-input v-model:value="form.accessToken" type="textarea" placeholder="请输入AccessToken" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="form.remark" type="textarea" placeholder="可选备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">添加</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '店铺管理'
const showCreate = ref(false)

const form = reactive({
  name: '',
  mallId: '',
  accessToken: '',
  remark: ''
})

const columns = [
  { title: '店铺名称', key: 'name' },
  { title: '商家ID', key: 'mallId' },
  { title: '状态', key: 'status', render: (row: any) => h('n-tag', { type: row.status === '正常' ? 'success' : 'error' }, row.status) },
  { title: '最后同步', key: 'lastSync' },
  { title: '添加时间', key: 'created' },
  { title: '操作', key: 'actions', width: 180 }
]

const stores = ref([
  { id: 1, name: '拼多多旗舰店', mallId: '12345678', status: '正常', lastSync: '2024-01-01 10:30', created: '2024-01-01' },
  { id: 2, name: '拼多多专营店', mallId: '87654321', status: '正常', lastSync: '2024-01-01 09:15', created: '2024-01-02' }
])

const handleCreate = () => {
  message.success('店铺添加成功')
  showCreate.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
