/**
 * 通知模块
 * 
 * 支持两种发送方式：
 * 1. qwenpaw channels send（优先）— 原路返回，跟回复机制一致
 * 2. 飞书 API（兜底）— 当没有会话信息时使用
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ========== QwenPaw 通道会话信息 ==========
// 由 setOcChannelInfo() 设置，之后通知会用 qwenpaw channels send 原路发回
let _ocChannel = null;   // 如 'feishu'
let _ocUserId = null;    // 如 'ou_def76e06395ab9983ed6070545b1948c'
let _ocSessionId = null; // 如 '9cee_831a1581'

/**
 * 设置 QwenPaw 通道会话信息
 * 设置后，通知会通过 qwenpaw channels send 原路发回给用户
 */
function setOcChannelInfo(channel, userId, sessionId) {
  _ocChannel = channel;
  _ocUserId = userId;
  _ocSessionId = sessionId;
}

/**
 * 通过飞书 API 发送富文本消息到当前会话对应的群聊
 * 用 session_id 后缀匹配群聊 chat_id，精准发群
 * 富文本天然支持多行，不会出现 \n 字面量
 */
async function sendViaFeishuRichText(lines) {
  if (!_ocSessionId) return false;
  
  const textLines = Array.isArray(lines) ? lines : [lines];
  if (!textLines.length) return false;

  const creds = getFeishuCredentials();
  if (!creds) return false;

  try {
    const token = getFeishuToken(creds);

    // 从 session_id 后缀匹配群聊 chat_id
    // session_id: "9cee_831a1581", 后缀: "831a1581"
    // chat_id: "oc_b1217b07524040b88b69a4b7831a1581", 以 "831a1581" 结尾
    const groups = await getBotGroupChatId(creds, token);
    if (!groups || !Array.isArray(groups)) return false;

    const parts = _ocSessionId.split('_');
    const suffix = parts.length > 1 ? parts[1] : _ocSessionId;
    const match = groups.find(g => g.chat_id && g.chat_id.endsWith(suffix));
    if (!match) return false;

    // 构造飞书富文本消息（每行一个 text 块，自动换行）
    const contentBlocks = textLines.map(line => [{ tag: 'text', text: line }]);
    const content = JSON.stringify({
      zh_cn: { title: '', content: contentBlocks }
    });

    const body = JSON.stringify({
      receive_id: match.chat_id,
      msg_type: 'post',
      content: content
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer ' + token
        }
      }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve(JSON.parse(chunks)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.code === 0) {
      console.log(`[notify] 已发送 → ${match.name || '群聊'} (${match.chat_id})`);
      return true;
    } else {
      console.log('[notify] 飞书发送失败:', result.msg);
      return false;
    }
  } catch (e) {
    console.log('[notify] 发送失败:', e.message);
    return false;
  }
}

// ========== 配置 ==========
const CONFIG = {
  agent_id: process.env.FEISHU_AGENT_ID || 'default',
  channel: 'feishu',
  // qwenpaw chats list 返回的会话名称
  SESSION_NAME_PM: '私信',      // 私信会话标识（用于区分群聊和私信）
};

