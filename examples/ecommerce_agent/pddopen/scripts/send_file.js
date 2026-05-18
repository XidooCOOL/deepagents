/**
 * send_file.js - 发送文件到飞书（已废弃，统一用 notify.js 的 sendFileMessage）
 * 
 * @deprecated 请使用 notify.js 的 sendFileMessage 函数
 * 
 * 用法（已废弃）:
 *   node send_file.js <文件路径>
 * 
 * 推荐用法:
 *   const { sendFileMessage } = require('../utils/notify');
 *   await sendFileMessage('path/to/file.xlsx');
 */

const { sendFileMessage } = require('../utils/notify');

const filePath = process.argv[2] || 'data/CustomerPerformance.xlsx';

async function main() {
  console.log('📤 发送文件到飞书:', filePath);
  const result = await sendFileMessage(filePath);
  
  if (result.success) {
    console.log('✅ 文件已发送! message_id:', result.message_id);
  } else {
    console.error('❌ 发送失败:', result.reason);
    process.exit(1);
  }
}

main();