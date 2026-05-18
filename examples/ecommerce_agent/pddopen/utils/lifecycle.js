/**
 * lifecycle.js - 浏览器生命周期管理器
 * 
 * 功能：
 * 1. 启动前检测：检查进程是否真的死了
 * 2. 状态同步：定期清理僵尸记录
 * 3. 自动恢复：崩溃后自动重启
 * 4. 优雅关闭：确保退出时正确清理
 */

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { BROWSER_STATE_FILE, PROFILES_ROOT, CHROME_PATH } = require('./config');
const { isPortAvailable, getNextAvailablePort } = require('./accounts');

// ============================================================
// 状态管理
// ============================================================

function loadBrowserState() {
  try {
    if (fs.existsSync(BROWSER_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BROWSER_STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveBrowserState(state) {
  try {
    const dir = path.dirname(BROWSER_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BROWSER_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[lifecycle] 保存状态失败:', e.message);
  }
}

// ============================================================
// 核心检测函数
// ============================================================

/**
 * 检测端口是否真的可用（彻底检测）
 * @param {number} port
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
async function isPortReallyAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timer = setTimeout(() => {
      server.close();
      resolve({ available: false, reason: '检测超时（3秒）' });
    }, 3000);
    
    server.once('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, reason: '端口被占用' });
      } else {
        resolve({ available: false, reason: err.message });
      }
    });
    
    server.once('listening', () => {
      clearTimeout(timer);
      server.close();
      resolve({ available: true });
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 检测 Chrome 进程是否真的在运行（通过 PID 或端口）
 * @param {number} port
 * @returns {Promise<{running: boolean, pid?: number, reason?: string}>}
 */
async function isChromeReallyRunning(port) {
  const { available } = await isPortReallyAvailable(port);
  
  if (available) {
    return { running: false, reason: '端口空闲' };
  }
  
  // 端口被占用，检查是不是 Chrome
  try {
    const { execSync } = require('child_process');
    const output = execSync(
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object OwningProcess | ConvertTo-Json`,
      { encoding: 'utf-8', shell: 'powershell' }
    );
    
    if (output && output.trim()) {
      const info = JSON.parse(output);
      const pid = Array.isArray(info) ? info[0].OwningProcess : info.OwningProcess;
      
      // 检查进程名
      const procOutput = execSync(
        `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`,
        { encoding: 'utf-8', shell: 'powershell' }
      );
      
      if (procOutput.trim().toLowerCase().includes('chrome')) {
        return { running: true, pid };
      } else {
        return { running: false, reason: `端口被非Chrome进程占用 (PID: ${pid})` };
      }
    }
  } catch (e) {
    // 检测失败，保守返回未运行
    return { running: false, reason: '检测失败: ' + e.message };
  }
  
  return { running: false, reason: '未知状态' };
}

// ============================================================
// 僵尸清理
// ============================================================

/**
 * 清理所有僵尸记录
 * 检测 browser_state.json 中的记录，如果进程已死，清理记录
 */
async function cleanZombieRecords() {
  const state = loadBrowserState();
  const shops = Object.keys(state);
  
  if (shops.length === 0) {
    console.log('[lifecycle] 没有店铺记录需要清理');
    return { cleaned: 0, remaining: 0 };
  }
  
  console.log(`[lifecycle] 开始清理僵尸记录，共 ${shops.length} 个店铺`);
  
  let cleaned = 0;
  const newState = {};
  
  for (const shopId of shops) {
    const entry = state[shopId];
    const { running, reason } = await isChromeReallyRunning(entry.port);
    
    if (running) {
      console.log(`[lifecycle] ✅ 店铺 ${shopId} 进程正常 (PID: ${entry.pid})`);
      newState[shopId] = entry;
    } else {
      console.log(`[lifecycle] ❌ 店铺 ${shopId} 进程已死 (${reason})，清理记录`);
      cleaned++;
    }
  }
  
  saveBrowserState(newState);
  
  return {
    cleaned,
    remaining: Object.keys(newState).length
  };
}

/**
 * 清理指定店铺的僵尸记录
 */
async function cleanZombieShop(shopId) {
  const state = loadBrowserState();
  const entry = state[shopId];
  
  if (!entry) {
    return { cleaned: false, reason: '无记录' };
  }
  
  const { running } = await isChromeReallyRunning(entry.port);
  
  if (running) {
    return { cleaned: false, reason: '进程仍在运行' };
  }
  
  delete state[shopId];
  saveBrowserState(state);
  
  return { cleaned: true };
}

// ============================================================
// 安全启动
// ============================================================

/**
 * 安全启动 Chrome（处理各种异常情况）
 * @param {object} account - 账号信息
 * @param {object} options
 * @param {boolean} options.forceRestart - 是否强制重启（忽略现有进程）
 * @param {boolean} options.skipZombieCheck - 跳过僵尸检测
 * @returns {Promise<{success: boolean, browser?: object, page?: object, action: string}>}
 */
async function safeStartChrome(account, options = {}) {
  const { shopId, shopName, cdp_port, profile } = account;
  const profileDir = path.join(PROFILES_ROOT, profile || `pdd_${shopId}`);
  
  console.log(`\n🆕 [lifecycle] 安全启动 Chrome: ${shopName} (${shopId})`);
  console.log(`   端口: ${cdp_port}, Profile: ${profileDir}`);
  
  // Step 1: 检查 browser_state.json 是否有记录
  const state = loadBrowserState();
  const existing = state[shopId];
  
  if (existing && !options.skipZombieCheck) {
    console.log(`[lifecycle] 发现已有记录: PID=${existing.pid}, Port=${existing.port}`);
    
    const { running } = await isChromeReallyRunning(existing.port);
    
    if (running) {
      if (options.forceRestart) {
        console.log(`[lifecycle] 强制重启模式，先杀旧进程`);
        await forceKillPort(existing.port);
      } else {
        console.log(`[lifecycle] ✅ 进程已在运行，尝试复用`);
        
        // 尝试连接现有 Chrome
        try {
          const { chromium } = require('playwright');
          const browser = await chromium.connectOverCDP(`http://127.0.0.1:${existing.port}`, { timeout: 5000 });
          const ctx = browser.contexts()[0];
          const pages = await ctx.pages();
          
          // 过滤系统页面
          const validPages = pages.filter(p => 
            !p.url().startsWith('chrome://') && 
            !p.url().startsWith('about:')
          );
          
          if (validPages.length > 0) {
            console.log(`[lifecycle] ✅ 成功连接到已有浏览器`);
            return {
              success: true,
              browser,
              page: validPages[0],
              action: 'reused'
            };
          }
        } catch (e) {
          console.log(`[lifecycle] 连接失败: ${e.message}，准备重启`);
          await forceKillPort(existing.port);
        }
      }
    } else {
      console.log(`[lifecycle] ❌ 记录已过期（进程已死），清理并重启`);
      delete state[shopId];
      saveBrowserState(state);
    }
  }
  
  // Step 2: 确保 Profile 目录存在
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
    console.log(`[lifecycle] 创建 Profile 目录: ${profileDir}`);
  }
  
  // Step 3: 检查端口是否被占用（如果被非Chrome进程占用，需要换一个端口）
  const { available } = await isPortReallyAvailable(cdp_port);
  
  if (!available) {
    console.log(`[lifecycle] ⚠️ 指定端口 ${cdp_port} 被占用，尝试获取新端口`);
    const newPort = await getNextAvailablePort();
    console.log(`[lifecycle] 新端口: ${newPort}`);
    
    // 更新记录中的端口
    account.cdp_port = newPort;
    await updateAccountPort(shopId, newPort);
  }
  
  // Step 4: 启动 Chrome
  const { browser, page, pid } = await startChromeWithRetry(account, profileDir);
  
  // Step 5: 记录 PID
  const finalState = loadBrowserState();
  finalState[shopId] = {
    pid,
    port: account.cdp_port,
    startedAt: new Date().toISOString(),
    shopName
  };
  saveBrowserState(finalState);
  
  console.log(`[lifecycle] ✅ Chrome 启动成功 (PID: ${pid})`);
  
  return {
    success: true,
    browser,
    page,
    pid,
    action: 'started'
  };
}

// ============================================================
// 启动函数
// ============================================================

/**
 * 带重试的 Chrome 启动
 */
async function startChromeWithRetry(account, profileDir, retries = 3) {
  const { shopId, shopName, cdp_port } = account;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await startChromeSingle(account, profileDir);
    } catch (e) {
      console.log(`[lifecycle] 启动失败 (${i + 1}/${retries}): ${e.message}`);
      
      if (i === retries - 1) throw e;
      
      // 等待后重试
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      
      // 清理可能残留的端口占用
      await forceKillPort(cdp_port);
    }
  }
}

