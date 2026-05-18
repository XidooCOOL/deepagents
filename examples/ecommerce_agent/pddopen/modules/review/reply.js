/**
 * modules/review/reply.js - 评价自动回复/举报
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const config = require('../../utils/config');
const filter = require('./filter');
const { getCssQuerySelectors } = require('../../utils/elements');
const { setPageSize } = require('./navigate');
const excel = require('../../utils/excel');

// 从 elements.json 获取选择器（缓存）
function getReviewSelectors() {
  return {
    groupHeader: getCssQuerySelectors('review', 'groupHeaderRow'),
    stickyHeader: getCssQuerySelectors('review', 'stickyHeaderRow'),
    groupCell: getCssQuerySelectors('review', 'groupCellRow')
  };
}

// 检查元素是否匹配任何分组/表头选择器
function isGroupOrHeaderRow(row, selectors) {
  for (const sel of selectors.groupHeader) {
    const kw = sel.replace(/\[class\*='|\'\]/g, '');
    if (row.className && row.className.includes(kw)) return true;
  }
  for (const sel of selectors.stickyHeader) {
    const kw = sel.replace(/\[class\*='|\'\]/g, '');
    if (row.className && row.className.includes(kw)) return true;
  }
  return false;
}

// ========================
// 常量
// ========================

const DEFAULT_TEMPLATES = [
  '谢谢惠顾🌹',
  '感谢您的支持，祝您购物愉快！',
  '欢迎再次光临～',
  '祝您生活愉快！',
  '感谢反馈，我们会继续努力！',
  '亲，很高兴为您服务～',
  '祝您天天好心情！',
  '期待再次为您服务！',
];

const DEFAULT_REASON = '同行恶意差评';

const REPORT_TEMPLATES_MALICIOUS_NO_IMG = [
  '此为同行恶意竞争差评，买家下单后无任何咨询/售后沟通，评价内容无实物图、无质量问题凭证，与美瞳产品实际品质严重不符，故意打${star}拉低店铺评分，扰乱平台公平竞争，恳请平台核实删除。',
  '该买家购买后发表恶意差评，内容与实际商品体验严重不符。经核实，商品质量合格发货正常，评价内容存在明显夸大或歪曲事实的情况，属于同行恶意竞争行为。请平台审核处理，维护商家合法权益。',
  '此评价明显为恶意差评，买家评价内容与商品实际品质存在较大出入，存在诋毁店铺声誉的行为。同行竞争此类行为严重损害商家利益，恳请平台介入处理。',
  '经自查，商品质量合格，发货及时，物流正常。该差评内容存在明显失实，属于同行恶意诋毁行为，请平台审核处理。',
];

const REPORT_TEMPLATES_MALICIOUS_HAS_IMG = [
  '此为同行恶意竞争差评，买家下单后无任何咨询/售后沟通，评价内容无质量问题凭证，与美瞳产品实际品质严重不符，故意打${star}拉低店铺评分，扰乱平台公平竞争，恳请平台核实删除。',
];

function getRandomTemplate(templates) {
  const list = templates && templates.length ? templates : DEFAULT_TEMPLATES;
  return list[Math.floor(Math.random() * list.length)];
}

function getReportTemplate(reason, star = 2, hasImg = false) {
  const templates = hasImg ? REPORT_TEMPLATES_MALICIOUS_HAS_IMG : REPORT_TEMPLATES_MALICIOUS_NO_IMG;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\$\{star\}/g, star + '星');
}

// ========================
// 店铺名相关
// ========================

/**
 * 从 options 获取店铺名列表（用于检测已回复的评价）
 * @param {Object} options
 *   - shopName: string - 完整店铺名，如"瞳粉美瞳专营店"
 *   - shopId: string - 店铺ID，如"18"
 * @returns {string[]} 店铺名列表，如['瞳粉美瞳专营店', '瞳粉', '专营店']
 */
function getShopNames(options) {
  const names = [];
  if (options && options.shopName) {
    names.push(options.shopName);  // 完整名称
    // 提取简称（去掉"旗舰店"、"专营店"等后缀）
    const shortNames = options.shopName.replace(/(旗舰店|专营店|专卖店|官方店)$/g, '').trim();
    if (shortNames && shortNames !== options.shopName) {
      names.push(shortNames);
    }
    // 添加通用后缀
    names.push('旗舰店', '专营店', '专卖店');
  }
  return names.length > 0 ? names : ['瞳粉', '专营店', '旗舰店', '专卖店'];  // 默认值
}

