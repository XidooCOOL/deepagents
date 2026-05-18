/**
 * hooks.js - 钩子系统
 * 
 * 提供生命周期钩子，允许在关键节点插入自定义逻辑
 * 
 * 钩子类型：
 * - beforeLogin: 登录前
 * - afterLogin: 登录后
 * - beforeExtract: 提取前
 * - afterExtract: 提取后
 * - onError: 发生错误时
 * - onComplete: 任务完成
 * 
 * 用法：
 *   const hooks = require('./hooks');
 *   await hooks.emit('afterExtract', { shopName, data });
 */

const fs = require('fs');
const path = require('path');

// 钩子配置
let config = null;
let enabled = true;

function getConfig() {
  if (config) return config;
  
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    config = { hooks: { enabled: true, log_to_console: true } };
  }
  return config;
}

// 内置钩子处理器
const builtInHandlers = {
  /**
   * 登录成功钩子 → 发送通知
   */
  afterLogin: async (data) => {
    const notify = require('./notify');
    if (data.adminName) {
      await notify.sendLoginSuccessWithAdmin(data.shopName, data.adminName);
    } else {
      await notify.sendLoginSuccess(data.shopName, '未知');
    }
  },

  /**
   * 店铺不匹配 → 发送通知
   */
  shopMismatch: async (data) => {
    const notify = require('./notify');
    await notify.sendShopMismatch(data.expected, data.actual);
  },

  /**
   * 登录失败 → 发送通知
   */
  loginFailed: async (data) => {
    const notify = require('./notify');
    await notify.sendLoginFailed(data.shopName, data.reason);
  },

  /**
   * 提取完成 → 发送通知
   */
  afterExtract: async (data) => {
    const notify = require('./notify');
    await notify.sendExtractComplete(data.shopName, data.date, data.metrics);
  },

  /**
   * 任务完成 → 发送通知
   */
  onComplete: async (data) => {
    const notify = require('./notify');
    await notify.sendTaskComplete(data.shopName, data.taskType);
  },

  /**
   * 发生错误 → 发送通知
   */
  onError: async (data) => {
    const notify = require('./notify');
    await notify.sendError(data.message);
  },

  /**
   * 任务失败 → 发送通知
   */
  taskError: async (data) => {
    const notify = require('./notify');
    await notify.sendTaskError(data.shopName, data.taskType, data.error);
  }
};

// 加载外部插件钩子
function loadPluginHooks() {
  const pluginHooks = {};
  const hooksDir = path.join(__dirname, '..', 'hooks');

  if (!fs.existsSync(hooksDir)) {
    return pluginHooks;
  }

  try {
    const files = fs.readdirSync(hooksDir);
    files.filter(f => f.endsWith('.js')).forEach(file => {
      try {
        const hookModule = require(path.join(hooksDir, file));
        if (hookModule && typeof hookModule === 'object') {
          Object.entries(hookModule).forEach(([name, fn]) => {
            if (typeof fn === 'function') {
              if (!pluginHooks[name]) pluginHooks[name] = [];
              pluginHooks[name].push(fn);
            }
          });
        }
      } catch (e) {
        console.log('[hooks] 加载失败:', file, e.message);
      }
    });
  } catch (e) {
    console.log('[hooks] 加载插件目录失败:', e.message);
  }

  return pluginHooks;
}

// 触发钩子
async function emit(event, data = {}) {
  const cfg = getConfig();

  if (!cfg.hooks?.enabled) {
    return;
  }

  if (cfg.hooks?.log_to_console) {
    console.log(`[hooks] 触发: ${event}`, data.shopName ? `{shop: ${data.shopName}}` : '');
  }

  const pluginHooks = loadPluginHooks();
  const handlers = [];

  // 内置钩子
  if (builtInHandlers[event]) {
    handlers.push(builtInHandlers[event]);
  }

  // 插件钩子
  if (pluginHooks[event]) {
    handlers.push(...pluginHooks[event]);
  }

  // 执行所有处理器
  const results = [];
  for (const handler of handlers) {
    try {
      const result = await handler(data);
      results.push({ success: true, result });
    } catch (e) {
      results.push({ success: false, error: e.message });
      console.log(`[hooks] ${event} 处理失败:`, e.message);
    }
  }

  return results;
}

// 快捷调用 - 不需要 await
function fire(event, data) {
  emit(event, data).catch(e => console.log('[hooks] fire error:', e.message));
}

module.exports = {
  emit,
  fire,
  // 暴露内置处理器，供测试用
  _handlers: builtInHandlers,
  // 重新加载配置
  reloadConfig: () => { config = null; }
};