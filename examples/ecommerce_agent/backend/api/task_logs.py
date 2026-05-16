"""
任务日志 API
提供任务执行日志查询接口
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session
from backend.database.models import get_db
from backend.database.models import Task, TaskLog

router = APIRouter(prefix="/api/tasks", tags=["任务日志"])


class TaskLogResponse(BaseModel):
    id: int
    task_id: int
    step_id: Optional[int]
    level: str
    message: str
    data: Optional[Dict]
    screenshot: Optional[str]
    created_at: datetime


class TaskExecutionDetail(BaseModel):
    id: int
    name: str
    task_type: str
    status: str
    progress: int
    current_step: Optional[str]
    total_steps: int
    completed_steps: int
    retry_count: int
    max_retries: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    logs: List[TaskLogResponse]


class StepSummary(BaseModel):
    step_id: int
    name: str
    status: str
    duration: float
    log_count: int
    error: Optional[str]


@router.get("/{task_id}/logs", response_model=List[TaskLogResponse])
async def get_task_logs(
    task_id: int,
    level: Optional[str] = None,
    step_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取任务执行日志"""
    query = db.query(TaskLog).filter(TaskLog.task_id == task_id)

    if level:
        query = query.filter(TaskLog.level == level)

    if step_id is not None:
        query = query.filter(TaskLog.step_id == step_id)

    logs = query.order_by(TaskLog.created_at.desc()).limit(limit).all()

    return [
        TaskLogResponse(
            id=log.id,
            task_id=log.task_id,
            step_id=log.step_id,
            level=log.level,
            message=log.message,
            data=eval(log.data) if log.data else None,
            screenshot=log.screenshot,
            created_at=log.created_at
        )
        for log in logs
    ]


@router.get("/{task_id}/detail")
async def get_task_execution_detail(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取任务执行详情"""
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    logs = db.query(TaskLog).filter(
        TaskLog.task_id == task_id
    ).order_by(TaskLog.created_at).all()

    step_logs: Dict[int, List] = {}
    for log in logs:
        if log.step_id not in step_logs:
            step_logs[log.step_id] = []
        step_logs[log.step_id].append(log)

    step_summaries = []
    for step_id, step_log_list in step_logs.items():
        step_names = [l.message for l in step_log_list if l.step_id == step_id]
        step_name = step_names[0] if step_names else f"步骤 {step_id}"

        errors = [l.message for l in step_log_list if l.level == "error"]
        duration = 0.0
        if step_log_list:
            duration = (step_log_list[-1].created_at - step_log_list[0].created_at).total_seconds()

        status = "success"
        if any(l.level == "error" for l in step_log_list):
            status = "failed"
        elif any(l.level == "warning" for l in step_log_list):
            status = "warning"

        step_summaries.append(StepSummary(
            step_id=step_id,
            name=step_name,
            status=status,
            duration=duration,
            log_count=len(step_log_list),
            error=errors[0] if errors else None
        ))

    step_summaries.sort(key=lambda x: x.step_id)

    return TaskExecutionDetail(
        id=task.id,
        name=task.name or f"{task.task_type}任务",
        task_type=task.task_type,
        status=task.status,
        progress=task.progress,
        current_step=task.current_step,
        total_steps=task.total_steps,
        completed_steps=task.completed_steps,
        retry_count=task.retry_count,
        max_retries=task.max_retries,
        error_message=task.error_message,
        started_at=task.started_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        logs=[
            TaskLogResponse(
                id=log.id,
                task_id=log.task_id,
                step_id=log.step_id,
                level=log.level,
                message=log.message,
                data=eval(log.data) if log.data else None,
                screenshot=log.screenshot,
                created_at=log.created_at
            )
            for log in logs
        ]
    )


@router.get("/{task_id}/steps")
async def get_task_steps(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取任务步骤摘要"""
    logs = db.query(TaskLog).filter(
        TaskLog.task_id == task_id
    ).order_by(TaskLog.created_at).all()

    step_logs: Dict[int, List] = {}
    for log in logs:
        if log.step_id not in step_logs:
            step_logs[log.step_id] = []
        step_logs[log.step_id].append(log)

    summaries = []
    for step_id, step_log_list in step_logs.items():
        step_names = [l.message for l in step_log_list if l.level == "info" and l.step_id == step_id]
        step_name = step_names[0] if step_names else f"步骤 {step_id}" if step_id else "初始化"

        errors = [l.message for l in step_log_list if l.level == "error"]
        warnings = [l.message for l in step_log_list if l.level == "warning"]
        successes = [l.message for l in step_log_list if l.level == "success"]

        duration = 0.0
        if step_log_list:
            duration = (step_log_list[-1].created_at - step_log_list[0].created_at).total_seconds()

        status = "running"
        if errors:
            status = "failed"
        elif successes:
            status = "completed"
        elif warnings:
            status = "warning"

        summaries.append({
            "step_id": step_id,
            "name": step_name[:50],
            "status": status,
            "duration": round(duration, 2),
            "log_count": len(step_log_list),
            "error_count": len(errors),
            "warning_count": len(warnings),
            "first_error": errors[0] if errors else None,
            "start_time": step_log_list[0].created_at.isoformat() if step_log_list else None,
            "end_time": step_log_list[-1].created_at.isoformat() if step_log_list else None
        })

    summaries.sort(key=lambda x: x["step_id"] or 0)

    return {
        "task_id": task_id,
        "total_steps": len(summaries),
        "steps": summaries
    }


@router.post("/{task_id}/retry")
async def retry_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """重试任务"""
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status not in ["failed", "completed"]:
        raise HTTPException(status_code=400, detail="只能重试失败或已完成的任务")

    task.status = "pending"
    task.retry_count += 1
    task.error_message = None
    task.completed_at = None
    task.started_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": f"任务已重新排队，当前重试次数: {task.retry_count}"
    }


