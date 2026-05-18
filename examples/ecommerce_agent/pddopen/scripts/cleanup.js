/**
 * scripts/cleanup.js - 清理工具
 * 
 * 使用方法:
 *   node scripts/cleanup.js                 # 交互式菜单
 *   node scripts/cleanup.js --all            # 清理所有僵尸记录
 *   node scripts/cleanup.js --kill <port>    # 强制关闭指定端口
 *   node scripts/cleanup.js --kill-all       # 关闭所有 pdd-open 相关 Chrome
 * 
 * 功能：
 * 1. 清理 browser_state.json 中的僵尸记录
 * 2. 强制关闭指定端口的 Chrome
 * 3. 关闭所有 pdd-open 的 Chrome
 */

const { cleanZombieRecords, forceKillPort, loadBrowserState } = require('../utils/lifecycle');
const { readAllAccounts } = require('../utils/accounts');
const { spawn, execSync } = require('child_process');
const { BASE_PORT, PROFILES_ROOT } = require('../config');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help') {
    showHelp();
    return;
  }
  
  switch (command) {
    case '--all':
      await cleanupAll();
      break;
    case '--kill':
      const port = parseInt(args[1]);
      if (!port) {
        console.error('❌ 请指定端口号: node scripts/cleanup.js --kill <port>');
        process.exit(1);
      }
      await killPort(port);
      break;
    case '--kill-all':
      await killAll();
      break;
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
  }
}

function showHelp() {
  console.log(`
🧹 pdd-open 清理工具

用法:
  node scripts/cleanup.js --all              清理所有僵尸记录
  node scripts/cleanup.js --kill <port>       关闭指定端口的 Chrome
  node scripts/cleanup.js --kill-all          关闭所有 pdd-open 的 Chrome

示例:
  node scripts/cleanup.js --all
  node scripts/cleanup.js --kill 49153
  node scripts/cleanup.js --kill-all
`);
}

async function cleanupAll() {
  console.log('🧹 开始清理所有僵尸记录...\n');
  
  const result = await cleanZombieRecords();
  
  console.log(`\n✅ 清理完成:`);
  console.log(`   已清理僵尸记录: ${result.cleaned} 个`);
  console.log(`   剩余活跃记录: ${result.remaining} 个`);
}

async function killPort(port) {
  console.log(`🔪 正在关闭端口 ${port}...`);
  
  const { running } = await isChromeReallyRunning(port);
  if (!running) {
    console.log(`⚠️ 端口 ${port} 没有 Chrome 进程`);
    return;
  }
  
  await forceKillPort(port);
  console.log(`✅ 端口 ${port} 已关闭`);
}

async function killAll() {
  console.log('🔪 正在关闭所有 pdd-open 的 Chrome...\n');
  
  const state = loadBrowserState();
  const shopIds = Object.keys(state);
  
  if (shopIds.length === 0) {
    console.log('⚠️ 没有找到活跃的店铺记录');
    return;
  }
  
  for (const shopId of shopIds) {
    const entry = state[shopId];
    console.log(`正在关闭 [${shopId}] 端口 ${entry.port}...`);
    await forceKillPort(entry.port);
  }
  
  // 清理记录
  const fs = require('fs');
  fs.writeFileSync(require.resolve('../data/browser_state.json').replace(/\\/g, '/').replace('/data/browser_state.json', '/data/browser_state.json'), '{}');
  
  console.log('\n✅ 所有 pdd-open Chrome 已关闭，记录已清空');
}

async function isChromeReallyRunning(port) {
  const { isPortReallyAvailable } = require('../utils/lifecycle');
  const { available } = await isPortReallyAvailable(port);
  
  if (available) return { running: false };
  
  try {
    const output = execSync(
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object OwningProcess | ConvertTo-Json`,
      { encoding: 'utf-8', shell: 'powershell' }
    );
    
    if (output && output.trim()) {
      const info = JSON.parse(output);
      const pid = Array.isArray(info) ? info[0].OwningProcess : info.OwningProcess;
      return { running: true, pid };
    }
  } catch (e) {}
  
  return { running: false };
}

main().catch(console.error);
