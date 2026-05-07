"""
Playwright 页面调试工具
用于调试和验证 DOM 元素选择器
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import os
import base64
import json
import uuid

router = APIRouter(prefix="/api/playwright-debug", tags=["页面调试"])

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


class DebugConfig(BaseModel):
    platform: str
    url: str
    username: Optional[str] = None
    password: Optional[str] = None
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


class PageContext:
    browser = None
    context = None
    page = None
    _instance = None

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            try:
                from playwright.async_api import async_playwright
                cls._instance = cls()
                cls._instance.playwright = await async_playwright().start()
                cls._instance.browser = await cls._instance.playwright.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                cls._instance.context = await cls._instance.browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                cls._instance.page = await cls._instance.context.new_page()
            except Exception as e:
                print(f"Failed to initialize Playwright: {e}")
                raise
        return cls._instance

    @classmethod
    async def close(cls):
        if cls._instance:
            try:
                if cls._instance.page:
                    await cls._instance.page.close()
                if cls._instance.context:
                    await cls._instance.context.close()
                if cls._instance.browser:
                    await cls._instance.browser.close()
                if cls._instance.playwright:
                    await cls._instance.playwright.stop()
            except:
                pass
            cls._instance = None


@router.post("/open-page")
async def open_page(config: DebugConfig):
    """打开页面进行调试，返回页面信息和截图"""
    try:
        ctx = await PageContext.get_instance()

        await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        if config.wait_selector:
            try:
                await ctx.page.wait_for_selector(config.wait_selector, timeout=config.wait_timeout)
            except:
                pass

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"page_{uuid.uuid4().hex[:8]}.png")
        await ctx.page.screenshot(path=screenshot_path, full_page=True)

        screenshot_url = f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}"

        return {
            "success": True,
            "message": "页面已打开",
            "platform": config.platform,
            "url": config.url,
            "screenshot": screenshot_url,
            "page_title": await ctx.page.title(),
            "viewport_size": {"width": 1920, "height": 1080}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-selector")
async def test_selector(config: DebugConfig, test: SelectorTest):
    """测试选择器是否有效，返回找到的元素信息"""
    try:
        ctx = await PageContext.get_instance()

        if config.url:
            await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        result = await _test_single_selector(ctx.page, test.selector, test.selector_type, test.action_type)
        return SelectorTestResult(**result)
    except Exception as e:
        return SelectorTestResult(
            selector=test.selector,
            selector_type=test.selector_type,
            success=False,
            found=False,
            element_count=0,
            error=str(e)
        )


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


@router.post("/test-selectors-batch")
async def test_selectors_batch(config: DebugConfig, selectors: List[SelectorTest]):
    """批量测试多个选择器"""
    try:
        ctx = await PageContext.get_instance()

        if config.url:
            await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        results = []
        for selector_test in selectors:
            result = await _test_single_selector(
                ctx.page,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-page-data")
async def extract_page_data(config: DebugConfig, selectors: Dict[str, str]):
    """从页面提取多个字段数据"""
    try:
        ctx = await PageContext.get_instance()

        if config.url:
            await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        data = {}
        for field_name, selector_info in selectors.items():
            if isinstance(selector_info, dict):
                selector = selector_info.get("selector", selector_info)
                selector_type = selector_info.get("type", "css")
            else:
                selector = selector_info
                selector_type = "css"

            result = await _test_single_selector(ctx.page, selector, selector_type)
            data[field_name] = {
                "value": result.get("element_text", ""),
                "found": result["found"],
                "count": result["element_count"]
            }

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"extract_{uuid.uuid4().hex[:8]}.png")
        await ctx.page.screenshot(path=screenshot_path, full_page=True)

        return ExtractResult(
            success=True,
            elements_found=len(selectors),
            data=data,
            screenshot=f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}"
        )
    except Exception as e:
        return ExtractResult(success=False, elements_found=0, error=str(e))


@router.post("/highlight-element")
async def highlight_element(config: DebugConfig, selector: str, selector_type: str = "css"):
    """高亮显示元素"""
    try:
        ctx = await PageContext.get_instance()

        if config.url:
            await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        highlight_script = f"""
        () => {{
            const elements = document.querySelectorAll('{selector}');
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

        count = await ctx.page.evaluate(highlight_script)

        await asyncio.sleep(0.5)

        screenshot_path = os.path.join(SCREENSHOT_DIR, f"highlight_{uuid.uuid4().hex[:8]}.png")
        await ctx.page.screenshot(path=screenshot_path, full_page=True)

        return {
            "success": True,
            "selector": selector,
            "elements_highlighted": count,
            "screenshot": f"/api/playwright-debug/screenshot/{os.path.basename(screenshot_path)}",
            "message": f"已高亮 {count} 个元素 (3秒后自动取消)"
        }
    except Exception as e:
        return {"success": False, "selector": selector, "error": str(e)}


@router.post("/get-page-info")
async def get_page_info(config: DebugConfig):
    """获取页面基本信息"""
    try:
        ctx = await PageContext.get_instance()

        if config.url:
            await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        page_info = await ctx.page.evaluate("""
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
            "url": config.url,
            "title": await ctx.page.title(),
            "viewport": {"width": 1920, "height": 1080},
            "elements": page_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login-debug")
async def login_debug(config: DebugConfig):
    """调试登录流程"""
    try:
        ctx = await PageContext.get_instance()

        await ctx.page.goto(config.url, wait_until="domcontentloaded", timeout=30000)

        if config.username:
            try:
                await ctx.page.fill("input[name='username'], input[type='text']", config.username)
            except:
                pass

        if config.password:
            try:
                await ctx.page.fill("input[name='password'], input[type='password']", config.password)
            except:
                pass

        screenshot_before = os.path.join(SCREENSHOT_DIR, "login_before.png")
        await ctx.page.screenshot(path=screenshot_before)

        try:
            await ctx.page.click("button[type='submit'], button:has-text('登录')")
            await ctx.page.wait_for_load_state("networkidle", timeout=5000)
        except:
            pass

        screenshot_after = os.path.join(SCREENSHOT_DIR, "login_after.png")
        await ctx.page.screenshot(path=screenshot_after)

        return {
            "success": True,
            "message": "登录调试完成",
            "logged_in": await ctx.page.title() != "登录",
            "username": config.username,
            "screenshot_before": f"/api/playwright-debug/screenshot/login_before.png",
            "screenshot_after": f"/api/playwright-debug/screenshot/login_after.png"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/platform-urls")
async def get_platform_urls():
    """获取各平台的常用 URL"""
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


@router.get("/screenshot/{filename}")
async def get_screenshot(filename: str):
    """获取截图文件"""
    from fastapi.responses import FileResponse
    screenshot_path = os.path.join(SCREENSHOT_DIR, filename)
    if os.path.exists(screenshot_path):
        return FileResponse(screenshot_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="截图不存在")


@router.post("/close-browser")
async def close_browser():
    """关闭浏览器实例"""
    await PageContext.close()
    return {"success": True, "message": "浏览器已关闭"}


@router.get("/test-connection")
async def test_connection():
    """测试 Playwright 连接"""
    try:
        ctx = await PageContext.get_instance()
        return {"success": True, "message": "Playwright 连接正常", "status": "ready"}
    except Exception as e:
        return {"success": False, "message": f"Playwright 连接失败: {str(e)}", "status": "error"}


USAGE_GUIDE = """
## Playwright 页面调试工具

### 1. 打开页面
POST /api/playwright-debug/open-page
{
    "platform": "pinduoduo",
    "url": "https://mms.pinduoduo.com/login",
    "username": "13800138000",
    "password": "xxx"
}

### 2. 测试选择器
POST /api/playwright-debug/test-selector
{
    "selector": "#goods-id",
    "selector_type": "css",
    "action_type": "extract"
}

### 3. 批量测试选择器
POST /api/playwright-debug/test-selectors-batch
{
    "selectors": [
        {"selector": "#goods-id", "selector_type": "css"},
        {"selector": ".goods-link", "selector_type": "css"}
    ]
}

### 4. 提取页面数据
POST /api/playwright-debug/extract-page-data
{
    "selectors": {
        "product_id": "#goods-id",
        "product_url": ".goods-link",
        "title": ".goods-title"
    }
}

### 5. 高亮元素
POST /api/playwright-debug/highlight-element
{
    "selector": "#goods-id"
}
"""