/**
 * 单次启动 Chrome
 */
async function startChromeSingle(account, profileDir) {
  const { shopId, shopName, cdp_port } = account;
  
  return new Promise((resolve, reject) => {
    const args = [
      `--remote-debugging-port=${cdp_port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-popup-blocking',
      '--no-sandbox'
    ];
    
    console.log(`[lifecycle] 启动命令: ${CHROME_PATH}`);
    console.log(`[lifecycle] 参数: ${args.join(' ')}`);
    
    const proc = spawn(CHROME_PATH, args, {
      stdio: 'ignore',
      detached: false,
      shell: true
    });
    
    let resolved = false;
    
    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`启动失败: ${err.message}`));
      }
    });
    
    // 等待 Chrome 启动并监听端口
    const startTime = Date.now();
    const timeout = 30000;
    
    const checkPort = setInterval(async () => {
      if (Date.now() - startTime > timeout) {
        clearInterval(checkPort);
        if (!resolved) {
          resolved = true;
          proc.kill();
          reject(new Error('启动超时（30秒）'));
        }
        return;
      }
      
      const { available } = await isPortReallyAvailable(cdp_port);
      if (!available) {
        clearInterval(checkPort);
        
        // Chrome 已启动，尝试连接
        try {
          const { chromium } = require('playwright');
          const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdp_port}`, { timeout: 10000 });
          const ctx = browser.contexts()[0];
          const pages = await ctx.pages();
          const page = pages.find(p => !p.url().startsWith('chrome://')) || pages[0];
          
          resolved = true;
          resolve({ browser, page, pid: proc.pid });
        } catch (e) {
          if (!resolved) {
            resolved = true;
            reject(new Error(`连接失败: ${e.message}`));
          }
        }
      }
    }, 500);
  });
}

