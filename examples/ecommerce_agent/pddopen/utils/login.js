// 登录流程 —— 如果已经登录就跳过扫码
// 捕获二维码 → 发送飞书 → 等待登录 → 提取数据 → 开始提取数据

const { chromium } = require('playwright');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');
const { sleep, randomDelay } = require('./browser');
const { waitWithHeartbeat } = require('./sigkill_guard');
const { getSelectors, getSelector, getFallbackCoords, buildLocator } = require('./elements');
const { matchPage } = require('./elements');
const { sendQrCode, sendText } = require('./notify');
const hooks = require('./hooks');
const { MEDIA_ROOT } = require('./config');
const { generateStealthJs } = require('./stealth');
const { waitForPageReady, getCurrentPage, isLoggedIn } = require('./page');
const { getShopName, getAdminName, verifyShopMatch } = require('./shop_info');

// CDP 连接重试（指数退避）
async function connectWithRetry(port, maxRetries = 5) {
  const browserURL = `http://127.0.0.1:${port}`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const browser = await chromium.connectOverCDP(browserURL, { timeout: 10000 });
      return browser;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      const delay = 2000 * Math.pow(2, i); // 2s → 4s → 8s → 16s → 32s
      console.log(`[CDP] 连接失败(${i + 1}/${maxRetries})，${delay}ms后重试...`);
      await sleep(delay);
    }
  }
}

// 连接到已经运行的 Chrome（CoPaw 版本：不拥有浏览器）
// 同时注入 stealth 反检测脚本
async function connectToChrome(port) {
  const browser = await connectWithRetry(port);
  browser._disconnected = false; // 不自动关闭
  
  // 注入 stealth 反检测（通过 CDP）
  try {
    const client = await CDP({ port });
    await client.Page.enable();
    await client.Page.addScriptToEvaluateOnNewDocument({
      source: generateStealthJs()
    });
    await client.close();
    console.log('🛡️ Stealth 反检测已注入');
  } catch (e) {
    console.warn('⚠️ Stealth 注入失败（不影响功能）:', e.message);
  }
  
  const contexts = browser.contexts();
  let page;
  
  if (contexts.length > 0) {
    const ctx = contexts[0];
    const allPages = await ctx.pages();
    
    // 过滤掉系统页面（chrome://, about:, devtools://）
    const pages = allPages.filter(p => {
      const url = p.url();
      return !url.startsWith('chrome://') && 
             !url.startsWith('about:') && 
             !url.startsWith('devtools://');
    });
    
    console.log(`📋 浏览器共 ${allPages.length} 个页面，过滤后 ${pages.length} 个`);
    
    // 策略1: 优先找登录页面
    let targetPage = pages.find(p => p.url().includes('/login'));
    
    // 策略2: 找 home/dashboard 页面
    if (!targetPage) {
      targetPage = pages.find(p => 
        p.url().includes('/home') || 
        p.url().includes('/dashboard') ||
        p.url().includes('mms.pinduoduo.com')
      );
    }
    
    // 策略3: 使用第一个非系统页面
    if (!targetPage && pages.length > 0) {
      targetPage = pages[0];
    }
    
    // 兜底: 创建新页面
    if (!targetPage) {
      targetPage = await ctx.newPage();
      console.log(`📍 创建新页面`);
    }
    
    page = targetPage;
    console.log(`📍 使用页面: ${page.url().substring(0, 80)}`);
    
    // 聚焦到目标页面
    try {
      await page.bringToFront();
    } catch (e) {}
  } else {
    page = await browser.newPage();
    console.log(`📍 创建新页面`);
  }
  
  return { browser, client: page };
}