/**
 * 检查文本中是否包含店铺回复（店铺名）
 * @param {string} text - 要检查的文本
 * @param {string[]} shopNames - 店铺名列表
 * @returns {boolean}
 */
function containsShopReply(text, shopNames) {
  if (!text || !shopNames || !shopNames.length) return false;
  const lowerText = text.toLowerCase();
  return shopNames.some(name => lowerText.includes(name.toLowerCase()));
}

// ========================
// 弹窗操作
// ========================

async function isQuickReplyModalOpen(page) {
  try {
    const modal = page.locator('[class*="MDL_modal"]').first();
    return await modal.isVisible({ timeout: 1000 }).catch(() => false);
  } catch (e) { return false; }
}

async function closeReplyModal(page) {
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  await waitWithHeartbeat(page, 300);
}

/**
 * 关闭弹窗
 * @param {Page} page 
 * @param {string} modalType - 'quickReply' 或 'interaction'
 */
async function closeModal(page, modalType) {
  if (modalType === 'quickReply') {
    // 快捷回复：点击"取消"按钮
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const cancelBtn = Array.from(btns).find(b => b.innerText.trim() === '取消');
      if (cancelBtn) cancelBtn.click();
    });
  } else {
    // 评价互动：点击右上角关闭图标
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="MDL_modal"]');
      const closeBtn = modal ? modal.querySelector('[class*="iconWrapper"]') : null;
      if (closeBtn && closeBtn.click) {
        closeBtn.click();
      } else if (closeBtn) {
        const event = new MouseEvent('click', { bubbles: true });
        closeBtn.dispatchEvent(event);
      }
    });
  }
  await page.waitForTimeout(300);
}

async function ensureModalClosed(page) {
  if (await isQuickReplyModalOpen(page)) await closeReplyModal(page);
}

async function clickReplyButton(page, idx) {
  try {
    // 先诊断目标行的状态
    const rowInfo = await page.evaluate((i) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      );
      const targetRow = rows[i];
      if (!targetRow) return { found: false };
      
      const links = Array.from(targetRow.querySelectorAll('a'));
      const replyBtn = links.find(a => a.innerText.trim() === '回复/互动');
      
      // 检查状态标记（是否已回复）
      const rowText = targetRow.innerText;
      const hasRepliedTag = rowText.includes('已回复') || rowText.includes('互动');
      
      return { 
        found: true, 
        hasReplyBtn: !!replyBtn,
        btnText: replyBtn?.innerText.trim(),
        btnHref: replyBtn?.href,
        btnParent: replyBtn?.parentElement?.className,
        hasRepliedTag,
        rowText: rowText.substring(0, 100)
      };
    }, idx);
    
    console.log(`       └→ 🔍 行状态: 找到=${rowInfo.found}, 按钮=${rowInfo.hasReplyBtn}, 文本=${rowInfo.hasRepliedTag}, 按钮文字="${rowInfo.btnText}"`);
    
    if (!rowInfo.found || !rowInfo.hasReplyBtn) return false;
    
    // 直接点击按钮
    return await page.evaluate((i) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      );
      const targetRow = rows[i];
      const links = Array.from(targetRow.querySelectorAll('a'));
      const btn = links.find(a => a.innerText.trim() === '回复/互动');
      if (btn) { 
        console.log(`       └→ 📌 点击按钮: "${btn.innerText.trim()}"`);
        btn.click(); 
        return true; 
      }
      return false;
    }, idx);
  } catch (e) {
    console.log(`       └→ ⚠️ 点击失败: ${e.message}`);
  }
  return false;
}

// 这个函数已废弃，请使用下面重新定义的版本
async function canReply_DELETED(page, idx) {}

/**
 * 判断是否可以回复评价
 * 逻辑：点击前检查行文本（有店铺名跳过）-> 点击 -> 点击后检查（有问题取消）
 * @param {Page} page
 * @param {Object} options
 *   - idx: number - 行索引
 *   - shopNames: string[] - 店铺名列表
 */
