// 浏览器管理模块 - 启动/停止/端口检测
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { CHROME_PATH, PROFILES_ROOT, BROWSER_STATE_FILE } = require('./config');
const { isPortAvailable } = require('./accounts');

// ============================================================
// 店铺浏览器进程状态管理（PID 精确记录）
// ============================================================

/** 加载状态文件 */
function loadBrowserState() {
  try {
    if (fs.existsSync(BROWSER_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BROWSER_STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[browser] 加载状态文件失败:', e.message);
  }
  return {};
}

/** 保存状态文件 */
function saveBrowserState(state) {
  try {
    const dir = path.dirname(BROWSER_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BROWSER_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[browser] 保存状态文件失败:', e.message);
  }
}

/** 记录店铺浏览器的 PID */
function recordBrowserPid(shopId, pid, port) {
  const state = loadBrowserState();
  state[shopId] = { pid, port, startedAt: new Date().toISOString() };
  saveBrowserState(state);
  console.log(`[browser] 记录店铺进程: ${shopId} PID=${pid} port=${port}`);
}

/** 清除店铺浏览器的 PID 记录 */
function clearBrowserPid(shopId) {
  const state = loadBrowserState();
  if (state[shopId]) {
    const { pid, port } = state[shopId];
    delete state[shopId];
    saveBrowserState(state);
    console.log(`[browser] 清除店铺进程记录: ${shopId} PID=${pid} port=${port}`);
  }
}

/** 按 shopId 精确停止浏览器并清除记录 */
async function stopBrowserByShop(shopId) {
  const state = loadBrowserState();
  const entry = state[shopId];
  if (!entry) {
    console.log(`[browser] ${shopId} 无进程记录，跳过`);
    return false;
  }
  const { pid, port } = entry;
  console.log(`[browser] 停止店铺浏览器: ${shopId} PID=${pid} port=${port}`);
  
  // 先杀进程
  await killPort(port);
  
  // 再清记录
  delete state[shopId];
  saveBrowserState(state);
  
  // 等待端口释放
  await sleep(1500);
  
  const released = await isPortAvailable(port);
  console.log(`[browser] 端口 ${port} 释放: ${released}`);
  return true;
}

// 杀占用指定端口的进程（Windows）- 全部在单个 PowerShell 进程内完成
async function killPort(port) {
  const psCmd = `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
  return new Promise((resolve) => {
    const proc = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', psCmd], { stdio: 'ignore', shell: true });
    proc.on('error', () => resolve(true));
    proc.on('close', () => resolve(true));
  });
}

// 3阶段端口清理
async function cleanPort(port) {
  // 阶段1：直接杀进程
  await killPort(port);
  await sleep(600);

  if (await isPortAvailable(port)) {
    return true;
  }

  // 阶段2：等 3 秒让 TIME_WAIT 释放
  await sleep(3000);

  if (await isPortAvailable(port)) {
    return true;
  }

  // 阶段3：再次杀 + 等待最多 5 分钟
  await killPort(port);
  await sleep(2000);

  const MAX_WAIT_MS = 5 * 60 * 1000;
  const start = Date.now();
  while (!(await isPortAvailable(port)) && (Date.now() - start) < MAX_WAIT_MS) {
    await sleep(10000);
  }

  return await isPortAvailable(port);
}

// 启动 Chrome
async function startChrome(account) {
  const { cdp_port, profile } = account;
  const profileFullPath = path.resolve(PROFILES_ROOT, profile || `pdd_${account.shop_id}`);

  // 清理端口
  const cleaned = await cleanPort(cdp_port);
  if (!cleaned) {
    throw new Error(`端口 ${cdp_port} 清理失败，进程占用超过 5 分钟`);
  }

  // 确保 profile 目录存在
  if (!fs.existsSync(profileFullPath)) {
    fs.mkdirSync(profileFullPath, { recursive: true });
  }

  // 直接启动 Chrome，让它独立存活
  // 添加 about:blank 作为备用页，防止 Chrome 无页面时关闭
  const chromeArgs = [
    `--remote-debugging-port=${cdp_port}`,
    `--user-data-dir=${profileFullPath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--start-maximized',
    '--disable-web-security',         // 允许跨域 canvas 导出
    '--allow-file-access-from-files', // 允许文件访问
    '--disable-hang-monitor',         // 防止 Chrome 检测到无响应后关闭
    '--disable-background-timer-throttling', // 防止后台定时器节流
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--no-crashpad',                  // 禁用崩溃报告
    '--disable-features=TranslateUI',
    '--noerrdialogs',                 // 禁用错误对话框
    '--disable-session-crashed-bubble',
    '--disable-dev-shm-usage',
    '--disable-in-process-stack-traces',
    'https://mms.pinduoduo.com',
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME_PATH, chromeArgs, {
      detached: true,
      stdio: 'ignore',
    });

    const chromePid = proc.pid;

    proc.on('error', (err) => {
      reject(new Error(`启动 Chrome 失败: ${err.message}`));
    });

    // 等待一下让 Chrome 启动
    setTimeout(async () => {
      if (await isPortAvailable(cdp_port)) {
        reject(new Error(`Chrome 启动后端口 ${cdp_port} 仍未被占用，启动失败`));
      } else {
        // 记录 PID
        recordBrowserPid(account.shop_id, chromePid, cdp_port);
        resolve({
          port: cdp_port,
          profileDir: profileFullPath,
          pid: chromePid,
        });
      }
    }, 5000);

    // 分离进程，让 Chrome 独立
    proc.unref();
  });
}

// 停止 Chrome 实例
async function stopChrome(port) {
  const killed = await killPort(port);
  await sleep(1000);
  return killed;
}

// 睡眠
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 查找 Chrome 进程 PID（通过监听端口）
function findChromePid(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const { exec } = require('child_process');
    
    // 尝试连接端口，如果成功就查找进程
    const client = new net.Socket();
    client.connect(port, '127.0.0.1', () => {
      client.destroy();
      // 使用 netstat 查找 PID
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        const match = stdout.match(/LISTENING\s+(\d+)/);
        resolve(match ? parseInt(match[1]) : null);
      });
    });
    client.on('error', () => {
      resolve(null);
    });
  });
}

// 随机延迟（拟人化）
function randomDelay(min = 1000, max = 3000) {
  const delay = min + Math.random() * (max - min);
  return sleep(delay);
}

module.exports = {
  killPort,
  cleanPort,
  startChrome,
  stopChrome,
  stopBrowserByShop,
  sleep,
  randomDelay,
};
