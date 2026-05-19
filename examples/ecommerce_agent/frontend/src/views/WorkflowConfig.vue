<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="配置自动化工作流">
      <template #extra>
        <n-button type="primary" @click="showCreate = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          新建工作流
        </n-button>
      </template>
    </n-page-header>

    <!-- 工作流列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="workflows"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>

    <!-- 创建工作流弹窗 -->
    <n-modal v-model:show="showCreate" preset="card" title="新建工作流" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="工作流名称">
          <n-input v-model:value="form.name" placeholder="请输入工作流名称" />
        </n-form-item>
        <n-form-item label="工作流类型">
          <n-select v-model:value="form.type" :options="typeOptions" placeholder="请选择类型" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入工作流描述" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">创建</n-button>
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
const pageTitle = '工作流配置'
const showCreate = ref(false)

const form = reactive({
  name: '',
  type: '',
  description: ''
})

const typeOptions = [
  { label: '商品发布', value: 'publish' },
  { label: '订单处理', value: 'order' },
  { label: '数据同步', value: 'sync' },
  { label: '数据分析', value: 'analysis' }
]

const columns = [
  { title: '名称', key: 'name' },
  { title: '类型', key: 'type', render: (row: any) => h('n-tag', { type: 'info' }, row.type) },
  { title: '状态', key: 'status', render: (row: any) => h('n-tag', { type: row.status === '启用' ? 'success' : 'default' }, row.status) },
  { title: '最后运行', key: 'lastRun' },
  { title: '操作', key: 'actions', width: 150, render: (row: any) => h('n-space', null, {
    default: () => [
      h('n-button', { quaternary: true, size: 'small' }, { default: () => '编辑' }),
      h('n-button', { quaternary: true, size: 'small', type: 'error' }, { default: () => '删除' })
    ]
  }) }
]

const workflows = ref([
  { id: 1, name: '每日商品同步', type: '数据同步', status: '启用', lastRun: '2024-01-01 09:00' },
  { id: 2, name: '订单自动处理', type: '订单处理', status: '启用', lastRun: '2024-01-01 10:30' },
  { id: 3, name: '数据日报生成', type: '数据分析', status: '禁用', lastRun: '-' }
])

const handleCreate = () => {
  message.success('工作流创建成功')
  showCreate.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