async function canReply(page, options) {
  const { idx, shopNames } = options;
  
  // 1. 点击前：检查行文本，有店铺名就跳过
  try {
    const beforeClick = await page.evaluate(({ i, names }) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      );
      if (!rows[i]) return { found: false };
      
      const text = rows[i].innerText;
      const hasShopReply = names.some(name => text.toLowerCase().includes(name.toLowerCase()));
      return {
        found: true,
        hasShopReply,
        textPreview: text.substring(0, 200).replace(/\n/g, ' ')
      };
    }, { i: idx, names: shopNames });
    
    if (!beforeClick.found) {
      console.log(`       └→ ⚠️ 行不存在`);
      return { canReply: false, reason: '行不存在' };
    }
    
    console.log(`       └→ 📋 点击前: ${beforeClick.textPreview.substring(0, 60)}...`);
    
    // 有店铺名，直接跳过
    if (beforeClick.hasShopReply) {
      console.log(`       └→ ⏭️ 已有店铺回复，跳过`);
      return { canReply: false, reason: '已有店铺回复' };
    }
    
    // 2. 没有店铺名，点击"回复/互动"按钮
    console.log(`       └→ 📌 点击回复/互动...`);
    const clicked = await page.evaluate((i) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      );
      if (!rows[i]) return { clicked: false, reason: '行不存在' };
      
      const cells = rows[i].querySelectorAll('td');
      for (const cell of cells) {
        const links = cell.querySelectorAll('a');
        for (const link of links) {
          if (link.innerText.includes('回复/互动')) {
            link.click();
            return { clicked: true };
          }
        }
      }
      return { clicked: false, reason: '按钮不存在' };
    }, idx);
    
    if (!clicked.clicked) {
      console.log(`       └→ ❌ 点击失败: ${clicked.reason}`);
      return { canReply: false, reason: '点击按钮失败' };
    }
    
    // 等待弹窗出现
    await waitWithHeartbeat(page, 2000, '等待弹窗');
    
    // 3. 点击后：检查弹窗状态
    const afterClick = await page.evaluate((names) => {
      const modals = document.querySelectorAll('[class*="MDL_modal"]');
      let modal = null;
      for (const m of modals) {
        const text = m.innerText || '';
        if (text.includes('快捷回复')) {
          modal = { el: m, type: 'quickReply' };
          break;
        }
        if (text.includes('评价互动')) {
          modal = { el: m, type: 'interaction' };
          break;
        }
      }
      
      if (!modal) return { found: false };
      
      const modalEl = modal.el;
      const allText = modalEl.innerText;
      const lowerNames = names.map(n => n.toLowerCase());
      const hasShopReply = lowerNames.some(name => allText.toLowerCase().includes(name));
      
      // 检查输入框状态
      const textbox = modalEl.querySelector('textarea');
      const textboxDisabled = textbox ? textbox.disabled : true;
      const textboxPlaceholder = textbox ? textbox.placeholder : '';
      
      // 检查按钮状态
      const buttons = Array.from(modalEl.querySelectorAll('button'));
      let submitBtn = null;
      if (modal.type === 'quickReply') {
        submitBtn = buttons.find(b => b.innerText.trim() === '回复');
      } else if (modal.type === 'interaction') {
        submitBtn = buttons.find(b => b.innerText.trim() === '发布');
      }
      
      return {
        found: true,
        modalType: modal.type,
        hasShopReply,
        textboxDisabled,
        textboxPlaceholder,
        submitBtnDisabled: submitBtn ? submitBtn.disabled : true
      };
    }, shopNames);
    
    if (!afterClick.found) {
      console.log(`       └→ ⚠️ 未找到弹窗`);
      return { canReply: false, reason: '弹窗未打开' };
    }
    
    console.log(`       └→ 📋 弹窗类型: ${afterClick.modalType === 'quickReply' ? '快捷回复' : '评价互动'}`);
    
    // 已回复：关闭弹窗并跳过
    if (afterClick.hasShopReply) {
      console.log(`       └→ ⚠️ 已有店铺回复，关闭弹窗`);
      await closeModal(page, afterClick.modalType);
      await waitWithHeartbeat(page, 300);
      return { canReply: false, reason: '已有店铺回复' };
    }
    
    // 检查输入框是否 disabled（"暂不能回复"）
    if (afterClick.textboxDisabled || afterClick.textboxPlaceholder === '暂不能回复') {
      console.log(`       └→ ⚠️ 暂不能回复，关闭弹窗`);
      await closeModal(page, afterClick.modalType);
      await waitWithHeartbeat(page, 300);
      return { canReply: false, reason: '暂不能回复' };
    }
    
    console.log(`       └→ ✅ 可回复`);
    return { canReply: true, reason: '可回复', modalType: afterClick.modalType };
    
  } catch (e) { 
    console.log(`       └→ 🔍 异常: ${e.message}`);
    return { canReply: false, reason: e.message }; 
  }
}

/**
 * 提交回复
 * @param {Page} page 
 * @param {string} text 
 * @param {string} modalType - 'quickReply' 或 'interaction'
 */
