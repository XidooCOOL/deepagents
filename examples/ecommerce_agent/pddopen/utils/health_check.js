/**
 * health_check.js - 健康检查模块
 * Phase 5: Cookie过期、浏览器崩溃、CDP连接检测
 */

const CDP = require('chrome-remote-interface');
const net = require('net');
const { chromium } = require('playwright');
const { isBrowserRunning } = require('./browser');
const { isLoggedIn } = require('./page');
const { Errors } = require('./errors');

// 检查结果
const HealthStatus = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  UNHEALTHY: 'unhealthy'
};

/**
 * 健康检查项
 */
class HealthCheck {
  constructor(port, shopName) {
    this.port = port;
    this.shopName = shopName;
    this.results = [];
  }

  /**
   * 执行所有检查
   */
  async check() {
    this.results = [];
    
    await this.checkBrowserProcess();
    await this.checkCDPConnection();
    await this.checkLoginStatus();
    await this.checkCookieExpiry();
    
    return this.getOverallStatus();
  }

  /**
   * 检查浏览器进程
   */
  async checkBrowserProcess() {
    try {
      const running = await isBrowserRunning(this.port);
      this.results.push({
        name: 'browser_process',
        status: running ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: running ? '浏览器进程运行中' : '浏览器进程未运行',
        details: { port: this.port }
      });
    } catch (e) {
      this.results.push({
        name: 'browser_process',
        status: HealthStatus.UNHEALTHY,
        message: '检查浏览器进程失败',
        error: e.message
      });
    }
  }

  /**
   * 检查CDP连接
   */
  async checkCDPConnection() {
    try {
      const client = await CDP({ port: this.port, host: '127.0.0.1' });
      await client.close();
      this.results.push({
        name: 'cdp_connection',
        status: HealthStatus.HEALTHY,
        message: 'CDP连接正常'
      });
    } catch (e) {
      this.results.push({
        name: 'cdp_connection',
        status: HealthStatus.UNHEALTHY,
        message: 'CDP连接失败',
        error: e.message
      });
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${this.port}`);
      const ctx = browser.contexts()[0];
      const pages = await ctx.pages();
      const loginPage = pages.find(p => p.url().includes('/login'));
      
      const isLogin = !loginPage || loginPage.url().includes('/home') || loginPage.url().includes('/dashboard');
      
      this.results.push({
        name: 'login_status',
        status: isLogin ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: isLogin ? '已登录' : '需要重新登录',
        details: { url: loginPage?.url() }
      });
      
      await browser.disconnect();
    } catch (e) {
      this.results.push({
        name: 'login_status',
        status: HealthStatus.WARNING,
        message: '无法检查登录状态',
        error: e.message
      });
    }
  }

  /**
   * 检查Cookie过期
   */
  async checkCookieExpiry() {
    try {
      const client = await CDP({ port: this.port, host: '127.0.0.1' });
      const { Network } = client;
      await Network.enable();
      
      const cookies = await Network.getCookies();
      const now = Date.now();
      
      let expiredCount = 0;
      for (const cookie of cookies.cookies || []) {
        if (cookie.expires && cookie.expires * 1000 < now) {
          expiredCount++;
        }
      }
      
      this.results.push({
        name: 'cookie_expiry',
        status: expiredCount > 0 ? HealthStatus.WARNING : HealthStatus.HEALTHY,
        message: expiredCount > 0 ? `${expiredCount}个Cookie已过期` : 'Cookie状态正常',
        details: { total: cookies.cookies?.length || 0, expired: expiredCount }
      });
      
      await client.close();
    } catch (e) {
      this.results.push({
        name: 'cookie_expiry',
        status: HealthStatus.WARNING,
        message: '无法检查Cookie',
        error: e.message
      });
    }
  }

  /**
   * 获取整体状态
   */
  getOverallStatus() {
    const unhealthy = this.results.filter(r => r.status === HealthStatus.UNHEALTHY);
    const warnings = this.results.filter(r => r.status === HealthStatus.WARNING);
    
    return {
      shopName: this.shopName,
      port: this.port,
      overall: unhealthy.length > 0 ? HealthStatus.UNHEALTHY : warnings.length > 0 ? HealthStatus.WARNING : HealthStatus.HEALTHY,
      results: this.results
    };
  }

  /**
   * 打印检查结果
   */
  print() {
    const status = this.getOverallStatus();
    const icon = { healthy: '✅', warning: '⚠️', unhealthy: '❌' };
    
    console.log(`\n🔍 健康检查: ${status.shopName} (端口 ${status.port})`);
    console.log('─'.repeat(40));
    
    for (const r of status.results) {
      const i = icon[r.status] || '⚪';
      console.log(`  ${i} ${r.name}: ${r.message}`);
    }
    
    console.log('─'.repeat(40));
    console.log(`  总体: ${icon[status.overall]} ${status.overall.toUpperCase()}`);
    
    return status;
  }
}

/**
 * 批量健康检查
 */
async function checkAllShops(accounts) {
  const results = [];
  for (const acc of accounts) {
    const check = new HealthCheck(acc.cdp_port, acc.shop_name);
    const result = await check.check();
    results.push(result);
    check.print();
  }
  return results;
}

/**
 * 快速检测（仅检查浏览器进程和CDP）
 */
async function quickCheck(port) {
  try {
    const running = await isBrowserRunning(port);
    if (!running) return { healthy: false, reason: '浏览器未运行' };
    
    const client = await CDP({ port, host: '127.0.0.1', timeout: 3000 });
    await client.close();
    return { healthy: true };
  } catch (e) {
    return { healthy: false, reason: e.message };
  }
}

module.exports = { HealthCheck, HealthStatus, checkAllShops, quickCheck };
