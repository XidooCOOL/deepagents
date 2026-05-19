<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理自动化技能">
      <template #extra>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          添加技能
        </n-button>
      </template>
    </n-page-header>

    <!-- 技能列表 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:3">
      <n-grid-item v-for="skill in skills" :key="skill.id">
        <n-card hoverable :bordered="false">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
              <n-icon :size="24" color="white"><component :is="getIcon(skill.icon)" /></n-icon>
            </div>
            <div class="flex-1">
              <div class="font-medium text-lg mb-1">{{ skill.name }}</div>
              <div class="text-sm text-neutral-500">{{ skill.description }}</div>
            </div>
          </div>
          
          <div class="space-y-2 mb-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">分类</span>
              <n-tag size="small">{{ skill.category }}</n-tag>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">版本</span>
              <span>{{ skill.version }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-neutral-500">状态</span>
              <n-tag size="small" type="success">{{ skill.status }}</n-tag>
            </div>
          </div>

          <n-divider style="margin: 12px 0" />

          <n-space justify="end">
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
              测试
            </n-button>
            <n-button quaternary size="small">
              <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
              编辑
            </n-button>
            <n-button quaternary size="small" type="error">
              <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 添加技能弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="添加技能" style="width: 600px">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="技能名称">
          <n-input v-model:value="form.name" placeholder="请输入技能名称" />
        </n-form-item>
        <n-form-item label="技能分类">
          <n-select v-model:value="form.category" :options="categoryOptions" placeholder="请选择分类" />
        </n-form-item>
        <n-form-item label="技能描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入技能描述" />
        </n-form-item>
        <n-form-item label="技能代码">
          <n-input v-model:value="form.code" type="textarea" placeholder="// 在这里编写技能代码" style="min-height: 200px" />
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
import { ref, reactive, h } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '技能管理'
const showCreateModal = ref(false)

const form = reactive({
  name: '',
  category: '',
  description: '',
  code: ''
})

const categoryOptions = [
  { label: '登录认证', value: 'auth' },
  { label: '商品操作', value: 'product' },
  { label: '订单管理', value: 'order' },
  { label: '数据处理', value: 'data' },
  { label: '工具函数', value: 'util' }
]

const skills = ref([
  { id: 1, name: '抖音登录', icon: 'login', category: '登录认证', description: '自动登录抖音商家后台', version: 'v1.2.0', status: '已启用' },
  { id: 2, name: '拼多多登录', icon: 'login', category: '登录认证', description: '自动登录拼多多商家后台', version: 'v1.0.5', status: '已启用' },
  { id: 3, name: '发布商品', icon: 'cloud_upload', category: '商品操作', description: '自动发布商品到平台', version: 'v2.1.0', status: '已启用' },
  { id: 4, name: '抓取订单', icon: 'download', category: '订单管理', description: '抓取并解析订单数据', version: 'v1.5.0', status: '已启用' },
  { id: 5, name: '图片上传', icon: 'image', category: '商品操作', description: '自动上传商品图片', version: 'v1.0.0', status: '测试中' },
  { id: 6, name: '数据分析', icon: 'bar_chart', category: '数据处理', description: '分析销售数据生成报告', version: 'v0.9.0', status: '开发中' }
])

const getIcon = (name: string) => {
  const iconMap: Record<string, any> = {
    login: icons.LogIn,
    cloud_upload: icons.CloudUpload,
    download: icons.Download,
    image: icons.Image,
    bar_chart: icons.BarChart
  }
  return iconMap[name] || icons.Hammer
}

const handleCreate = () => {
  message.success('技能添加成功')
  showCreateModal.value = false
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
