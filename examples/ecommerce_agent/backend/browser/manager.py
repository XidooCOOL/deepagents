import asyncio
import uuid
from pathlib import Path
from typing import Dict, Optional, Any, Callable
from datetime import datetime, timedelta
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database.models import Store, BrowserTab
from backend.browser.anti_detect import anti_detect


class BrowserHealthStatus:
    """浏览器健康状态"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    RECOVERING = "recovering"
    DEAD = "dead"


class BrowserManager:
    """浏览器管理器 - 带健康检查和自动恢复"""

    def __init__(self, db: Session):
        self.db = db
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.contexts: Dict[int, BrowserContext] = {}
        self.tabs: Dict[int, Page] = {}
        self.tab_info: Dict[int, Dict[str, Any]] = {}
        self.health_status: Dict[int, str] = {}
        self._health_check_task: Optional[asyncio.Task] = None
        self._health_check_interval = 30.0
        self._consecutive_failures: Dict[int, int] = {}
        self._recovery_in_progress: Dict[int, bool] = {}
        self._on_recovery_callbacks: list = []

    async def start(self):
        """启动浏览器"""
        if self.playwright is None:
            self.playwright = await async_playwright().start()

            launch_options = {
                "headless": settings.HEADLESS,
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                ]
            }
            self.browser = await self.playwright.chromium.launch(**launch_options)

            await self._start_health_check()

    async def stop(self):
        """停止浏览器"""
        await self._stop_health_check()

        for store_id in list(self.tabs.keys()):
            await self.close_tab(store_id)

        for store_id in list(self.contexts.keys()):
            await self.close_context(store_id)

        if self.browser:
            try:
                await self.browser.close()
            except:
                pass
            self.browser = None

        if self.playwright:
            try:
                await self.playwright.stop()
            except:
                pass
            self.playwright = None

    async def _start_health_check(self):
        """启动健康检查"""
        if self._health_check_task is None:
            self._health_check_task = asyncio.create_task(self._health_check_loop())

    async def _stop_health_check(self):
        """停止健康检查"""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            self._health_check_task = None

    async def _health_check_loop(self):
        """健康检查循环"""
        while True:
            try:
                await asyncio.sleep(self._health_check_interval)
                await self._check_all_browsers()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"健康检查错误: {e}")

    async def _check_all_browsers(self):
        """检查所有浏览器状态"""
        if not self.browser:
            return

        for store_id in list(self.contexts.keys()):
            await self._check_store_browser(store_id)

    async def _check_store_browser(self, store_id: int) -> bool:
        """检查单个店铺的浏览器状态"""
        try:
            if store_id not in self.contexts:
                self.health_status[store_id] = BrowserHealthStatus.UNHEALTHY
                return False

            context = self.contexts[store_id]

            try:
                if context.browser.is_closed():
                    raise Exception("Context's browser is closed")

                pages = context.pages
                if store_id in self.tabs:
                    page = self.tabs[store_id]
                    try:
                        current_url = page.url
                        title = page.title()
                    except Exception:
                        raise Exception("Page is not accessible")

                self._consecutive_failures[store_id] = 0
                self.health_status[store_id] = BrowserHealthStatus.HEALTHY
                return True

            except Exception:
                failures = self._consecutive_failures.get(store_id, 0) + 1
                self._consecutive_failures[store_id] = failures

                if failures >= 3:
                    self.health_status[store_id] = BrowserHealthStatus.UNHEALTHY
                    await self._auto_recover_store(store_id)

                return False

        except Exception as e:
            print(f"检查店铺 {store_id} 浏览器状态失败: {e}")
            return False

    async def _auto_recover_store(self, store_id: int):
        """自动恢复店铺浏览器"""
        if self._recovery_in_progress.get(store_id, False):
            return

        self._recovery_in_progress[store_id] = True
        self.health_status[store_id] = BrowserHealthStatus.RECOVERING

        try:
            print(f"开始恢复店铺 {store_id} 的浏览器...")

            if store_id in self.tabs:
                try:
                    await self.tabs[store_id].close()
                except:
                    pass
                del self.tabs[store_id]

            if store_id in self.contexts:
                try:
                    await self.contexts[store_id].close()
                except:
                    pass
                del self.contexts[store_id]

            store = self.db.query(Store).get(store_id)
            if store:
                context = await self.get_context(store)
                page = await context.new_page()
                self.tabs[store_id] = page

                self._consecutive_failures[store_id] = 0
                self.health_status[store_id] = BrowserHealthStatus.HEALTHY

                print(f"店铺 {store_id} 的浏览器已恢复")

                for callback in self._on_recovery_callbacks:
                    try:
                        await callback(store_id)
                    except:
                        pass

        except Exception as e:
            print(f"恢复店铺 {store_id} 失败: {e}")
            self.health_status[store_id] = BrowserHealthStatus.DEAD
        finally:
            self._recovery_in_progress[store_id] = False

    def on_recovery(self, callback: Callable):
        """注册恢复回调"""
        self._on_recovery_callbacks.append(callback)

    async def get_context(self, store: Store) -> BrowserContext:
        """获取或创建浏览器上下文（Profile）"""
        if store.id in self.contexts:
            return self.contexts[store.id]

        if not self.browser:
            await self.start()

        profile_path = settings.PROFILE_DIR / f"store_{store.id}"
        profile_path.mkdir(parents=True, exist_ok=True)

        fingerprint = anti_detect.load_fingerprint(store.id, profile_path)
        if fingerprint is None:
            fingerprint = anti_detect.generate_fingerprint()
            anti_detect.save_fingerprint(store.id, fingerprint, profile_path)

        context_options = {
            "user_data_dir": str(profile_path),
            "viewport": fingerprint["viewport"],
            "user_agent": fingerprint["user_agent"],
            "locale": "zh-CN",
            "timezone_id": "Asia/Shanghai",
            "permissions": ["geolocation"],
            "geolocation": {"latitude": 39.9042, "longitude": 116.4074},
        }

        context = await self.browser.new_context(**context_options)

        await self._apply_stealth(context)

        self.contexts[store.id] = context
        self.health_status[store.id] = BrowserHealthStatus.HEALTHY
        return context

    async def _apply_stealth(self, context: BrowserContext):
        """应用 stealth 技术"""
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['zh-CN', 'zh', 'en']
            });

            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)

    async def get_tab(self, store: Store) -> Page:
        """获取或创建 Tab，带健康检查"""
        if store.id in self.tabs:
            page = self.tabs[store.id]
            try:
                _ = page.url
                await self._update_tab_last_used(store.id)
                self.health_status[store.id] = BrowserHealthStatus.HEALTHY
                return page
            except Exception:
                await self._auto_recover_store(store.id)

        context = await self.get_context(store)

        page = await context.new_page()
        tab_id = str(uuid.uuid4())

        self.tabs[store.id] = page
        self.tab_info[store.id] = {
            "tab_id": tab_id,
            "created_at": datetime.utcnow(),
            "last_used_at": datetime.utcnow()
        }

        db_tab = BrowserTab(
            store_id=store.id,
            tab_id=tab_id,
            url="",
            is_active=True
        )
        self.db.add(db_tab)
        self.db.commit()

        return page

    async def close_tab(self, store_id: int):
        """关闭 Tab"""
        if store_id in self.tabs:
            try:
                await self.tabs[store_id].close()
            except:
                pass
            del self.tabs[store_id]

        if store_id in self.tab_info:
            del self.tab_info[store_id]

        self.db.query(BrowserTab).filter(
            BrowserTab.store_id == store_id
        ).update({"is_active": False})
        self.db.commit()

        self.health_status[store_id] = BrowserHealthStatus.UNHEALTHY

    async def close_context(self, store_id: int):
        """关闭上下文"""
        if store_id in self.contexts:
            try:
                await self.contexts[store_id].close()
            except:
                pass
            del self.contexts[store_id]

        if store_id in self.tabs:
            try:
                await self.tabs[store_id].close()
            except:
                pass
            del self.tabs[store_id]

    async def force_recover(self, store_id: int):
        """强制恢复指定店铺的浏览器"""
        await self._auto_recover_store(store_id)

    async def _update_tab_last_used(self, store_id: int):
        """更新 Tab 最后使用时间"""
        if store_id in self.tab_info:
            self.tab_info[store_id]["last_used_at"] = datetime.utcnow()

        self.db.query(BrowserTab).filter(
            BrowserTab.store_id == store_id
        ).update({"last_used_at": datetime.utcnow()})
        self.db.commit()

    async def cleanup_idle_tabs(self):
        """清理闲置 Tab"""
        now = datetime.utcnow()
        idle_timeout = timedelta(minutes=settings.TAB_IDLE_TIMEOUT_MINUTES)

        to_close = []
        for store_id, info in self.tab_info.items():
            if now - info["last_used_at"] > idle_timeout:
                to_close.append(store_id)

        for store_id in to_close:
            await self.close_tab(store_id)

    async def take_screenshot(self, store_id: int, name: str = "") -> str:
        """截图"""
        if store_id not in self.tabs:
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{store_id}_{timestamp}_{name}.png"
        filepath = settings.SCREENSHOT_DIR / filename

        try:
            await self.tabs[store_id].screenshot(path=str(filepath))
            return str(filepath)
        except Exception:
            return ""

    async def navigate(self, store: Store, url: str) -> Page:
        """导航到 URL，带重试"""
        max_retries = 3

        for attempt in range(max_retries):
            try:
                page = await self.get_tab(store)
                await page.goto(url, wait_until="networkidle", timeout=30000)

                self.db.query(BrowserTab).filter(
                    BrowserTab.store_id == store.id
                ).update({"url": url})
                self.db.commit()

                return page

            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"导航失败，尝试恢复: {e}")
                    await self._auto_recover_store(store.id)
                    await asyncio.sleep(2)
                else:
                    raise

    def get_health_status(self, store_id: int) -> Dict[str, Any]:
        """获取店铺浏览器健康状态"""
        return {
            "store_id": store_id,
            "status": self.health_status.get(store_id, BrowserHealthStatus.UNHEALTHY),
            "has_context": store_id in self.contexts,
            "has_tab": store_id in self.tabs,
            "consecutive_failures": self._consecutive_failures.get(store_id, 0),
            "is_recovering": self._recovery_in_progress.get(store_id, False)
        }

    def get_all_health_status(self) -> Dict[int, Dict[str, Any]]:
        """获取所有店铺浏览器健康状态"""
        return {
            store_id: self.get_health_status(store_id)
            for store_id in set(list(self.contexts.keys()) + list(self.tabs.keys()))
        }


_browser_manager: Optional[BrowserManager] = None


def get_browser_manager(db: Session) -> BrowserManager:
    """获取浏览器管理器"""
    global _browser_manager
    if _browser_manager is None:
        _browser_manager = BrowserManager(db)
    return _browser_manager