// 关闭所有弹窗和通知面板（安全版：所有操作带超时，永不卡住）
async function closeAllPopups(page) {
  // 1. 点击通用关闭按钮（知道了/确认等）
  const modalSelectors = getSelectors('shared', 'modalCloseBtn');
  for (const sel of modalSelectors) {
    try {
      await page.waitForSelector(sel.value, { timeout: 1500 });
      await page.click(sel.value);
      await randomDelay(300, 600);
    } catch (e) { /* 没找到就跳过 */ }
  }

  // 2. 关闭右侧通知面板
  const notifSelectors = getSelectors('shared', 'notificationCloseBtn');
  for (const sel of notifSelectors) {
    try {
      const locator = buildLocator(page, sel);
      await locator.first().waitFor({ timeout: 1500 });
      await locator.first().click();
      await randomDelay(300, 600);
      break;
    } catch (e) { /* 没找到就跳过 */ }
  }

  // 3. 按 ESC 关闭弹窗（万能兜底）
  try {
    await page.keyboard.press('Escape');
    await randomDelay(300, 500);
  } catch (e) { /* 跳过 */ }

  return page;
}

// 捕获二维码并保存（支持过期自动刷新 + canvas 精确提取）
async function captureQrCode(page, port, shopName, ctx, options = {}) {
  console.log('📸 捕获二维码...');

  // 清理上次的旧二维码
  const { existsSync, unlinkSync } = require('fs');
  const { TEMP_DIR, MEDIA_ROOT } = require('./config');
  const tempPath = path.join(__dirname, '..', 'temp', `current_qr_${port}.png`);
  const publicPath = path.join(MEDIA_ROOT, 'current_qr.png');
  if (existsSync(tempPath)) unlinkSync(tempPath);
  if (existsSync(publicPath)) unlinkSync(publicPath);

  // ---- 捕获 + 发送（完整流程，失败才抛异常）----
  async function tryCapture() {
    // ---- 1. 过期检测 + 自动刷新 ----
    const hasMask = await page.$('.scan-mask');
    if (hasMask) {
      console.log('⚠️ 检测到二维码已过期，点击刷新...');
      const maskBtn = page.locator('.scan-mask button');
      await maskBtn.scrollIntoViewIfNeeded();
      await maskBtn.click({ force: true });
      await randomDelay(2000, 3000);
    }

    // ---- 2. 等待 canvas 尺寸就绪 ----
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('.qr-code canvas');
        return canvas && canvas.width === 120 && canvas.height === 120;
      },
      { timeout: 10000 }
    );
    console.log('✅ 二维码 canvas 尺寸就绪');
    
    // ---- 2.5 等待二维码图像完整绘制（多次采样确认）----
    // 二维码是从服务器异步加载后绘制到 canvas 的，尺寸就绪≠图像画完
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('.qr-code canvas');
        if (!canvas) return false;
        // 检查 canvas 是否已绘制（非空白）
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // 统计非白色像素数量（二维码有图案，非纯白）
        let nonWhite = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          // 如果像素不是接近白色（容差 20），认为是二维码图案
          if (!(r > 235 && g > 235 && b > 235)) {
            nonWhite++;
          }
        }
        // 如果有超过 100 个非白色像素，认为二维码已绘制
        return nonWhite > 100;
      },
      { timeout: 10000 }
    );
    console.log('✅ 二维码图像已完整绘制');
    
    // 再额外等待一小段时间确保稳定性
    await randomDelay(500, 800);

    // ---- 3. 从 canvas 精确提取图像数据（160x160 带白色 padding）----
    const qrDataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('.qr-code canvas');
      if (!canvas) throw new Error('找不到二维码 canvas');
      const PADDING = 20, SIZE = 120;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = SIZE + PADDING * 2;
      newCanvas.height = SIZE + PADDING * 2;
      const ctx = newCanvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      ctx.drawImage(canvas, PADDING, PADDING, SIZE, SIZE);
      return newCanvas.toDataURL('image/png');
    });

    console.log('📸 二维码数据提取成功 (' + qrDataUrl.length + ' bytes)');

    // ---- 4. 保存文件 ----
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tempPath, buffer);
    fs.copyFileSync(tempPath, publicPath);
    console.log(`📸 二维码已保存到 ${publicPath}`);

    // ---- 5. 发送到飞书 ----
    console.log('🚀 发送二维码到飞书...');
    
    // 1. 先发"请扫码"文字
    const scanText = options.reason === 'timeout'
      ? '⏰ 扫码超时，请重新扫码'
      : options.reason === 'shop_mismatch'
      ? '🔄 店铺不匹配，请用正确账号重新扫码'
      : options.retry
      ? '🔄 ' + shopName + ' 二维码（重试），请重新扫码'
      : '📍 ' + shopName + ' 请扫码';
    await sendText(scanText, ctx);
    console.log('✅ 请扫码');
    
    // 2. 再发图片
    const imgCaption = options.retry ? shopName + ' 二维码（重试）' : shopName + ' 二维码';
    const result = await sendQrCode(publicPath, imgCaption, ctx);
    if (!result.success) {
      throw new Error('send_failed:' + result.reason);
    }
    console.log('✅ 二维码图片发送成功');
    
    return publicPath;
  }

  // ---- 主流程：首次尝试 ----
  try {
    return { success: true, path: await tryCapture() };
  } catch (firstError) {
    console.error('❌ 首次捕获失败:', firstError.message);

    // ---- 失败后刷新重试一次 ----
    try {
      console.log('🔄 刷新页面，重试捕获...');
      await page.goto('https://mms.pinduoduo.com/login', { waitUntil: 'networkidle' });
      await randomDelay(3000, 5000);
      return { success: true, path: await tryCapture() };
    } catch (retryError) {
      console.error('❌ 重试也失败了:', retryError.message);
      await sendError('捕获二维码失败: ' + retryError.message, ctx);
      return { success: false };
    }
  }
}