async function submitReply(page, text, modalType) {
  try {
    // 等待弹窗稳定
    await page.waitForTimeout(500);
    
    if (modalType === 'interaction') {
      // 评价互动弹窗 - 按钮是"发布"
      const textarea = page.locator('[class*="MDL_modal"] textarea');
      await textarea.click();
      await textarea.fill(text);
      await page.waitForTimeout(200);
      // 使用 button:first-child 或 text locator
      await page.locator('[class*="MDL_modal"] button').first().click();
    } else {
      // 快捷回复弹窗 - 按钮是"回复"
      const textarea = page.locator('[class*="MDL_modal"] textarea');
      await textarea.click();
      await textarea.fill(text);
      await page.waitForTimeout(200);
      // 找到不包含"互动"的"回复"按钮
      const buttons = page.locator('[class*="MDL_modal"] button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = await btn.innerText();
        if (text.trim() === '回复') {
          await btn.click();
          break;
        }
      }
    }
    
    console.log(`       └→ ✅ 已提交回复`);
    await page.waitForTimeout(800);
    return true;
  } catch (e) {
    console.log(`       └→ ❌ 提交回复失败: ${e.message}`);
    return false;
  }
}

async function clickReportButton(page, idx) {
  try {
    // 在 evaluate 内部直接点击（避免跨上下文问题）
    return await page.evaluate((i) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      );
      const targetRow = rows[i];
      if (!targetRow) return false;
      const reportLink = targetRow.querySelector('[data-tracking-click-viewid="report"] a');
      if (reportLink) { reportLink.click(); return true; }
      const links = targetRow.querySelectorAll('a');
      const btn = Array.from(links).find(a => a.innerText.trim() === '举报');
      if (btn) { btn.click(); return true; }
      return false;
    }, idx);
  } catch (e) {}
  return false;
}

async function selectReportReason(page, reason) {
  try {
    const label = page.locator('[class*="MDL_modal"] label').filter({ hasText: reason }).first();
    if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
      await label.click(); return true;
    }
  } catch (e) {}
  return false;
}

async function fillReportContent(page, content) {
  try {
    const textarea = page.locator('[class*="MDL_modal"] textarea').first();
    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textarea.fill(content); return true;
    }
  } catch (e) {}
  return false;
}

async function clickModalButton(page, buttonText) {
  try {
    const btn = page.getByText(buttonText, { exact: false }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click(); return true;
    }
  } catch (e) {}
  return false;
}

// ========================
// 提取当前页评价数据（用于 Excel 记录）
// ========================

/**
 * 提取当前页评价数据
 * @param {Page} page
 * @param {string[]} shopNames - 店铺名列表
 */
