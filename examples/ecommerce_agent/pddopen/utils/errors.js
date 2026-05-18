// errors.js - 统一错误处理模块

/**
 * pdd-open 错误类型
 */
const ErrorTypes = {
  // 登录相关
  LOGIN_TIMEOUT: 'LOGIN_TIMEOUT',           // 登录超时
  LOGIN_FAILED: 'LOGIN_FAILED',             // 登录失败
  LOGIN_QR_EXPIRED: 'LOGIN_QR_EXPIRED',     // 二维码过期
  LOGIN_SHOP_MISMATCH: 'LOGIN_SHOP_MISMATCH', // 店铺不匹配
  
  // 浏览器相关
  BROWSER_START_FAILED: 'BROWSER_START_FAILED', // 浏览器启动失败
  BROWSER_CRASHED: 'BROWSER_CRASHED',           // 浏览器崩溃
  BROWSER_PORT_USED: 'BROWSER_PORT_USED',      // 端口被占用
  
  // 数据提取相关
  EXTRACT_FAILED: 'EXTRACT_FAILED',         // 提取失败
  EXTRACT_TIMEOUT: 'EXTRACT_TIMEOUT',       // 提取超时
  EXTRACT_NO_DATA: 'EXTRACT_NO_DATA',       // 无数据
  EXTRACT_DATE_MISMATCH: 'EXTRACT_DATE_MISMATCH', // 日期不匹配
  
  // 日期相关
  DATE_RANGE_EXCEEDED: 'DATE_RANGE_EXCEEDED', // 日期范围超限
  DATE_INVALID: 'DATE_INVALID',               // 无效日期
  DATE_FUTURE: 'DATE_FUTURE',                 // 日期是未来
  
  // 账号相关
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',   // 账号不存在
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',     // 账号已禁用
  
  // Excel相关
  EXCEL_WRITE_FAILED: 'EXCEL_WRITE_FAILED', // 写入失败
  EXCEL_READ_FAILED: 'EXCEL_READ_FAILED',   // 读取失败
  
  // 网络相关
  NETWORK_ERROR: 'NETWORK_ERROR',           // 网络错误
  PAGE_LOAD_FAILED: 'PAGE_LOAD_FAILED',     // 页面加载失败
  
  // 未知错误
  UNKNOWN: 'UNKNOWN'
};

/**
 * pdd-open 统一错误类
 */
class PddOpenError extends Error {
  /**
   * @param {string} type - 错误类型（来自 ErrorTypes）
   * @param {string} message - 错误消息
   * @param {object} details - 额外详情
   */
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'PddOpenError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  /**
   * 获取用户友好的错误消息
   */
  getUserMessage() {
    const messages = {
      [ErrorTypes.LOGIN_TIMEOUT]: '登录超时，请检查网络后重试',
      [ErrorTypes.LOGIN_FAILED]: '登录失败，请重新扫码',
      [ErrorTypes.LOGIN_QR_EXPIRED]: '二维码已过期，请重新获取',
      [ErrorTypes.LOGIN_SHOP_MISMATCH]: '店铺不匹配，请确认账号',
      [ErrorTypes.BROWSER_START_FAILED]: '浏览器启动失败',
      [ErrorTypes.BROWSER_CRASHED]: '浏览器意外崩溃',
      [ErrorTypes.BROWSER_PORT_USED]: '端口被占用，请稍后重试',
      [ErrorTypes.EXTRACT_FAILED]: '数据提取失败',
      [ErrorTypes.EXTRACT_TIMEOUT]: '数据提取超时',
      [ErrorTypes.EXTRACT_NO_DATA]: '未检测到数据',
      [ErrorTypes.EXTRACT_DATE_MISMATCH]: '页面日期与预期不符',
      [ErrorTypes.DATE_RANGE_EXCEEDED]: '日期范围不能超过31天',
      [ErrorTypes.DATE_INVALID]: '日期格式无效',
      [ErrorTypes.DATE_FUTURE]: '不能提取未来日期',
      [ErrorTypes.ACCOUNT_NOT_FOUND]: '找不到该账号',
      [ErrorTypes.ACCOUNT_DISABLED]: '该账号已被禁用',
      [ErrorTypes.EXCEL_WRITE_FAILED]: 'Excel写入失败',
      [ErrorTypes.EXCEL_READ_FAILED]: 'Excel读取失败',
      [ErrorTypes.NETWORK_ERROR]: '网络错误',
      [ErrorTypes.PAGE_LOAD_FAILED]: '页面加载失败',
      [ErrorTypes.UNKNOWN]: '发生未知错误'
    };
    return messages[this.type] || this.message;
  }
  
  /**
   * 获取详细日志
   */
  toLogString() {
    return `[${this.type}] ${this.message} | ${JSON.stringify(this.details)}`;
  }
  
  /**
   * 发送到飞书通知
   */
  toFeishuMessage() {
    return {
      msg_type: 'text',
      content: {
        text: `❌ pdd-open 错误\n\n类型: ${this.type}\n消息: ${this.getUserMessage()}\n详情: ${this.message}\n时间: ${this.timestamp}`
      }
    };
  }
}

/**
 * 快速创建错误
 */
function createError(type, message, details = {}) {
  return new PddOpenError(type, message, details);
}

// 常用错误快捷函数
const Errors = {
  loginTimeout: (details = {}) => createError(ErrorTypes.LOGIN_TIMEOUT, '登录超时', details),
  loginFailed: (details = {}) => createError(ErrorTypes.LOGIN_FAILED, '登录失败', details),
  extractFailed: (msg, details = {}) => createError(ErrorTypes.EXTRACT_FAILED, msg, details),
  dateRangeExceeded: (details = {}) => createError(ErrorTypes.DATE_RANGE_EXCEEDED, '日期范围超过31天限制', details),
  accountNotFound: (keyword, details = {}) => createError(ErrorTypes.ACCOUNT_NOT_FOUND, `找不到账号: ${keyword}`, { keyword, ...details }),
  pageLoadFailed: (url, details = {}) => createError(ErrorTypes.PAGE_LOAD_FAILED, `页面加载失败: ${url}`, { url, ...details }),
  excelWriteFailed: (file, details = {}) => createError(ErrorTypes.EXCEL_WRITE_FAILED, `Excel写入失败: ${file}`, { file, ...details }),
};

module.exports = {
  ErrorTypes,
  PddOpenError,
  createError,
  Errors
};
