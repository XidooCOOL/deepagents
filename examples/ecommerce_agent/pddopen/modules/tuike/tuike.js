#!/usr/bin/env node
// 推广数据提取脚本 - DOM 直接解析，无需 OCR
// 用法: node scripts/tuike.js <店铺名/ID> [YYYY-MM-DD]
// 也可被 pdd-open.js 导入调用
// 2026-04-23 更新：全面使用 elements.json 统一选择器

const { findAccountByKeyword, isBrowserRunning } = require('../../utils/accounts');
const { startChrome } = require('../../utils/browser');
const { fullLoginFlow } = require('../../utils/login');
const { writePromotionData } = require('../../utils/excel');
const { navigateWithDateRange } = require('../../utils/calendar');
const { sidebarFallback } = require('../../utils/sidebar');
const { getCssQuerySelectors } = require('../../utils/elements');
const CDP = require('chrome-remote-interface');
const playwright = require('playwright');
const { waitWithHeartbeat, safeGoto } = require('../../utils/sigkill_guard');

const YINGXIAO_URL = 'https://yingxiao.pinduoduo.com/goods/report/promotion/overView';

// 关闭弹窗 - 使用 elements.json 统一选择器
async function closePopups(client) {
  // 从 elements.json 获取选择器
  const maskSelectors = getCssQuerySelectors('shared', 'maskOverlay');
  const btnSelectors = ['我知道了', '知道了', '关闭', '确认', '好的'];
  
  await client.Runtime.evaluate({
    expression: `
      (function() {
        var selectors = ${JSON.stringify(maskSelectors)};
        var btnTexts = ${JSON.stringify(btnSelectors)};
        
        // 使用 elements.json 定义的遮罩层选择器
        selectors.forEach(function(sel) {
          try {
            var els = document.querySelectorAll(sel);
            for (var i=0; i<els.length; i++) { 
              els[i].style.display='none'; 
              els[i].style.visibility='hidden'; 
            }
          } catch(e) {}
        });
        
        // 点击文本按钮
        var btns = document.querySelectorAll('button');
        for (var i=0; i<btns.length; i++) {
          var t = btns[i].innerText.trim();
          if (btnTexts.indexOf(t) !== -1) btns[i].click();
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 300));
}

// 从数据概况区域提取聚合数据
// 页面使用 BoardRow_item / BoardItem_currentValue 组件渲染指标
// 关键：页面初始化后 BoardItem 显示"今日"数据（这是用户实际需要的"昨日"数据，因为页面默认就加载这个数据）
// 选择器使用 [class*="BoardItem_currentValue"] 而非完整类名（哈希值每次不同）
async function extractOverview(client) {
  const result = await client.Runtime.evaluate({
    expression: `
      (function() {
        var metricKeys = [
          '成交花费(元)', '交易额(元)', '实际投产比', '实际成交花费(元)',
          '总花费(元)', '净交易额(元)', '净实际投产比', '净成交笔数',
          '净成交笔数占比', '每笔净成交金额(元)', '每笔净成交花费(元)', '净交易额占比',
          '结算交易额(元)', '结算投产比', '结算成交笔数', '每笔结算成交金额(元)', '每笔结算成交花费(元)',
          '退款豁免率', '退单豁免率', '交易额结算率', '订单结算率',
          '成交笔数', '每笔成交花费(元)', '每笔成交金额(元)',
          '曝光量', '点击量', '点击转化率', '点击率'
        ];退款豁免率', '退单豁免率',
          '交易额结算率', '订单结算率', '结算订单成本(元)', '成交笔数',
          '每笔成交花费(元)', '每笔成交金额(元)', '曝光量', '点击量', '点击转化率'
        ];
        
        var metricMap = {};
        
        // 方式1: 使用 BoardItem 向下遍历
        var boardItems = document.querySelectorAll('[class*="BoardItem"]');
        var processedKeys = new Set();
        
        boardItems.forEach(function(item) {
          var text = item.innerText || '';
          var lines = text.split(/\\n/).filter(function(l) { return l.trim(); });
          
          if (lines.length < 2) return;
          
          // 检查第一行是否是指标名
          var firstLine = lines[0].trim();
          if (metricKeys.indexOf(firstLine) !== -1 && !processedKeys.has(firstLine)) {
            // 取第二行作为值
            var value = lines[1].trim();
            metricMap[firstLine] = value;
            processedKeys.add(firstLine);
          }
        });
        
        // 方式2: 补充查找（对某些特殊布局的元素）
        // 对于还没找到的指标，用 BoardItem_currentValue 向上遍历
        var valueEls = document.querySelectorAll('[class*="BoardItem_currentValue"]');
        
        for (var v=0; v<valueEls.length; v++) {
          var el = valueEls[v];
          var txt = el.innerText || '';
          if (!txt.trim()) continue;
          
          // 只向上一层父元素查找（避免遍历到错误的祖先）
          var parent = el.parentNode;
          var metricName = null;
          var depth = 0;
          
          while (parent && parent.tagName !== 'BODY' && depth < 2) {
            var parentTxt = parent.innerText || '';
            var firstLine = parentTxt.split(/\\n/)[0].trim();
            if (metricKeys.indexOf(firstLine) !== -1 && !processedKeys.has(firstLine)) {
              metricName = firstLine;
              break;
            }
            parent = parent.parentNode;
            depth++;
          }
          
          if (metricName) {
            metricMap[metricName] = txt.split(/\\n/)[0].trim();
            processedKeys.add(metricName);
          }
        }
        
        // 清理万单位："1.68 万" -> 16800
        ['曝光量', '点击量'].forEach(function(key) {
          if (metricMap[key]) {
            var match = metricMap[key].match(/^([\d.,]+)\s*万$/);
            if (match) {
              var num = parseFloat(match[1].replace(/,/g, ''));
              metricMap[key] = String(Math.round(num * 10000));
            }
          }
        });
        
        // 计算点击转化率
        var clicks = parseFloat((metricMap['点击量'] || '0').replace(/,/g, ''));
        var impressions = parseFloat((metricMap['曝光量'] || '0').replace(/,/g, ''));
        if (!isNaN(clicks) && !isNaN(impressions) && impressions > 0) {
          metricMap['点击转化率'] = (clicks / impressions * 100).toFixed(2) + '%';
        }
        
        return metricMap;
      })()
    `,
    returnByValue: true
  });
  return result.result.value || { error: 'no result' };
}

// 解析日期参数，支持 YYYY-MM 整月 → 自动展开为月初到月末
function parseDateRange(dateStr) {
  // YYYY-MM-DD~YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD 范围格式
  if (dateStr.includes('~') || dateStr.includes('到') || dateStr.includes('至')) {
    const parts = dateStr.split(/[~到至]/);
    const start = parts[0].trim();
    const end = parts.length > 1 ? parts[1].trim() : start;
    // 如果开始和结束已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return { beginDate: start, endDate: end };
    }
    // 否则按整月处理（parts[0] 是 YYYY-MM）
    const monthMatch = start.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = parseInt(monthMatch[1]);
      const month = parseInt(monthMatch[2]);
      const lastDay = new Date(year, month, 0).getDate();
      return {
        beginDate: `${year}-${monthMatch[2]}-01`,
        endDate: `${year}-${monthMatch[2]}-${lastDay}`
      };
    }
    return { beginDate: start, endDate: end };
  }
  
  // YYYY-MM 格式 → 整月
  const monthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]);
    // 下个月第一天减一天就是当月最后一天
    const lastDay = new Date(year, month, 0).getDate();
    return {
      beginDate: `${year}-${monthMatch[2]}-01`,
      endDate: `${year}-${monthMatch[2]}-${lastDay}`
    };
  }
  // YYYY-MM-DD 格式 → 单日
  return {
    beginDate: dateStr,
    endDate: dateStr
  };
}

// 完整提取流程（导出给主入口调用）
// cdpPort: 可选，默认从 account 查找
// dateStr: 支持 YYYY-MM-DD（单日）或 YYYY-MM（整月）
async function extractTuikePromotion(client, shopName, dateStr, cdpPort) {
  console.log('🚀 导航到推广报表页面...');

  // 获取 CDP 端口
  if (!cdpPort) {
    const acc = findAccountByKeyword(shopName);
    cdpPort = acc ? acc.cdp_port : 9302;
  }

  // 用 Playwright 连接 CDP，获取完整的 page 对象以便等待 DOM
  const browser = await playwright.chromium.connectOverCDP(`http://localhost:${cdpPort}`);
  const ctx = browser.contexts()[0];
  let page = (await ctx.pages())[0];
  if (!page) page = await ctx.newPage();

  // 解析日期范围，支持整月
  const { beginDate, endDate } = parseDateRange(dateStr || getYesterday());
  console.log(`📅 日期范围: ${beginDate} ~ ${endDate}`);
  
  // 导航到指定日期范围（直接导航）
  let url = `${YINGXIAO_URL}?beginDate=${beginDate}&endDate=${endDate}`;
  console.log(`🚀 导航: ${url}`);
  
  // 直接 goto，如果失败再用侧边栏 fallback
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitWithHeartbeat(page, 3000, '等待页面加载');
    console.log('✅ URL 导航成功');
  } catch(e) {
    console.warn('⚠️ URL 导航失败，使用侧边栏 fallback...');
    const fallbackOk = await sidebarFallback(page, 'tuikeReport', null);
    if (!fallbackOk) {
      throw new Error('无法导航到推广报表页面');
    }
  }
  await waitWithHeartbeat(page, 5000, '等待推广数据加载');
  
  // 等待 BoardItem 渲染（最多 15 秒）
  try {
    await page.waitForSelector('[class*="BoardItem_currentValue"]', { timeout: 15000 });
  } catch(e) {
    console.log('⚠️ BoardItem 未出现，尝试其他选择器...');
    await waitWithHeartbeat(page, 5000, '等待 BoardItem 渲染');
  }

  // 关闭弹窗
  await page.evaluate(`
    (function() {
      var btns = document.querySelectorAll('button');
      for (var i=0; i<btns.length; i++) {
        var t = btns[i].innerText.trim();
        if (t==='我知道了'||t==='知道了'||t==='关闭') btns[i].click();
      }
    })()
  `);
  await waitWithHeartbeat(page, 500, '等待弹窗关闭动画');

  // 检查当前 URL
  console.log('当前 URL:', page.url());

  // 用 Playwright 的 page.evaluate 提取数据（更稳定）
  console.log('📊 提取数据概况...');
  const data = await page.evaluate(function() {
      var metricKeys = [
        '成交花费(元)', '交易额(元)', '实际投产比', '实际成交花费(元)',
        '总花费(元)', '净交易额(元)', '净实际投产比', '净成交笔数',
        '净成交笔数占比', '每笔净成交金额(元)', '每笔净成交花费(元)', '净交易额占比',
        '结算交易额(元)', '结算投产比', '结算成交笔数', '每笔结算成交金额(元)', '每笔结算成交花费(元)',
        '退款豁免率', '退单豁免率', '交易额结算率', '订单结算率',
        '成交笔数', '每笔成交花费(元)', '每笔成交金额(元)',
        '曝光量', '点击量', '点击率', '点击转化率'
      ];
      
      // 按长度降序排序，匹配时先试长名字，避免短名字被抢先
      metricKeys.sort(function(a, b) {
        return b.length - a.length;
      });
      
      var metricMap = {};
      
      // BoardItem 结构：整个指标块包含标签和值，我们在整个块里找匹配
      var items = document.querySelectorAll('[class*="BoardItem"]');
      
      items.forEach(function(item) {
        var text = item.innerText || '';
        
        // 按长度优先匹配
        for (var k=0; k<metricKeys.length; k++) {
          var key = metricKeys[k];
          if (text.includes(key)) {
            // 值在 currentValue 元素里
            var valueEl = item.querySelector('[class*="BoardItem_currentValue"]');
            if (valueEl) {
              var value = (valueEl.innerText || '').split('\n')[0].trim();
              if (value) {
                metricMap[key] = value;
              }
            }
            break; // 匹配到就退出，避免短名字覆盖
          }
        }
      });
      
      // 清理万单位
      ['曝光量', '点击量'].forEach(function(key) {
        if (metricMap[key]) {
          var match = metricMap[key].match(/^([0-9.,]+)\s*万$/);
          if (match) {
            var num = parseFloat(match[1].replace(/,/g, ''));
            metricMap[key] = String(Math.round(num * 10000));
          }
        }
      });
      
      // 如果没有点击转化率，重新计算（如果已有就不覆盖）
      var clicks = parseFloat((metricMap['点击量'] || '0').replace(/,/g, ''));
      var impressions = parseFloat((metricMap['曝光量'] || '0').replace(/,/g, ''));
      if (!isNaN(clicks) && !isNaN(impressions) && impressions > 0) {
        var computedRate = (clicks / impressions * 100).toFixed(2) + '%';
        if (!metricMap['点击转化率']) {
          metricMap['点击转化率'] = computedRate;
        }
      }
      
      return metricMap;
    });

  console.log('提取结果:', JSON.stringify(data));

  if (Object.keys(data).length === 0) {
    console.error('❌ 提取失败: 数据为空');
    await browser.close();
    return null;
  }
  
  console.log('✅ 提取到数据概况:', JSON.stringify(data));
  await browser.close();
  
  // 返回数据（不发送通知，由调用者统一管理通知）
  return [data];
}