// ============================================================
// 强制关闭
// ============================================================

/**
 * 强制关闭指定端口的进程
 */
async function forceKillPort(port) {
  try {
    const { execSync } = require('child_process');
    execSync(
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Stop-Process -Force`,
      { stdio: 'ignore', shell: 'powershell' }
    );
    
    // 等待端口释放
    await new Promise(r => setTimeout(r, 1500));
    
    console.log(`[lifecycle] ✅ 端口 ${port} 已释放`);
    return true;
  } catch (e) {
    // 可能没有进程，忽略错误
    return false;
  }
}

// ============================================================
// 更新账号端口（需要写入 accounts.xlsx）
// ============================================================

async function updateAccountPort(shopId, newPort) {
  try {
    const XLSX = require('xlsx');
    const { ACCOUNTS_XLSX_PATH } = require('./config');
    
    if (!fs.existsSync(ACCOUNTS_XLSX_PATH)) return false;
    
    const workbook = XLSX.readFile(ACCOUNTS_XLSX_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // 找到并更新
    const updated = data.map(row => {
      if (String(row.shop_id) === String(shopId)) {
        row.cdp_port = newPort;
      }
      return row;
    });
    
    // 写回
    const newSheet = XLSX.utils.json_to_sheet(updated);
    workbook.Sheets[workbook.SheetNames[0]] = newSheet;
    XLSX.writeFile(workbook, ACCOUNTS_XLSX_PATH);
    
    console.log(`[lifecycle] ✅ 账号 ${shopId} 端口已更新为 ${newPort}`);
    return true;
  } catch (e) {
    console.error(`[lifecycle] 更新账号端口失败: ${e.message}`);
    return false;
  }
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 核心检测
  isPortReallyAvailable,
  isChromeReallyRunning,
  
  // 清理
  cleanZombieRecords,
  cleanZombieShop,
  
  // 生命周期
  safeStartChrome,
  forceKillPort,
  
  // 状态
  loadBrowserState,
  saveBrowserState
};
