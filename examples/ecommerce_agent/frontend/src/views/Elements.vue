<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理DOM元素选择器">
      <template #extra>
        <n-space>
          <n-button @click="handleImport">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导入
          </n-button>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
            添加元素
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 筛选 -->
    <n-card class="mb-6">
      <n-space>
        <n-select v-model:value="platformFilter" :options="platformOptions" style="width: 150px" clearable placeholder="平台" />
        <n-select v-model:value="pageFilter" :options="pageOptions" style="width: 150px" clearable placeholder="页面" />
        <n-input v-model:value="searchKeyword" placeholder="搜索元素..." style="width: 250px" clearable />
        <n-button type="primary">
          <template #icon><n-icon><component :is="icons.Search" /></n-icon></template>
          搜索
        </n-button>
      </n-space>
    </n-card>

    <!-- 元素列表 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="elements"
        :pagination="{ pageSize: 10 }"
      />
    </n-card>

    <!-- 创建元素弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="添加DOM元素" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="选择平台">
          <n-select v-model:value="form.platform" :options="platformOptions" placeholder="请选择平台" />
        </n-form-item>
        <n-form-item label="页面名称">
          <n-select v-model:value="form.page" :options="pageOptions" placeholder="请选择页面" />
        </n-form-item>
        <n-form-item label="元素名称">
          <n-input v-model:value="form.name" placeholder="例如: login_btn" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入描述" />
        </n-form-item>
        <n-form-item label="选择器类型">
          <n-radio-group v-model:value="form.selectorType">
            <n-space>
              <n-radio value="css">CSS选择器</n-radio>
              <n-radio value="xpath">XPath</n-radio>
              <n-radio value="text">文本内容</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="选择器值">
          <n-input v-model:value="form.selector" placeholder="例如: #submit_btn" />
        </n-form-item>
        <n-form-item label="备用选择器">
          <n-input v-model:value="form.backupSelectors" type="textarea" placeholder="一个一行，作为备用选择器" />
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
const pageTitle = '元素管理'
const showCreateModal = ref(false)
const platformFilter = ref('')
const pageFilter = ref('')
const searchKeyword = ref('')

const form = reactive({
  platform: '',
  page: '',
  name: '',
  description: '',
  selectorType: 'css',
  selector: '',
  backupSelectors: ''
})

const platformOptions = [
  { label: '抖音', value: 'douyin' },
  { label: '拼多多', value: 'pinduoduo' },
  { label: '淘宝', value: 'taobao' }
]

const pageOptions = [
  { label: '登录页', value: 'login' },
  { label: '首页', value: 'home' },
  { label: '商品发布', value: 'publish' },
  { label: '订单列表', value: 'orders' }
]

const columns = [
  { title: '平台', key: 'platform', width: 100 },
  { title: '页面', key: 'page', width: 120 },
  { title: '名称', key: 'name', width: 150 },
  { title: '描述', key: 'description', minWidth: 150 },
  { title: '类型', key: 'type', width: 100 },
  { title: '选择器', key: 'selector', width: 200 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 150 }
]

const elements = ref([
  { id: 1, platform: '抖音', page: '登录页', name: 'username_input', description: '用户名输入框', type: 'CSS', selector: '#username', status: '正常' },
  { id: 2, platform: '抖音', page: '登录页', name: 'password_input', description: '密码输入框', type: 'CSS', selector: '#password', status: '正常' },
  { id: 3, platform: '抖音', page: '登录页', name: 'login_btn', description: '登录按钮', type: 'CSS', selector: '#login-btn', status: '正常' },
  { id: 4, platform: '拼多多', page: '商品发布', name: 'title_input', description: '商品标题输入框', type: 'XPath', selector: '//input[@name="title"]', status: '待验证' }
])

const handleCreate = () => {
  message.success('DOM元素添加成功')
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
