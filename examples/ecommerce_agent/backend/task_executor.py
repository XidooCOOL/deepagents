"""
任务执行服务
包含重试机制、执行日志、步骤追踪
"""
import asyncio
import traceback
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import json

from sqlalchemy.orm import Session


class ExecutionStatus(str, Enum):
    """执行状态"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class LogLevel(str, Enum):
    """日志级别"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


@dataclass
class ExecutionStep:
    """执行步骤"""
    step_id: int
    name: str
    status: ExecutionStatus
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration: float = 0.0
    logs: List[Dict] = field(default_factory=list)
    error: Optional[str] = None
    screenshot: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskExecutionContext:
    """任务执行上下文"""
    task_id: int
    store_id: int
    store_name: str
    platform: str
    total_steps: int
    current_step: int = 0
    status: ExecutionStatus = ExecutionStatus.PENDING
    steps: List[ExecutionStep] = field(default_factory=list)
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    progress: float = 0.0


class ExecutionLogger:
    """执行日志记录器"""

    def __init__(self, db: Session, task_id: int):
        self.db = db
        self.task_id = task_id
        self._logs: List[Dict] = []

    def log(
        self,
        level: LogLevel,
        message: str,
        step_id: int = None,
        data: Dict = None,
        screenshot: str = None
    ) -> Dict:
        """记录日志"""
        log_entry = {
            "task_id": self.task_id,
            "step_id": step_id,
            "level": level.value,
            "message": message,
            "data": data or {},
            "screenshot": screenshot,
            "timestamp": datetime.now().isoformat()
        }

        self._logs.append(log_entry)

        from backend.database.models import TaskLog

        db_log = TaskLog(
            task_id=self.task_id,
            step_id=step_id,
            level=level.value,
            message=message,
            data=json.dumps(data) if data else None,
            screenshot=screenshot
        )
        self.db.add(db_log)
        self.db.commit()

        return log_entry

    def debug(self, message: str, step_id: int = None, data: Dict = None):
        return self.log(LogLevel.DEBUG, message, step_id, data)

    def info(self, message: str, step_id: int = None, data: Dict = None):
        return self.log(LogLevel.INFO, message, step_id, data)

    def warning(self, message: str, step_id: int = None, data: Dict = None):
        return self.log(LogLevel.WARNING, message, step_id, data)

    def error(self, message: str, step_id: int = None, error: Exception = None, screenshot: str = None):
        error_data = {
            "error_type": type(error).__name__ if error else None,
            "error_message": str(error) if error else message,
            "traceback": traceback.format_exc() if error else None
        }
        return self.log(LogLevel.ERROR, message, step_id, error_data, screenshot)

    def success(self, message: str, step_id: int = None, data: Dict = None):
        return self.log(LogLevel.SUCCESS, message, step_id, data)

    def get_logs(self, step_id: int = None, level: str = None) -> List[Dict]:
        """获取日志"""
        from backend.database.models import TaskLog

        query = self.db.query(TaskLog).filter(TaskLog.task_id == self.task_id)

        if step_id is not None:
            query = query.filter(TaskLog.step_id == step_id)
        if level:
            query = query.filter(TaskLog.level == level)

        return [
            {
                "id": log.id,
                "step_id": log.step_id,
                "level": log.level,
                "message": log.message,
                "data": json.loads(log.data) if log.data else None,
                "screenshot": log.screenshot,
                "timestamp": log.created_at.isoformat()
            }
            for log in query.order_by(TaskLog.created_at).all()
        ]


