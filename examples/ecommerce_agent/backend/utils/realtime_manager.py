"""
实时状态监控系统
WebSocket 服务端 + 事件广播
"""
import asyncio
import json
import time
from typing import Dict, List, Set, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect
import threading

from backend.utils.resource_monitor import ResourceMonitor


class EventType(str, Enum):
    """事件类型"""
    TASK_CREATED = "task:created"
    TASK_STARTED = "task:started"
    TASK_PROGRESS = "task:progress"
    TASK_COMPLETED = "task:completed"
    TASK_FAILED = "task:failed"
    TASK_LOG = "task:log"

    BROWSER_OPENED = "browser:opened"
    BROWSER_CLOSED = "browser:closed"
    BROWSER_ERROR = "browser:error"

    STORE_LOGIN = "store:login"
    STORE_LOGOUT = "store:logout"
    STORE_ERROR = "store:error"

    SYSTEM_STATUS = "system:status"
    SYSTEM_ALERT = "system:alert"
    SYSTEM_RESOURCE = "system:resource"

    AGENT_MESSAGE = "agent:message"
    AGENT_THINKING = "agent:thinking"

    HEARTBEAT = "heartbeat"


@dataclass
class Event:
    """事件数据"""
    type: str
    data: Dict[str, Any]
    timestamp: str = ""
    source: str = "server"

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            EventType.TASK_CREATED: set(),
            EventType.TASK_STARTED: set(),
            EventType.TASK_PROGRESS: set(),
            EventType.TASK_COMPLETED: set(),
            EventType.TASK_FAILED: set(),
            EventType.TASK_LOG: set(),
            EventType.BROWSER_OPENED: set(),
            EventType.BROWSER_CLOSED: set(),
            EventType.BROWSER_ERROR: set(),
            EventType.STORE_LOGIN: set(),
            EventType.STORE_LOGOUT: set(),
            EventType.STORE_ERROR: set(),
            EventType.SYSTEM_STATUS: set(),
            EventType.SYSTEM_ALERT: set(),
            EventType.SYSTEM_RESOURCE: set(),
            EventType.AGENT_MESSAGE: set(),
            EventType.AGENT_THINKING: set(),
            EventType.HEARTBEAT: set(),
            "global": set(),
        }
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channels: List[str] = None):
        """建立连接"""
        await websocket.accept()

        async with self._lock:
            if channels:
                for channel in channels:
                    if channel in self.active_connections:
                        self.active_connections[channel].add(websocket)
            self.active_connections["global"].add(websocket)

    async def disconnect(self, websocket: WebSocket):
        """断开连接"""
        async with self._lock:
            for connections in self.active_connections.values():
                connections.discard(websocket)

    async def broadcast(self, event: Event, channels: List[str] = None):
        """广播事件"""
        if channels is None:
            channels = [event.type]

        targets = set()
        async with self._lock:
            for channel in channels:
                if channel in self.active_connections:
                    targets.update(self.active_connections[channel])
            targets.update(self.active_connections["global"])

        disconnected = []
        for connection in targets:
            try:
                await connection.send_json(event.to_dict())
            except:
                disconnected.append(connection)

        for conn in disconnected:
            await self.disconnect(conn)

    def get_stats(self) -> Dict[str, Any]:
        """获取连接统计"""
        total = len(self.active_connections["global"])
        by_channel = {k: len(v) for k, v in self.active_connections.items()}
        return {
            "total_connections": total,
            "by_channel": by_channel
        }