// 获取昨日 YYYY-MM-DD
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// 独立运行入口
async function main() {
  const args = process.argv.slice(2);
  const keyword = args[0];
  const dateStr = args[1] || getYesterday();

  try {
    if (!keyword) {
      console.log('用法: node scripts/tuike.js <店铺名/ID> [YYYY-MM-DD]');
      process.exit(1);
    }

    const account = findAccountByKeyword(keyword);
    if (!account) {
      console.error('❌ 找不到账号: ' + keyword);
      process.exit(1);
    }
    console.log('🔍 账号: ' + account.shop_name + '，端口: ' + account.cdp_port);

    const running = await isBrowserRunning(account.cdp_port);
    if (!running) {
      console.log('🚀 浏览器未运行，启动中...');
      await startChrome(account);

      await new Promise(r => setTimeout(r, 3000));
      await fullLoginFlow(account.cdp_port, account.shop_name, null);
    } else {
      console.log('✅ 浏览器已运行，跳过扫码登录');
    }

    console.log('✅', account.shop_name, '登录成功！');
    console.log('📊 开始提取', account.shop_name, dateStr, '的推广数据...');

    const client = await CDP({ port: account.cdp_port });
    await client.Page.enable();
    await client.Runtime.enable();

    const result = await extractTuikePromotion(client, account.shop_name, dateStr);

    if (result) {
      console.log('📊 开始写入 Excel...');
      await writePromotionData(account.shop_name, dateStr, result);
      console.log('✅ 推广数据写入完成！');
    } else {
      console.error('❌ 未能提取到推广数据');
    }

    await client.close();
  } catch (err) {
    console.error('❌ 执行出错:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractTuikePromotion };
