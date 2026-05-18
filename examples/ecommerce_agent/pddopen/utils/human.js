/**
 * human.js - 模拟真实人类操作
 * 转译自 TypeScript 版本
 */

// 等待
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 随机整数
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 人类停顿（随机短停顿/长停顿）
async function humanPause(short = false) {
  const ms = short ? rand(300, 900) : rand(800, 2600);
  await sleep(ms);
}

// 人类移动鼠标到目标坐标，带随机抖动
// 注意：CDP 连接后 page.mouse.position() 可能无效，改用 locator 目标坐标
async function humanMove(page, target, duration = 600) {
  const mouse = page.mouse;
  let startX, startY;
  try {
    const pos = await mouse.position();
    startX = pos.x;
    startY = pos.y;
  } catch (e) {
    // CDP 连接后 mouse.position 不可用，从目标坐标反推起点（左上偏移）
    startX = target.x - rand(80, 200);
    startY = target.y - rand(50, 150);
  }
  const steps = rand(18, 40);
  const dt = duration / steps;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jx = (Math.random() - 0.5) * 8;
    const jy = (Math.random() - 0.5) * 8;
    const nx = startX + (target.x - startX) * t + jx;
    const ny = startY + (target.y - startY) * t + jy;
    await mouse.move(nx, ny);
    await sleep(dt);
  }
}

// 人类移动到元素中心点（用 locator.boundingBox + mouse.move，不依赖 mouse.position）
async function humanMoveTo(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('元素不存在');
  const cx = box.x + box.width / 2 + rand(-8, 8);
  const cy = box.y + box.height / 2 + rand(-6, 6);
  await humanMove(page, { x: cx, y: cy }, rand(500, 1100));
}

// 人类点击元素（主要用 locator.click，CDP mouse 异常或 strict mode 时降级）
async function humanClick(page, locator) {
  try {
    // 优先用 Playwright 原生 click（内置人类行为模拟、跨 iframe/Shadow DOM 处理）
    await locator.click({ timeout: 10000, force: false });
    await humanPause(true);
    return;
  } catch (e) {
    const msg = e.message || '';
    // strict mode violation（多元素匹配）或 mouse.position 异常 → 降级
    if (msg.includes('strict mode') || msg.includes('resolved to') ||
        msg.includes('mouse.position') || msg.includes('position is not')) {
      const box = await locator.first().boundingBox().catch(() => null);
      if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.click(cx, cy);
        await humanPause(true);
        return;
      }
    }
    throw e;
  }
}

// 人类点击（容忍多元素 strict mode，自动选第一个）
async function humanClickFirst(page, locator) {
  try {
    return await humanClick(page, locator);
  } catch (e) {
    if (e.message.includes('strict mode') || e.message.includes('resolved to')) {
      return await humanClick(page, locator.first());
    }
    throw e;
  }
}

// 人类输入文本（逐字输入，带随机间隔）
async function humanType(page, locator, text) {
  await humanMoveTo(page, locator);
  await humanClick(page, locator);
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: rand(80, 220) });
  }
}

// 人类滚动到指定 Y 坐标，分步滚动
async function humanScroll(page, targetY) {
  const start = await page.evaluate(() => window.scrollY);
  const delta = targetY - start;
  const steps = rand(15, 35);
  for (let i = 1; i <= steps; i++) {
    const cur = Math.max(0, start + delta * (i / steps));
    await page.evaluate(y => window.scrollTo(0, y), cur);
    await sleep(rand(15, 40));
  }
  await humanPause(true);
}

// 随机滚动
async function humanRandomScroll(page) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  const to = rand(200, Math.min(h - 500, 2500));
  await humanScroll(page, to);
}

module.exports = {
  sleep,
  rand,
  humanPause,
  humanMove,
  humanMoveTo,
  humanClick,
  humanClickFirst,
  humanType,
  humanScroll,
  humanRandomScroll
};