class RetryableTask:
    """可重试任务包装器"""

    def __init__(
        self,
        max_retries: int = 3,
        retry_delay: float = 2.0,
        backoff_multiplier: float = 2.0,
        max_delay: float = 60.0,
        retry_on: List[type] = None
    ):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.backoff_multiplier = backoff_multiplier
        self.max_delay = max_delay
        self.retry_on = retry_on or [Exception]

    def should_retry(self, exception: Exception) -> bool:
        """判断是否应该重试"""
        return any(isinstance(exception, exc_type) for exc_type in self.retry_on)

    def get_delay(self, attempt: int) -> float:
        """计算延迟时间（指数退避）"""
        delay = self.retry_delay * (self.backoff_multiplier ** (attempt - 1))
        return min(delay, self.max_delay)

    async def execute(
        self,
        func: Callable,
        logger: ExecutionLogger,
        *args,
        **kwargs
    ) -> Any:
        """执行带重试的任务"""
        last_exception = None

        for attempt in range(1, self.max_retries + 1):
            try:
                if attempt > 1:
                    delay = self.get_delay(attempt)
                    logger.warning(
                        f"重试 {attempt}/{self.max_retries}，等待 {delay:.1f} 秒",
                        data={"attempt": attempt, "delay": delay}
                    )
                    await asyncio.sleep(delay)

                logger.info(f"执行任务 (尝试 {attempt}/{self.max_retries})")
                result = await func(*args, **kwargs)
                logger.success("任务执行成功")
                return result

            except Exception as e:
                last_exception = e
                logger.error(f"任务执行失败: {str(e)}", error=e)

                if not self.should_retry(e) or attempt >= self.max_retries:
                    raise

        raise last_exception


class BrowserHealthChecker:
    """浏览器健康检查器"""

    def __init__(
        self,
        check_interval: float = 30.0,
        max_consecutive_failures: int = 3
    ):
        self.check_interval = check_interval
        self.max_consecutive_failures = max_consecutive_failures
        self._failure_count: Dict[int, int] = {}
        self._health_check_task: Optional[asyncio.Task] = None

    async def check_browser_health(self, browser_manager) -> bool:
        """检查浏览器健康状态"""
        try:
            if not browser_manager.browser:
                return False

            if browser_manager.browser.is_closed():
                return False

            contexts = browser_manager.contexts
            for store_id in list(contexts.keys()):
                try:
                    context = contexts[store_id]
                    if context.browser.is_closed():
                        self._failure_count[store_id] = self._failure_count.get(store_id, 0) + 1
                    else:
                        self._failure_count[store_id] = 0
                except Exception:
                    self._failure_count[store_id] = self._failure_count.get(store_id, 0) + 1

            return True

        except Exception:
            return False

    async def auto_recover(self, browser_manager, store_id: int, logger: ExecutionLogger):
        """自动恢复浏览器"""
        try:
            logger.warning(f"尝试恢复店铺 {store_id} 的浏览器")

            if store_id in browser_manager.tabs:
                try:
                    await browser_manager.tabs[store_id].close()
                except:
                    pass
                del browser_manager.tabs[store_id]

            if store_id in browser_manager.contexts:
                try:
                    await browser_manager.contexts[store_id].close()
                except:
                    pass
                del browser_manager.contexts[store_id]

            from backend.database.models import Store
            store = browser_manager.db.query(Store).get(store_id)
            if store:
                context = await browser_manager.get_context(store)
                page = await context.new_page()
                browser_manager.tabs[store_id] = page
                logger.success(f"店铺 {store_id} 的浏览器已恢复")

        except Exception as e:
            logger.error(f"恢复失败: {str(e)}", error=e)
            raise

    async def health_check_loop(self, browser_manager, logger: ExecutionLogger):
        """健康检查循环"""
        while True:
            try:
                await asyncio.sleep(self.check_interval)

                is_healthy = await self.check_browser_health(browser_manager)

                for store_id, count in list(self._failure_count.items()):
                    if count >= self.max_consecutive_failures:
                        logger.warning(
                            f"检测到店铺 {store_id} 浏览器连续失败 {count} 次",
                            data={"store_id": store_id, "failures": count}
                        )
                        try:
                            await self.auto_recover(browser_manager, store_id, logger)
                            self._failure_count[store_id] = 0
                        except:
                            pass

                if not is_healthy:
                    logger.warning("检测到浏览器不健康，尝试重启")
                    try:
                        await browser_manager.stop()
                        await browser_manager.start()
                    except:
                        pass

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"健康检查错误: {str(e)}", error=e)

    def start_monitoring(self, browser_manager, logger: ExecutionLogger):
        """启动监控"""
        if self._health_check_task is None:
            self._health_check_task = asyncio.create_task(
                self.health_check_loop(browser_manager, logger)
            )

    def stop_monitoring(self):
        """停止监控"""
        if self._health_check_task:
            self._health_check_task.cancel()
            self._health_check_task = None


