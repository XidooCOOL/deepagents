/**
 * config.js - 配置管理
 * 
 * 从 config.json 读取配置，提供统一的配置访问
 * 硬编码的默认值作为 fallback
 */

const path = require('path');
const fs = require('fs');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ========== QwenPaw 家目录智能检测 ==========
// copaw 改名成了 qwenpaw，旧版目录优先，新版兜底
function getQwenpawHome() {
  const home = process.env.USERPROFILE || 'C:\\Users\\Administrator';
  const candidates = ['.copaw', '.qwenpaw'];
  for (const dir of candidates) {
    const fullPath = path.join(home, dir);
    if (fs.existsSync(fullPath)) {
      // 确保目录下至少有个 workspaces 子目录才认为有效
      const wsDir = path.join(fullPath, 'workspaces');
      if (fs.existsSync(wsDir) && fs.readdirSync(wsDir).length > 0) {
        return fullPath;
      }
    }
  }
  // 都找不到，默认用旧的 .copaw 保底
  return path.join(home, '.copaw');
}

const QWENPAW_HOME = getQwenpawHome();

// ========== Profiles 根目录智能检测 ==========
function getDefaultProfilesRoot() {
  // 先检查 H 盘是否存在
  try {
    fs.accessSync('H:\\');
    return 'H:\\chrome_pdd_profile';
  } catch {
    // H 盘不存在，在 C 盘创建
    const cPath = 'C:\\chrome_pdd_profile';
    if (!fs.existsSync(cPath)) {
      fs.mkdirSync(cPath, { recursive: true });
    }
    return cPath;
  }
}

// 加载 config.json
let _config = null;
function loadConfig() {
  if (_config) return _config;
  
  const configPath = path.join(PROJECT_ROOT, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      _config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.log('[config] 加载失败，使用默认配置');
      _config = {};
    }
  } else {
    _config = {};
  }
  return _config;
}

// 获取配置值，带默认值
function get(key, defaultValue) {
  const cfg = loadConfig();
  const keys = key.split('.');
  let value = cfg;
  
  for (const k of keys) {
    if (value === undefined || value === null) break;
    value = value[k];
  }
  
  return value !== undefined ? value : defaultValue;
}

// ========== 路径配置 ==========
const ACCOUNTS_DIR = path.join(PROJECT_ROOT, get('paths.accounts_dir', 'accounts'));
const DATA_DIR = path.join(PROJECT_ROOT, get('paths.data_dir', 'data'));
const DATA_ROOT = DATA_DIR;  // 兼容旧代码
const TEMP_DIR = path.join(PROJECT_ROOT, get('paths.temp_dir', 'temp'));

// 账号相关
const ACCOUNTS_XLSX_PATH = path.join(ACCOUNTS_DIR, 'accounts.xlsx');
const STATE_PATH = path.join(ACCOUNTS_DIR, 'state.json');

// 数据文件 — QwenPaw 家目录动态检测，不再硬编码路径
const MEDIA_ROOT = path.join(QWENPAW_HOME, 'media');
const BROWSER_STATE_FILE = path.join(DATA_DIR, 'browser_state.json');
const SALES_DATA_FILE = path.join(DATA_DIR, 'Sales_Data.xlsx');
const SALES_DATA_FILE_RANGE = path.join(DATA_DIR, 'Sales_Data_Range.xlsx');
const PROMOTION_DATA_FILE = path.join(DATA_DIR, 'Promotion_Data.xlsx');
const PROMOTION_DATA_FILE_RANGE = path.join(DATA_DIR, 'Promotion_Data_Range.xlsx');

// 临时文件
const CURRENT_QR_PATH = path.join(TEMP_DIR, 'current_qr.png');
const CURRENT_SCREENSHOT_PATH = path.join(TEMP_DIR, 'current_screenshot.png');
const CURRENT_QR_PUBLIC_PATH = path.join(MEDIA_ROOT, 'current_qr.png');

// 客服绩效文件
const CUSTOMER_PERFORMANCE_PREFIX = 'CustomerPerformance_';
const CUSTOMER_PERFORMANCE_SUFFIX = '.xlsx';

function getCustomerFilePath(shopId) {
  return path.join(DATA_DIR, `${CUSTOMER_PERFORMANCE_PREFIX}${shopId}${CUSTOMER_PERFORMANCE_SUFFIX}`);
}

function getCustomerFilePathRange(shopId) {
  return path.join(DATA_DIR, `${CUSTOMER_PERFORMANCE_PREFIX}${shopId}_Range${CUSTOMER_PERFORMANCE_SUFFIX}`);
}

function isCustomerPerformanceFile(filePath) {
  return path.basename(filePath).startsWith(CUSTOMER_PERFORMANCE_PREFIX);
}

// ========== 系统配置 ==========

// 端口
const BASE_PORT = get('port_range.base', 49152);
const MAX_PORT_OFFSET = get('port_range.max_offset', 100);

// Chrome
const CHROME_PATH = get('chrome.path', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const PROFILES_ROOT = get('chrome.profiles_root', getDefaultProfilesRoot());

// 拼多多
const PDD_BASE_URL = get('pdd.base_url', 'https://mms.pinduoduo.com');
const PDD_LOGIN_URL = get('pdd.login_url', 'https://mms.pinduoduo.com/login');

// 超时配置
const LOGIN_TIMEOUT = get('pdd.login_timeout_ms', 10 * 60 * 1000);
const POLL_INTERVAL = get('pdd.poll_interval_ms', 3000);
const PAGE_LOAD_WAIT = get('pdd.page_load_wait_ms', 3000);
const DATA_RENDER_WAIT = get('pdd.data_render_wait_ms', 15000);

// 元素注册表
const ELEMENTS_PATH = path.join(PROJECT_ROOT, 'refs', 'elements.json');

// ========== 导出 ==========
module.exports = {
  // 项目根目录
  PROJECT_ROOT,
  
  // 目录
  ACCOUNTS_DIR,
  DATA_DIR,
  DATA_ROOT,
  TEMP_DIR,
  MEDIA_ROOT,
  PROFILES_ROOT,
  
  // 账号文件
  ACCOUNTS_XLSX_PATH,
  STATE_PATH,
  
  // 数据文件
  BROWSER_STATE_FILE,
  SALES_DATA_FILE,
  SALES_DATA_FILE_RANGE,
  PROMOTION_DATA_FILE,
  PROMOTION_DATA_FILE_RANGE,
  
  // 临时文件
  CURRENT_QR_PATH,
  CURRENT_SCREENSHOT_PATH,
  CURRENT_QR_PUBLIC_PATH,
  
  // 客服绩效
  getCustomerFilePath,
  getCustomerFilePathRange,
  isCustomerPerformanceFile,
  CUSTOMER_PERFORMANCE_PREFIX,
  
  // 系统配置
  BASE_PORT,
  MAX_PORT_OFFSET,
  CHROME_PATH,
  PDD_BASE_URL,
  PDD_LOGIN_URL,
  LOGIN_TIMEOUT,
  POLL_INTERVAL,
  PAGE_LOAD_WAIT,
  DATA_RENDER_WAIT,
  
  // 其他
  ELEMENTS_PATH,
  
  // 配置访问接口
  get,
  loadConfig,
};