class RealtimeManager:
    """实时状态管理器"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.connection_manager = ConnectionManager()
        self.resource_monitor = ResourceMonitor()
        self._monitor_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._initialized = True
        self._subscribers: Dict[str, List[Callable]] = {}

    async def start(self):
        """启动监控服务"""
        self._monitor_task = asyncio.create_task(self._resource_monitor_loop())
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        print("✅ 实时监控系统已启动")

    async def stop(self):
        """停止监控服务"""
        if self._monitor_task:
            self._monitor_task.cancel()
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        print("🛑 实时监控系统已停止")

    async def _resource_monitor_loop(self):
        """资源监控循环 - 每10秒上报一次"""
        while True:
            try:
                await asyncio.sleep(10)
                usage = self.resource_monitor.get_current_usage()
                await self.emit(Event(
                    type=EventType.SYSTEM_RESOURCE,
                    data=usage,
                    source="resource_monitor"
                ))
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"资源监控错误: {e}")

    async def _heartbeat_loop(self):
        """心跳循环 - 每30秒发送一次"""
        while True:
            try:
                await asyncio.sleep(30)
                await self.emit(Event(
                    type=EventType.HEARTBEAT,
                    data={"timestamp": datetime.now().isoformat()},
                    source="server"
                ))
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"心跳错误: {e}")

    async def emit(self, event: Event, channels: List[str] = None):
        """发送事件"""
        await self.connection_manager.broadcast(event, channels)

    async def emit_task_created(self, task_id: int, task_name: str, store_id: int = None):
        """任务创建"""
        await self.emit(Event(
            type=EventType.TASK_CREATED,
            data={
                "task_id": task_id,
                "task_name": task_name,
                "store_id": store_id
            }
        ))

    async def emit_task_started(self, task_id: int, task_name: str, total_steps: int):
        """任务开始"""
        await self.emit(Event(
            type=EventType.TASK_STARTED,
            data={
                "task_id": task_id,
                "task_name": task_name,
                "total_steps": total_steps,
                "progress": 0
            }
        ))

    async def emit_task_progress(self, task_id: int, current_step: int, total_steps: int, message: str = ""):
        """任务进度"""
        progress = (current_step / total_steps * 100) if total_steps > 0 else 0
        await self.emit(Event(
            type=EventType.TASK_PROGRESS,
            data={
                "task_id": task_id,
                "current_step": current_step,
                "total_steps": total_steps,
                "progress": round(progress, 1),
                "message": message
            }
        ))

    async def emit_task_completed(self, task_id: int, task_name: str, result: Dict = None):
        """任务完成"""
        await self.emit(Event(
            type=EventType.TASK_COMPLETED,
            data={
                "task_id": task_id,
                "task_name": task_name,
                "result": result or {}
            }
        ))

    async def emit_task_failed(self, task_id: int, task_name: str, error: str):
        """任务失败"""
        await self.emit(Event(
            type=EventType.TASK_FAILED,
            data={
                "task_id": task_id,
                "task_name": task_name,
                "error": error
            }
        ))

    async def emit_task_log(self, task_id: int, level: str, message: str):
        """任务日志"""
        await self.emit(Event(
            type=EventType.TASK_LOG,
            data={
                "task_id": task_id,
                "level": level,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
        ))

    async def emit_browser_opened(self, store_id: int, store_name: str):
        """浏览器打开"""
        await self.emit(Event(
            type=EventType.BROWSER_OPENED,
            data={
                "store_id": store_id,
                "store_name": store_name
            }
        ))

    async def emit_browser_closed(self, store_id: int, store_name: str):
        """浏览器关闭"""
        await self.emit(Event(
            type=EventType.BROWSER_CLOSED,
            data={
                "store_id": store_id,
                "store_name": store_name
            }
        ))

    async def emit_browser_error(self, store_id: int, store_name: str, error: str):
        """浏览器错误"""
        await self.emit(Event(
            type=EventType.BROWSER_ERROR,
            data={
                "store_id": store_id,
                "store_name": store_name,
                "error": error
            }
        ))

    async def emit_store_login(self, store_id: int, store_name: str, platform: str):
        """店铺登录"""
        await self.emit(Event(
            type=EventType.STORE_LOGIN,
            data={
                "store_id": store_id,
                "store_name": store_name,
                "platform": platform
            }
        ))

    async def emit_store_logout(self, store_id: int, store_name: str):
        """店铺登出"""
        await self.emit(Event(
            type=EventType.STORE_LOGOUT,
            data={
                "store_id": store_id,
                "store_name": store_name
            }
        ))

    async def emit_agent_message(self, session_id: str, message: str, is_user: bool = False):
        """Agent 消息"""
        await self.emit(Event(
            type=EventType.AGENT_MESSAGE,
            data={
                "session_id": session_id,
                "message": message,
                "is_user": is_user,
                "timestamp": datetime.now().isoformat()
            }
        ))

    async def emit_agent_thinking(self, session_id: str, thinking: str, step: int):
        """Agent 思考过程"""
        await self.emit(Event(
            type=EventType.AGENT_THINKING,
            data={
                "session_id": session_id,
                "thinking": thinking,
                "step": step
            }
        ))

    async def emit_system_alert(self, level: str, title: str, message: str, data: Dict = None):
        """系统告警"""
        await self.emit(Event(
            type=EventType.SYSTEM_ALERT,
            data={
                "level": level,
                "title": title,
                "message": message,
                "data": data or {}
            }
        ), channels=[EventType.SYSTEM_ALERT, "global"])

    async def subscribe(self, event_type: str, callback: Callable):
        """订阅事件"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "connections": self.connection_manager.get_stats(),
            "resource": self.resource_monitor.get_current_usage()
        }


# 全局实例
realtime_manager = RealtimeManager()


# WebSocket 路由处理
async def websocket_endpoint(websocket: WebSocket, channels: List[str] = None):
    """WebSocket 连接处理"""
    await realtime_manager.connection_manager.connect(websocket, channels)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON"}
                })
    except WebSocketDisconnect:
        await realtime_manager.connection_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        await realtime_manager.connection_manager.disconnect(websocket)


async def handle_websocket_message(websocket: WebSocket, message: Dict):
    """处理 WebSocket 消息"""
    action = message.get("action")

    if action == "subscribe":
        channels = message.get("channels", [])
        await realtime_manager.connection_manager.connect(websocket, channels)
        await websocket.send_json({
            "type": "subscribed",
            "data": {"channels": channels}
        })

    elif action == "unsubscribe":
        channels = message.get("channels", [])
        for channel in channels:
            realtime_manager.connection_manager.active_connections.get(channel, set()).discard(websocket)

    elif action == "ping":
        await websocket.send_json({
            "type": "pong",
            "data": {"timestamp": datetime.now().isoformat()}
        })

    elif action == "get_status":
        stats = realtime_manager.get_stats()
        await websocket.send_json({
            "type": "status",
            "data": stats
        })

    elif action == "get_resources":
        usage = realtime_manager.resource_monitor.get_current_usage()
        await websocket.send_json({
            "type": "resources",
            "data": usage
        })
