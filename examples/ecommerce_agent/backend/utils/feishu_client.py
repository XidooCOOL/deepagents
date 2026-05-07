"""
飞书 SDK 集成模块
支持发送消息、接收事件、群聊管理
"""
import json
import hashlib
import hmac
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import httpx
import asyncio

from sqlalchemy.orm import Session


class FeishuClient:
    """飞书 SDK 客户端"""

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        db: Session = None
    ):
        self.app_id = app_id
        self.app_secret = app_secret
        self.db = db
        self._tenant_access_token = None
        self._token_expires_at = 0
        self.api_base_url = "https://open.feishu.cn/open-apis"

    async def get_tenant_access_token(self) -> str:
        """获取 tenant_access_token"""
        if self._tenant_access_token and time.time() < self._token_expires_at - 60:
            return self._tenant_access_token

        url = f"{self.api_base_url}/auth/v3/tenant_access_token/internal"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret
                }
            )
            data = response.json()

            if data.get("code") != 0:
                raise Exception(f"获取 token 失败: {data.get('msg')}")

            self._tenant_access_token = data["tenant_access_token"]
            self._token_expires_at = time.time() + data.get("expire", 7200)
            return self._tenant_access_token

    async def _request(
        self,
        method: str,
        path: str,
        data: Dict = None,
        params: Dict = None
    ) -> Dict[str, Any]:
        """发送 API 请求"""
        token = await self.get_tenant_access_token()
        url = f"{self.api_base_url}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers, params=params)
            else:
                response = await client.request(method, url, headers=headers, json=data)

            result = response.json()

            if result.get("code") != 0:
                raise Exception(f"API 请求失败: {result.get('msg')}")

            return result.get("data", {})

    async def send_text_message(
        self,
        receive_id_type: str,
        receive_id: str,
        content: str,
        msg_type: str = "text"
    ) -> Dict[str, Any]:
        """
        发送文本消息

        Args:
            receive_id_type: 接收者类型 - open_id/user_id/union_id/email/chat_id
            receive_id: 接收者 ID
            content: 消息内容
            msg_type: 消息类型
        """
        return await self._request(
            "POST",
            "/im/v1/messages",
            data={
                "receive_id": receive_id,
                "msg_type": msg_type,
                "content": json.dumps({"text": content})
            },
            params={"receive_id_type": receive_id_type}
        )

    async def send_post_message(
        self,
        receive_id_type: str,
        receive_id: str,
        title: str,
        content: List[List[Dict]]
    ) -> Dict[str, Any]:
        """
        发送富文本消息 (post)

        Args:
            receive_id_type: 接收者类型
            receive_id: 接收者 ID
            title: 标题
            content: 富文本内容 [[{tag, text, ...}, ...], ...]
        """
        post_content = {
            "zh_cn": {
                "title": title,
                "content": content
            }
        }
        return await self._request(
            "POST",
            "/im/v1/messages",
            data={
                "receive_id": receive_id,
                "msg_type": "post",
                "content": json.dumps(post_content)
            },
            params={"receive_id_type": receive_id_type}
        )

    async def send_interactive_card(
        self,
        receive_id_type: str,
        receive_id: str,
        card_content: Dict
    ) -> Dict[str, Any]:
        """
        发送卡片消息

        Args:
            receive_id_type: 接收者类型
            receive_id: 接收者 ID
            card_content: 卡片 JSON 内容
        """
        return await self._request(
            "POST",
            "/im/v1/messages",
            data={
                "receive_id": receive_id,
                "msg_type": "interactive",
                "content": json.dumps(card_content)
            },
            params={"receive_id_type": receive_id_type}
        )

    async def reply_message(
        self,
        message_id: str,
        content: str,
        msg_type: str = "text"
    ) -> Dict[str, Any]:
        """回复消息"""
        return await self._request(
            "POST",
            f"/im/v1/messages/{message_id}/reply",
            data={
                "msg_type": msg_type,
                "content": json.dumps({"text": content})
            }
        )

    async def get_chat_list(
        self,
        user_id_type: str = "open_id"
    ) -> List[Dict[str, Any]]:
        """获取群列表"""
        return await self._request(
            "GET",
            "/im/v1/chats",
            params={"user_id_type": user_id_type}
        )

    async def get_chat_info(self, chat_id: str) -> Dict[str, Any]:
        """获取群信息"""
        return await self._request("GET", f"/im/v1/chats/{chat_id}")

    async def create_chat(
        self,
        name: str,
        description: str = "",
        user_id_list: List[str] = None,
        chat_mode: str = "group",
        chat_type: str = "private"
    ) -> Dict[str, Any]:
        """创建群聊"""
        data = {
            "name": name,
            "description": description,
            "chat_mode": chat_mode,
            "chat_type": chat_type
        }
        if user_id_list:
            data["user_id_list"] = user_id_list
        return await self._request("POST", "/im/v1/chats", data=data)

    async def add_chat_members(
        self,
        chat_id: str,
        id_list: List[str],
        member_id_type: str = "open_id"
    ) -> Dict[str, Any]:
        """添加群成员"""
        return await self._request(
            "POST",
            f"/im/v1/chats/{chat_id}/members",
            data={
                "id_list": id_list,
                "member_id_type": member_id_type
            }
        )

    async def upload_image(self, image_path: str) -> str:
        """上传图片，返回 image_key"""
        import mimetypes

        with open(image_path, "rb") as f:
            image_data = f.read()

        token = await self.get_tenant_access_token()
        url = f"{self.api_base_url}/im/v1/images"
        headers = {
            "Authorization": f"Bearer {token}"
        }

        mime_type = mimetypes.guess_type(image_path)[0] or "image/png"
        files = {
            "image_type": (None, "message"),
            "image": (image_path.split("/")[-1], image_data, mime_type)
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, files=files)
            result = response.json()

            if result.get("code") != 0:
                raise Exception(f"上传图片失败: {result.get('msg')}")

            return result["data"]["image_key"]

    async def get_user_info(self, user_id: str, user_id_type: str = "open_id") -> Dict[str, Any]:
        """获取用户信息"""
        return await self._request(
            "GET",
            f"/contact/v3/users/{user_id}",
            params={"user_id_type": user_id_type}
        )