// 等待扫码登录完成（事件驱动版，告别轮询）
async function waitForLogin(page, port, shopName, ctx) {
  console.log('⏳ 等待扫码登录...');
  const MAX_WAIT_MS = 5 * 60 * 1000; // 5 分钟
  const NOTIFY_INTERVAL_MS = 60 * 1000; // 每 1 分钟提醒一次

  try {
    // 事件驱动：扫码完成后页面会跳转到 home，waitForURL 直接返回，不用轮询
    await page.waitForURL(url => {
      try {
        const u = new URL(url);
        return u.hostname.includes('pinduoduo.com') && (u.pathname === '/home' || u.pathname.endsWith('/home/'));
      } catch { return false; }
    }, { timeout: MAX_WAIT_MS });
    console.log('✅ 扫码成功，已登录');

    // 验证店铺
    console.log('🔍 验证店铺信息: ' + shopName + '...');
    const verifyResult = await verifyShopMatch(page, shopName);
    console.log(verifyResult.message);

    if (!verifyResult.ok) {
      const notifyMsg = '⚠️ 店铺不匹配\n预期：' + shopName + '\n实际：' + verifyResult.actual + '\n→ 自动重新扫码，请用正确账号登录';
      console.log(notifyMsg);
      await hooks.fire('shopMismatch', { expected: shopName, actual: verifyResult.actual });
      await logoutAccount(page);
      return { success: false, reason: 'shop_mismatch', actual: verifyResult.actual };
    }

    hooks.fire('afterLogin', { shopName, adminName: verifyResult.adminName });
    return { success: true };

  } catch (e) {
    if (e.message.includes('timeout')) {
      const timeoutMsg = '等待登录超时（5分钟），请重新发起提取';
      console.error('[login] ' + timeoutMsg);
      hooks.fire('onError', { message: shopName + timeoutMsg });
    } else {
      console.error('等待扫码登录异常:', e.message);
    }
    return { success: false, reason: 'timeout' };
  }
}

