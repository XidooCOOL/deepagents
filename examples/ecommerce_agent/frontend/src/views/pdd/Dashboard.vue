<template>
  <div class="pdd-dashboard">
    <el-card class="header-card">
      <div class="header">
        <div class="title">
          <el-icon :size="24" color="#fa5a4b"><component :is="DataAnalysis" /></el-icon>
          <h2>拼多多数据概览</h2>
        </div>
        <div class="actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
          />
          <el-button type="primary" @click="refreshData">
            <el-icon><component :is="Refresh" /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card sales-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#409eff"><component :is="ShoppingCart" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ stats.totalSales.toLocaleString() }}</div>
              <div class="stat-label">总销售额</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card orders-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#67c23a"><component :is="List" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalOrders.toLocaleString() }}</div>
              <div class="stat-label">总订单数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card visitors-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#e6a23c"><component :is="User" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalVisitors.toLocaleString() }}</div>
              <div class="stat-label">总访客数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card ads-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" color="#f56c6c"><component :is="TrendCharts" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ stats.totalAdsSpend.toLocaleString() }}</div>
              <div class="stat-label">总推广花费</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>销售趋势</span>
            </div>
          </template>
          <div class="chart-placeholder">
            <el-empty description="暂无数据趋势图" />
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>推广效果</span>
            </div>
          </template>
          <div class="chart-placeholder">
            <el-empty description="暂无推广数据图" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="data-table-card">
      <template #header>
        <div class="table-header">
          <span>最近数据记录</span>
          <el-button size="small" type="primary" @click="exportData">
            导出Excel
          </el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="销售数据" name="sales">
          <el-table :data="salesData" stripe style="width: 100%">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="orders" label="订单数" width="100" />
            <el-table-column prop="gmv" label="销售额" width="120">
              <template #default="scope">
                ¥{{ scope.row.gmv?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="visitors" label="访客数" width="100" />
            <el-table-column prop="conversionRate" label="转化率" width="100">
              <template #default="scope">
                {{ scope.row.conversionRate }}%
              </template>
            </el-table-column>
            <el-table-column prop="avgOrderValue" label="客单价" width="120">
              <template #default="scope">
                ¥{{ scope.row.avgOrderValue?.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="推广数据" name="ads">
          <el-table :data="adsData" stripe style="width: 100%">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="spend" label="花费" width="100">
              <template #default="scope">
                ¥{{ scope.row.spend?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="impressions" label="曝光" width="100" />
            <el-table-column prop="clicks" label="点击" width="100" />
            <el-table-column prop="orders" label="订单" width="100" />
            <el-table-column prop="roi" label="ROI" width="100">
              <template #default="scope">
                {{ scope.row.roi?.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  DataAnalysis, 
  Refresh, 
  ShoppingCart, 
  List, 
  User, 
  TrendCharts 
} from '@element-plus/icons-vue';
import { pddApi } from '@/api/pdd';

const dateRange = ref<Date[]>([]);
const activeTab = ref('sales');
const loading = ref(false);

const stats = ref({
  totalSales: 0,
  totalOrders: 0,
  totalVisitors: 0,
  totalAdsSpend: 0
});

const salesData = ref<any[]>([]);
const adsData = ref<any[]>([]);

const refreshData = async () => {
  loading.value = true;
  try {
    const [salesResponse, adsResponse] = await Promise.all([
      pddApi.getSalesData(''),
      pddApi.getAdsData()
    ]);

    if (salesResponse.success && salesResponse.data) {
      salesData.value = salesResponse.data;
      calculateSalesStats(salesResponse.data);
    }

    if (adsResponse.success && adsResponse.data) {
      adsData.value = adsResponse.data;
      calculateAdsStats(adsResponse.data);
    }
  } catch (error: any) {
    ElMessage.error('获取数据失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const calculateSalesStats = (data: any[]) => {
  stats.value.totalSales = data.reduce((sum, item) => sum + (item.gmv || 0), 0);
  stats.value.totalOrders = data.reduce((sum, item) => sum + (item.orders || 0), 0);
  stats.value.totalVisitors = data.reduce((sum, item) => sum + (item.visitors || 0), 0);
};

const calculateAdsStats = (data: any[]) => {
  stats.value.totalAdsSpend = data.reduce((sum, item) => sum + (item.spend || 0), 0);
};

const handleDateChange = () => {
  refreshData();
};

const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.pdd-dashboard {
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

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 350px;
}

.chart-header {
  font-weight: 600;
  font-size: 16px;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 250px;
}

.data-table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