@router.get("/{task_id}/timeline")
async def get_task_timeline(
    task_id: int,
    db: Session = Depends(get_db)
):
    """获取任务时间线（用于前端展示）"""
    logs = db.query(TaskLog).filter(
        TaskLog.task_id == task_id
    ).order_by(TaskLog.created_at).all()

    if not logs:
        raise HTTPException(status_code=404, detail="没有找到日志")

    timeline = []
    for log in logs:
        timeline.append({
            "id": log.id,
            "time": log.created_at.isoformat(),
            "level": log.level,
            "message": log.message,
            "step_id": log.step_id,
            "has_screenshot": bool(log.screenshot)
        })

    return {
        "task_id": task_id,
        "timeline": timeline,
        "total": len(timeline)
    }


@router.get("/running")
async def get_running_tasks(db: Session = Depends(get_db)):
    """获取正在运行的任务"""
    tasks = db.query(Task).filter(
        Task.status.in_(["running", "retrying"])
    ).order_by(Task.started_at.desc()).limit(50).all()

    return {
        "tasks": [
            {
                "id": task.id,
                "name": task.name,
                "task_type": task.task_type,
                "status": task.status,
                "progress": task.progress,
                "current_step": task.current_step,
                "retry_count": task.retry_count,
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "store_id": task.store_id
            }
            for task in tasks
        ],
        "total": len(tasks)
    }


@router.get("/recent")
async def get_recent_tasks(
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取最近的任务"""
    query = db.query(Task)

    if status:
        query = query.filter(Task.status == status)

    tasks = query.order_by(Task.created_at.desc()).limit(limit).all()

    return {
        "tasks": [
            {
                "id": task.id,
                "name": task.name,
                "task_type": task.task_type,
                "status": task.status,
                "progress": task.progress,
                "error_message": task.error_message,
                "retry_count": task.retry_count,
                "created_at": task.created_at.isoformat(),
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "store_id": task.store_id
            }
            for task in tasks
        ],
        "total": len(tasks)
    }
