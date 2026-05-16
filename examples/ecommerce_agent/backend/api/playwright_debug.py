"""
Playwright 页面调试工具
复用已登录店铺的浏览器进行调试
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import os
import uuid

from sqlalchemy.orm import Session
from backend.database.models import get_db
from backend.database.models import Store
from backend.browser.manager import get_browser_manager, BrowserManager

router = APIRouter(prefix="/api/playwright-debug", tags=["页面调试"])

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


class DebugConfig(BaseModel):
    store_id: int
    url: Optional[str] = None
    wait_selector: Optional[str] = None
    wait_timeout: int = 5000


class SelectorTest(BaseModel):
    selector: str
    selector_type: str = "css"
    action_type: str = "click"


class SelectorTestResult(BaseModel):
    selector: str
    selector_type: str
    success: bool
    found: bool
    element_text: Optional[str] = None
    element_html: Optional[str] = None
    element_count: int = 0
    bounding_box: Optional[Dict] = None
    error: Optional[str] = None


class ExtractResult(BaseModel):
    success: bool
    elements_found: int
    data: Dict[str, Any] = {}
    screenshot: Optional[str] = None
    error: Optional[str] = None


def get_store_with_browser(db: Session, store_id: int) -> tuple:
    """获取店铺及其浏览器 Page"""
    store = db.query(Store).get(store_id)
    if not store:
        raise HTTPException(status_code=404, detail="店铺不存在")

    if not store.is_active:
        raise HTTPException(status_code=400, detail="店铺未启用")

    browser_manager = get_browser_manager(db)
    return store, browser_manager


async def _test_single_selector(page, selector: str, selector_type: str, action_type: str = "click"):
    result = {
        "selector": selector,
        "selector_type": selector_type,
        "success": True,
        "found": False,
        "element_count": 0,
        "element_text": None,
        "element_html": None,
        "bounding_box": None,
        "error": None
    }

    try:
        if selector_type == "css":
            locator = page.locator(selector)
        elif selector_type == "xpath":
            locator = page.locator(f"xpath={selector}")
        elif selector_type == "text":
            locator = page.get_by_text(selector, exact=False)
        elif selector_type == "id":
            locator = page.locator(f"#{selector}")
        elif selector_type == "class":
            locator = page.locator(f".{selector}")
        else:
            locator = page.locator(selector)

        count = await locator.count()
        result["element_count"] = count
        result["found"] = count > 0

        if count > 0:
            first_element = locator.first
            try:
                result["element_text"] = await first_element.inner_text()
            except:
                result["element_text"] = await first_element.text_content()

            try:
                result["element_html"] = await first_element.inner_html()
            except:
                pass

            try:
                box = await first_element.bounding_box()
                if box:
                    result["bounding_box"] = {
                        "x": round(box["x"], 2),
                        "y": round(box["y"], 2),
                        "width": round(box["width"], 2),
                        "height": round(box["height"], 2)
                    }
            except:
                pass
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)

    return result


@router.post("/get-page")
async def get_page(config: DebugConfig, db: Session = Depends(get_db)):
    """
    获取店铺浏览器页面
    如果店铺尚未打开浏览器，自动启动并保持登录状态
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        current_url = page.url if hasattr(page, 'url') else ""

        return {
            "success": True,
            "message": "获取页面成功",
            "store_id": store.id,
            "store_name": store.name,
            "platform": store.platform,
            "current_url": current_url,
            "page_title": await page.title() if page else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/open-page")
async def open_page(config: DebugConfig, db: Session = Depends(get_db)):
    """
    在店铺浏览器中打开页面
    复用已登录的浏览器会话
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

            if config.wait_selector:
                try:
                    await page.wait_for_selector(config.wait_selector, timeout=config.wait_timeout)
                except:
                    pass

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"store_{store.id}_{uuid.uuid4().hex[:8]}.png")
        await page.screenshot(path=screenshot_path, full_page=True)

        screenshot_url = f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}"

        return {
            "success": True,
            "message": "页面已打开",
            "store_id": store.id,
            "store_name": store.name,
            "platform": store.platform,
            "url": page.url,
            "screenshot": screenshot_url,
            "page_title": await page.title(),
            "viewport_size": {"width": 1920, "height": 1080}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-selector")
async def test_selector(config: DebugConfig, test: SelectorTest, db: Session = Depends(get_db)):
    """
    测试选择器是否有效
    使用店铺已登录的浏览器
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        result = await _test_single_selector(page, test.selector, test.selector_type, test.action_type)
        return SelectorTestResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        return SelectorTestResult(
            selector=test.selector,
            selector_type=test.selector_type,
            success=False,
            found=False,
            element_count=0,
            error=str(e)
        )


@router.post("/test-selectors-batch")
async def test_selectors_batch(config: DebugConfig, selectors: List[SelectorTest], db: Session = Depends(get_db)):
    """
    批量测试多个选择器
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        results = []
        for selector_test in selectors:
            result = await _test_single_selector(
                page,
                selector_test.selector,
                selector_test.selector_type,
                selector_test.action_type
            )
            results.append(result)

        return {
            "total": len(selectors),
            "success_count": sum(1 for r in results if r["found"]),
            "failed_count": sum(1 for r in results if not r["found"]),
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-page-data")
async def extract_page_data(config: DebugConfig, selectors: Dict[str, str], db: Session = Depends(get_db)):
    """
    从页面提取多个字段数据
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        data = {}
        for field_name, selector_info in selectors.items():
            if isinstance(selector_info, dict):
                selector = selector_info.get("selector", selector_info)
                selector_type = selector_info.get("type", "css")
            else:
                selector = selector_info
                selector_type = "css"

            result = await _test_single_selector(page, selector, selector_type)
            data[field_name] = {
                "value": result.get("element_text", ""),
                "found": result["found"],
                "count": result["element_count"]
            }

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"extract_store_{store.id}_{uuid.uuid4().hex[:8]}.png")
        await page.screenshot(path=screenshot_path, full_page=True)

        return ExtractResult(
            success=True,
            elements_found=len(selectors),
            data=data,
            screenshot=f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        return ExtractResult(success=False, elements_found=0, error=str(e))


@router.post("/highlight-element")
async def highlight_element(config: DebugConfig, selector: str, selector_type: str = "css", db: Session = Depends(get_db)):
    """
    高亮显示元素
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        escaped_selector = selector.replace("'", "\\'")
        highlight_script = f"""
        () => {{
            const elements = document.querySelectorAll('{escaped_selector}');
            elements.forEach(el => {{
                const originalOutline = el.style.outline;
                const originalBg = el.style.backgroundColor;
                el.style.outline = '3px solid red';
                el.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                setTimeout(() => {{
                    el.style.outline = originalOutline;
                    el.style.backgroundColor = originalBg;
                }}, 3000);
            }});
            return elements.length;
        }}
        """

        count = await page.evaluate(highlight_script)

        await asyncio.sleep(0.5)

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"highlight_store_{store.id}_{uuid.uuid4().hex[:8]}.png")
        await page.screenshot(path=screenshot_path, full_page=True)

        return {
            "success": True,
            "selector": selector,
            "store_id": store.id,
            "store_name": store.name,
            "elements_highlighted": count,
            "screenshot": f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}",
            "message": f"已高亮 {count} 个元素 (3秒后自动取消)"
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "selector": selector, "error": str(e)}


@router.post("/get-page-info")
async def get_page_info(config: DebugConfig, db: Session = Depends(get_db)):
    """
    获取页面基本信息
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        page_info = await page.evaluate("""
            () => {
                return {
                    inputs: document.querySelectorAll('input').length,
                    buttons: document.querySelectorAll('button').length,
                    links: document.querySelectorAll('a').length,
                    forms: document.querySelectorAll('form').length,
                    images: document.querySelectorAll('img').length,
                    tables: document.querySelectorAll('table').length
                };
            }
        """)

        return {
            "success": True,
            "store_id": store.id,
            "store_name": store.name,
            "platform": store.platform,
            "url": page.url,
            "title": await page.title(),
            "viewport": {"width": 1920, "height": 1080},
            "elements": page_info
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/take-screenshot")
async def take_screenshot(config: DebugConfig, db: Session = Depends(get_db)):
    """
    截取当前页面
    """
    try:
        store, browser_manager = get_store_with_browser(db, config.store_id)

        await browser_manager.start()
        page = await browser_manager.get_tab(store)

        if config.url:
            await page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"screenshot_store_{store.id}_{uuid.uuid4().hex[:8]}.png")
        await page.screenshot(path=screenshot_path, full_page=True)

        return {
            "success": True,
            "store_id": store.id,
            "store_name": store.name,
            "screenshot": f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}",
            "page_title": await page.title()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/screenshot/{filename}")
async def get_screenshot(filename: str):
    """获取截图文件"""
    from fastapi.responses import FileResponse
    screenshot_path = os.path.join(SCREENSHOT_DIR, filename)
    if os.path.exists(screenshot_path):
        return FileResponse(screenshot_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="截图不存在")


@router.get("/stores")
async def get_available_stores(db: Session = Depends(get_db)):
    """
    获取可用的店铺列表
    """
    stores = db.query(Store).filter(Store.is_active == True).all()

    browser_manager = get_browser_manager(db)

    store_list = []
    for store in stores:
        has_browser = store.id in browser_manager.tabs
        current_url = ""

        if has_browser and store.id in browser_manager.tabs:
            try:
                page = browser_manager.tabs[store.id]
                current_url = page.url if hasattr(page, 'url') else ""
            except:
                pass

        store_list.append({
            "id": store.id,
            "name": store.name,
            "platform": store.platform,
            "has_browser": has_browser,
            "current_url": current_url,
            "is_active": store.is_active
        })

    return {
        "stores": store_list,
        "total": len(store_list),
        "active_count": sum(1 for s in store_list if s["has_browser"])
    }


@router.get("/platform-urls")
async def get_platform_urls():
    """
    获取各平台的常用 URL
    """
    return {
        "pinduoduo": {
            "login": "https://mms.pinduoduo.com/login",
            "publish": "https://mms.pinduoduo.com/goods/create",
            "goods_list": "https://mms.pinduoduo.com/goods/list",
            "publish_success": "https://mms.pinduoduo.com/goods/success"
        },
        "douyin": {
            "login": "https://creator.douyin.com",
            "publish": "https://creator.douyin.com/product/publish",
            "product_list": "https://creator.douyin.com/product/list"
        },
        "taobao": {
            "login": "https://login.taobao.com",
            "publish": "https://upload.taobao.com/item/add.htm",
            "goods_list": "https://sell.taobao.com/auction/goods/index.htm"
        },
        "jd": {
            "login": "https://passport.jd.com",
            "publish": "https://seller.jd.com/commodity/create",
            "goods_list": "https://seller.jd.com/commodity/list"
        }
    }


@router.get("/test-connection")
async def test_connection(db: Session = Depends(get_db)):
    """测试连接和浏览器状态"""
    try:
        browser_manager = get_browser_manager(db)
        await browser_manager.start()

        return {
            "success": True,
            "message": "浏览器连接正常",
            "status": "ready",
            "active_tabs": len(browser_manager.tabs),
            "active_contexts": len(browser_manager.contexts)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"连接失败: {str(e)}",
            "status": "error"
        }


USAGE_GUIDE = """
## Playwright 页面调试工具（复用店铺浏览器）

### 1. 获取可用店铺
GET /api/playwright-debug/stores
返回: {"stores": [{"id": 1, "name": "拼多多店铺A", "platform": "pinduoduo", "has_browser": true}]}

### 2. 打开页面
POST /api/playwright-debug/open-page
{
    "store_id": 1,
    "url": "https://mms.pinduoduo.com/goods/create"
}

### 3. 测试选择器
POST /api/playwright-debug/test-selector
{
    "store_id": 1,
    "selector": "#goods-id",
    "selector_type": "css",
    "action_type": "extract"
}

### 4. 高亮元素
POST /api/playwright-debug/highlight-element
{
    "store_id": 1,
    "selector": "#goods-id",
    "selector_type": "css"
}

### 5. 截取页面
POST /api/playwright-debug/take-screenshot
{
    "store_id": 1
}
"""
