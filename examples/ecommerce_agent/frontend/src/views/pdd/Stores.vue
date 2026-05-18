<template>
  <div class="pdd-stores">
    <el-card class="header-card">
      <div class="header">
        <div class="title">
          <el-icon :size="24" color="#fa5a4b"><component :is="Shop" /></el-icon>
          <h2>拼多多店铺管理</h2>
        </div>
        <div class="actions">
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><component :is="Plus" /></el-icon>
            添加店铺
          </el-button>
          <el-button @click="refreshStores">
            <el-icon><component :is="Refresh" /></el-icon>
            刷新
          </el-button>
          <el-button @click="stopAllStores" type="warning">
            <el-icon><component :is="VideoPause" /></el-icon>
            停止全部
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="stores-grid">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="store in stores" :key="store.shop_name">
        <el-card class="store-card" shadow="hover">
          <template #header>
            <div class="store-header">
              <div class="store-name">
                <el-icon :size="20" color="#fa5a4b"><component :is="Shop" /></el-icon>
                <span>{{ store.shop_name }}</span>
              </div>
              <el-tag :type="store.status === 'RUNNING' ? 'success' : 'info'" size="small">
                {{ store.status === 'RUNNING' ? '运行中' : '已停止' }}
              </el-tag>
            </div>
          </template>
          
          <div class="store-info">
            <div class="info-item">
              <span class="label">CDP端口:</span>
              <span class="value">{{ store.cdp_port || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态:</span>
              <el-tag :type="store.status === 'RUNNING' ? 'success' : 'info'" size="small">
                {{ store.status === 'RUNNING' ? '运行中' : '已停止' }}
              </el-tag>
            </div>
          </div>
          
          <div class="store-actions">
            <el-button size="small" type="primary" @click="extractData(store.shop_name, 'all')">
              提取数据
            </el-button>
            <el-button size="small" @click="stopStore(store.shop_name)" 
                      :disabled="store.status !== 'RUNNING'" type="warning">
              停止
            </el-button>
            <el-button size="small" type="info" @click="healthCheck(store.shop_name)">
              健康检查
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="stores.length === 0" description="暂无店铺，请添加店铺"></el-empty>

    <el-dialog v-model="showAddDialog" title="添加新店铺" width="500px">
      <el-form :model="newStore" label-width="100px">
        <el-form-item label="店铺名称">
          <el-input v-model="newStore.shop_name" placeholder="请输入店铺名称" />
        </el-form-item>
        <el-form-item label="店铺ID">
          <el-input v-model="newStore.shop_id" placeholder="请输入店铺ID" />
        </el-form-item>
        <el-form-item label="管理员名称">
          <el-input v-model="newStore.admin_name" placeholder="请输入管理员名称（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addStore">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showExtractDialog" title="提取数据" width="600px">
      <el-form :model="extractForm" label-width="120px">
        <el-form-item label="店铺名称">
          <el-input v-model="extractForm.shop_name" disabled />
        </el-form-item>
        <el-form-item label="数据类型">
          <el-checkbox-group v-model="extractForm.data_types">
            <el-checkbox label="sales">销售数据</el-checkbox>
            <el-checkbox label="service">客服绩效</el-checkbox>
            <el-checkbox label="ads">推广数据</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="指定日期">
          <el-date-picker v-model="extractForm.date" type="date" placeholder="选择日期（默认昨日）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExtractDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmExtract" :loading="extracting">开始提取</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showHealthDialog" title="健康检查结果" width="800px">
      <pre class="health-output">{{ healthOutput }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Shop, Plus, Refresh, VideoPause } from '@element-plus/icons-vue';
import { pddApi } from '@/api/pdd';

const stores = ref<any[]>([]);
const showAddDialog = ref(false);
const showExtractDialog = ref(false);
const showHealthDialog = ref(false);
const extracting = ref(false);
const healthOutput = ref('');

const newStore = ref({
  shop_name: '',
  shop_id: '',
  admin_name: ''
});

const extractForm = ref({
  shop_name: '',
  data_types: ['sales'],
  date: null as Date | null
});

const refreshStores = async () => {
  try {
    const response = await pddApi.listStores();
    if (response.success) {
      stores.value = response.data || [];
    }
  } catch (error: any) {
    ElMessage.error('获取店铺列表失败: ' + error.message);
  }
};

const addStore = async () => {
  if (!newStore.value.shop_name || !newStore.value.shop_id) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    const response = await pddApi.addStore(
      newStore.value.shop_name,
      newStore.value.shop_id,
      newStore.value.admin_name
    );
    
    if (response.success) {
      ElMessage.success('店铺添加成功');
      showAddDialog.value = false;
      newStore.value = { shop_name: '', shop_id: '', admin_name: '' };
      await refreshStores();
    }
  } catch (error: any) {
    ElMessage.error('添加店铺失败: ' + error.message);
  }
};

const stopStore = async (shopName: string) => {
  try {
    await ElMessageBox.confirm(`确定要停止店铺 "${shopName}" 吗?`, '确认', {
      type: 'warning'
    });
    
    const response = await pddApi.stopStore(shopName);
    if (response.success) {
      ElMessage.success(response.message);
      await refreshStores();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('停止店铺失败: ' + error.message);
    }
  }
};

const stopAllStores = async () => {
  try {
    await ElMessageBox.confirm('确定要停止所有店铺吗?', '确认', {
      type: 'warning'
    });
    
    const response = await pddApi.stopAllStores();
    if (response.success) {
      ElMessage.success(response.message);
      await refreshStores();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('停止所有店铺失败: ' + error.message);
    }
  }
};

const extractData = (shopName: string, dataType: string) => {
  extractForm.value.shop_name = shopName;
  extractForm.value.data_types = [dataType];
  showExtractDialog.value = true;
};

const confirmExtract = async () => {
  if (extractForm.value.data_types.length === 0) {
    ElMessage.warning('请选择数据类型');
    return;
  }

  extracting.value = true;
  const dateStr = extractForm.value.date 
    ? new Date(extractForm.value.date).toISOString().split('T')[0] 
    : undefined;

  try {
    let response;
    const dataType = extractForm.value.data_types[0];
    
    if (dataType === 'all' || extractForm.value.data_types.length > 1) {
      response = await pddApi.extractAll(extractForm.value.shop_name, dateStr);
    } else if (dataType === 'sales') {
      response = await pddApi.extractSales(extractForm.value.shop_name, dateStr);
    } else if (dataType === 'service') {
      response = await pddApi.extractService(extractForm.value.shop_name, dateStr);
    } else if (dataType === 'ads') {
      response = await pddApi.extractAds(extractForm.value.shop_name, dateStr);
    }

    if (response.success) {
      ElMessage.success(response.message);
      showExtractDialog.value = false;
    }
  } catch (error: any) {
    ElMessage.error('提取数据失败: ' + error.message);
  } finally {
    extracting.value = false;
  }
};

const healthCheck = async (shopName?: string) => {
  try {
    const response = await pddApi.healthCheck(shopName);
    healthOutput.value = response.data || response.message;
    showHealthDialog.value = true;
  } catch (error: any) {
    ElMessage.error('健康检查失败: ' + error.message);
  }
};

onMounted(() => {
  refreshStores();
});
</script>

<style scoped>
.pdd-stores {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.actions {
  display: flex;
  gap: 10px;
}

.stores-grid {
  margin-top: 20px;
}

.store-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.store-card:hover {
  transform: translateY(-5px);
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.store-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.store-info {
  margin: 20px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  font-weight: 600;
}

.store-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.health-output {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 500px;
  overflow-y: auto;
}
</style>
