"""
实时状态 API
提供 HTTP 接口获取实时状态（作为 WebSocket 的补充）
"""
from fastapi import APIRouter, Depends
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from backend.database.models import get_db
from backend.database.models import Task, Store
from backend.utils.resource_monitor import ResourceMonitor

router = APIRouter(prefix="/api/status", tags=["状态监控"])


@router.get("/dashboard")
async def get_dashboard_status(db: Session = Depends(get_db)):
    """获取仪表盘统计数据"""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_tasks = db.query(Task).count()
    today_tasks = db.query(Task).filter(Task.created_at >= today_start).count()
    running_tasks = db.query(Task).filter(Task.status == 'running').count()

    completed_tasks = db.query(Task).filter(Task.status == 'completed').count()
    failed_tasks = db.query(Task).filter(Task.status == 'failed').count()

    total_stores = db.query(Store).filter(Store.is_active == True).count()
    active_stores = db.query(Store).filter(Store.is_active == True).count()

    resource_monitor = ResourceMonitor()
    resource_usage = resource_monitor.get_current_usage()

    return {
        "tasks": {
            "total": total_tasks,
            "today": today_tasks,
            "running": running_tasks,
            "completed": completed_tasks,
            "failed": failed_tasks,
            "success_rate": round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0
        },
        "stores": {
            "total": total_stores,
            "active_today": active_stores
        },
        "resources": resource_usage,
        "timestamp": now.isoformat()
    }


@router.get("/tasks")
async def get_tasks_status(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取任务状态列表"""
    query = db.query(Task)

    if status:
        query = query.filter(Task.status == status)

    tasks = query.order_by(Task.updated_at.desc()).limit(limit).all()

    return {
        "tasks": [
            {
                "id": task.id,
                "name": task.name,
                "status": task.status,
                "progress": task.progress or 0,
                "store_id": task.store_id,
                "store_name": task.store.name if task.store else None,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None,
                "error_message": task.error_message
            }
            for task in tasks
        ],
        "total": query.count()
    }


@router.get("/browsers")
async def get_browsers_status(db: Session = Depends(get_db)):
    """获取浏览器状态"""
    from backend.browser.manager import get_browser_manager

    browser_manager = get_browser_manager(db)
    active_store_ids = list(browser_manager.tabs.keys()) if browser_manager.tabs else []

    stores = db.query(Store).filter(Store.is_active == True).all()

    store_status = []
    for store in stores:
        store_status.append({
            "id": store.id,
            "name": store.name,
            "platform": store.platform,
            "is_active": store.is_active,
            "browser_open": store.id in active_store_ids,
            "last_login_at": store.last_login_at.isoformat() if store.last_login_at else None
        })

    return {
        "stores": store_status,
        "active_count": len(active_store_ids),
        "total_count": len(stores)
    }


@router.get("/resources")
async def get_resources():
    """获取系统资源使用情况"""
    monitor = ResourceMonitor()
    return monitor.get_current_usage()


@router.get("/alerts")
async def get_recent_alerts(limit: int = 20):
    """获取最近告警（从内存缓存）"""
    return {
        "alerts": [],
        "total": 0
    }


@router.get("/activity-log")
async def get_activity_log(
    event_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取活动日志"""
    now = datetime.now()
    since = now - timedelta(hours=24)

    logs = []

    tasks = db.query(Task).filter(
        Task.updated_at >= since
    ).order_by(Task.updated_at.desc()).limit(limit).all()

    for task in tasks:
        logs.append({
            "id": f"task_{task.id}",
            "type": f"task:{task.status}",
            "message": f"任务 {task.name} - {task.status}",
            "store_id": task.store_id,
            "timestamp": task.updated_at.isoformat() if task.updated_at else None,
            "data": {
                "task_id": task.id,
                "status": task.status,
                "progress": task.progress
            }
        })

    return {
        "logs": logs,
        "total": len(logs)
    }
