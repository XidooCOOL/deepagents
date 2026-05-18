#!/usr/bin/env node
const m = require('../modules'), u = require('../utils');
const { enableGuard } = u.process_guard;
const { findAccountByKeyword, listAccountsWithStatus, isBrowserRunning, addAccount } = u.accounts;
const { startChrome, stopBrowserByShop } = u.browser;
const { fullLoginFlow, logoutAccount } = u.login;
const { fullExtractSales } = m.extract;
const { writeSalesData, writePromotionData, writeReviewData } = u.excel;
const { sendError, setOcChannelInfo } = u.notify;
const hooks = u.hooks;
const { extractCustomerPerformancePlaywright } = m.customer;
const { extractTuikePromotion } = m.tuike;
const { extractReviews, navigateToReviewPage, setPageSize, batchReplyReviews, batchReportReviews } = m.review;
const { ArgsParser } = u.args_parser;
const { ExecutionLog, printStats } = u.execution_log;
const { TaskQueue } = u.task_queue;
const { checkAllShops } = u.health_check;
const dataCache = u.data_cache, pw = require('playwright');

function ph() { console.log(`pdd-open 8.0.0 - 拼多多商家后台数据提取

用法: pdd-open <店铺名/ID> [options]

数据类型:
  --sales, --extract   提取销售数据（默认昨日）
  --service [YYYY-MM]  提取客服绩效（默认昨日）
  --ads, --tuike       提取推广数据（默认昨日）
  --all, --tian        提取全部（销售+推广+客服），不含评价管理
  --review --reply     提取并回复5星好评（可与 --report 同时使用）
  --review --report    提取并举报1-2星差评（可与 --reply 同时使用）
  --review             提取评价数据
  --review --reply     提取评价并自动回复
  --review --report    提取评价并自动举报差评

选项:
  --list               列出所有账号及运行状态
  --stop <店铺名>       停止店铺浏览器实例
  --stop-all            停止所有店铺浏览器（仅 pdd-open 管理的 Chrome）
  --logout [店铺名]     退出登录
  --add "店铺名" SHOPID [管理员]  添加新账号
  --stats [天数]        执行统计（默认7天）
  --health             健康检查
  --batch A,B          批量处理
  --date <日期>        指定销售日期 (YYYY-MM-DD)
  --pages <N>          评价提取页数限制
  --reply-text <文本>   自定义回复内容
  --limit <N>          回复数量限制
  --help               显示帮助

示例:
  pdd-open 瞳粉                  打开瞳粉店铺后台
  pdd-open 瞳粉 --tian            提取瞳粉昨日全部数据+评价回复+举报
  pdd-open 瞳粉 --extract        提取瞳粉昨日销售数据
  pdd-open 瞳粉 --service        提取瞳粉昨日客服绩效
  pdd-open 瞳粉 --service 2026-03  提取瞳粉指定月客服绩效
  pdd-open 瞳粉 --ads            提取瞳粉昨日推广数据
  pdd-open 瞳粉 --review         提取瞳粉评价数据
  pdd-open 瞳粉 --review --reply 提取并自动回复评价
  pdd-open --list               列出所有账号
  pdd-open --add "新店铺" 24 老王  添加新账号
`); }

function he(e, s) { console.error('[X] ' + (e instanceof Error ? e.message : e)); if (s) sendError(e.message, s).catch(() => {}); process.exit(1); }
function gy() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }

async function main() {
  // 启用进程守护 - Node.js 退出时自动清理 Chrome
  enableGuard();
  
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) { ph(); return; }
  const p = new ArgsParser(args); p.parse();
  
  // 读取 QwenPaw 通道会话信息，通知将原路返回（跟回复机制一致）
  const ncIdx = args.indexOf('--notify-channel');
  const nuIdx = args.indexOf('--notify-user');
  const nsIdx = args.indexOf('--notify-session');
  if (ncIdx >= 0 && nuIdx >= 0 && nsIdx >= 0) {
    setOcChannelInfo(args[ncIdx + 1], args[nuIdx + 1], args[nsIdx + 1]);
  }
  
  if (p.has('--stats')) { printStats(p.get('--stats') && p.get('--stats')[0] ? parseInt(p.get('--stats')[0]) : 7); return; }
  if (p.has('--health')) { const accs = await listAccountsWithStatus(); await checkAllShops(accs); return; }
  if (p.has('--batch')) { const shops = p.get('--batch')[0].split(','); const q = new TaskQueue({}); q.addBatch(shops, { sales: p.sales, ads: p.ads, date: p.salesDate || gy() }); await q.run(); return; }
  if (p.has('--list')) { const accs = await listAccountsWithStatus(); accs.forEach(a => console.log(a.shop_name + ' | ' + a.cdp_port + ' | ' + (a.running ? 'RUNNING' : 'STOPPED'))); return; }
  if (p.has('--stop')) { const kw = p.get('--stop')[0]; const a = findAccountByKeyword(kw); if (!a) { console.error('not found:' + kw); process.exit(1); } await stopBrowserByShop(a.shop_name); console.log('stopped'); return; }
  if (p.has('--stop-all')) {
    const accs = await listAccountsWithStatus();
    let closed = 0, fail = 0;
    for (const a of accs) {
      try {
        const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:' + a.cdp_port);
        await browser.close();
        console.log('✅', a.shop_name, '(端口', a.cdp_port + ')');
        closed++;
      } catch (e) {
        console.log('❌', a.shop_name, '-', e.message.split('\n')[0]);
        fail++;
      }
    }
    console.log(`\n关闭完成：${closed} 个成功，${fail} 个失败`);
    return;
  }
  if (p.has('--logout')) {
    const kw = p.get('--logout') ? p.get('--logout')[0] : (p.summary().shop || 'XIDOO');
    const a = findAccountByKeyword(kw);
    if (!a) { console.error('not found'); process.exit(1); }
    try {
      const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:' + a.cdp_port);
      const page = browser.contexts()[0].pages()[0];
      const r = await logoutAccount(page);
      console.log(r.success ? 'logged out' : 'failed:' + r.reason);
    } catch (e) { console.error(e.message); }
    return;
  }
  if (p.has('--add')) { const pv = p.get('--add'); const acc = await addAccount(pv[0], pv[1], pv[2] || ''); console.log('added:' + acc.shop_name); return; }
  const kw = p.summary().shop;
  if (!kw) { console.error('need shop'); process.exit(1); }
  const acc = findAccountByKeyword(kw);
  if (!acc) { console.error('not found:' + kw); process.exit(1); }
  if (Array.isArray(acc)) { console.log('multi:' + acc.map(a => a.shop_name).join(',')); return; }
  console.log('shop:' + acc.shop_name);
  const port = acc.cdp_port;
  if (!await isBrowserRunning(port)) { console.log('starting'); await startChrome(acc); } else { console.log('running'); }
  try { 
    const loginResult = await fullLoginFlow(port, acc.shop_name); 
    console.log('logged in'); 
    // ✅ 登录成功后发送通知
    hooks.fire('afterLogin', { shopName: acc.shop_name, adminName: acc.admin || '未知' });
  } catch (e) { he(e, acc.shop_name); }
  let page = null, browser = null;
  try {
    browser = await pw.chromium.connectOverCDP('http://127.0.0.1:' + port);
    const ctx = browser.contexts().find(c => c.pages().length > 0) || await browser.newContext();
    page = ctx.pages()[0] || await ctx.newPage();
  } catch (e) { console.warn('CDP:', e.message); }
  const doS = p.sales || p.has('--extract') || p.has('--all') || p.has('--tian'), 
        doSv = p.service || p.has('--all') || p.has('--tian'), 
        doA = p.ads || p.has('--all') || p.has('--tian');
  const log = new ExecutionLog(acc.shop_name, doS && doA ? 'all' : doS ? 'sales' : doA ? 'ads' : doSv ? 'service' : 'browse', p.salesDate || gy());
  
  // ========== 销售数据 ==========
  if (doS) {
    const d = p.salesDate || gy();
    console.log('sales:' + d);
    try {
      const check = dataCache.checkCompleteness(acc.shop_name, 'sales', d, {});
      if (!p.force && check.isComplete) {
        console.log('cached');
      } else {
        const r = await fullExtractSales(page, null, acc.shop_id, acc.shop_name, d);
        if (r && r.metrics) {
          await writeSalesData(acc.shop_id, acc.shop_name, d, r.metrics);
          log.success({});
          hooks.fire('afterExtract', { shopName: acc.shop_name, date: d, metrics: r.metrics });
          console.log('saved');
        }
      }
    } catch (e) {
      console.log('err:' + e.message);
      log.fail(e.message);
      hooks.fire('taskError', { shopName: acc.shop_name, taskType: 'sales', error: e.message });
    }
  }
  
  // ========== 推广数据 ==========
  if (doA) {
    const d = p.adsDate || gy();
    console.log('ads:' + d);
    try {
      const r = await extractTuikePromotion(null, acc.shop_name, d, port);
      if (r && r.items) {
        await writePromotionData(acc.shop_name, d, r.items);
        log.success({});
        hooks.fire('onComplete', { shopName: acc.shop_name, taskType: 'ads' });
        console.log('saved');
      }
    } catch (e) {
      console.log('err:' + e.message);
      log.fail(e.message);
      hooks.fire('taskError', { shopName: acc.shop_name, taskType: 'ads', error: e.message });
    }
    
  }
  
  // ========== 客服绩效 ==========
  if (doSv) {
    const d = p.serviceMonth || gy();
    console.log('service:' + d);
    try {
      await extractCustomerPerformancePlaywright(port, acc.shop_name, acc.shop_id, d);
      log.success({});
      hooks.fire('onComplete', { shopName: acc.shop_name, taskType: 'service' });
      console.log('saved');
    } catch (e) {
      console.log('err:' + e.message);
      log.fail(e.message);
      hooks.fire('taskError', { shopName: acc.shop_name, taskType: 'service', error: e.message });
    }
  }
  
  // ========== 评价管理（独立运行，不由 --tian 触发）==========
  const doReview = p.has('--review');
  const doReply = p.has('--reply');
  const doReport = p.has('--report');
  
  // 只在有评价操作时才导航到评价页面
  if (doReview || doReply || doReport) {
    await navigateToReviewPage(page);
    // ✅ 每页条数在 batchReplyReviews/batchReportReviews 内部筛选后设置
  }
  
  if (doReport) {
    // --report：执行差评举报（1-2星）
    console.log('review-report: starting...');
    const limit = p.get('--limit') ? parseInt(p.get('--limit')[0]) : 200;
    const safeLimit = Math.min(limit, 200);
    
    const reportResult = await batchReportReviews(page, { stars: [1, 2], limit: safeLimit, shopId: acc.shop_id });
    console.log('review-report: 举报' + reportResult.reported + '条，跳过' + reportResult.skipped + '条');
    if (reportResult.excelAdded) console.log('   📝 Excel新增' + reportResult.excelAdded + '条');
    log.success({ reportResult });
    hooks.fire('onComplete', { shopName: acc.shop_name, taskType: 'review' });
  }
  
  if (doReply) {
    // --reply：执行智能回复（5星好评）
    console.log('reply: starting...');
    const replyText = p.get('--reply-text') ? p.get('--reply-text')[0] : null;
    const limit = p.get('--limit') ? parseInt(p.get('--limit')[0]) : 200;
    const safeLimit = Math.min(limit, 200);
    
    const replyResult = await batchReplyReviews(page, { replyText, limit: safeLimit, shopId: acc.shop_id });
    console.log('reply: 回复' + replyResult.replied + '条，跳过' + replyResult.skipped + '条');
    if (replyResult.excelAdded) console.log('   📝 Excel新增' + replyResult.excelAdded + '条');
    log.success(replyResult);
    hooks.fire('onComplete', { shopName: acc.shop_name, taskType: 'review' });
  }
  
  if (doReview) {
    // --review：提取并保存评价
    console.log('review: extracting...');
    try {
      const limit = p.get('--limit') ? parseInt(p.get('--limit')[0]) : 200;
      const safeLimit = Math.min(limit, 200);
      const reviews = await extractReviews(page, { pageSize, limit: safeLimit });
      const filePaths = await writeReviewData(acc.shop_id, reviews);
      console.log('saved:', filePaths.join(', '));
      log.success({});
    } catch (e) {
      console.log('err:', e.message);
      log.fail(e.message);
      hooks.fire('taskError', { shopName: acc.shop_name, taskType: 'review', error: e.message });
    }
  }
  
  console.log('done' + (log.duration ? ' ' + (log.duration / 1000).toFixed(1) + 's' : ''));
}
main().catch(e => { console.error(e); process.exit(1); });