// 完整登录流程
async function fullLoginFlow(port, shopName, ctx) {
  console.log('[pdd-open] 开始登录流程 port=' + port);
  
  const { browser, client } = await connectToChrome(port);
  
  // 先获取当前 URL，判断是否已经登录了
  let currentUrl;
  try {
    currentUrl = await client.url();
    console.log(`📍 当前 URL: ${currentUrl}`);
  } catch (e) {
    console.log(`⚠️ 获取当前 URL 失败，跳转登录页...`);
    await client.goto('https://mms.pinduoduo.com/login');
    await client.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    await waitForPageReady(client);
    currentUrl = await client.url();
  }

  // 如果不在拼多多域名上（如 chrome:// 新标签页），主动导航到登录页
  if (!currentUrl.includes('pinduoduo.com') && !currentUrl.includes('mms')) {
    console.log(`📍 当前不在拼多多域名，主动导航到登录页...`);
    await client.goto('https://mms.pinduoduo.com/login', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(client);
    currentUrl = await client.url();
    console.log(`📍 导航后 URL: ${currentUrl}`);
  }
  
  // 如果不在登录页，就认为已经登录（不再跳转，避免超时）
  if (currentUrl.includes('login')) {
    console.log('📍 当前在登录页，需要扫码登录');
  } else {
    console.log('✅ 已检测到非登录页面，认为已登录，跳过扫码');
  }
  
  // 检查是否已经登录（只要不在 login 页就认为已登录）
  if (!currentUrl.includes('login')) {
    console.log('✅ 已经登录，跳过扫码');
    
    // 验证店铺 + 读取管理员名称（均从 DOM 获取）
    const verifyResult = await verifyShopMatch(client, shopName);
    console.log(verifyResult.message);
    if (verifyResult.adminName) {
      console.log(`👤 管理员：${verifyResult.adminName}`);
    }
    if (!verifyResult.ok) {
      hooks.fire('shopMismatch', { expected: shopName, actual: verifyResult.actual });
      await logoutAccount(client);
      // 退出后，回到扫码流程
    } else {
      hooks.fire('afterLogin', { shopName, adminName: verifyResult.adminName });
      return { 
        success: true, 
        client, 
        browser,
        shopVerified: verifyResult.ok, 
        actualShopName: verifyResult.actual, 
        adminName: verifyResult.adminName 
      };
    }
  }
  
  // 需要扫码（含自动重试：店铺不匹配时自动退出并重新扫码）
  const MAX_LOGIN_RETRIES = 3;
  let loginSuccess = false;
  let actualShopName = '';
  let adminName = '';
  let shopVerified = false;
  let verifyResultData = null;
  
  for (let retry = 0; retry < MAX_LOGIN_RETRIES; retry++) {
    const isRetry = retry > 0;
    if (retry > 0) {
      console.log('📍 第 ' + (retry + 1) + ' 次扫码尝试...');
    }
    
    await captureQrCode(client, port, shopName, ctx, { retry: isRetry });
    const result = await waitForLogin(client, port, shopName, ctx);
    
    if (result.success) {
      // 店铺验证已在 waitForLogin 内部完成并通知
      loginSuccess = true;
      shopVerified = result.shopVerified;
      actualShopName = result.actualShopName || '';
      adminName = result.adminName || '';
      break;
    }
    
    if (result.reason === 'shop_mismatch') {
      actualShopName = result.actual || actualShopName;
      if (retry < MAX_LOGIN_RETRIES - 1) {
        console.log('🔄 店铺不匹配，自动重新扫码（第 ' + (retry + 1) + ' 次）...');
        // logoutAccount 已在 waitForLogin 内部调用，页面已回到登录页
        // 继续下一次循环，重新 captureQrCode + waitForLogin
      } else {
        console.error('❌ 多次扫码店铺均不匹配，放弃');
        hooks.fire('loginFailed', { shopName, reason: '多次扫码店铺均不匹配，请确认二维码是否正确' });
      }
      continue;
    }
    
    // 其他失败原因（超时等）
    if (retry < MAX_LOGIN_RETRIES - 1) {
      console.log('登录失败，等待重试...');
      continue;
    }
  }
  
  if (!loginSuccess) {
    await browser.close();
    return { success: false, client: null, browser: null };
  }

  // 关闭可能的弹窗
  await closeAllPopups(client);

  return {
    success: true,
    client,
    browser,
    shopVerified,
    actualShopName,
    adminName,
  };
}

// 退出当前账号（回到登录页）
async function logoutAccount(page) {
  console.log('🔓 退出当前账号，清理 Cookie...');

  // 方法1：通过 Playwright 清理 Cookie（最可靠）
  try {
    const context = page.context();
    await context.clearCookies();
    console.log('✅ 已清理 Cookie（Playwright）');
  } catch (e) {
    console.warn('⚠️ Playwright 清理 Cookie 失败:', e.message);
  }

  // 方法2：通过 CDP 清理 Cookie（兜底）
  try {
    const CDP = require('chrome-remote-interface');
    const browser = page.context().browser();
    if (browser && browser.contexts().length > 0) {
      const cdpSession = await browser.contexts()[0].newCDPSession(page);
      await cdpSession.send('Network.clearBrowserCookies');
      console.log('✅ 已清理 Cookie（CDP）');
      await cdpSession.detach();
    }
  } catch (e) {
    console.warn('⚠️ CDP 清理 Cookie 失败:', e.message);
  }

  // 点击账号下拉触发器 → 退出（UI 层面退出）
  const triggerSelectors = [
    { type: 'css-prefix', value: 'AccountNew_wrap', keyword: 'XIDOO' },
    { type: 'css-prefix', value: 'AccountNew_layout', keyword: 'XIDOO' },
    { type: 'css-prefix', value: 'mallName', keyword: 'XIDOO' },
    { type: 'css', value: '.anq-dropdown-trigger', keyword: '旗舰店' },
  ];

  let clickedTrigger = false;
  for (const sel of triggerSelectors) {
    try {
      const locator = buildLocator(page, sel);
      await locator.first().waitFor({ timeout: 3000 });
      await locator.first().click({ timeout: 5000 });
      await randomDelay(800, 1500);
      clickedTrigger = true;
      console.log('✅ 点击账号下拉触发器成功');
      break;
    } catch (e) {
      continue;
    }
  }

  if (!clickedTrigger) {
    console.log('⚠️ 无法点击账号下拉触发器，直接跳转登录页');
    await page.goto('https://mms.pinduoduo.com/login', { waitUntil: 'networkidle', timeout: 15000 });
    await waitForPageReady(page);
    return { success: true };
  }

  await randomDelay(500, 1000);
  const logoutSelectors = [
    { type: 'css-prefix', value: 'logout', keyword: '退出当前账号' },
    { type: 'css-prefix', value: 'mms-header__userinfo', keyword: '退出' },
    { type: 'css', value: '.logout', keyword: '退出当前账号' },
    { type: 'xpath', value: '//div[contains(@class,"logout")]' },
    { type: 'xpath', value: '//div[contains(text(),"退出当前账号")]' },
  ];

  for (const sel of logoutSelectors) {
    try {
      const locator = buildLocator(page, sel);
      await locator.first().waitFor({ timeout: 3000 });
      await locator.first().click({ timeout: 5000 });
      await randomDelay(1500, 2500);
      console.log('✅ 点击退出按钮成功');
      break;
    } catch (e) {
      continue;
    }
  }

  // 跳转到登录页
  try {
    await page.waitForFunction(() => window.location.href.includes('login'), { timeout: 5000 });
    console.log('✅ 已回到登录页');
  } catch (e) {
    console.log('⚠️ 未自动跳转，强制跳转登录页...');
    await page.goto('https://mms.pinduoduo.com/login', { waitUntil: 'networkidle', timeout: 15000 });
    await waitForPageReady(page);
  }
  return { success: true };
}

module.exports = {
  connectToChrome,
  fullLoginFlow,
  closeAllPopups,
  captureQrCode,
  waitForLogin,
  verifyShopMatch,
  logoutAccount,
};
