/**
 * _build.js - reply.js 生成脚本
 * 运行: node modules/review/_build.js
 */
const fs = require('fs');
const path = require('path');

const REPORT_TEMPLATE = '此为同行恶意竞争差评，买家下单后无任何咨询/售后沟通，评价内容无实物图、无质量问题凭证，与美瞳产品实际品质严重不符，故意打一星拉低店铺评分，扰乱平台公平竞争，恳请平台核实删除。';

const DEFAULT_TEMPLATES = [
  '谢谢惠顾🌹',
  '感谢您的支持，祝您购物愉快！',
  '欢迎再次光临～',
  '祝您生活愉快！',
  '感谢反馈，我们会继续努力！',
  '亲，很高兴为您服务～',
  '祝您天天好心情！',
  '期待再次为您服务！'
];

// 完整的 reply.js 内容
const replyJsContent = `/**
 * modules/review/reply.js - 评价自动回复/举报
 * 生成时间: ${new Date().toLocaleString('zh-CN')}
 * 
 * 举报模板:
 * ${REPORT_TEMPLATE}
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const config = require('../../utils/config');

const DEFAULT_TEMPLATES = ${JSON.stringify(DEFAULT_TEMPLATES, null, 2)};

const REPORT_TEMPLATE = '${REPORT_TEMPLATE}';

function getRandomTemplate(t) {
  const l = t && t.length ? t : DEFAULT_TEMPLATES;
  return l[Math.floor(Math.random() * l.length)];
}

// ============== 调试日志工具 ==============
const DEBUG = process.env.DEBUG_REPLY === '1';
const log = (...args) => {
  if (DEBUG) console.log('[reply]', new Date().toISOString(), ...args);
};

async function isQuickReplyModalOpen(page) {
  try {
    const visible = await page.locator('[class*="MDL_modal"]').first().isVisible().catch(() => false);
    log('isQuickReplyModalOpen:', visible);
    return visible;
  } catch (e) {
    log('isQuickReplyModalOpen error:', e.message);
    return false;
  }
}

async function canReply(page) {
  const result = await page.evaluate(() => {
    const ta = document.querySelector('[class*="MDL_modal"] textarea');
    if (!ta) return { canReply: false };
    return { canReply: ta.placeholder !== '暂不能回复' };
  });
  log('canReply:', result);
  return result;
}

async function closeReplyModal(page) {
  log('closeReplyModal called');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  await waitWithHeartbeat(page, 300);
  await waitWithHeartbeat(page, 200);
}

// ============== 修复后的 clickReplyButton ==============
async function clickReplyButton(page, idx) {
  log('clickReplyButton called, idx:', idx);
  
  try {
    // 方法1: 尝试多种选择器找"回复"按钮
    const selectors = [
      'a:has-text("回复")',
      '[class*="review"] a:has-text("回复")',
      '[class*="comment"] a:has-text("回复")',
      'tr a:has-text("回复")'
    ];
    
    for (const selector of selectors) {
      const btns = await page.locator(selector).all();
      log('Trying selector:', selector, 'found:', btns.length);
      
      if (btns.length > 0) {
        const targetIdx = idx >= 0 && idx < btns.length ? idx : 0;
        await btns[targetIdx].click({ timeout: 3000 });
        log('Clicked reply button via selector:', selector);
        await waitWithHeartbeat(page, 500);
        return true;
      }
    }
    
    // 方法2: 通过行定位
    log('Trying row-based method...');
    const clicked = await page.evaluate((i) => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
        !r.classList.contains('TB_stickyHeaderFirstTr_5-178-0') && 
        !r.classList.contains('TB_bodyGroupHeader_5-178-0') &&
        r.innerText && r.innerText.includes('订单编号')
      );
      
      if (!rows.length) return false;
      const targetRow = rows[i >= 0 && i < rows.length ? i : 0];
      if (!targetRow) return false;
      
      // 找回复链接
      const links = targetRow.querySelectorAll('a');
      const replyLink = Array.from(links).find(a => a.innerText.trim() === '回复');
      
      if (replyLink) {
        replyLink.click();
        return true;
      }
      return false;
    }, idx);
    
    if (clicked) {
      log('Clicked via row method');
      await waitWithHeartbeat(page, 500);
      return true;
    }
    
    log('No reply button found');
    return false;
  } catch (e) {
    log('clickReplyButton error:', e.message);
    return false;
  }
}

async function fillReply(page, text) {
  log('fillReply called, text:', text.substring(0, 20) + '...');
  await waitWithHeartbeat(page, 300);
  
  const result = await page.evaluate((txt) => {
    const ta = document.querySelector('[class*="MDL_modal"] textarea');
    if (!ta) return { success: false, error: 'no textarea' };
    
    // 清空并输入
    ta.focus();
    ta.select();
    document.execCommand('delete');
    ta.value = '';
    
    // 设置新值并触发事件
    ta.value = txt;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    
    return { success: true, valueLength: ta.value.length };
  }, text);
  
  log('fillReply result:', result);
  return result;
}

async function submitReply(page) {
  log('submitReply called');
  await waitWithHeartbeat(page, 300);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => 
      b.innerText.includes('发布') || 
      b.innerText.includes('提交') || 
      b.innerText.includes('确认')
    );
    if (submitBtn) {
      submitBtn.click();
    }
  });
  
  await waitWithHeartbeat(page, 800);
  log('submitReply done');
}

async function autoReplyReviews(page, count = 10, options = {}) {
  const templates = options.templates || DEFAULT_TEMPLATES;
  const skipReplied = options.skipReplied !== false;
  const results = { success: 0, skipped: 0, failed: 0 };
  
  log('autoReplyReviews started, count:', count);
  
  for (let i = 0; i < count; i++) {
    log('Processing review', i + 1);
    
    // 检查是否已回复
    if (skipReplied) {
      const alreadyReplied = await page.evaluate((idx) => {
        const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
          !r.classList.contains('TB_stickyHeaderFirstTr_5-178-0') && 
          !r.classList.contains('TB_bodyGroupHeader_5-178-0') &&
          r.innerText && r.innerText.includes('订单编号')
        );
        if (rows.length <= idx) return false;
        return rows[idx].innerText.includes('已回复');
      }, i);
      
      if (alreadyReplied) {
        log('Review', i, 'already replied, skipping');
        results.skipped++;
        continue;
      }
    }
    
    // 点击回复按钮
    const clicked = await clickReplyButton(page, i);
    if (!clicked) {
      log('Failed to click reply button for', i);
      results.failed++;
      continue;
    }
    
    // 等待弹窗
    await waitWithHeartbeat(page, 800);
    
    // 检查是否可以回复
    const { canReply: can } = await canReply(page);
    if (!can) {
      log('Cannot reply to review', i);
      await closeReplyModal(page);
      results.failed++;
      continue;
    }
    
    // 填充回复内容
    const template = getRandomTemplate(templates);
    await fillReply(page, template);
    
    // 提交
    await submitReply(page);
    await waitWithHeartbeat(page, 500);
    
    results.success++;
    log('Replied to review', i);
  }
  
  log('autoReplyReviews completed:', results);
  return results;
}

// ============== 举报功能 ==============
async function clickReportButton(page, idx) {
  log('clickReportButton called, idx:', idx);
  
  const clicked = await page.evaluate((i) => {
    const rows = Array.from(document.querySelectorAll('tr')).filter(r => 
      !r.classList.contains('TB_stickyHeaderFirstTr_5-178-0') && 
      !r.classList.contains('TB_bodyGroupHeader_5-178-0') &&
      r.innerText && r.innerText.includes('订单编号')
    );
    
    if (!rows.length) return false;
    const targetRow = rows[i >= 0 && i < rows.length ? i : 0];
    if (!targetRow) return false;
    
    // 找举报链接
    const links = targetRow.querySelectorAll('a');
    const reportLink = Array.from(links).find(a => a.innerText.trim() === '举报');
    
    if (reportLink) {
      log('Found report link, clicking...');
      reportLink.click();
      return true;
    }
    return false;
  }, idx);
  
  if (clicked) {
    await waitWithHeartbeat(page, 800);
  }
  
  return clicked;
}

async function submitReport(page) {
  log('submitReport called');
  await waitWithHeartbeat(page, 500);
  
  await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    const checks = document.querySelectorAll('input[type="checkbox"]');
    
    if (radios.length) radios[0].click();
    else if (checks.length) checks[0].click();
  });
  
  await waitWithHeartbeat(page, 300);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => 
      b.innerText.includes('提交') || 
      b.innerText.includes('确认') ||
      b.innerText.includes('举报')
    );
    if (submitBtn) submitBtn.click();
  });
  
  await waitWithHeartbeat(page, 500);
  log('submitReport done');
}

async function autoReportReviews(page, count = 10, options = {}) {
  const template = options.template || REPORT_TEMPLATE;
  const results = { success: 0, failed: 0 };
  
  log('autoReportReviews started, count:', count);
  log('Report template:', template);
  
  for (let i = 0; i < count; i++) {
    log('Processing report for review', i + 1);
    
    // 点击举报按钮
    const clicked = await clickReportButton(page, i);
    if (!clicked) {
      log('Failed to click report button for', i);
      results.failed++;
      continue;
    }
    
    // 选择举报原因
    await waitWithHeartbeat(page, 300);
    
    // 提交
    await submitReport(page);
    await waitWithHeartbeat(page, 500);
    
    results.success++;
    log('Reported review', i);
  }
  
  log('autoReportReviews completed:', results);
  return results;
}

module.exports = {
  autoReplyReviews,
  autoReportReviews,
  clickReplyButton,
  clickReportButton,
  fillReply,
  submitReply,
  submitReport,
  closeReplyModal,
  isQuickReplyModalOpen,
  canReply,
  getRandomTemplate,
  DEFAULT_TEMPLATES,
  REPORT_TEMPLATE
};
