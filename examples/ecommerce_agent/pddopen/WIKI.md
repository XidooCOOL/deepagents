# pdd-open 技术文档

> 拼多多商家后台自动化技术参考

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Playwright | 浏览器自动化控制 |
| Chrome CDP | 独立 Chrome 实例连接 |
| MiniMax VLM | 销售数据截图 OCR |
| xlsx | Excel 数据写入 |

---

## 核心模块

```
modules/
├── review/              # 评价管理
│   ├── reply.js        # 回复/举报逻辑
│   ├── filter.js       # 筛选（时间/星级）
│   └── navigate.js     # 页面导航
├── customer/           # 客服绩效提取
├── extract/           # 销售数据提取
└── tuike/             # 推广数据提取

utils/
├── excel.js           # 统一 Excel 操作
├── browser.js        # Chrome 启停
├── login.js          # 扫码登录
└── notify.js         # 飞书通知
```

---

## 评价星级判断

通过 SVG 属性 `data-testid="beast-core-icon-star_filled"` 判断：
- 5个星星 → 5星
- 4个星星 → 4星
- 3个星星 → 3星
- 2个星星 → 2星
- 1个星星 → 1星

---

## 举报模板

| 类型 | 模板 |
|------|------|
| 无图差评 | 同行恶意差评，无实物图、无质量问题凭证，与产品实际品质严重不符，故意拉低评分扰乱竞争 |
| 有图差评 | 同行恶意差评，图片疑似调色/盗用，请平台核实处理 |

---

## Chrome Profile

每个账号对应独立 Chrome Profile，路径：
```
accounts/profiles/pdd_<shopId>/
```

---

## 相关文档

- [SKILL.md](./SKILL.md) - 使用指南
- [BUGS.md](./BUGS.md) - 踩坑记录

---

*最后更新：2026-04-29*
