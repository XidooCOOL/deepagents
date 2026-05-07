"""
Webhook 管理系统
支持多平台 Webhook 配置、消息模板、数据持久化
"""
import asyncio
import json
import hmac
import hashlib
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
import httpx

from sqlalchemy.orm import Session


class WebhookPlatform(str, Enum):
    """支持的平台"""
    FEISHU = "feishu"
    DINGTALK = "dingtalk"
    WECOM = "wecom"
    CUSTOM = "custom"


class WebhookEvent(str, Enum):
    """事件类型"""
    TASK_CREATED = "task:created"
    TASK_STARTED = "task:started"
    TASK_PROGRESS = "task:progress"
    TASK_COMPLETED = "task:completed"
    TASK_FAILED = "task:failed"
    TASK_PAUSED = "task:paused"
    STORE_LOGIN = "store:login"
    STORE_LOGOUT = "store:logout"
    STORE_ERROR = "store:error"
    SYSTEM_WARNING = "system:warning"
    SYSTEM_ERROR = "system:error"
    SYSTEM_HEALTH = "system:health"
    RESOURCE_HIGH = "resource:high"
    RESOURCE_CRITICAL = "resource:critical"
    PRODUCT_PUBLISHED = "product:published"
    GOOD_REVIEW_REPLIED = "good_review:replied"
    DATA_FETCHED = "data:fetched"
    DAILY_REPORT = "daily:report"


