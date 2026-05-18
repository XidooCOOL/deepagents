/**
 * modules/extract/index.js - 数据提取模块
 * 
 * 包含：销售数据、流量数据、客服绩效等数据提取功能
 */

const extract = require('./extract');
const navigate = require('./navigate');

module.exports = {
  // 主提取函数
  ...extract,
  
  // 导航相关
  navigate: {
    ...navigate
  }
};
