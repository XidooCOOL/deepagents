"""
Webhook 管理 API
统一管理多平台 Webhook 配置、消息模板
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

from sqlalchemy.orm import Session
from backend.database.models import get_db
from backend.utils.webhook_manager import (
    get_webhook_manager,
    get_template_manager,
    WebhookPlatform,
    WebhookEvent
)

router = APIRouter(prefix="/api/webhooks", tags=["Webhook管理"])


class WebhookCreate(BaseModel):
    name: str
    platform: str = "custom"
    url: str
    secret: str = ""
    events: List[str] = []
    headers: Dict[str, str] = {}
    retry_times: int = 3
    timeout: int = 10


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    url: Optional[str] = None
    secret: Optional[str] = None
    events: Optional[List[str]] = None
    headers: Optional[Dict[str, str]] = None
    retry_times: Optional[int] = None
    timeout: Optional[int] = None
    is_active: Optional[bool] = None


class TemplateCreate(BaseModel):
    name: str
    template_type: str
    platform: str = "feishu"
    title: str = ""
    content: str = ""
    card_config: Dict = {}
    variables: List[Dict] = []
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    card_config: Optional[Dict] = None
    variables: Optional[List[Dict]] = None
    is_default: Optional[bool] = None


class SendAlertRequest(BaseModel):
    event_type: str
    data: Dict[str, Any] = {}


@router.get("")
async def list_webhooks(db: Session = Depends(get_db)):
    """获取所有 Webhook 配置"""
    manager = get_webhook_manager(db)
    webhooks = manager.get_all_webhooks()
    return {
        "webhooks": [w.to_dict() for w in webhooks],
        "total": len(webhooks)
    }


@router.get("/platforms")
async def get_platforms():
    """获取支持的平台列表"""
    return {
        "platforms": [
            {"value": "feishu", "label": "飞书", "color": "#2862D4"},
            {"value": "dingtalk", "label": "钉钉", "color": "#1677FF"},
            {"value": "wecom", "label": "企业微信", "color": "#07C160"},
            {"value": "custom", "label": "自定义", "color": "#909399"}
        ]
    }


@router.get("/events")
async def get_event_types():
    """获取事件类型列表"""
    return {
        "events": [
            {"value": "task:created", "label": "任务创建", "category": "任务"},
            {"value": "task:started", "label": "任务开始", "category": "任务"},
            {"value": "task:progress", "label": "任务进度", "category": "任务"},
            {"value": "task:completed", "label": "任务完成", "category": "任务"},
            {"value": "task:failed", "label": "任务失败", "category": "任务"},
            {"value": "store:login", "label": "店铺登录", "category": "店铺"},
            {"value": "store:logout", "label": "店铺登出", "category": "店铺"},
            {"value": "store:error", "label": "店铺错误", "category": "店铺"},
            {"value": "system:warning", "label": "系统警告", "category": "系统"},
            {"value": "system:error", "label": "系统错误", "category": "系统"},
            {"value": "resource:high", "label": "资源过高", "category": "系统"},
            {"value": "product:published", "label": "商品发布", "category": "业务"},
            {"value": "daily:report", "label": "每日报告", "category": "业务"}
        ],
        "categories": ["任务", "店铺", "系统", "业务"]
    }


@router.post("")
async def create_webhook(data: WebhookCreate, db: Session = Depends(get_db)):
    """创建 Webhook 配置"""
    manager = get_webhook_manager(db)

    webhook = manager.create_webhook(
        name=data.name,
        platform=data.platform,
        url=data.url,
        events=data.events,
        secret=data.secret,
        headers=data.headers,
        retry_times=data.retry_times,
        timeout=data.timeout
    )

    if webhook:
        return {"success": True, "webhook": webhook.to_dict()}

    raise HTTPException(status_code=400, detail="创建失败")


@router.get("/{webhook_id}")
async def get_webhook(webhook_id: int, db: Session = Depends(get_db)):
    """获取单个 Webhook"""
    manager = get_webhook_manager(db)
    webhook = manager.get_webhook(webhook_id)

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook 不存在")

    return webhook.to_dict()


@router.put("/{webhook_id}")
async def update_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    db: Session = Depends(get_db)
):
    """更新 Webhook 配置"""
    manager = get_webhook_manager(db)
    webhook = manager.get_webhook(webhook_id)

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook 不存在")

    if data.name is not None:
        webhook.name = data.name
    if data.platform is not None:
        webhook.platform = data.platform
    if data.url is not None:
        webhook.url = data.url
    if data.secret is not None:
        webhook.secret = data.secret
    if data.events is not None:
        webhook.events = data.events
    if data.headers is not None:
        webhook.headers = data.headers
    if data.retry_times is not None:
        webhook.retry_times = data.retry_times
    if data.timeout is not None:
        webhook.timeout = data.timeout
    if data.is_active is not None:
        webhook.is_active = data.is_active

    if manager.update_webhook(webhook):
        return {"success": True, "webhook": webhook.to_dict()}

    raise HTTPException(status_code=400, detail="更新失败")


@router.delete("/{webhook_id}")
async def delete_webhook(webhook_id: int, db: Session = Depends(get_db)):
    """删除 Webhook"""
    manager = get_webhook_manager(db)

    if manager.delete_webhook(webhook_id):
        return {"success": True, "message": "已删除"}

    raise HTTPException(status_code=404, detail="Webhook 不存在")


@router.post("/{webhook_id}/toggle")
async def toggle_webhook(webhook_id: int, db: Session = Depends(get_db)):
    """切换启用状态"""
    manager = get_webhook_manager(db)
    webhook = manager.get_webhook(webhook_id)

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook 不存在")

    manager.set_active(webhook_id, not webhook.is_active)
    webhook = manager.get_webhook(webhook_id)

    return {"success": True, "is_active": webhook.is_active}


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: int, db: Session = Depends(get_db)):
    """测试 Webhook"""
    manager = get_webhook_manager(db)
    result = manager.test_webhook(webhook_id)

    if "error" in result and result["error"] == "Webhook not found":
        raise HTTPException(status_code=404, detail="Webhook 不存在")

    return result


@router.post("/send")
async def send_alert(request: SendAlertRequest, db: Session = Depends(get_db)):
    """发送告警到所有订阅该事件的 Webhook"""
    manager = get_webhook_manager(db)
    result = await manager.send_alert(request.event_type, request.data)

    if result["status"] == "no_targets":
        return {"success": True, "message": "没有订阅该事件的 Webhook", "sent": 0}

    return {
        "success": True,
        "sent": result["total"],
        "success_count": result["success_count"],
        "results": result["results"]
    }


@router.get("/history")
async def get_send_history(
    event_type: Optional[str] = None,
    webhook_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取发送历史（简化版，从日志表获取）"""
    from backend.database.models import OperationLog

    query = db.query(OperationLog).filter(
        OperationLog.operation_type.like("webhook%")
    )

    if event_type:
        query = query.filter(OperationLog.message.like(f"%{event_type}%"))

    if webhook_id:
        query = query.filter(OperationLog.task_id == webhook_id)

    logs = query.order_by(OperationLog.created_at.desc()).limit(limit).all()

    return {
        "history": [
            {
                "id": log.id,
                "event_type": log.operation_type,
                "message": log.message,
                "status": log.status,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ],
        "total": len(logs)
    }


@router.get("/templates")
async def list_templates(
    platform: Optional[str] = None,
    template_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取消息模板列表"""
    manager = get_template_manager(db)

    templates = manager.get_all_templates()

    if platform:
        templates = [t for t in templates if t.platform == platform]
    if template_type:
        templates = [t for t in templates if t.template_type == template_type]

    return {
        "templates": [t.to_dict() for t in templates],
        "total": len(templates)
    }


@router.get("/templates/types")
async def get_template_types():
    """获取模板类型列表"""
    return {
        "types": [
            {"value": "task_alert", "label": "任务告警", "events": ["task:failed", "task:completed"]},
            {"value": "task_completed", "label": "任务完成", "events": ["task:completed"]},
            {"value": "daily_report", "label": "每日报告", "events": ["daily:report"]},
            {"value": "product_published", "label": "商品发布", "events": ["product:published"]},
            {"value": "resource_alert", "label": "资源告警", "events": ["resource:high", "resource:critical"]},
            {"value": "store_alert", "label": "店铺告警", "events": ["store:error"]}
        ]
    }


@router.post("/templates")
async def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    """创建消息模板"""
    manager = get_template_manager(db)

    template = manager.create_template(
        name=data.name,
        template_type=data.template_type,
        platform=data.platform,
        title=data.title,
        content=data.content,
        card_config=data.card_config,
        variables=data.variables,
        is_default=data.is_default
    )

    if template:
        return {"success": True, "template": template.to_dict()}

    raise HTTPException(status_code=400, detail="创建失败")


@router.get("/templates/{template_id}")
async def get_template(template_id: int, db: Session = Depends(get_db)):
    """获取单个模板"""
    manager = get_template_manager(db)
    template = manager.get_template(template_id)

    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    return template.to_dict()


@router.put("/templates/{template_id}")
async def update_template(
    template_id: int,
    data: TemplateUpdate,
    db: Session = Depends(get_db)
):
    """更新消息模板"""
    manager = get_template_manager(db)
    template = manager.get_template(template_id)

    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    if data.name is not None:
        template.name = data.name
    if data.title is not None:
        template.title = data.title
    if data.content is not None:
        template.content = data.content
    if data.card_config is not None:
        template.card_config = data.card_config
    if data.variables is not None:
        template.variables = data.variables
    if data.is_default is not None:
        template.is_default = data.is_default

    if manager.update_template(template):
        return {"success": True, "template": template.to_dict()}

    raise HTTPException(status_code=400, detail="更新失败")


@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    """删除消息模板"""
    manager = get_template_manager(db)

    if manager.delete_template(template_id):
        return {"success": True, "message": "已删除"}

    raise HTTPException(status_code=404, detail="模板不存在")


@router.post("/templates/{template_id}/preview")
async def preview_template(
    template_id: int,
    variables: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """预览模板渲染结果"""
    manager = get_template_manager(db)
    rendered = manager.render_template(template_id, variables)

    if not rendered:
        raise HTTPException(status_code=404, detail="模板不存在")

    return rendered


@router.post("/templates/init-defaults")
async def init_default_templates(db: Session = Depends(get_db)):
    """初始化默认模板"""
    manager = get_template_manager(db)
    manager.init_default_templates()

    templates = manager.get_all_templates()
    return {
        "success": True,
        "message": f"已初始化 {len(templates)} 个模板",
        "templates": [t.to_dict() for t in templates]
    }
