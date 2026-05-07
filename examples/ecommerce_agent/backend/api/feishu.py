"""
飞书集成 API
配置管理、消息发送、Webhook 事件接收
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import asyncio

from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import AppConfig
from backend.utils.feishu_client import (
    FeishuIntegration,
    FeishuClient,
    FeishuWebhookHandler,
    FeishuMessageTemplates
)
from backend.utils.realtime_manager import realtime_manager

router = APIRouter(prefix="/api/feishu", tags=["飞书集成"])


class FeishuConfigRequest(BaseModel):
    app_id: str
    app_secret: str
    verification_token: Optional[str] = ""
    webhook_url: Optional[str] = ""


class SendMessageRequest(BaseModel):
    receive_id_type: str = "open_id"
    receive_id: str
    message_type: str = "text"
    content: str


class SendCardRequest(BaseModel):
    receive_id_type: str = "open_id"
    receive_id: str
    card_type: str = "task_alert"
    data: Dict[str, Any] = {}


class FeishuConfigResponse(BaseModel):
    configured: bool
    app_id: Optional[str] = None
    webhook_url: Optional[str] = None


@router.get("/config", response_model=FeishuConfigResponse)
async def get_config(db: Session = Depends(get_db)):
    """获取飞书配置状态"""
    config = db.query(AppConfig).filter(
        AppConfig.key == "feishu_config"
    ).first()

    if config and config.value:
        try:
            data = json.loads(config.value)
            return FeishuConfigResponse(
                configured=True,
                app_id=data.get("app_id"),
                webhook_url=data.get("webhook_url", "")
            )
        except:
            pass

    return FeishuConfigResponse(configured=False)


@router.post("/config")
async def save_config(
    config: FeishuConfigRequest,
    db: Session = Depends(get_db)
):
    """保存飞书配置"""
    integration = FeishuIntegration(db)

    success = integration.save_config(
        app_id=config.app_id,
        app_secret=config.app_secret,
        verification_token=config.verification_token or ""
    )

    if success:
        config_data = db.query(AppConfig).filter(
            AppConfig.key == "feishu_config"
        ).first()

        if config_data and config.webhook_url:
            data = json.loads(config_data.value)
            data["webhook_url"] = config.webhook_url
            config_data.value = json.dumps(data)
            db.commit()

        return {"success": True, "message": "配置已保存"}

    return {"success": False, "message": "配置保存失败"}


@router.delete("/config")
async def delete_config(db: Session = Depends(get_db)):
    """删除飞书配置"""
    config = db.query(AppConfig).filter(
        AppConfig.key == "feishu_config"
    ).first()

    if config:
        db.delete(config)
        db.commit()
        return {"success": True, "message": "配置已删除"}

    return {"success": True, "message": "无配置可删除"}


@router.post("/test")
async def test_connection(db: Session = Depends(get_db)):
    """测试飞书连接"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        token = await client.get_tenant_access_token()
        return {
            "success": True,
            "message": "连接成功",
            "token_prefix": token[:10] + "..."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"连接失败: {str(e)}")