class TaskExecutor:
    """任务执行器（带重试和日志）"""

    def __init__(
        self,
        db: Session,
        task_id: int,
        max_retries: int = 3,
        retry_delay: float = 2.0
    ):
        self.db = db
        self.task_id = task_id
        self.logger = ExecutionLogger(db, task_id)
        self.retry_config = RetryableTask(
            max_retries=max_retries,
            retry_delay=retry_delay
        )
        self.context: Optional[TaskExecutionContext] = None

    async def execute_with_retry(
        self,
        step_name: str,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """执行单个步骤（带重试）"""
        if not self.context:
            self.context = TaskExecutionContext(
                task_id=self.task_id,
                store_id=0,
                store_name="",
                platform="",
                total_steps=1
            )

        step = ExecutionStep(
            step_id=self.context.current_step + 1,
            name=step_name,
            status=ExecutionStatus.RUNNING
        )
        self.context.steps.append(step)

        try:
            self.logger.info(f"开始执行: {step_name}", step_id=step.step_id)
            step.status = ExecutionStatus.RUNNING

            result = await self.retry_config.execute(
                func,
                self.logger,
                *args,
                **kwargs
            )

            step.status = ExecutionStatus.SUCCESS
            step.end_time = datetime.now()
            step.duration = (step.end_time - step.start_time).total_seconds()
            self.logger.success(f"完成: {step_name}", step_id=step.step_id)

            self.context.current_step += 1
            self._update_progress()

            return result

        except Exception as e:
            step.status = ExecutionStatus.FAILED
            step.end_time = datetime.now()
            step.duration = (step.end_time - step.start_time).total_seconds()
            step.error = str(e)
            self.logger.error(f"失败: {step_name}", step_id=step.step_id, error=e)

            self.context.error = str(e)
            raise

    def _update_progress(self):
        """更新进度"""
        if self.context and self.context.total_steps > 0:
            self.context.progress = (
                self.context.current_step / self.context.total_steps * 100
            )

            from backend.database.models import Task
            task = self.db.query(Task).get(self.task_id)
            if task:
                task.progress = self.context.progress
                self.db.commit()

    async def execute_steps(
        self,
        store_id: int,
        store_name: str,
        platform: str,
        steps: List[Dict],
        execute_func: Callable
    ):
        """执行步骤列表"""
        self.context = TaskExecutionContext(
            task_id=self.task_id,
            store_id=store_id,
            store_name=store_name,
            platform=platform,
            total_steps=len(steps)
        )

        self.logger.info(
            f"开始执行任务，共 {len(steps)} 个步骤",
            data={"store_id": store_id, "platform": platform, "steps": len(steps)}
        )

        try:
            for i, step_config in enumerate(steps):
                step_name = step_config.get("name", f"步骤 {i + 1}")
                self.context.current_step = i

                await self.execute_with_retry(
                    step_name,
                    execute_func,
                    step_config
                )

            self.context.status = ExecutionStatus.SUCCESS
            self.context.completed_at = datetime.now()
            self.logger.success("任务全部完成")

        except Exception as e:
            self.context.status = ExecutionStatus.FAILED
            self.context.completed_at = datetime.now()
            self.context.error = str(e)
            self.logger.error("任务执行失败", error=e)
            raise

    def get_execution_summary(self) -> Dict:
        """获取执行摘要"""
        if not self.context:
            return {}

        total_duration = 0
        for step in self.context.steps:
            total_duration += step.duration

        return {
            "task_id": self.context.task_id,
            "status": self.context.status.value,
            "total_steps": self.context.total_steps,
            "completed_steps": self.context.current_step,
            "progress": self.context.progress,
            "total_duration": total_duration,
            "retry_count": self.context.retry_count,
            "error": self.context.error,
            "started_at": self.context.started_at.isoformat() if self.context.started_at else None,
            "completed_at": self.context.completed_at.isoformat() if self.context.completed_at else None,
            "steps": [
                {
                    "step_id": s.step_id,
                    "name": s.name,
                    "status": s.status.value,
                    "duration": s.duration,
                    "error": s.error
                }
                for s in self.context.steps
            ]
        }
