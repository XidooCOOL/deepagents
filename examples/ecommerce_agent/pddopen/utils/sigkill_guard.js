/**
 * sigkill-guard.js
 * 防 SIGKILL 保护层：心跳 + 安全导航 + 智能等待
 * 来源：C:\Users\Administrator\.openclaw\skills\pdd-open\src\sigkill-guard.js
 * 
 * 所有模块统一调用这里，而不是直接用 page.waitForTimeout / page.goto
 */

const path = require('path');
const fs = require('fs');
const { DATA_ROOT } = require('./config');
const { waitForPageReady } = require('./page');

// 确保截图目录存在
function ensureScreenshotsDir() {
  const dir = path.join(DATA_ROOT, 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 心跳等待 — 解决 page.waitForTimeout 静默期被 OS 杀的问题
 * @param {Page} page - Playwright page 对象
 * @param {number} ms - 等待毫秒数
 * @param {string} label - 描述标签，打印用
 */
async function waitWithHeartbeat(page, ms, label = '等待') {
  const interval = Math.min(2000, ms); // 每2秒心跳，或按比例
  let waited = 0;

  const heartbeat = setInterval(() => {
    waited += interval;
    const pct = ms > 0 ? ` (${Math.round(waited / ms * 100)}%)` : '';
    console.log(`⏳ ${label}...${pct}`);
  }, interval);

  // page 可能为 null（如进程末尾的简单延时），降级为 setTimeout
  try {
    if (page) {
      await page.waitForTimeout(ms);
    } else {
      await new Promise(r => setTimeout(r, ms));
    }
  } catch (e) {
    await new Promise(r => setTimeout(r, ms));
  }

  clearInterval(heartbeat);
  console.log(`✅ ${label} 完成`);
}

/**
 * 安全导航 — goto 加 timeout，导航成功立即截图保活
 * @param {Page} page - Playwright page 对象
 * @param {string} url - 目标 URL
 * @param {object} options - goto 选项，默认 timeout=30000
 * @returns {boolean} true=导航成功，false=超时/失败
 */
async function safeGoto(page, url, options = {}) {
  const timeout = options.timeout || 30000;
  const label = options.label || url;

  console.log(`🚀 导航: ${label}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (e) {
    console.warn(`⚠️ 导航超时/失败: ${e.message}`);
    return false;
  }

  // 等待页面加载完成
  await waitForPageReady(page);

  // 导航成功后立即截图，证明页面可达，OS 看到进程在做事
  ensureScreenshotsDir();
  const screenshotPath = path.join(
    ensureScreenshotsDir(),
    `sigkill_guard_${Date.now()}.png`
  );
  try {
    await page.screenshot({ path: screenshotPath, timeout: 10000 });
    console.log(`📸 截图已保存: ${path.basename(screenshotPath)}`);
  } catch (e) {
    console.warn(`⚠️ 截图失败（不影响主流程）: ${e.message}`);
  }

  return true;
}

/**
 * 智能等待数据渲染 — 等 DOM 元素出现，全程心跳，未出现 fallback
 * @param {Page} page - Playwright page 对象
 * @param {string} selector - CSS 选择器或 Playwright 断言
 * @param {object} options
 * @param {number} options.timeout - 最大等待时间，默认 15000
 * @param {number} options.fallbackMs - 元素未出现时 fallback 等待，默认 5000
 * @param {string} options.label - 描述
 */
async function waitForData(page, selector, options = {}) {
  const {
    timeout = 15000,
    fallbackMs = 5000,
    label = `等待元素 ${selector}`
  } = options;

  console.log(`🔍 ${label}（最多 ${timeout}ms）`);

  // 先尝试 networkidle（等网络空闲，数据往往已加载）
  try {
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 20000) });
    console.log(`✅ networkidle 触发`);
  } catch (e) {
    console.warn(`⚠️ networkidle 未触发，fallback 到固定等待`);
    await waitWithHeartbeat(page, fallbackMs, label);
    return;
  }

  // 再尝试等待目标选择器出现
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    console.log(`✅ 元素出现: ${selector}`);
  } catch (e) {
    console.warn(`⚠️ 元素 ${selector} 未在 ${timeout}ms 内出现，fallback`);
    await waitWithHeartbeat(page, fallbackMs, label);
  }
}

/**
 * 安全截图 — 封装 page.screenshot，失败不抛异常
 * @param {Page} page
 * @param {string} suffix 文件名后缀
 */
async function safeScreenshot(page, suffix = 'snapshot') {
  ensureScreenshotsDir();
  const screenshotPath = path.join(
    ensureScreenshotsDir(),
    `${suffix}_${Date.now()}.png`
  );
  try {
    await page.screenshot({ path: screenshotPath, timeout: 10000 });
    console.log(`📸 截图: ${path.basename(screenshotPath)}`);
    return screenshotPath;
  } catch (e) {
    console.warn(`⚠️ 截图失败: ${e.message}`);
    return null;
  }
}

module.exports = {
  waitWithHeartbeat,
  safeGoto,
  waitForData,
  safeScreenshot,
};
