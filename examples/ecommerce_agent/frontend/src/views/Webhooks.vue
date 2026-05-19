<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理Webhook配置">
      <template #extra>
        <n-button type="primary" @click="showCreate = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          添加Webhook
        </n-button>
      </template>
    </n-page-header>

    <!-- Webhook列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="webhooks"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>

    <!-- 创建Webhook弹窗 -->
    <n-modal v-model:show="showCreate" preset="card" title="添加Webhook" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="Webhook名称">
          <n-input v-model:value="form.name" placeholder="请输入Webhook名称" />
        </n-form-item>
        <n-form-item label="URL">
          <n-input v-model:value="form.url" placeholder="https://example.com/webhook" />
        </n-form-item>
        <n-form-item label="触发事件">
          <n-checkbox-group v-model:value="form.events">
            <n-space vertical>
              <n-checkbox value="task.created">任务创建</n-checkbox>
              <n-checkbox value="task.completed">任务完成</n-checkbox>
              <n-checkbox value="task.failed">任务失败</n-checkbox>
              <n-checkbox value="order.created">新订单</n-checkbox>
              <n-checkbox value="product.published">商品发布</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item label="密钥（可选）">
          <n-input v-model:value="form.secret" type="password" placeholder="用于签名验证" />
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
const pageTitle = 'Webhook管理'
const showCreate = ref(false)

const form = reactive({
  name: '',
  url: '',
  events: [] as string[],
  secret: ''
})

const columns = [
  { title: '名称', key: 'name' },
  { title: 'URL', key: 'url' },
  { title: '触发事件', key: 'events', render: (row: any) => row.events.map((e: string) => h('n-tag', { size: 'small', style: 'margin-right: 4px' }, e)) },
  { title: '状态', key: 'status', render: (row: any) => h('n-tag', { type: row.status === '启用' ? 'success' : 'default' }, row.status) },
  { title: '最后触发', key: 'lastTrigger' },
  { title: '操作', key: 'actions', width: 180 }
]

const webhooks = ref([
  { id: 1, name: '通知中心', url: 'https://example.com/hook', events: ['task.completed', 'task.failed'], status: '启用', lastTrigger: '2024-01-01 10:30' },
  { id: 2, name: '数据同步', url: 'https://api.example.com/sync', events: ['order.created'], status: '启用', lastTrigger: '2024-01-01 09:15' }
])

const handleCreate = () => {
  message.success('Webhook添加成功')
  showCreate.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