// ========== 飞书凭证 ==========
// 智能检测 QwenPaw 家目录（兼容 .qwenpaw 和 .copaw 两种命名）
function getAgentJsonPath() {
  const home = process.env.USERPROFILE || 'C:\\Users\\Administrator';
  const candidates = ['.copaw', '.qwenpaw'];

  // 找 QwenPaw 家目录，必须有可用的 agent.json 才采用
  for (const dir of candidates) {
    const qwenpawHome = path.join(home, dir);
    if (!fs.existsSync(qwenpawHome)) continue;

    const workspacesDir = path.join(qwenpawHome, 'workspaces');
    if (fs.existsSync(workspacesDir)) {
      const workspaces = fs.readdirSync(workspacesDir);
      for (const ws of workspaces) {
        const candidate = path.join(workspacesDir, ws, 'agent.json');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
    // 目录存在但没有 agent.json，继续尝试下一个候选
  }

  // 所有候选目录都没找到，fallback 到 default workspace
  return path.join(home, '.copaw', 'workspaces', 'default', 'agent.json');
}

function getFeishuCredentials() {
  const agentJsonPath = getAgentJsonPath();
  if (fs.existsSync(agentJsonPath)) {
    const content = fs.readFileSync(agentJsonPath, 'utf8');
    const config = JSON.parse(content);
    const feishu = config.channels?.feishu;
    if (feishu && feishu.app_id && feishu.app_secret) {
      return {
        app_id: feishu.app_id,
        app_secret: feishu.app_secret,
      };
    }
  }
  return null;
}

// ========== 获取飞书 Token ==========
let _cachedToken = null;
let _tokenExpiry = 0;

function getFeishuToken(creds) {
  if (_cachedToken && Date.now() < _tokenExpiry) {
    return _cachedToken;
  }
  try {
    const body = JSON.stringify({
      app_id: creds.app_id,
      app_secret: creds.app_secret
    });
    const result = execSync(
      `curl -s -X POST -H "Content-Type: application/json" -d "${body.replace(/"/g, '\\"')}" "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const data = JSON.parse(result);
    if (data.code !== 0) {
      throw new Error(`获取 Token 失败: ${data.msg}`);
    }
    _cachedToken = data.tenant_access_token;
    _tokenExpiry = Date.now() + (data.expire - 60) * 1000;
    return _cachedToken;
  } catch (e) {
    throw e;
  }
}

// ========== 获取当前活跃会话 ==========
function getLatestFeishuSession() {
  try {
    const output = execSync(
      `qwenpaw chats list --agent-id ${CONFIG.agent_id} --channel ${CONFIG.channel}`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const start = output.indexOf('[');
    if (start === -1) return null;
    const jsonStr = output.substring(start);
    const sessions = JSON.parse(jsonStr);
    if (!sessions || sessions.length === 0) return null;
    
    // 优先返回 status === 'running' 的会话（当前正在聊天的会话）
    const activeSession = sessions.find(s => s.status === 'running');
    if (activeSession) return activeSession;

    // 没有 running 会话，再找群聊
    const groupSession = sessions.find(s => s.name !== CONFIG.SESSION_NAME_PM);
    if (groupSession) return groupSession;

    // 都没有才按 updated_at 取最新的私信
    sessions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return sessions[0];
  } catch (e) {
    console.log('[notify] 获取会话失败:', e.message);
    return null;
  }
}

// ========== 获取群的 chat_id ==========
function getBotGroupChatId(creds, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/im/v1/chats?page_size=50',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(chunks);
          if (data.code === 0 && data.data && data.data.items) {
            resolve(data.data.items);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ========== 获取接收者 ID（优先发群聊） ==========
async function getReceiveId(creds, token) {
  // 1. 获取当前最新会话
  const session = getLatestFeishuSession();
  if (!session) return null;

  // 2. 非私信会话 → 群聊，用 session_id 后缀匹配群聊 chat_id
  //    session_id 格式: "9cee_831a1581"，后缀 "831a1581"
  //    群聊 chat_id 格式: "oc_b1217b07524040b88b69a4b7831a1581"，以 "831a1581" 结尾
  if (session.name !== CONFIG.SESSION_NAME_PM) {
    const parts = session.session_id.split('_');
    const suffix = parts.length > 1 ? parts[1] : session.session_id;

    const groups = await getBotGroupChatId(creds, token);
    if (groups && Array.isArray(groups)) {
      const match = groups.find(g => g.chat_id && g.chat_id.endsWith(suffix));
      if (match) {
        return { type: 'chat_id', id: match.chat_id, isGroupChat: true };
      }
    }
  }

  // 3. fallback 到私信
  return { type: 'open_id', id: session.user_id, isGroupChat: false };
}

// ========== 根据扩展名获取飞书 file_type ==========
function getFileType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const typeMap = {
    'xlsx': 'xls', 'xls': 'xls',
    'png': 'png',
    'jpg': 'jpg', 'jpeg': 'jpg',
    'gif': 'gif',
    'pdf': 'pdf',
    'doc': 'doc', 'docx': 'doc',
    'ppt': 'ppt', 'pptx': 'ppt',
    'mp4': 'mp4',
    'mov': 'mov',
    'aac': 'opus', 'opus': 'opus'
  };
  return typeMap[ext] || 'stream';
}

// ========== 上传文件到飞书 ==========
async function uploadFile(filePath, token) {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const fileType = getFileType(fileName);
  const boundary = '----WebKitFormBoundary' + Date.now().toString(36);

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
    Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file_name"\r\n\r\n`),
    Buffer.from(fileName + `\r\n`),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file_type"\r\n\r\n`),
    Buffer.from(fileType + `\r\n`),
    Buffer.from(`--${boundary}--\r\n`)
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/im/v1/files',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(chunks);
          if (r.code === 0) resolve(r.data?.file_key);
          else reject(new Error(r.msg || 'upload failed'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ========== 发送文件消息（自动跟随会话） ==========
async function sendFileMessage(filePath, ctx = null) {
  const creds = getFeishuCredentials();
  if (!creds) {
    console.log('[notify] 未配置飞书凭据');
    return { success: false, reason: 'no_creds' };
  }

  if (!fs.existsSync(filePath)) {
    console.log('[notify] 文件不存在:', filePath);
    return { success: false, reason: 'file_not_found' };
  }

  try {
    const token = getFeishuToken(creds);
    const receiveInfo = await getReceiveId(creds, token);

    if (!receiveInfo || !receiveInfo.id) {
      console.log('[notify] 未找到接收者');
      return { success: false, reason: 'no_receiver' };
    }

    // 上传文件
    const fileKey = await uploadFile(filePath, token);

    // 发送文件消息
    const body = JSON.stringify({
      receive_id: receiveInfo.id,
      msg_type: 'file',
      content: JSON.stringify({
        file_key: fileKey,
        file_name: path.basename(filePath)
      })
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/messages?receive_id_type=' + receiveInfo.type,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer ' + token
        }
      }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve(JSON.parse(chunks)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.code === 0) {
      console.log(`[notify] 文件发送成功 → ${receiveInfo.isGroupChat ? '群聊' : '私信'} (${receiveInfo.type})`);
      return { success: true, message_id: result.data?.message_id };
    } else {
      console.log('[notify] 文件发送失败:', result.msg);
      return { success: false, reason: result.msg };
    }
  } catch (e) {
    console.log('[notify] 文件发送失败:', e.message);
    return { success: false, reason: e.message };
  }
}

// ========== 发送飞书消息（优先飞书 API 发到正确群聊） ==========
async function sendFeishuMessageAuto(lines) {
  // 优先通过 session_id 匹配群聊，用飞书 API 发富文本
  if (await sendViaFeishuRichText(lines)) {
    return { success: true };
  }

  // 无会话信息，兜底用旧的飞书 API 逻辑
  const creds = getFeishuCredentials();
  if (!creds) {
    console.log('[notify] 未配置飞书凭据');
    return { success: false, reason: 'no_creds' };
  }

  try {
    const token = getFeishuToken(creds);
    const receiveInfo = await getReceiveId(creds, token);
    
    if (!receiveInfo || !receiveInfo.id) {
      console.log('[notify] 未找到接收者');
      return { success: false, reason: 'no_receiver' };
    }

    const isGroupChat = receiveInfo.isGroupChat;
    const receiveIdType = receiveInfo.type;
    const receiveId = receiveInfo.id;

    // 构造飞书富文本消息
    const contentBlocks = lines.map(line => [{ tag: 'text', text: line }]);
    const content = JSON.stringify({
      zh_cn: {
        title: '',
        content: contentBlocks,
      }
    });

    // 发送消息
    const body = {
      receive_id: receiveId,
      msg_type: 'post',
      content: content
    };

    const result = await new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/messages?receive_id_type=' + receiveIdType,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': 'Bearer ' + token
        }
      }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve(JSON.parse(chunks)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (result.code === 0) {
      console.log(`[notify] 发送成功 → ${isGroupChat ? '群聊' : '私信'} (${receiveIdType})`);
      return { success: true, message_id: result.data?.message_id };
    } else {
      console.log('[notify] 发送失败:', result.msg);
      return { success: false, reason: result.msg };
    }
  } catch (e) {
    console.log('[notify] 发送失败:', e.message);
    return { success: false, reason: e.message };
  }
}

// ========== 发送图片到飞书群 ==========
async function sendImageToFeishuGroup(imagePath) {
  const creds = getFeishuCredentials();
  if (!creds) {
    console.log('[notify] 未配置飞书凭据');
    return { success: false, reason: 'no_creds' };
  }

  try {
    const token = getFeishuToken(creds);
    const chatId = await getBotGroupChatId(creds, token);
    
    if (!chatId) {
      console.log('[notify] 未找到群 chat_id');
      return { success: false, reason: 'no_chat_id' };
    }

    // 上传图片
    const imgBuf = fs.readFileSync(imagePath);
    const boundary = '----WebKitFormBoundary' + Date.now().toString(36);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_type"\r\n\r\nmessage\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${path.basename(imagePath)}"\r\nContent-Type: image/png\r\n\r\n`),
      imgBuf,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const uploadResult = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/images',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Authorization': 'Bearer ' + token
        }
      }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve(JSON.parse(chunks)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (uploadResult.code !== 0) {
      return { success: false, reason: uploadResult.msg };
    }

    // 发送图片消息
    const msgBody = {
      receive_id: chatId,
      msg_type: 'image',
      content: JSON.stringify({ image_key: uploadResult.data.image_key })
    };

    const msgResult = await new Promise((resolve, reject) => {
      const data = JSON.stringify(msgBody);
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': 'Bearer ' + token
        }
      }, res => {
        let chunks = '';
        res.on('data', d => chunks += d);
        res.on('end', () => resolve(JSON.parse(chunks)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (msgResult.code === 0) {
      console.log('[notify] 图片发送成功');
      return { success: true, message_id: msgResult.data?.message_id };
    } else {
      console.log('[notify] 图片消息发送失败:', msgResult.msg);
      return { success: false, reason: msgResult.msg };
    }
  } catch (e) {
    console.log('[notify] 图片发送失败:', e.message);
    return { success: false, reason: e.message };
  }
}

// ========== 发送文字消息 ==========
async function sendText(text, ctx = null) {
  return notify(text.split('\n'));
}

// ========== 发送图片消息 ==========
async function sendImage(imagePath, ctx = null) {
  return sendImageToFeishuGroup(imagePath);
}

// ========== 发送二维码图片 ==========
async function sendQrCode(imagePath, ctx = null) {
  return sendImageToFeishuGroup(imagePath);
}

// ========== 统一通知接口 ==========
async function notify(lines) {
  if (typeof lines === 'string') {
    lines = lines.split('\n');
  }
  return sendFeishuMessageAuto(lines);
}

// ========== 快捷通知函数 ==========
async function sendLoginSuccess(shopName, username, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '🎉 【登录成功】',
    `🏪 ${shopName}`,
    `👤 ${username}`,
    `⏰ ${timeStr}`
  ]);
}

async function sendLoginSuccessWithAdmin(shopName, adminName, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '🎉 【登录成功】',
    `🏪 ${shopName}`,
    `👤 ${adminName}`,
    `⏰ ${timeStr}`
  ]);
}

async function sendLoginFailed(shopName, reason, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '❌ 【登录失败】',
    `🏪 ${shopName}`,
    `⚠️ ${reason}`,
    `⏰ ${timeStr}`
  ]);
}

async function sendShopMismatch(expectedShop, actualShop, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '⚠️ 【店铺不匹配】',
    `📋 预期店铺: ${expectedShop}`,
    `🔍 实际店铺: ${actualShop}`,
    `💡 请切换到正确的店铺后重试`,
    `⏰ ${timeStr}`
  ]);
}

async function sendExtractComplete(shopName, dateStr, metrics, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lines = [
    '✅ 【数据提取完成】',
    `🏪 ${shopName}`,
    `📅 ${dateStr}`
  ];
  if (metrics) {
    if (metrics.orderCount !== undefined) lines.push(`📦 订单数: ${metrics.orderCount}`);
    if (metrics.gmv !== undefined) lines.push(`💰 GMV: ¥${metrics.gmv}`);
  }
  lines.push(`⏰ ${timeStr}`);
  return notify(lines);
}

async function sendError(errorMsg, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '🚨 【出错了】',
    `⚠️ ${errorMsg}`,
    `⏰ ${timeStr}`
  ]);
}

async function sendCustomMessage(lines, ctx = null) {
  if (typeof lines === 'string') {
    lines = lines.split('\n');
  }
  return notify(lines);
}

// ========== 任务通知函数 ==========
async function sendTaskComplete(shopName, taskType, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '✅ 【任务完成】',
    `🏪 ${shopName}`,
    `📋 ${taskType}`,
    `⏰ ${timeStr}`
  ]);
}

async function sendTaskError(shopName, taskType, errorMsg, ctx = null) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return notify([
    '❌ 【任务失败】',
    `🏪 ${shopName}`,
    `📋 ${taskType}`,
    `⚠️ ${errorMsg}`,
    `⏰ ${timeStr}`
  ]);
}

// ========== 导出 ==========
module.exports = {
  notify,
  sendText,
  sendImage,
  sendQrCode,
  sendFileMessage,
  sendLoginSuccess,
  sendLoginSuccessWithAdmin,
  sendLoginFailed,
  sendShopMismatch,
  sendExtractComplete,
  sendError,
  sendCustomMessage,
  sendTaskComplete,
  sendTaskError,
  setOcChannelInfo,
  // 内部方法暴露，方便测试
  _getLatestFeishuSession: getLatestFeishuSession,
  _getFeishuCredentials: getFeishuCredentials,
};