// 账号管理模块 - 读取、查找、添加账号
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { BASE_PORT, ACCOUNTS_XLSX_PATH, PROFILES_ROOT } = require('./config');

// 读取所有账号
function readAllAccounts() {
  if (!fs.existsSync(ACCOUNTS_XLSX_PATH)) {
    throw new Error(`账号配置文件不存在: ${ACCOUNTS_XLSX_PATH}`);
  }
  const workbook = XLSX.readFile(ACCOUNTS_XLSX_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const accounts = XLSX.utils.sheet_to_json(sheet);
  // 过滤掉未启用的
  return accounts.filter(a => a.enabled !== false);
}

// 模糊匹配账号
// 返回:
// - null → 没找到
// - array[multiple] → 多个匹配
// - account → 单个找到
function findAccountByKeyword(keyword) {
  const accounts = readAllAccounts();
  keyword = keyword.toLowerCase().trim();
  
  // 精确匹配 id
  let found = accounts.filter(a => 
    a.id?.toLowerCase() === keyword ||
    String(a.shop_id) === keyword
  );
  if (found.length === 1) {
    return found[0];
  }
  if (found.length > 1) {
    return found; // 多个匹配返回数组
  }
  
  // 模糊匹配店铺名（包含关键词）
  found = accounts.filter(a => 
    a.shop_name?.toLowerCase().includes(keyword)
  );
  
  if (found.length === 1) {
    return found[0];
  }
  
  if (found.length === 0) {
    return null; // 没找到
  }
  
  return found; // 多个匹配
}

// 获取下一个可用端口
async function getNextAvailablePort() {
  const accounts = readAllAccounts();
  const usedPorts = accounts.map(a => a.cdp_port).filter(Boolean);
  for (let offset = 1; offset <= 100; offset++) {
    const port = BASE_PORT + offset;
    if (!usedPorts.includes(port) && await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('没有可用端口了（最多支持 100 个账号）');
}

// 检测端口是否可用（带超时保护）
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    // 超时保护：3秒内无法绑定视为不可用
    const timer = setTimeout(() => {
      server.close();
      resolve(false);
    }, 3000);
    server.once('error', () => {
      clearTimeout(timer);
      resolve(false); // 端口被占用
    });
    server.once('listening', () => {
      clearTimeout(timer);
      server.close();
      resolve(true); // 端口可用
    });
    server.listen(port, '127.0.0.1');
  });
}

// 检测端口是否被占用（浏览器是否运行）
async function isBrowserRunning(port) {
  return !(await isPortAvailable(port));
}

// 添加新账号（异步，端口分配会检测是否被占用）
async function addAccount(shopName, shopId, adminName) {
  // 检查是否已存在
  const accounts = readAllAccounts();
  const exists = accounts.find(a => 
    String(a.shop_id) === String(shopId)
  );
  if (exists) {
    throw new Error(`SHOPID ${shopId} 已存在: ${exists.shop_name}`);
  }

  // 生成 id
  const maxId = accounts
    .map(a => parseInt(a.id?.replace('acc_', '') || '0'))
    .reduce((a, b) => Math.max(a, b), 0);
  const newId = `acc_${String(maxId + 1).padStart(3, '0')}`;
  
  // profile 目录名 → pdd_{shopId} 和原来一致，保持兼容
  const profileDir = `pdd_${shopId}`;
  const fullProfilePath = path.join(PROFILES_ROOT, profileDir);
  
  // 创建 profile 目录
  if (!fs.existsSync(fullProfilePath)) {
    fs.mkdirSync(fullProfilePath, { recursive: true });
  }

  // 保存到 Excel
  const workbook = XLSX.readFile(ACCOUNTS_XLSX_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const existing = XLSX.utils.sheet_to_json(sheet);

  // 异步分配端口：取当前最大端口号 +1，同时检测是否被其他进程占用
  const usedPorts = accounts.map(a => a.cdp_port).filter(Boolean);
  let port = BASE_PORT + accounts.length + 1;
  while (usedPorts.includes(port) || !(await isPortAvailable(port))) port++;

  const newAccount = {
    enabled: true,
    id: newId,
    shop_name: shopName,
    shop_id: shopId,
    admin: adminName || '',
    profile_dir: profileDir,
    cdp_port: port,
    base_url: 'https://mms.pinduoduo.com',
  };

  existing.push(newAccount);
  const newSheet = XLSX.utils.json_to_sheet(existing);
  workbook.Sheets[sheetName] = newSheet;
  XLSX.writeFile(workbook, ACCOUNTS_XLSX_PATH);

  return newAccount;
}

// 列出所有账号带状态
async function listAccountsWithStatus() {
  const accounts = readAllAccounts();
  const result = await Promise.all(accounts.map(async a => ({
    ...a,
    is_running: await isBrowserRunning(a.cdp_port),
  })));
  return result;
}

module.exports = {
  readAllAccounts,
  findAccountByKeyword,
  getNextAvailablePort,
  isPortAvailable,
  isBrowserRunning,
  addAccount,
  listAccountsWithStatus,
};