function extractPageReviews(page, shopNames) {
  const names = shopNames || getShopNames({});
  return page.evaluate((names) => {
    const lowerNames = names.map(n => n.toLowerCase());
    const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
      !r.matches('[class*="stickyHeader"]') && 
      !r.matches('[class*="bodyGroupHeader"]') && 
      r.innerText && r.innerText.includes('订单编号')
    );
    
    return rows.map(row => {
      const text = row.innerText;
      const timeMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : '';
      const contentMatch = text.match(/^(.+?)(?=\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const content = contentMatch ? contentMatch[1].trim().substring(0, 500) : '';
      const orderMatch = text.match(/订单编号[：:]\s*(\d{6}-\d{15,})/);
      const orderId = orderMatch ? orderMatch[1] : '';
      const buyerMatch = text.match(/买家昵称[：:]\s*([^\n]+)/);
      const buyerName = buyerMatch ? buyerMatch[1].trim() : '';
      const goodsMatch = text.match(/ID[：:]\s*(\d+)/);
      const goodsId = goodsMatch ? goodsMatch[1] : '';
      
      // 解析星级：查找前一个兄弟元素（分组表头行）的星星数量
      let star = 5;
      let prevRow = row.previousElementSibling;
      while (prevRow) {
        if (prevRow.className && prevRow.className.includes('bodyGroupHeader')) {
          const starSvgs = prevRow.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
          if (starSvgs.length > 0 && starSvgs.length <= 5) {
            star = starSvgs.length;
            break;
          }
        }
        prevRow = prevRow.previousElementSibling;
      }
      
      // 检查是否已回复：行文本中包含商家回复内容
      const rowText = text.toLowerCase();
      const hasShopReply = lowerNames.some(name => rowText.includes(name));
      const hasRepliedTag = text.includes('已回复');
      const isReplied = (hasShopReply || hasRepliedTag) ? '是' : '否';
      
      return { orderId, star, buyerName, goodsId, content, time, isReplied };
    });
  }, names);
}

module.exports = {
  getRandomTemplate, DEFAULT_TEMPLATES, DEFAULT_REASON,
  getReportTemplate,
  isQuickReplyModalOpen, closeReplyModal, ensureModalClosed, closeModal,
  clickReplyButton, canReply, submitReply,
  clickReportButton, selectReportReason, fillReportContent, clickModalButton,
  batchReplyReviews, batchReportReviews,
  // 店铺名相关
  getShopNames, containsShopReply, extractPageReviews
};

// ========================
// 批量回复评价（带 Excel 记录）
// ========================

/**
 * @param {Page} page
 * @param {Object} options
 *   - limit: number - 最大处理条数，默认 200
 *   - replyText: string - 指定回复文本
 *   - shopId: string - 店铺ID（用于 Excel 文件名）
 *   - shopName: string - 店铺名称（如"瞳粉美瞳专营店"）
 */
async function batchReplyReviews(page, options) {
  options = options || {};
  const cfg = config.get('review') || {};
  const limit = Math.min(options.limit || 200, 200);  // ✅ 限制最多200条
  const templates = options.replyText ? [options.replyText] : (cfg.reply_templates || DEFAULT_TEMPLATES);
  const shopId = options.shopId || 'unknown';
  const shopName = options.shopName || '';
  
  // 动态获取店铺名列表
  const shopNames = getShopNames({ shopName, shopId });
  console.log(`🔄 智能批量处理：筛选近30天 + 5星（店铺名：${shopNames.join(', ')}）`);
  
  let autoClosed = 0, needForceClose = 0;
  
  // ✅ 先清除筛选
  await filter.clearAllFilters(page);
  await waitWithHeartbeat(page, 1500, '清除筛选');
  
  // ✅ 设置目标筛选条件（筛选会重置每页条数，所以先做筛选）
  await filter.setTimeFilter(page, '30');
  await waitWithHeartbeat(page, 1500, '筛选近30天');
  await filter.setStarFilter(page, 5);
  await waitWithHeartbeat(page, 1500, '筛选5星');
  
  // ✅ 最后设置每页最大条数（筛选完成后设置，避免被重置）
  await setPageSize(page, 'max');
  // 不筛选"未回复"：拼多多此筛选不准确，已回复的评价仍会显示
  
  // 获取筛选信息
  const pageInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const totalMatch = bodyText.match(/共\s*有\s*(\d+)\s*条/);
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    const pageSizeMatch = bodyText.match(/每页[\s\n]*(\d+)[\s\n]*条/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 40;
    return { total, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  });
  console.log(`📊 筛选结果：共 ${pageInfo.total} 条，每页 ${pageInfo.pageSize} 条，共 ${pageInfo.totalPages} 页`);
  
  // ========================
  // 边翻页边处理主循环（优化版）
  // ========================
  let processed = 0, replied = 0, skipped = 0;
  let excelAddedCount = 0;
  
  while (processed < limit) {
    await ensureModalClosed(page);
    
    // 提取当前页评价数据
    const info = await page.evaluate((names) => {
      return Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      ).map(row => {
        const text = row.innerText;
        let star = 5;
        const sm = text.match(/(\d)星/);
        if (sm) star = parseInt(sm[1]);
        const links = row.querySelectorAll('a');
        const orderMatch = text.match(/订单编号[：:]\s*(\d{6}-\d{15,})/);
        const orderId = orderMatch ? orderMatch[1] : '';
        const buyerMatch = text.match(/买家昵称[：:]\s*([^\n]+)/);
        const buyerName = buyerMatch ? buyerMatch[1].trim() : '';
        const goodsMatch = text.match(/ID[：:]\s*(\d+)/);
        const goodsId = goodsMatch ? goodsMatch[1] : '';
        const timeMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '';
        const contentMatch = text.match(/^(.+?)(?=\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const content = contentMatch ? contentMatch[1].trim().substring(0, 500) : '';
        
        // 检查是否已回复：行文本中包含商家回复内容
        const rowText = text.toLowerCase();
        const lowerNames = names.map(n => n.toLowerCase());
        const hasShopReply = lowerNames.some(name => rowText.includes(name));
        const hasRepliedTag = text.includes('已回复');
        const isReplied = hasShopReply || hasRepliedTag;
        
        return { star, orderId, buyerName, goodsId, content, time, isReplied,
          hasReplyBtn: Array.from(links).some(a => a.innerText.trim() === '回复/互动') };
      });
    }, shopNames);
    
    // 边提取边写 Excel（增量写入）
    if (info.length > 0) {
      const pageReviews = info.map(item => ({
        orderId: item.orderId,
        star: item.star,
        buyerName: item.buyerName,
        goodsId: item.goodsId,
        content: item.content,
        time: item.time,
        isReplied: item.isReplied ? '是' : '否'
      }));
      const writeResult = await excel.writeReviewData(shopId, pageReviews);
      excelAddedCount += writeResult.added || 0;
      if (writeResult.added > 0) {
        console.log(`  📝 已记录当前页 ${writeResult.added} 条`);
      }
    }
    
    console.log(`  当前页 ${info.length} 条，已处理 ${processed}/${limit}`);
    
    for (let i = 0; i < info.length && processed < limit; i++) {
      const item = info[i];
      const orderShort = item.orderId ? item.orderId.slice(-10) : 'N/A';
      const btnStatus = item.hasReplyBtn ? '✓可回复' : '✗无按钮';
      const replyStatus = item.isReplied ? '(已回复)' : '(待回复)';
      
      // 优先判断是否已回复：直接用行文本检测
      if (item.isReplied) {
        console.log(`  [${processed + 1}] ⭐${item.star} ${btnStatus} 订单:${orderShort} ${replyStatus} ⏭️跳过`);
        skipped++;
        if (item.orderId) excel.updateReplyStatus(shopId, item.orderId);
        processed++;
        continue;
      }
      
      if (item.star === 5 && item.hasReplyBtn) {
        console.log(`  [${processed + 1}] ⭐${item.star} ${btnStatus} 订单:${orderShort} ${replyStatus}`);
        const canReplyResult = await canReply(page, { idx: i, shopNames });
        if (!canReplyResult.canReply) {
          console.log(`       └→ ⚠️ ${canReplyResult.reason}，跳过`);
          skipped++;
          // 检测到"已有店铺回复"时，修正 Excel 状态
          if (canReplyResult.reason === '已有店铺回复' && item.orderId) {
            excel.updateReplyStatus(shopId, item.orderId);
          }
        } else {
          const text = getRandomTemplate(templates);
          const success = await submitReply(page, text, canReplyResult.modalType);
          if (success) { 
            replied++;
            if (item.orderId) excel.updateReplyStatus(shopId, item.orderId);
            console.log(`       └→ ✅ 回复成功`);
            await waitWithHeartbeat(page, 500, '检查弹窗');
            const stillOpen = await page.evaluate(() => {
              const modal = document.querySelector('[class*="MDL_modal"]');
              return modal && modal.offsetWidth > 0;
            });
            if (stillOpen) { await closeModal(page, canReplyResult.modalType); needForceClose++; console.log(`       └→ ⚠️ 强制关闭弹窗`); } else { autoClosed++; }
          } else { skipped++; await closeModal(page, canReplyResult.modalType); console.log(`       └→ ❌ 回复失败`); }
        }
      } else {
        console.log(`  [${processed + 1}] ⭐${item.star} ${btnStatus} 订单:${orderShort} ⏭️`);
      }
      processed++;
      await waitWithHeartbeat(page, 800);
    }
    
    // 检查是否达到 limit
    if (processed >= limit) break;
    
    // 检查是否有下一页
    const hasNext = await page.evaluate(() => { 
      const btn = document.querySelector('[class*="PGT_next"]'); 
      return btn && !btn.className.includes('PGT_disabled'); 
    });
    if (!hasNext) {
      console.log(`  📄 已到最后一页`);
      break;
    }
    
    // 翻下一页
    await page.evaluate(() => { const btn = document.querySelector('[class*="PGT_next"]'); if (btn) btn.click(); });
    await waitWithHeartbeat(page, 1500, '等待下一页');
    // ✅ 每页条数在筛选后已设置，翻页不会重置
  }
  
  console.log(`✅ 完成：回复${replied}条，跳过${skipped}条`);
  console.log(`📊 Excel已记录：${excelAddedCount} 条`);
  return { replied, skipped };
}

// ========================
// 批量举报评价（带 Excel 记录）
// ========================

/**
 * @param {Page} page
 * @param {Object} options
 *   - stars: number[] - 目标星级，默认 [1, 2]
 *   - reason: string - 举报原因
 *   - limit: number - 最大处理条数，默认 200
 *   - shopId: string - 店铺ID（用于 Excel 文件名）
 *   - shopName: string - 店铺名称
 */
async function batchReportReviews(page, options) {
  options = options || {};
  const stars = options.stars || [1, 2];
  const reason = options.reason || DEFAULT_REASON;
  const limit = Math.min(options.limit || 200, 200);  // ✅ 限制最多200条
  const shopId = options.shopId || 'unknown';
  const shopName = options.shopName || '';
  
  // 动态获取店铺名列表
  const shopNames = getShopNames({ shopName, shopId });
  console.log(`🔄 批量举报：筛选近30天 + ${stars.join(', ')}星，举报原因："${reason}"`);
  
  let processed = 0, reported = 0, skipped = 0;
  
  // ✅ 先清除筛选
  await filter.clearAllFilters(page);
  await waitWithHeartbeat(page, 1500, '清除筛选');
  
  // ✅ 设置目标筛选条件（筛选会重置每页条数，所以先做筛选）
  await filter.setTimeFilter(page, '30');
  await waitWithHeartbeat(page, 1500, '筛选近30天');
  await filter.filterOneToTwoStars(page);
  await waitWithHeartbeat(page, 2000, '筛选星级');
  
  // ✅ 最后设置每页最大条数（筛选完成后设置，避免被重置）
  await setPageSize(page, 'max');
  
  const pageInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const totalMatch = bodyText.match(/共\s*有\s*(\d+)\s*条/);
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    const pageSizeMatch = bodyText.match(/每页[\s\n]*(\d+)[\s\n]*条/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 40;
    return { total, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  });
  console.log(`📊 筛选结果：共 ${pageInfo.total} 条，每页 ${pageInfo.pageSize} 条，共 ${pageInfo.totalPages} 页`);
  
  // 📝 提取数据并写入 Excel
  // 优化：直接取全部页（不要按 limit 限制，否则 DOM 行数不足时漏数据）
  const allReviews = [];
  let pageCount = 0;
  const maxPages = pageInfo.totalPages;
  
  while (pageCount < maxPages) {
    const reviews = await page.evaluate((names) => {
      const lowerNames = names.map(n => n.toLowerCase());
      return Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      ).map(row => {
        const text = row.innerText;
        const timeMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '';
        const contentMatch = text.match(/^(.+?)(?=\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const content = contentMatch ? contentMatch[1].trim().substring(0, 500) : '';
        const orderMatch = text.match(/订单编号[：:]\s*(\d{6}-\d{15,})/);
        const orderId = orderMatch ? orderMatch[1] : '';
        const buyerMatch = text.match(/买家昵称[：:]\s*([^\n]+)/);
        const buyerName = buyerMatch ? buyerMatch[1].trim() : '';
        const goodsMatch = text.match(/ID[：:]\s*(\d+)/);
        const goodsId = goodsMatch ? goodsMatch[1] : '';
        // 解析星级：查找前一个兄弟元素的星星数量
        let star = 5;
        let prevRow = row.previousElementSibling;
        while (prevRow) {
          if (prevRow.className && prevRow.className.includes('bodyGroupHeader')) {
            const starSvgs = prevRow.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
            if (starSvgs.length > 0 && starSvgs.length <= 5) {
              star = starSvgs.length;
              break;
            }
          }
          prevRow = prevRow.previousElementSibling;
        }
        
        // 检查是否已回复：行文本中包含商家回复内容（如店铺昵称）
        const rowText = text.toLowerCase();
        const hasShopReply = lowerNames.some(name => rowText.includes(name));
        const hasRepliedTag = text.includes('已回复') || text.includes('互动');
        const isReplied = (hasShopReply || hasRepliedTag) ? '是' : '否';
        
        // 检测是否有"举报"按钮 - 有则未举报，无则已举报
        const reportBtns = row.querySelectorAll('a');
        const hasReportBtn = Array.from(reportBtns).some(a => a.innerText.trim() === '举报');
        const isReported = !hasReportBtn; // 无按钮 = 已举报
        
        return { orderId, star, buyerName, goodsId, content, time, isReplied, isReported };
      });
    }, shopNames);
    allReviews.push(...reviews);
    pageCount++;
    if (pageCount >= maxPages) break;
    const hasNext = await page.evaluate(() => {
      const btn = document.querySelector('[class*="PGT_next"]');
      return btn && !btn.className.includes('PGT_disabled');
    });
    if (!hasNext) break;
    await page.evaluate(() => { const btn = document.querySelector('[class*="PGT_next"]'); if (btn) btn.click(); });
    await waitWithHeartbeat(page, 1500, '等待下一页数据');
  }
  
  if (pageCount > 1) {
    await page.evaluate(() => { const btn = document.querySelector('[class*="PGT_prev"]'); if (btn) btn.click(); });
    await waitWithHeartbeat(page, 1500, '回到第一页');
  }
  
  const writeResult = await excel.writeReviewData(shopId, allReviews);
  console.log(`📝 已记录评价数据：新增 ${writeResult?.added || 0} 条，跳过 ${writeResult?.skipped || 0} 条（已存在）`);
  
  while (processed < limit) {
    await ensureModalClosed(page);
    
    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.matches('[class*="stickyHeader"]') && 
        !r.matches('[class*="bodyGroupHeader"]') && 
        r.innerText && r.innerText.includes('订单编号')
      ).map((row, idx) => {
        const text = row.innerText;
        // 解析星级：查找前一个兄弟元素的星星数量
        let star = 5;
        let prevRow = row.previousElementSibling;
        while (prevRow) {
          if (prevRow.className && prevRow.className.includes('bodyGroupHeader')) {
            const starSvgs = prevRow.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
            if (starSvgs.length > 0 && starSvgs.length <= 5) {
              star = starSvgs.length;
              break;
            }
          }
          prevRow = prevRow.previousElementSibling;
        }
        const reportLink = row.querySelector('[data-tracking-click-viewid="report"] a');
        const hasImg = row.innerHTML.includes('logic_imgContainer') || row.innerHTML.includes('view_image_video');
        const orderMatch = text.match(/订单编号[：:]\s*(\d{6}-\d{15,})/);
        return { idx, star, hasImg, hasReport: !!reportLink, orderId: orderMatch ? orderMatch[1] : '' };
      });
    });
    
    for (const row of rows) {
      if (processed >= limit) break;
      const orderShort = row.orderId ? row.orderId.slice(-10) : 'N/A';
      const btnStatus = row.hasReport ? '✓可举报' : '✗无按钮';
      const starStr = `${row.star}星`;
      
      // 无举报按钮 = 已举报过，直接标记并跳过
      if (!row.hasReport) { 
        console.log(`  [${processed + 1}] ⭐${starStr} ${btnStatus} 订单尾号:${orderShort} ⏭️已举报`);
        processed++;
        // 自动更新 Excel 举报状态
        if (row.orderId) excel.updateReportStatus(shopId, row.orderId);
        continue; 
      }
      if (!stars.includes(row.star)) { 
        console.log(`  [${processed + 1}] ⭐${starStr} ${btnStatus} 订单尾号:${orderShort} ⏭️(非目标星级)`);
        processed++; continue; 
      }
      
      console.log(`  [${processed + 1}] ⭐${starStr} ${btnStatus} 订单尾号:${orderShort}`);
      const clicked = await clickReportButton(page, row.idx);
      if (!clicked) { skipped++; processed++; continue; }
      
      await waitWithHeartbeat(page, 800, '等待举报弹窗');
      const reasonSelected = await selectReportReason(page, reason);
      if (!reasonSelected) { 
        console.log(`       └→ ❌ 未找到举报原因"${reason}"`);
        await ensureModalClosed(page); skipped++; processed++; continue; 
      }
      
      await waitWithHeartbeat(page, 500, '等待textarea出现');
      const template = getReportTemplate(reason, row.star, row.hasImg);
      const filled = await fillReportContent(page, template);
      if (!filled) { 
        console.log(`       └→ ❌ 未找到内容输入框`);
        await ensureModalClosed(page); skipped++; processed++; continue; 
      }
      
      await waitWithHeartbeat(page, 300);
      const submitted = await clickModalButton(page, '提交举报');
      
      if (submitted) {
        reported++;
        if (row.orderId) excel.updateReportStatus(shopId, row.orderId);
        console.log(`       └→ ✅ 举报成功`);
      } else { 
        skipped++; 
        console.log(`       └→ ❌ 提交失败`);
      }
      
      await waitWithHeartbeat(page, 1000);
      await ensureModalClosed(page);
      processed++;
    }
    
    const hasNext = await page.evaluate(() => {
      const btn = document.querySelector('[class*="PGT_next"]');
      return btn && !btn.className.includes('PGT_disabled');
    });
    if (!hasNext) break;
    await page.evaluate(() => { const btn = document.querySelector('[class*="PGT_next"]'); if (btn) btn.click(); });
    await waitWithHeartbeat(page, 1500, '等待下一页');
    // ✅ 每页条数在筛选后已设置，翻页不会重置
  }
  
  console.log(`✅ 完成：举报 ${reported} 条，跳过 ${skipped} 条`);
  return { reported, skipped, excelAdded: writeResult?.added || 0 };
}