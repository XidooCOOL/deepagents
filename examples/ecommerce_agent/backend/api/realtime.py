"""
实时监控 WebSocket 路由
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional
import json

from backend.utils.realtime_manager import realtime_manager, websocket_endpoint, EventType

router = APIRouter(prefix="/api/realtime", tags=["实时监控"])


@router.websocket("/ws")
async def websocket_route(
    websocket: WebSocket,
    channels: str = Query(default="", description="订阅的频道，逗号分隔")
):
    """
    WebSocket 连接端点

    订阅频道:
    - global: 全局频道（所有事件）
    - task:created, task:started, task:progress, task:completed, task:failed
    - browser:opened, browser:closed, browser:error
    - store:login, store:logout, store:error
    - system:status, system:alert, system:resource
    - agent:message, agent:thinking
    """
    channel_list = [c.strip() for c in channels.split(",") if c.strip()] if channels else None
    await websocket_endpoint(websocket, channel_list)


@router.get("/status")
async def get_status():
    """获取实时系统状态"""
    return realtime_manager.get_stats()


@router.get("/resources")
async def get_resources():
    """获取系统资源使用情况"""
    from backend.utils.resource_monitor import ResourceMonitor
    monitor = ResourceMonitor()
    return monitor.get_current_usage()


@router.get("/events/history")
async def get_event_history(
    event_type: Optional[str] = None,
    limit: int = 50
):
    """获取历史事件"""
    return {
        "events": [],
        "total": 0,
        "message": "历史事件存储功能待实现"
    }


@router.post("/test/emit")
async def test_emit_event(
    event_type: str,
    data: dict = {}
):
    """测试发送事件（仅用于开发调试）"""
    from backend.utils.realtime_manager import Event

    event = Event(type=event_type, data=data)
    await realtime_manager.emit(event)

    return {"success": True, "event_type": event_type}


@router.post("/test/alert")
async def test_alert(
    level: str = "info",
    title: str = "测试告警",
    message: str = "这是一条测试告警"
):
    """测试发送告警"""
    await realtime_manager.emit_system_alert(level, title, message)

    return {"success": True, "message": "告警已发送"}
