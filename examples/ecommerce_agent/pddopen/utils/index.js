/**
 * utils/index.js - 工具模块统一导出
 * 
 * 使用方式：
 *   const { browser, calendar, excel } = require('./utils');
 */

module.exports = {
  // 核心
  config: require('./config'),
  errors: require('./errors'),
  
  // 浏览器
  browser: require('./browser'),
  lifecycle: require('./lifecycle'),
  process_guard: require('./process_guard'),
  page: require('./page'),
  stealth: require('./stealth'),
  
  // UI 交互
  calendar: require('./calendar'),
  sidebar: require('./sidebar'),
  login: require('./login'),
  shop_info: require('./shop_info'),
  
  // 数据处理
  excel: require('./excel'),
  vision: require('./vision'),
  data_cache: require('./data_cache'),
  
  // 辅助
  elements: require('./elements'),
  args_parser: require('./args_parser'),
  date_parser: require('./date_parser'),
  task_queue: require('./task_queue'),
  health_check: require('./health_check'),
  human: require('./human'),
  notify: require('./notify'),
  hooks: require('./hooks'),
  execution_log: require('./execution_log'),
  sigkill_guard: require('./sigkill_guard'),
  accounts: require('./accounts'),
  cleanup: require('./cleanup'),
};
