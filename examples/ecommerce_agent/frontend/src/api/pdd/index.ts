import axios from 'axios';

const api = axios.create({
  baseURL: '/api/pdd',
  timeout: 60000,
});

export const pddApi = {
  listStores: async () => {
    const response = await api.get('/stores');
    return response.data;
  },

  addStore: async (shopName: string, shopId: string, adminName?: string) => {
    const response = await api.post('/stores', {
      shop_name: shopName,
      shop_id: shopId,
      admin_name: adminName
    });
    return response.data;
  },

  stopStore: async (shopName: string) => {
    const response = await api.post(`/stores/${encodeURIComponent(shopName)}/stop`);
    return response.data;
  },

  stopAllStores: async () => {
    const response = await api.post('/stores/stop-all');
    return response.data;
  },

  healthCheck: async (shopName?: string) => {
    const params = shopName ? { shop_name: shopName } : {};
    const response = await api.get('/health', { params });
    return response.data;
  },

  extractSales: async (shopName: string, date?: string) => {
    const response = await api.post('/extract/sales', {
      shop_name: shopName,
      date
    });
    return response.data;
  },

  extractService: async (shopName: string, date?: string) => {
    const response = await api.post('/extract/service', {
      shop_name: shopName,
      date
    });
    return response.data;
  },

  extractAds: async (shopName: string, date?: string) => {
    const response = await api.post('/extract/ads', {
      shop_name: shopName,
      date
    });
    return response.data;
  },

  extractAll: async (shopName: string, date?: string) => {
    const response = await api.post('/extract/all', {
      shop_name: shopName,
      date
    });
    return response.data;
  },

  extractReviews: async (shopName: string, pages?: number, reply?: boolean, report?: boolean) => {
    const response = await api.post('/extract/reviews', {
      shop_name: shopName,
      pages,
      reply,
      report
    });
    return response.data;
  },

  batchExtract: async (shops: string[], dataType: string = 'sales', date?: string) => {
    const response = await api.post('/batch/extract', {
      shops,
      data_type: dataType,
      date
    });
    return response.data;
  },

  getSalesData: async (shopName: string) => {
    const response = await api.get('/data/sales', {
      params: { shop_name: shopName }
    });
    return response.data;
  },

  getAdsData: async () => {
    const response = await api.get('/data/ads');
    return response.data;
  },

  getExecutionLog: async () => {
    const response = await api.get('/data/execution-log');
    return response.data;
  },

  getBrowserState: async () => {
    const response = await api.get('/data/browser-state');
    return response.data;
  },

  getStats: async (days: number = 7) => {
    const response = await api.get('/stats', { params: { days } });
    return response.data;
  }
};

export default pddApi;