@dataclass
class WebhookConfig:
    """Webhook 配置"""
    id: int = 0
    name: str = ""
    platform: str = "custom"
    url: str = ""
    secret: str = ""
    events: List[str] = field(default_factory=list)
    headers: Dict[str, str] = field(default_factory=dict)
    retry_times: int = 3
    timeout: int = 10
    is_active: bool = True
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "platform": self.platform,
            "url": self.url,
            "secret": self.secret,
            "events": self.events,
            "headers": self.headers,
            "retry_times": self.retry_times,
            "timeout": self.timeout,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class MessageTemplate:
    """消息模板"""
    id: int = 0
    name: str = ""
    template_type: str = "task_alert"
    platform: str = "feishu"
    title: str = ""
    content: str = ""
    card_config: Dict = field(default_factory=dict)
    variables: List[Dict] = field(default_factory=list)
    is_default: bool = False
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "template_type": self.template_type,
            "platform": self.platform,
            "title": self.title,
            "content": self.content,
            "card_config": self.card_config,
            "variables": self.variables,
            "is_default": self.is_default,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class WebhookManager:
    """Webhook 管理器"""

    def __init__(self, db: Session):
        self.db = db
        self._cache: Dict[int, WebhookConfig] = {}
        self._load_from_db()

    def _load_from_db(self):
        """从数据库加载配置"""
        from backend.database.models import WebhookConfig as DBWebhookConfig

        configs = self.db.query(DBWebhookConfig).all()
        for cfg in configs:
            webhook = WebhookConfig(
                id=cfg.id,
                name=cfg.name,
                platform=cfg.platform,
                url=cfg.url,
                secret=cfg.secret or "",
                events=cfg.events or [],
                headers=cfg.headers or {},
                retry_times=cfg.retry_times or 3,
                timeout=cfg.timeout or 10,
                is_active=cfg.is_active,
                created_at=cfg.created_at.isoformat() if cfg.created_at else "",
                updated_at=cfg.updated_at.isoformat() if cfg.updated_at else ""
            )
            self._cache[cfg.id] = webhook

    def _save_to_db(self, webhook: WebhookConfig) -> bool:
        """保存到数据库"""
        from backend.database.models import WebhookConfig as DBWebhookConfig

        try:
            if webhook.id > 0:
                cfg = self.db.query(DBWebhookConfig).get(webhook.id)
                if cfg:
                    cfg.name = webhook.name
                    cfg.platform = webhook.platform
                    cfg.url = webhook.url
                    cfg.secret = webhook.secret
                    cfg.events = webhook.events
                    cfg.headers = webhook.headers
                    cfg.retry_times = webhook.retry_times
                    cfg.timeout = webhook.timeout
                    cfg.is_active = webhook.is_active
            else:
                cfg = DBWebhookConfig(
                    name=webhook.name,
                    platform=webhook.platform,
                    url=webhook.url,
                    secret=webhook.secret,
                    events=webhook.events,
                    headers=webhook.headers,
                    retry_times=webhook.retry_times,
                    timeout=webhook.timeout,
                    is_active=webhook.is_active
                )
                self.db.add(cfg)
                self.db.flush()
                webhook.id = cfg.id

            self.db.commit()
            self._cache[webhook.id] = webhook
            return True
        except Exception as e:
            self.db.rollback()
            print(f"保存 Webhook 配置失败: {e}")
            return False

    def create_webhook(
        self,
        name: str,
        platform: str,
        url: str,
        events: List[str],
        secret: str = "",
        headers: Dict = None,
        retry_times: int = 3,
        timeout: int = 10
    ) -> Optional[WebhookConfig]:
        """创建 Webhook"""
        webhook = WebhookConfig(
            name=name,
            platform=platform,
            url=url,
            secret=secret,
            events=events,
            headers=headers or {},
            retry_times=retry_times,
            timeout=timeout,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        if self._save_to_db(webhook):
            return webhook
        return None

    def update_webhook(self, webhook: WebhookConfig) -> bool:
        """更新 Webhook"""
        webhook.updated_at = datetime.now().isoformat()
        return self._save_to_db(webhook)

    def delete_webhook(self, webhook_id: int) -> bool:
        """删除 Webhook"""
        from backend.database.models import WebhookConfig as DBWebhookConfig

        try:
            cfg = self.db.query(DBWebhookConfig).get(webhook_id)
            if cfg:
                self.db.delete(cfg)
                self.db.commit()
                self._cache.pop(webhook_id, None)
                return True
        except Exception as e:
            self.db.rollback()
            print(f"删除 Webhook 配置失败: {e}")
        return False

    def get_webhook(self, webhook_id: int) -> Optional[WebhookConfig]:
        """获取单个 Webhook"""
        return self._cache.get(webhook_id)

    def get_all_webhooks(self) -> List[WebhookConfig]:
        """获取所有 Webhook"""
        return list(self._cache.values())

    def get_webhooks_by_platform(self, platform: str) -> List[WebhookConfig]:
        """按平台获取 Webhook"""
        return [w for w in self._cache.values() if w.platform == platform and w.is_active]

    def get_webhooks_for_event(self, event_type: str) -> List[WebhookConfig]:
        """获取订阅特定事件的 Webhook"""
        result = []
        for webhook in self._cache.values():
            if webhook.is_active and event_type in webhook.events:
                result.append(webhook)
        return result

    def set_active(self, webhook_id: int, active: bool) -> bool:
        """设置启用状态"""
        webhook = self._cache.get(webhook_id)
        if webhook:
            webhook.is_active = active
            return self.update_webhook(webhook)
        return False

    async def send_alert(
        self,
        event_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """发送告警到所有订阅该事件的 Webhook"""
        webhooks = self.get_webhooks_for_event(event_type)

        if not webhooks:
            return {"status": "no_targets", "message": "没有找到匹配的 Webhook"}

        results = []
        for webhook in webhooks:
            result = await self._send_webhook(webhook, event_type, data)
            results.append({
                "webhook_id": webhook.id,
                "webhook_name": webhook.name,
                "platform": webhook.platform,
                "result": result
            })

        return {
            "status": "sent",
            "total": len(webhooks),
            "success_count": sum(1 for r in results if r["result"].get("success")),
            "results": results
        }

    async def _send_webhook(
        self,
        webhook: WebhookConfig,
        event_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """发送单个 Webhook"""
        headers = webhook.headers.copy()
        headers["Content-Type"] = "application/json"

        if webhook.secret:
            timestamp = str(int(time.time()))
            message = f"{timestamp}{webhook.secret}"
            signature = hashlib.sha256(message.encode()).hexdigest()
            headers["X-Webhook-Signature"] = signature
            headers["X-Webhook-Timestamp"] = timestamp

        message = {
            "event": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }

        for attempt in range(webhook.retry_times):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        webhook.url,
                        json=message,
                        headers=headers,
                        timeout=webhook.timeout
                    )

                    if response.status_code < 400:
                        return {
                            "success": True,
                            "status_code": response.status_code,
                            "attempt": attempt + 1
                        }
                    else:
                        return {
                            "success": False,
                            "status_code": response.status_code,
                            "error": f"HTTP {response.status_code}",
                            "attempt": attempt + 1
                        }
            except Exception as e:
                if attempt == webhook.retry_times - 1:
                    return {
                        "success": False,
                        "error": str(e),
                        "attempt": attempt + 1
                    }

        return {"success": False, "error": "Max retries exceeded"}

    def test_webhook(self, webhook_id: int) -> Dict[str, Any]:
        """测试 Webhook（同步）"""
        import requests

        webhook = self._cache.get(webhook_id)
        if not webhook:
            return {"success": False, "error": "Webhook not found"}

        test_message = {
            "event": "test",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "message": "这是一条测试消息",
                "type": "webhook_test"
            }
        }

        headers = webhook.headers.copy()
        headers["Content-Type"] = "application/json"

        try:
            response = requests.post(
                webhook.url,
                json=test_message,
                headers=headers,
                timeout=webhook.timeout
            )

            if response.status_code < 400:
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "response": response.text[:200] if response.text else ""
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            return {"success": False, "error": str(e)}


class TemplateManager:
    """消息模板管理器"""

    def __init__(self, db: Session):
        self.db = db
        self._cache: Dict[int, MessageTemplate] = {}
        self._load_from_db()

    def _load_from_db(self):
        """从数据库加载模板"""
        from backend.database.models import MessageTemplate as DBTemplate

        templates = self.db.query(DBTemplate).all()
        for tmpl in templates:
            template = MessageTemplate(
                id=tmpl.id,
                name=tmpl.name,
                template_type=tmpl.template_type,
                platform=tmpl.platform,
                title=tmpl.title,
                content=tmpl.content,
                card_config=tmpl.card_config or {},
                variables=tmpl.variables or [],
                is_default=tmpl.is_default,
                created_at=tmpl.created_at.isoformat() if tmpl.created_at else "",
                updated_at=tmpl.updated_at.isoformat() if tmpl.updated_at else ""
            )
            self._cache[tmpl.id] = template

    def _save_to_db(self, template: MessageTemplate) -> bool:
        """保存到数据库"""
        from backend.database.models import MessageTemplate as DBTemplate

        try:
            if template.id > 0:
                tmpl = self.db.query(DBTemplate).get(template.id)
                if tmpl:
                    tmpl.name = template.name
                    tmpl.template_type = template.template_type
                    tmpl.platform = template.platform
                    tmpl.title = template.title
                    tmpl.content = template.content
                    tmpl.card_config = template.card_config
                    tmpl.variables = template.variables
                    tmpl.is_default = template.is_default
            else:
                tmpl = DBTemplate(
                    name=template.name,
                    template_type=template.template_type,
                    platform=template.platform,
                    title=template.title,
                    content=template.content,
                    card_config=template.card_config,
                    variables=template.variables,
                    is_default=template.is_default
                )
                self.db.add(tmpl)
                self.db.flush()
                template.id = tmpl.id

            self.db.commit()
            self._cache[template.id] = template
            return True
        except Exception as e:
            self.db.rollback()
            print(f"保存模板失败: {e}")
            return False

    def create_template(
        self,
        name: str,
        template_type: str,
        platform: str = "feishu",
        title: str = "",
        content: str = "",
        card_config: Dict = None,
        variables: List[Dict] = None,
        is_default: bool = False
    ) -> Optional[MessageTemplate]:
        """创建模板"""
        template = MessageTemplate(
            name=name,
            template_type=template_type,
            platform=platform,
            title=title,
            content=content,
            card_config=card_config or {},
            variables=variables or [],
            is_default=is_default,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        if self._save_to_db(template):
            return template
        return None

    def update_template(self, template: MessageTemplate) -> bool:
        """更新模板"""
        template.updated_at = datetime.now().isoformat()
        return self._save_to_db(template)

    def delete_template(self, template_id: int) -> bool:
        """删除模板"""
        from backend.database.models import MessageTemplate as DBTemplate

        try:
            tmpl = self.db.query(DBTemplate).get(template_id)
            if tmpl:
                self.db.delete(tmpl)
                self.db.commit()
                self._cache.pop(template_id, None)
                return True
        except Exception as e:
            self.db.rollback()
            print(f"删除模板失败: {e}")
        return False

    def get_template(self, template_id: int) -> Optional[MessageTemplate]:
        """获取单个模板"""
        return self._cache.get(template_id)

    def get_all_templates(self) -> List[MessageTemplate]:
        """获取所有模板"""
        return list(self._cache.values())

    def get_templates_by_type(self, template_type: str) -> List[MessageTemplate]:
        """按类型获取模板"""
        return [t for t in self._cache.values() if t.template_type == template_type]

    def get_templates_by_platform(self, platform: str) -> List[MessageTemplate]:
        """按平台获取模板"""
        return [t for t in self._cache.values() if t.platform == platform]

    def get_default_template(self, template_type: str, platform: str) -> Optional[MessageTemplate]:
        """获取默认模板"""
        for tmpl in self._cache.values():
            if tmpl.template_type == template_type and tmpl.platform == platform and tmpl.is_default:
                return tmpl
        return None

    def render_template(
        self,
        template_id: int,
        variables: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """渲染模板"""
        template = self._cache.get(template_id)
        if not template:
            return None

        content = template.content
        for key, value in variables.items():
            content = content.replace(f"{{{key}}}", str(value))

        return {
            "title": template.title,
            "content": content,
            "card_config": template.card_config
        }

    def init_default_templates(self):
        """初始化默认模板"""
        if self._cache:
            return

        defaults = [
            {
                "name": "任务失败告警",
                "template_type": "task_alert",
                "platform": "feishu",
                "title": "⚠️ 任务执行失败",
                "content": "任务「{task_name}」执行失败\n错误: {error}\n店铺: {store_name}",
                "variables": [
                    {"name": "task_name", "label": "任务名称", "type": "string"},
                    {"name": "error", "label": "错误信息", "type": "string"},
                    {"name": "store_name", "label": "店铺名称", "type": "string"}
                ],
                "is_default": True
            },
            {
                "name": "任务完成通知",
                "template_type": "task_completed",
                "platform": "feishu",
                "title": "✅ 任务执行成功",
                "content": "任务「{task_name}」已完成\n结果: {result}\n店铺: {store_name}",
                "variables": [
                    {"name": "task_name", "label": "任务名称", "type": "string"},
                    {"name": "result", "label": "执行结果", "type": "string"},
                    {"name": "store_name", "label": "店铺名称", "type": "string"}
                ]
            },
            {
                "name": "每日运营报告",
                "template_type": "daily_report",
                "platform": "feishu",
                "title": "📊 {store_name} 每日报告",
                "content": "日期: {date}\n销售额: {sales_amount}\n订单数: {orders_count}\n访客数: {visitors}",
                "variables": [
                    {"name": "store_name", "label": "店铺名称", "type": "string"},
                    {"name": "date", "label": "日期", "type": "string"},
                    {"name": "sales_amount", "label": "销售额", "type": "number"},
                    {"name": "orders_count", "label": "订单数", "type": "number"},
                    {"name": "visitors", "label": "访客数", "type": "number"}
                ]
            },
            {
                "name": "商品发布成功",
                "template_type": "product_published",
                "platform": "feishu",
                "title": "🎉 商品发布成功",
                "content": "商品「{product_title}」已成功发布到{platform}\n商品ID: {product_id}",
                "variables": [
                    {"name": "product_title", "label": "商品标题", "type": "string"},
                    {"name": "platform", "label": "平台", "type": "string"},
                    {"name": "product_id", "label": "商品ID", "type": "string"}
                ]
            },
            {
                "name": "系统资源告警",
                "template_type": "resource_alert",
                "platform": "feishu",
                "title": "🚨 系统资源告警",
                "content": "{resource_type} 使用率: {usage}%\n超过阈值: {threshold}%",
                "variables": [
                    {"name": "resource_type", "label": "资源类型", "type": "string"},
                    {"name": "usage", "label": "使用率", "type": "number"},
                    {"name": "threshold", "label": "阈值", "type": "number"}
                ]
            },
            {
                "name": "钉钉-任务告警",
                "template_type": "task_alert",
                "platform": "dingtalk",
                "title": "任务告警",
                "content": "任务「{task_name}」{status}\n{message}",
                "variables": [
                    {"name": "task_name", "label": "任务名称", "type": "string"},
                    {"name": "status", "label": "状态", "type": "string"},
                    {"name": "message", "label": "消息", "type": "string"}
                ]
            },
            {
                "name": "企微-任务告警",
                "template_type": "task_alert",
                "platform": "wecom",
                "title": "任务告警",
                "content": "任务「{task_name}」{status}\n{message}",
                "variables": [
                    {"name": "task_name", "label": "任务名称", "type": "string"},
                    {"name": "status", "label": "状态", "type": "string"},
                    {"name": "message", "label": "消息", "type": "string"}
                ]
            }
        ]

        for tmpl_data in defaults:
            existing = self.get_default_template(tmpl_data["template_type"], tmpl_data["platform"])
            if not existing:
                self.create_template(**tmpl_data)


_webhook_managers: Dict[int, WebhookManager] = {}
_template_managers: Dict[int, TemplateManager] = {}


def get_webhook_manager(db: Session) -> WebhookManager:
    """获取 Webhook 管理器实例"""
    db_id = id(db)
    if db_id not in _webhook_managers:
        _webhook_managers[db_id] = WebhookManager(db)
    return _webhook_managers[db_id]


def get_template_manager(db: Session) -> TemplateManager:
    """获取模板管理器实例"""
    db_id = id(db)
    if db_id not in _template_managers:
        _template_managers[db_id] = TemplateManager(db)
        _template_managers[db_id].init_default_templates()
    return _template_managers[db_id]
