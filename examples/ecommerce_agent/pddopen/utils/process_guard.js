/**
 * process_guard.js - 进程守护模块
 * 
 * 解决：
 * 1. Node.js 超时/被杀时 → Chrome 也退出
 * 2. Chrome 崩溃时 → Node.js 知道并清理
 * 3. CDP 连接断开时 → 自动重连或清理
 */

const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BROWSER_STATE_FILE, PROFILES_ROOT } = require('./config');
const { loadBrowserState, forceKillPort, isChromeReallyRunning } = require('./lifecycle');

// ============================================================
// 全局进程管理
// ============================================================

// 记录当前会话启动的 Chrome 进程
const _sessionChrome = new Map(); // shopId -> { proc, port, browser }

// 注册 Chrome 进程到会话
function registerChrome(shopId, proc, port, browser) {
  _sessionChrome.set(shopId, { proc, port, browser });
  console.log(`[guard] 注册 Chrome: 店铺 ${shopId}, 端口 ${port}`);
}

// 注销 Chrome 进程
function unregisterChrome(shopId) {
  const entry = _sessionChrome.get(shopId);
  if (entry) {
    _sessionChrome.delete(shopId);
    console.log(`[guard] 注销 Chrome: 店铺 ${shopId}`);
  }
}

// ============================================================
// Node.js 退出处理
// ============================================================

let _guardEnabled = false;

/**
 * 启用进程守护
 * 调用时机：在 pdd-open.js 主流程开始时调用
 */
function enableGuard() {
  if (_guardEnabled) return;
  _guardEnabled = true;
  
  console.log('[guard] 进程守护已启用');
  
  // 捕获退出信号
  const cleanup = async (signal) => {
    console.log(`\n[guard] 收到 ${signal} 信号，开始清理...`);
    await cleanupAllChrome();
    console.log('[guard] 清理完成，退出');
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', cleanup);
  
  // 捕获未处理的异常
  process.on('uncaughtException', async (err) => {
    console.error('[guard] 未捕获异常:', err.message);
    await cleanupAllChrome();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[guard] 未处理的 Promise 拒绝:', reason);
    await cleanupAllChrome();
  });
}

/**
 * 清理所有会话中的 Chrome
 */
async function cleanupAllChrome() {
  console.log(`[guard] 正在清理 ${_sessionChrome.size} 个 Chrome 进程...`);
  
  for (const [shopId, entry] of _sessionChrome) {
    try {
      console.log(`[guard] 关闭店铺 ${shopId}...`);
      
      // 先断开 CDP 连接
      if (entry.browser) {
        try {
          await entry.browser.disconnect();
        } catch (e) {}
      }
      
      // 再杀进程
      await forceKillPort(entry.port);
      
    } catch (e) {
      console.warn(`[guard] 清理店铺 ${shopId} 失败: ${e.message}`);
    }
  }
  
  _sessionChrome.clear();
}

// ============================================================
// Chrome 崩溃检测
// ============================================================

/**
 * 为浏览器添加崩溃监听
 */
function watchBrowserCrash(shopId, browser) {
  browser.on('disconnected', async () => {
    console.log(`[guard] ⚠️ Chrome 崩溃/断开: 店铺 ${shopId}`);
    
    // 从会话中移除
    _sessionChrome.delete(shopId);
    
    // 清理 browser_state.json
    const state = loadBrowserState();
    if (state[shopId]) {
      delete state[shopId];
      const dir = path.dirname(BROWSER_STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(BROWSER_STATE_FILE, JSON.stringify(state, null, 2));
    }
    
    console.log(`[guard] 店铺 ${shopId} 崩溃记录已清理`);
  });
}

// ============================================================
// CDP 连接健康检测
// ============================================================

/**
 * CDP 连接健康检测循环
 * @param {string} shopId
 * @param {Browser} browser - Playwright Browser 对象
 * @param {number} port
 * @param {number} intervalMs - 检测间隔，默认 30 秒
 */
let _healthChecks = new Map(); // shopId -> intervalId

function startHealthCheck(shopId, browser, port, intervalMs = 30000) {
  // 清除已有的
  stopHealthCheck(shopId);
  
  const intervalId = setInterval(async () => {
    try {
      // 尝试执行简单操作检测连接
      const ctx = browser.contexts()[0];
      if (!ctx) {
        console.log(`[guard] ⚠️ 店铺 ${shopId} 无 context，停止检测`);
        stopHealthCheck(shopId);
        return;
      }
      
      const pages = await ctx.pages();
      if (pages.length === 0) {
        console.log(`[guard] ⚠️ 店铺 ${shopId} 无页面，停止检测`);
        stopHealthCheck(shopId);
        return;
      }
      
      // 检测浏览器进程是否还在
      const { running } = await isChromeReallyRunning(port);
      if (!running) {
        console.log(`[guard] ⚠️ 店铺 ${shopId} Chrome 进程已死`);
        stopHealthCheck(shopId);
        return;
      }
      
      console.log(`[guard] ✅ 店铺 ${shopId} 健康检查通过`);
      
    } catch (e) {
      console.log(`[guard] ⚠️ 店铺 ${shopId} 健康检查失败: ${e.message}`);
      // CDP 连接可能断了，触发断开处理
      browser.emit('disconnected');
      stopHealthCheck(shopId);
    }
  }, intervalMs);
  
  _healthChecks.set(shopId, intervalId);
  console.log(`[guard] 启动健康检查: 店铺 ${shopId} (每 ${intervalMs/1000}s)`);
}

function stopHealthCheck(shopId) {
  const intervalId = _healthChecks.get(shopId);
  if (intervalId) {
    clearInterval(intervalId);
    _healthChecks.delete(shopId);
  }
}

// ============================================================
// 带守护的浏览器启动
// ============================================================

/**
 * 带守护的 Chrome 启动
 * 自动注册进程守护和崩溃监听
 */
async function guardedStartChrome(account, options = {}) {
  const { shopId, cdp_port } = account;
  
  // 启用守护（如果还没启用）
  enableGuard();
  
  // 调用 lifecycle 的 safeStartChrome
  const { safeStartChrome } = require('./lifecycle');
  const result = await safeStartChrome(account, options);
  
  if (result.success && result.browser) {
    // 注册到会话
    registerChrome(shopId, result.pid, cdp_port, result.browser);
    
    // 监听崩溃
    watchBrowserCrash(shopId, result.browser);
    
    // 启动健康检查
    startHealthCheck(shopId, result.browser, cdp_port);
  }
  
  return result;
}

/**
 * 带守护的浏览器关闭
 */
async function guardedStopBrowser(shopId) {
  const entry = _sessionChrome.get(shopId);
  
  if (entry) {
    // 停止健康检查
    stopHealthCheck(shopId);
    
    // 断开 CDP
    if (entry.browser) {
      try {
        await entry.browser.disconnect();
      } catch (e) {}
    }
    
    // 杀进程
    await forceKillPort(entry.port);
    
    // 从会话移除
    unregisterChrome(shopId);
  }
  
  return true;
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 守护控制
  enableGuard,
  cleanupAllChrome,
  
  // 进程注册
  registerChrome,
  unregisterChrome,
  
  // 浏览器守护
  watchBrowserCrash,
  startHealthCheck,
  stopHealthCheck,
  
  // 带守护的启动/停止
  guardedStartChrome,
  guardedStopBrowser,
};
