/**
 * scripts/reply-and-report.js
 * 同时执行评价回复（5星）和举报（1-2星）
 */
const m = require('../modules'), u = require('../utils');
const { findAccountByKeyword, isBrowserRunning } = u.accounts;
const { fullLoginFlow } = u.login;
const pw = require('playwright');

async function main() {
  const kw = process.argv[2] || '瞳粉';
  const replyLimit = parseInt(process.argv[3]) || 30;
  const reportLimit = parseInt(process.argv[4]) || 30;
  
  console.log(`📍 店铺: ${kw}`);
  console.log(`📊 回复限制: ${replyLimit}条, 举报限制: ${reportLimit}条`);
  
  const acc = findAccountByKeyword(kw);
  const port = acc.cdp_port;
  
  if (!await isBrowserRunning(port)) {
    console.log('🚀 启动浏览器...');
    await require('../utils/browser').startChrome(acc);
  }
  
  await fullLoginFlow(port, acc.shop_name);
  console.log('✅ 已登录');
  
  let browser, page;
  browser = await pw.chromium.connectOverCDP('http://127.0.0.1:' + port);
  const ctx = browser.contexts().find(c => c.pages().length > 0) || await browser.newContext();
  page = ctx.pages()[0] || await ctx.newPage();
  
  // 导航到评价页面
  const { navigateToReviewPage, setPageSize } = m.review;
  await navigateToReviewPage(page);
  await setPageSize(page, 'max');
  
  // 先回复5星好评
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 执行回复（5星好评）...');
  const replyResult = await m.review.batchReplyReviews(page, { 
    limit: replyLimit, 
    shopId: acc.shop_id,
    stars: [5]  // 只回复5星
  });
  console.log(`✅ 回复完成：成功 ${replyResult.replied} 条，跳过 ${replyResult.skipped} 条`);
  
  // 再举报1-2星差评
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 执行举报（1-2星差评）...');
  const reportResult = await m.review.batchReportReviews(page, { 
    stars: [1, 2], 
    limit: reportLimit, 
    shopId: acc.shop_id
  });
  console.log(`✅ 举报完成：成功 ${reportResult.reported} 条，跳过 ${reportResult.skipped} 条`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 全部完成！');
  
  await browser.close();
}

main().catch(e => { 
  console.error('❌ 错误:', e.message); 
  console.error(e.stack);
  process.exit(1); 
});
