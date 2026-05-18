/**
 * modules/review/index.js - 评价管理模块
 * 
 * 功能：
 * - 评价数据提取
 * - 自动回复评价
 * - 评价筛选
 * - Excel导出
 */
const navigate = require('./navigate');
const review = require('./review');
const reply = require('./reply');
const filter = require('./filter');

module.exports = {
  // 页面导航
  ...navigate,
  
  // 评价提取
  ...review,
  
  // 自动回复
  ...reply,
  
  // 评价筛选
  ...filter
};