@router.get("/chats")
async def get_chat_list(db: Session = Depends(get_db)):
    """获取群列表"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        chats = await client.get_chat_list()
        return {
            "success": True,
            "chats": chats.get("items", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取群列表失败: {str(e)}")


@router.get("/chats/{chat_id}")
async def get_chat_info(chat_id: str, db: Session = Depends(get_db)):
    """获取群信息"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        chat = await client.get_chat_info(chat_id)
        return {
            "success": True,
            "chat": chat
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取群信息失败: {str(e)}")


@router.post("/messages/send")
async def send_message(
    request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """发送消息"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        if request.message_type == "text":
            result = await client.send_text_message(
                receive_id_type=request.receive_id_type,
                receive_id=request.receive_id,
                content=request.content
            )
        else:
            result = await client.send_text_message(
                receive_id_type=request.receive_id_type,
                receive_id=request.receive_id,
                content=request.content
            )

        return {
            "success": True,
            "message": "消息已发送",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"发送失败: {str(e)}")


@router.post("/messages/send-card")
async def send_card_message(
    request: SendCardRequest,
    db: Session = Depends(get_db)
):
    """发送卡片消息"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        if request.card_type == "task_alert":
            card = FeishuMessageTemplates.task_alert_card(
                task_name=request.data.get("task_name", ""),
                status=request.data.get("status", "info"),
                message=request.data.get("message", "")
            )
        elif request.card_type == "daily_report":
            card = FeishuMessageTemplates.daily_report_card(
                title=request.data.get("title", ""),
                stats=request.data.get("stats", {}),
                store_name=request.data.get("store_name", "")
            )
        elif request.card_type == "product_published":
            card = FeishuMessageTemplates.product_published_card(
                product_title=request.data.get("product_title", ""),
                platform=request.data.get("platform", ""),
                product_url=request.data.get("product_url", "")
            )
        elif request.card_type == "resource_alert":
            card = FeishuMessageTemplates.resource_alert_card(
                resource_type=request.data.get("resource_type", ""),
                usage=request.data.get("usage", 0),
                threshold=request.data.get("threshold", 80)
            )
        else:
            card = request.data.get("custom_card", {})

        result = await client.send_interactive_card(
            receive_id_type=request.receive_id_type,
            receive_id=request.receive_id,
            card_content=card
        )

        return {
            "success": True,
            "message": "卡片消息已发送",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"发送失败: {str(e)}")


@router.post("/messages/reply/{message_id}")
async def reply_message(
    message_id: str,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """回复消息"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        result = await client.reply_message(message_id, content)
        return {
            "success": True,
            "message": "回复已发送",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"回复失败: {str(e)}")


@router.post("/webhook")
async def receive_webhook(
    body: Dict[str, Any],
    x_lark_verification_token: Optional[str] = Header(None),
    x_lark_request_timestamp: Optional[str] = Header(None),
    x_lark_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    接收飞书 Webhook 事件

    事件类型:
    - im.message.receive_v1: 接收消息
    - im.message.read_v1: 消息已读
    """
    integration = FeishuIntegration(db)
    handler = integration.get_webhook_handler()

    headers = {
        "X-Lark-Verification-Token": x_lark_verification_token,
        "X-Lark-Request-Timestamp": x_lark_request_timestamp,
        "X-Lark-Signature": x_lark_signature
    }

    if body.get("type") == "url_verification":
        challenge = body.get("challenge", "")
        return {"challenge": challenge}

    if body.get("event", {}).get("type") == "im.message.receive_v1":
        message_data = handler.handle_message_event(body)

        if message_data:
            await realtime_manager.emit_agent_message(
                session_id=message_data.get("chat_id", ""),
                message=message_data.get("content", ""),
                is_user=True
            )

            return {
                "success": True,
                "message": "消息已接收",
                "data": message_data
            }

    return {"success": True, "message": "事件已处理"}


@router.get("/templates")
async def get_message_templates():
    """获取可用消息模板"""
    return {
        "templates": [
            {
                "type": "task_alert",
                "name": "任务告警",
                "description": "任务执行状态变更通知",
                "fields": ["task_name", "status", "message"]
            },
            {
                "type": "daily_report",
                "name": "每日报告",
                "description": "店铺每日运营数据报告",
                "fields": ["title", "stats", "store_name"]
            },
            {
                "type": "product_published",
                "name": "商品发布",
                "description": "商品发布成功通知",
                "fields": ["product_title", "platform", "product_url"]
            },
            {
                "type": "resource_alert",
                "name": "资源告警",
                "description": "系统资源使用率告警",
                "fields": ["resource_type", "usage", "threshold"]
            }
        ]
    }


@router.post("/alerts/task")
async def send_task_alert(
    receive_id_type: str = "open_id",
    receive_id: str = "ou_xxx",
    task_name: str = "测试任务",
    status: str = "success",
    message: str = "任务执行完成",
    db: Session = Depends(get_db)
):
    """发送任务告警（快捷接口）"""
    integration = FeishuIntegration(db)

    try:
        await integration.send_task_alert(
            receive_id_type=receive_id_type,
            receive_id=receive_id,
            task_name=task_name,
            status=status,
            message=message
        )
        return {"success": True, "message": "告警已发送"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/alerts/resource")
async def send_resource_alert(
    receive_id_type: str = "open_id",
    receive_id: str = "ou_xxx",
    resource_type: str = "CPU",
    usage: float = 85.0,
    threshold: float = 80.0,
    db: Session = Depends(get_db)
):
    """发送资源告警（快捷接口）"""
    integration = FeishuIntegration(db)
    client = integration.get_client()

    if not client:
        raise HTTPException(status_code=400, detail="飞书未配置")

    try:
        card = FeishuMessageTemplates.resource_alert_card(
            resource_type=resource_type,
            usage=usage,
            threshold=threshold
        )
        await client.send_interactive_card(receive_id_type, receive_id, card)
        return {"success": True, "message": "告警已发送"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
