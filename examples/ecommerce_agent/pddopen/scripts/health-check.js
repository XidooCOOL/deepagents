/**
 * scripts/health-check.js - 启动前健康检查
 * 
 * 使用方法:
 *   node scripts/health-check.js [shopId]
 *   node scripts/health-check.js          # 检查所有店铺
 *   node scripts/health-check.js 21       # 检查指定店铺
 * 
 * 功能：
 * 1. 检测 browser_state.json 中的记录是否与实际进程匹配
 * 2. 自动清理僵尸记录
 * 3. 检测端口占用情况
 * 4. 报告店铺状态
 */

const { cleanZombieRecords, isChromeReallyRunning, loadBrowserState } = require('../utils/lifecycle');
const { readAllAccounts } = require('../utils/accounts');

async function main() {
  console.log('='.repeat(60));
  console.log('🩺 pdd-open 健康检查');
  console.log('='.repeat(60));
  
  const args = process.argv.slice(2);
  const targetShopId = args[0];
  
  // Step 1: 清理僵尸记录
  console.log('\n📋 Step 1: 清理僵尸记录...');
  const cleanResult = await cleanZombieRecords();
  console.log(`   已清理: ${cleanResult.cleaned} 个`);
  console.log(`   剩余活跃: ${cleanResult.remaining} 个`);
  
  if (targetShopId) {
    // Step 2: 检查指定店铺
    console.log(`\n📋 Step 2: 检查店铺 ${targetShopId}...`);
    await checkShop(targetShopId);
  } else {
    // Step 3: 检查所有店铺
    console.log('\n📋 Step 2: 检查所有店铺...');
    const accounts = readAllAccounts();
    
    for (const account of accounts) {
      await checkShop(account.shop_id, account.shop_name);
    }
  }
  
  // Step 4: 检测未记录的 Chrome
  console.log('\n📋 Step 3: 检测未记录的 Chrome 进程...');
  await detectUntrackedBrowsers();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 健康检查完成');
  console.log('='.repeat(60));
}

async function checkShop(shopId, shopName) {
  const state = loadBrowserState();
  const entry = state[shopId];
  
  if (!entry) {
    console.log(`\n  [${shopId}] ${shopName || ''}`);
    console.log(`     状态: ⚪ 无记录（未启动或已清理）`);
    return;
  }
  
  const { running, reason, pid } = await isChromeReallyRunning(entry.port);
  
  console.log(`\n  [${shopId}] ${shopName || entry.shopName || ''}`);
  console.log(`     记录端口: ${entry.port}`);
  console.log(`     记录PID: ${entry.pid}`);
  console.log(`     实际PID: ${pid || 'N/A'}`);
  console.log(`     启动时间: ${entry.startedAt}`);
  
  if (running) {
    console.log(`     状态: ✅ 健康（进程运行中）`);
  } else {
    console.log(`     状态: ❌ 僵尸记录（${reason}）`);
    console.log(`     建议: 运行 'node scripts/cleanup.js' 清理`);
  }
}

async function detectUntrackedBrowsers() {
  const state = loadBrowserState();
  const trackedPorts = new Set(Object.values(state).map(e => e.port));
  
  // 检查常见端口范围
  const checkedPorts = [];
  const BASE_PORT = 49152;
  
  for (let offset = 1; offset <= 20; offset++) {
    const port = BASE_PORT + offset;
    if (trackedPorts.has(port)) continue;
    
    try {
      const { available } = await isPortReallyAvailable(port);
      if (!available) {
        const { running, pid } = await isChromeReallyRunning(port);
        if (running) {
          checkedPorts.push({ port, pid });
        }
      }
    } catch (e) {
      // 忽略检测错误
    }
  }
  
  if (checkedPorts.length > 0) {
    console.log(`  ⚠️  发现 ${checkedPorts.length} 个未记录的 Chrome:`);
    for (const { port, pid } of checkedPorts) {
      console.log(`     - 端口 ${port}, PID ${pid}`);
    }
    console.log(`     建议: 如果这些是 pdd-open 的店铺，请检查是否正常记录`);
  } else {
    console.log('  ✅ 未发现未记录的 Chrome');
  }
}

const { isPortReallyAvailable } = require('../utils/lifecycle');

main().catch(console.error);