class FeishuWebhookHandler:
    """飞书 Webhook 事件处理器"""

    def __init__(self, app_id: str, app_secret: str, verification_token: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.verification_token = verification_token

    def verify_request(self, body: Dict, headers: Dict) -> bool:
        """验证请求合法性"""
        if "X-Lark-Verification-Token" in headers:
            return headers["X-Lark-Verification-Token"] == self.verification_token
        return True

    def verify_signature(self, body_str: str, timestamp: str, signature: str) -> bool:
        """验证签名"""
        if not self.app_secret:
            return True

        message = f"{timestamp}{self.app_secret}"
        encrypt = hashlib.sha256(message.encode()).hexdigest()
        return encrypt == signature

    def parse_event(self, body: Dict) -> Dict[str, Any]:
        """解析事件"""
        schema = body.get("schema", body)
        event_type = schema.get("event", {}).get("type", "")

        return {
            "event_type": event_type,
            "event": schema.get("event", {}),
            "tenant_key": schema.get("tenant_key", ""),
            "app_id": schema.get("app_id", ""),
            "timestamp": schema.get("timestamp", ""),
            "data": schema.get("event", {}).get("data", {})
        }

    def handle_message_event(self, event: Dict) -> Optional[Dict[str, Any]]:
        """处理消息事件"""
        sender = event.get("event", {}).get("sender", {})
        message = event.get("event", {}).get("message", {})

        return {
            "message_id": message.get("message_id"),
            "chat_id": message.get("chat_id"),
            "sender": {
                "sender_id": sender.get("sender_id", {}),
                "sender_type": sender.get("sender_type"),
                "tenant_key": sender.get("tenant_key")
            },
            "content": message.get("content"),
            "msg_type": message.get("msg_type"),
            "create_time": message.get("create_time")
        }


class FeishuMessageTemplates:
    """飞书消息模板"""

    @staticmethod
    def task_alert_card(
        task_name: str,
        status: str,
        message: str,
        action_url: str = "",
        action_text: str = "查看详情"
    ) -> Dict:
        """任务告警卡片"""
        status_colors = {
            "failed": {"bg_color": "#FFF1F0", "text_color": "#F5222D"},
            "success": {"bg_color": "#F6FFED", "text_color": "#52C41A"},
            "running": {"bg_color": "#E6F7FF", "text_color": "#1890FF"},
            "warning": {"bg_color": "#FFFBE6", "text_color": "#FAAD14"}
        }
        color = status_colors.get(status, status_colors["running"])

        elements = [
            {
                "tag": "markdown",
                "content": f"**任务状态: {status.upper()}**"
            },
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**任务名称**: {task_name}"
                }
            },
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**消息**: {message}"
                }
            }
        ]

        if action_url:
            elements.append({
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": action_text},
                        "type": "primary",
                        "url": action_url
                    }
                ]
            })

        return {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": f"⚠️ 任务告警"},
                "template": "red" if status == "failed" else "blue"
            },
            "elements": elements
        }

    @staticmethod
    def daily_report_card(
        title: str,
        stats: Dict[str, Any],
        store_name: str
    ) -> Dict:
        """每日运营报告卡片"""
        stat_items = ""
        for key, value in stats.items():
            stat_items += f"- **{key}**: {value}\n"

        return {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": f"📊 {title}"},
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "markdown",
                    "content": f"**店铺**: {store_name}\n**日期**: {datetime.now().strftime('%Y-%m-%d')}"
                },
                {"tag": "hr"},
                {
                    "tag": "markdown",
                    "content": stat_items
                },
                {
                    "tag": "note",
                    "elements": [
                        {"tag": "plain_text", "content": "由电商Agent系统自动生成"}
                    ]
                }
            ]
        }

    @staticmethod
    def product_published_card(
        product_title: str,
        platform: str,
        product_url: str,
        status: str = "success"
    ) -> Dict:
        """商品发布成功卡片"""
        return {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": "🎉 商品发布成功"},
                "template": "green"
            },
            "elements": [
                {
                    "tag": "markdown",
                    "content": f"**商品标题**: {product_title}"
                },
                {
                    "tag": "markdown",
                    "content": f"**发布平台**: {platform}"
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {"tag": "plain_text", "content": "查看商品"},
                            "type": "primary",
                            "url": product_url
                        }
                    ]
                }
            ]
        }

    @staticmethod
    def resource_alert_card(
        resource_type: str,
        usage: float,
        threshold: float,
        server_name: str = "电商Agent"
    ) -> Dict:
        """系统资源告警卡片"""
        is_critical = usage >= threshold

        return {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": "🚨 系统资源告警"},
                "template": "red" if is_critical else "orange"
            },
            "elements": [
                {
                    "tag": "markdown",
                    "content": f"**服务器**: {server_name}\n**资源类型**: {resource_type}\n**当前使用率**: {usage:.1f}%\n**告警阈值**: {threshold:.1f}%"
                },
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": "⚠️ 建议立即检查系统状态"
                    }
                }
            ]
        }


