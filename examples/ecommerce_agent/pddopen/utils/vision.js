/**
 * vision.js - MiniMax VLM + 火山引擎 OCR 自动 fallback
 * 优先 MiniMax，失败自动 fallback 到火山引擎
 */
const https = require('https');
const secrets = require('../refs/secrets.json');

// ========== MiniMax VLM ==========
const minimaxApiKey = secrets.minimax_api_key;

function callMinimaxVLM(imageBuffer, prompt) {
  return new Promise((resolve, reject) => {
    const imageBase64 = imageBuffer.toString('base64');
    const body = {
      prompt: prompt,
      image_url: `data:image/png;base64,${imageBase64}`
    };
    const bodyStr = JSON.stringify(body);

    const options = {
      hostname: 'api.minimax.chat',
      path: '/v1/coding_plan/vlm',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${minimaxApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 60000 // 30秒超时
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            let content = parsed.content;
            
            // 尝试从 ```json ... ``` 中提取 JSON
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[1]));
              return;
            }
            
            // 尝试从 ``` ... ``` 中提取（不带 json 标记）
            const codeMatch = content.match(/```\n?([\s\S]*?)\n?```/);
            if (codeMatch) {
              try {
                resolve(JSON.parse(codeMatch[1]));
                return;
              } catch (e) {
                // 不是有效 JSON，继续尝试其他方式
              }
            }
            
            // 尝试直接解析 content（如果是纯 JSON）
            try {
              resolve(JSON.parse(content));
              return;
            } catch (e) {
              // 不是纯 JSON，返回原始内容
            }
            
            resolve(content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          } else {
            reject(new Error('Unknown MiniMax response: ' + JSON.stringify(parsed).slice(0, 200)));
          }
        } catch (e) {
          reject(new Error('Failed to parse MiniMax response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('MiniMax timeout after 120s')));
    req.write(bodyStr);
    req.end();
  });
}

// ========== 重试版本（带重试逻辑）==========
function callMinimaxVLMWithRetry(imageBuffer, prompt, retries = 2) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await callMinimaxVLM(imageBuffer, prompt);
        resolve(result);
        return;
      } catch (e) {
        if (i === retries) {
          reject(e);
        } else {
          console.log(`[vision] MiniMax 重试 ${i+1}/${retries}...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
  });
}

// ========== 火山引擎 OCR/VLM (fallback) ==========
const arkApiKey = secrets.volcengine_api_key;
const arkEndpoint = secrets.volcengine_endpoint || 'ark.volcengineapi.com';

function callArkVLM(imageBuffer, prompt) {
  return new Promise((resolve, reject) => {
    const imageBase64 = imageBuffer.toString('base64');
    const body = {
      model: 'doubao-vision-pro-32k',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
        ]
      }]
    };
    const bodyStr = JSON.stringify(body);

    const options = {
      hostname: arkEndpoint,
      path: '/api/v3/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${arkApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].message) {
            const content = parsed.choices[0].message.content;
            // 尝试提取 JSON
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[1]));
            } else {
              resolve(content);
            }
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          } else {
            reject(new Error('Unknown Ark response: ' + JSON.stringify(parsed).slice(0, 200)));
          }
        } catch (e) {
          reject(new Error('Failed to parse Ark response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Ark timeout after 30s')));
    req.write(bodyStr);
    req.end();
  });
}

// ========== 自动 fallback 主入口 ==========

/**
 * 从截图提取交易数据
 * 优先 MiniMax，失败自动 fallback 火山引擎
 * @param {Buffer} screenshot - 页面截图
 * @param {string} prompt - 可选，自定义 prompt
 * @returns {Promise<Object>} 解析后的数据
 */
async function extractSalesDataFromImage(screenshot, prompt) {
  const defaultPrompt = `这是一张拼多多商家后台"交易概况"页面的截图。请把你看到的每一个数据项都提取出来，包括：所有数字指标及其对应的名称/标签。输出JSON，不要遗漏任何数据。`;
  
  // 先尝试 MiniMax
  try {
    console.log('[vision] Trying MiniMax VLM...');
    const result = await callMinimaxVLM(screenshot, prompt || defaultPrompt);
    console.log('[vision] MiniMax succeeded');
    return result;
  } catch (miniErr) {
    console.log(`[vision] MiniMax failed: ${miniErr.message}, falling back to Ark...`);
    // MiniMax 失败，fallback 到火山
    try {
      const result = await callArkVLM(screenshot, prompt || defaultPrompt);
      console.log('[vision] Ark fallback succeeded');
      return result;
    } catch (arkErr) {
      console.log(`[vision] Ark fallback also failed: ${arkErr.message}`);
      throw new Error(`Both MiniMax and Ark failed. MiniMax: ${miniErr.message}, Ark: ${arkErr.message}`);
    }
  }
}

/**
 * 从截图提取客服数据
 * @param {Buffer} screenshot - 页面截图
 * @returns {Promise<Object>} 解析后的数据
 */
async function extractCustomerServiceDataFromImage(screenshot) {
  const prompt = `这是一张拼多多客服绩效数据页面截图。请提取所有客服数据，包括客服名称、回复率、平均回复时间、接单数等指标。请以JSON格式输出。`;
  
  try {
    console.log('[vision] Trying MiniMax VLM for customer service data...');
    const result = await callMinimaxVLM(screenshot, prompt);
    console.log('[vision] MiniMax succeeded');
    return result;
  } catch (miniErr) {
    console.log(`[vision] MiniMax failed: ${miniErr.message}, falling back to Ark...`);
    try {
      const result = await callArkVLM(screenshot, prompt);
      console.log('[vision] Ark fallback succeeded');
      return result;
    } catch (arkErr) {
      console.log(`[vision] Ark fallback also failed: ${arkErr.message}`);
      throw new Error(`Both MiniMax and Ark failed. MiniMax: ${miniErr.message}, Ark: ${arkErr.message}`);
    }
  }
}

module.exports = {
  callMinimaxVLM,
  callArkVLM,
  extractSalesDataFromImage,
  extractCustomerServiceDataFromImage
};
