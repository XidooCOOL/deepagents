<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理拼多多店铺的商品评论">
      <template #extra>
        <n-space>
          <n-button @click="exportComments">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出评论
          </n-button>
          <n-button type="primary" @click="refreshComments">
            <template #icon><n-icon><component :is="icons.Refresh" /></n-icon></template>
            刷新评论
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 统计卡片 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#3b82f6"><component :is="icons.Chatbubble" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">总评论数</div>
              <div class="text-2xl font-bold">{{ stats.total }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#10b981"><component :is="icons.Star" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">好评数</div>
              <div class="text-2xl font-bold">{{ stats.positive }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#f59e0b"><component :is="icons.AlertCircle" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">中评数</div>
              <div class="text-2xl font-bold">{{ stats.neutral }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <n-icon :size="20" color="#ef4444"><component :is="icons.ThumbsDown" /></n-icon>
            </div>
            <div>
              <div class="text-sm text-neutral-500">差评数</div>
              <div class="text-2xl font-bold">{{ stats.negative }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 筛选区域 -->
    <n-card class="mb-6">
      <n-form inline>
        <n-form-item label="店铺">
          <n-select v-model:value="filters.store" :options="storeOptions" placeholder="全部店铺" clearable style="width: 200px" />
        </n-form-item>
        <n-form-item label="商品">
          <n-select v-model:value="filters.product" :options="productOptions" placeholder="全部商品" clearable style="width: 250px" />
        </n-form-item>
        <n-form-item label="评论类型">
          <n-select v-model:value="filters.type" :options="typeOptions" placeholder="全部类型" clearable style="width: 150px" />
        </n-form-item>
        <n-form-item label="日期范围">
          <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable style="width: 250px" />
        </n-form-item>
        <n-form-item label="关键词">
          <n-input v-model:value="filters.keyword" placeholder="搜索评论内容..." clearable style="width: 200px">
            <template #prefix>
              <n-icon><component :is="icons.Search" /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="applyFilters">
              <template #icon><n-icon><component :is="icons.Search" /></n-icon></template>
              搜索
            </n-button>
            <n-button @click="resetFilters">重置</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>

    <!-- 评论列表 -->
    <n-card title="评论列表">
      <template #header-extra>
        <n-space>
          <n-button size="small" @click="handleBatchReply">
            <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
            批量回复
          </n-button>
          <n-button size="small" type="error" @click="handleBatchDelete">
            <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
            批量删除
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="commentColumns"
        :data="comments"
        :pagination="pagination"
        :row-selection="rowSelection"
      >
        <template #table-row="props">
          <tr>
            <td>
              <n-checkbox :checked="props.row.selected" @update:checked="props.onChange" />
            </td>
            <td>
              <div class="flex items-center gap-2">
                <div class="flex">
                  <n-star v-for="i in 5" :key="i" :value="i <= props.row.rating ? 1 : 0" readonly />
                </div>
                <n-tag :type="getTagType(props.row.type)" size="small">
                  {{ props.row.type }}
                </n-tag>
              </div>
            </td>
            <td>{{ props.row.productName }}</td>
            <td>{{ props.row.storeName }}</td>
            <td>
              <div class="max-w-400">
                <p class="text-sm line-clamp-2">{{ props.row.content }}</p>
                <div v-if="props.row.images && props.row.images.length > 0" class="flex gap-2 mt-2">
                  <div v-for="(img, idx) in props.row.images.slice(0, 3)" :key="idx" class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer" @click="previewImage(img)">
                    <n-icon :size="18" color="#a3a3a3"><component :is="icons.Image" /></n-icon>
                  </div>
                  <div v-if="props.row.images.length > 3" class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <span class="text-xs text-neutral-500">+{{ props.row.images.length - 3 }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>{{ props.row.buyerName }}</td>
            <td>{{ props.row.createTime }}</td>
            <td>
              <n-tag :type="props.row.replied ? 'success' : 'default'" size="small">
                {{ props.row.replied ? '已回复' : '未回复' }}
              </n-tag>
            </td>
            <td>
              <n-space>
                <n-button quaternary size="small" @click="viewDetail(props.row)">
                  <template #icon><n-icon><component :is="icons.Eye" /></n-icon></template>
                </n-button>
                <n-button quaternary size="small" @click="replyComment(props.row)">
                  <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
                </n-button>
              </n-space>
            </td>
          </tr>
        </template>
      </n-data-table>
    </n-card>

    <!-- 回复弹窗 -->
    <n-modal v-model:show="showReplyModal" preset="card" title="回复评论" style="width: 500px">
      <div v-if="selectedComment" class="space-y-4">
        <n-card size="small" title="评论内容">
          <div class="flex items-center gap-2 mb-2">
            <n-star v-for="i in 5" :key="i" :value="i <= selectedComment.rating ? 1 : 0" readonly />
            <n-tag :type="getTagType(selectedComment.type)" size="small">{{ selectedComment.type }}</n-tag>
          </div>
          <p>{{ selectedComment.content }}</p>
          <div v-if="selectedComment.images && selectedComment.images.length > 0" class="flex gap-2 mt-2">
            <img v-for="(img, idx) in selectedComment.images.slice(0, 3)" :key="idx" :src="img" class="w-20 h-20 object-cover rounded-lg" />
          </div>
        </n-card>
        <n-form-item label="回复内容">
          <n-input v-model:value="replyContent" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="请输入回复内容..." />
        </n-form-item>
        <n-form-item label="快捷回复">
          <n-space>
            <n-button v-for="quick in quickReplies" :key="quick.label" size="small" @click="replyContent = quick.content">
              {{ quick.label }}
            </n-button>
          </n-space>
        </n-form-item>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showReplyModal = false">取消</n-button>
          <n-button type="primary" @click="submitReply" :loading="replyLoading">
            <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
            发送回复
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 图片预览弹窗 -->
    <n-modal v-model:show="showImagePreview" preset="card" title="图片预览" style="width: 600px">
      <img v-if="previewImageUrl" :src="previewImageUrl" class="w-full h-auto max-h-[500px] object-contain" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '评论管理'
const showReplyModal = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const selectedComment = ref<any>(null)
const replyContent = ref('')
const replyLoading = ref(false)

const filters = ref({
  store: '',
  product: '',
  type: '',
  dateRange: null as [number, number] | null,
  keyword: ''
})

const stats = ref({
  total: 2856,
  positive: 2156,
  neutral: 458,
  negative: 242
})

const storeOptions = ref([
  { label: 'XIDOO隐形眼镜旗舰店', value: 'XIDOO隐形眼镜旗舰店' },
  { label: '瞳粉美瞳专营店', value: '瞳粉美瞳专营店' },
  { label: 'JEWELRY DOLL旗舰店', value: 'JEWELRY DOLL旗舰店' }
])

const productOptions = ref([
  { label: '隐形眼镜日抛30片装', value: 'prod_001' },
  { label: '美瞳彩色隐形眼镜', value: 'prod_002' },
  { label: '护理液120ml', value: 'prod_003' },
  { label: '隐形眼镜半年抛', value: 'prod_004' }
])

const typeOptions = ref([
  { label: '好评', value: '好评' },
  { label: '中评', value: '中评' },
  { label: '差评', value: '差评' }
])

const quickReplies = ref([
  { label: '感谢好评', content: '感谢您的好评！我们会继续努力提供更好的服务~' },
  { label: '抱歉差评', content: '非常抱歉给您带来不好的体验，我们会尽快处理您的问题。' },
  { label: '售后咨询', content: '如有任何问题，请联系我们的客服，我们会及时为您解决。' }
])

const comments = ref([
  { id: 1, rating: 5, type: '好评', productName: '隐形眼镜日抛30片装', storeName: 'XIDOO隐形眼镜旗舰店', content: '非常好的产品，戴着很舒服，没有异物感，下次还会回购！', buyerName: '张**', createTime: '2024-01-15 14:30', replied: true, images: ['img1.jpg', 'img2.jpg'] },
  { id: 2, rating: 3, type: '中评', productName: '美瞳彩色隐形眼镜', storeName: '瞳粉美瞳专营店', content: '颜色很好看，但是戴着有点干，可能需要配合护理液使用。', buyerName: '李**', createTime: '2024-01-15 10:15', replied: false, images: [] },
  { id: 3, rating: 1, type: '差评', productName: '护理液120ml', storeName: 'XIDOO隐形眼镜旗舰店', content: '收到的时候瓶子已经漏了，液体洒了一半，包装太简陋了！', buyerName: '王**', createTime: '2024-01-14 18:20', replied: true, images: ['img3.jpg'] },
  { id: 4, rating: 5, type: '好评', productName: '隐形眼镜半年抛', storeName: 'JEWELRY DOLL旗舰店', content: '性价比很高，戴了三个月还是很清晰，推荐购买！', buyerName: '赵**', createTime: '2024-01-14 15:30', replied: false, images: [] },
  { id: 5, rating: 4, type: '好评', productName: '隐形眼镜日抛30片装', storeName: 'XIDOO隐形眼镜旗舰店', content: '发货很快，第二天就收到了，包装也很精美。', buyerName: '刘**', createTime: '2024-01-13 09:45', replied: true, images: ['img4.jpg', 'img5.jpg', 'img6.jpg', 'img7.jpg'] }
])

const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

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

const commentColumns = [
  { type: 'selection', width: 50 },
  { title: '评分/类型', key: 'rating', width: 120 },
  { title: '商品', key: 'productName', width: 200 },
  { title: '店铺', key: 'storeName', width: 150 },
  { title: '评论内容', key: 'content', minWidth: 300 },
  { title: '买家', key: 'buyerName', width: 100 },
  { title: '时间', key: 'createTime', width: 150 },
  { title: '状态', key: 'replied', width: 100 },
  { title: '操作', key: 'actions', width: 150 }
]

const getTagType = (type: string) => {
  const map: Record<string, any> = {
    '好评': 'success',
    '中评': 'warning',
    '差评': 'error'
  }
  return map[type] || 'default'
}

const applyFilters = () => {
  message.info('筛选已应用')
}

const resetFilters = () => {
  filters.value = {
    store: '',
    product: '',
    type: '',
    dateRange: null,
    keyword: ''
  }
  message.info('筛选已重置')
}

const refreshComments = async () => {
  message.success('评论已刷新')
}

const exportComments = () => {
  message.info('正在导出评论...')
}

const viewDetail = (comment: any) => {
  message.info(`查看评论详情: ${comment.id}`)
}

const replyComment = (comment: any) => {
  selectedComment.value = comment
  replyContent.value = ''
  showReplyModal.value = true
}

const submitReply = async () => {
  if (!replyContent.value.trim()) {
    message.warning('请输入回复内容')
    return
  }
  replyLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  selectedComment.value.replied = true
  replyLoading.value = false
  showReplyModal.value = false
  message.success('回复成功')
}

const previewImage = (url: string) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

const handleBatchReply = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择评论')
    return
  }
  message.info(`批量回复 ${selectedRowKeys.value.length} 条评论`)
}

const handleBatchDelete = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择评论')
    return
  }
  message.success(`已删除 ${selectedRowKeys.value.length} 条评论`)
}
</script>

<style scoped>
.page-container {
  width: 100%;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