class FeishuIntegration:
    """飞书集成管理器"""

    def __init__(self, db: Session = None):
        self.db = db
        self._client: Optional[FeishuClient] = None
        self._config: Optional[Dict] = None

    def load_config(self) -> bool:
        """从数据库加载配置"""
        if not self.db:
            return False

        from backend.database.models import AppConfig

        config = self.db.query(AppConfig).filter(
            AppConfig.key == "feishu_config"
        ).first()

        if config and config.value:
            try:
                self._config = json.loads(config.value)
                return True
            except:
                pass
        return False

    def save_config(
        self,
        app_id: str,
        app_secret: str,
        verification_token: str = ""
    ) -> bool:
        """保存配置到数据库"""
        if not self.db:
            return False

        from backend.database.models import AppConfig

        config_data = {
            "app_id": app_id,
            "app_secret": app_secret,
            "verification_token": verification_token
        }

        config = self.db.query(AppConfig).filter(
            AppConfig.key == "feishu_config"
        ).first()

        if config:
            config.value = json.dumps(config_data)
        else:
            config = AppConfig(
                key="feishu_config",
                value=json.dumps(config_data),
                description="飞书应用配置"
            )
            self.db.add(config)

        self.db.commit()
        self._config = config_data
        return True

    def get_client(self) -> Optional[FeishuClient]:
        """获取飞书客户端"""
        if not self.load_config():
            return None

        if not self._client:
            self._client = FeishuClient(
                app_id=self._config["app_id"],
                app_secret=self._config["app_secret"],
                db=self.db
            )
        return self._client

    async def send_task_alert(
        self,
        receive_id_type: str,
        receive_id: str,
        task_name: str,
        status: str,
        message: str
    ):
        """发送任务告警"""
        client = self.get_client()
        if not client:
            raise Exception("飞书未配置")

        card = FeishuMessageTemplates.task_alert_card(task_name, status, message)
        return await client.send_interactive_card(receive_id_type, receive_id, card)

    async def send_daily_report(
        self,
        receive_id_type: str,
        receive_id: str,
        title: str,
        stats: Dict,
        store_name: str
    ):
        """发送每日报告"""
        client = self.get_client()
        if not client:
            raise Exception("飞书未配置")

        card = FeishuMessageTemplates.daily_report_card(title, stats, store_name)
        return await client.send_interactive_card(receive_id_type, receive_id, card)

    async def send_product_published(
        self,
        receive_id_type: str,
        receive_id: str,
        product_title: str,
        platform: str,
        product_url: str
    ):
        """发送商品发布通知"""
        client = self.get_client()
        if not client:
            raise Exception("飞书未配置")

        card = FeishuMessageTemplates.product_published_card(product_title, platform, product_url)
        return await client.send_interactive_card(receive_id_type, receive_id, card)

    def get_webhook_handler(self) -> Optional[FeishuWebhookHandler]:
        """获取 Webhook 处理器"""
        if not self.load_config():
            return None

        return FeishuWebhookHandler(
            app_id=self._config.get("app_id", ""),
            app_secret=self._config.get("app_secret", ""),
            verification_token=self._config.get("verification_token", "")
        )


_feishu_integration: Optional[FeishuIntegration] = None


def get_feishu_integration(db: Session) -> FeishuIntegration:
    """获取飞书集成实例"""
    global _feishu_integration
    if _feishu_integration is None:
        _feishu_integration = FeishuIntegration(db)
    return _feishu_integration
