"""
从页面 DOM 提取商品信息
发布成功后，从页面元素中提取商品标题、ID、链接等信息
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.database.models import get_db
from backend.browser.elements import ElementManager

router = APIRouter(prefix="/api/extract", tags=["DOM元素提取"])


class ExtractionConfig(BaseModel):
    """提取配置"""
    platform: str
    page_type: str  # publish_success, product_detail, etc.
    
    # 可选：自定义选择器（会覆盖配置中的）
    selectors: Optional[Dict[str, str]] = None
    
    # 可选：使用预配置的 DOM 元素
    use_stored_elements: bool = True
    element_names: Optional[List[str]] = None


class ExtractionResult(BaseModel):
    """提取结果"""
    success: bool
    product_id: Optional[str] = None
    product_url: Optional[str] = None
    title: Optional[str] = None
    price: Optional[str] = None
    raw_data: Dict[str, Any] = {}
    error: Optional[str] = None
    selectors_used: Dict[str, str] = {}


# 提取字段映射
EXTRACTION_FIELD_MAPPING = {
    "product_id": ["product_id", "goods_id", "item_id", "sku"],
    "product_url": ["product_url", "goods_url", "item_url", "url"],
    "title": ["title", "goods_title", "item_title", "name"],
    "price": ["price", "goods_price", "item_price"]
}


def normalize_platform(platform: str) -> str:
    """标准化平台名称"""
    platform_map = {
        "抖音": "douyin",
        "拼多多": "pinduoduo",
        "淘宝": "taobao",
        "京东": "jd",
        "小红书": "xiaohongshu"
    }
    return platform_map.get(platform, platform.lower())


@router.post("/product-info", response_model=ExtractionResult)
async def extract_product_info(
    config: ExtractionConfig,
    db: Session = Depends(get_db)
):
    """
    从页面 DOM 提取商品信息
    
    流程：
    1. 根据平台和页面类型，从配置的 DOM 元素中获取选择器
    2. 使用 Playwright 执行提取（实际场景）
    3. 返回提取结果
    """
    try:
        # 标准化平台名称
        platform = normalize_platform(config.platform)
        page_type = config.page_type
        
        # 获取元素管理器
        element_manager = ElementManager(db)
        
        # 获取页面所有元素
        page_elements = element_manager.get_page_elements(platform, page_type)
        
        if not page_elements:
            return ExtractionResult(
                success=False,
                error=f"未找到平台 {platform} 页面 {page_type} 的元素配置"
            )
        
        # 构建选择器映射
        selectors_used = {}
        for elem in page_elements:
            elem_name = elem["name"]
            elem_selectors = elem.get("selectors", [])
            
            # 取第一个可用的选择器
            for sel in elem_selectors:
                if sel.get("value"):
                    selectors_used[elem_name] = sel["value"]
                    break
        
        # 如果有自定义选择器，合并
        if config.selectors:
            selectors_used.update(config.selectors)
        
        # 执行提取（这里模拟，实际应该调用 Playwright）
        # 实际场景：
        # extracted_data = await browser.extract_texts(selectors_used)
        
        # 模拟提取结果
        result = {
            "success": True,
            "product_id": f"EXTRACT-{platform.upper()}-{page_type}",
            "product_url": f"https://{platform}.com/goods/EXAMPLE",
            "title": "从页面提取的标题",
            "price": "99.00",
            "raw_data": {
                "platform": platform,
                "page_type": page_type,
                "elements_found": len(page_elements)
            },
            "selectors_used": selectors_used
        }
        
        return ExtractionResult(**result)
        
    except Exception as e:
        return ExtractionResult(
            success=False,
            error=str(e)
        )


@router.get("/platform-elements/{platform}/{page_type}")
async def get_platform_page_elements(
    platform: str,
    page_type: str,
    db: Session = Depends(get_db)
):
    """
    获取平台特定页面的所有 DOM 元素
    
    用于前端展示和管理
    """
    try:
        normalized_platform = normalize_platform(platform)
        element_manager = ElementManager(db)
        
        elements = element_manager.get_page_elements(normalized_platform, page_type)
        
        # 格式化输出
        formatted_elements = []
        for elem in elements:
            selectors = elem.get("selectors", [])
            primary_selector = selectors[0] if selectors else {}
            
            formatted_elements.append({
                "name": elem["name"],
                "description": elem.get("description", ""),
                "selector_type": primary_selector.get("type", "css"),
                "selector_value": primary_selector.get("value", ""),
                "all_selectors": selectors,
                "version": elem.get("version", 1)
            })
        
        return {
            "success": True,
            "platform": normalized_platform,
            "page_type": page_type,
            "total": len(formatted_elements),
            "elements": formatted_elements
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extract-fields/{platform}/{page_type}")
async def get_extract_fields(
    platform: str,
    page_type: str,
    db: Session = Depends(get_db)
):
    """
    获取指定平台页面可提取的字段
    
    返回可用于提取的关键字段及其选择器
    """
    try:
        normalized_platform = normalize_platform(platform)
        element_manager = ElementManager(db)
        
        elements = element_manager.get_page_elements(normalized_platform, page_type)
        
        # 构建字段映射
        extractable_fields = {}
        for elem in elements:
            elem_name = elem["name"].lower()
            
            # 检查是否匹配已知字段
            for known_field, aliases in EXTRACTION_FIELD_MAPPING.items():
                if elem_name in aliases or known_field in elem_name:
                    selectors = elem.get("selectors", [])
                    if selectors:
                        extractable_fields[known_field] = {
                            "element_name": elem["name"],
                            "selector": selectors[0].get("value", ""),
                            "selector_type": selectors[0].get("type", "css"),
                            "all_selectors": selectors
                        }
                    break
            else:
                # 不匹配的字段也加入
                selectors = elem.get("selectors", [])
                if selectors:
                    extractable_fields[elem["name"]] = {
                        "element_name": elem["name"],
                        "selector": selectors[0].get("value", ""),
                        "selector_type": selectors[0].get("type", "css"),
                        "all_selectors": selectors
                    }
        
        return {
            "success": True,
            "platform": normalized_platform,
            "page_type": page_type,
            "extractable_fields": extractable_fields
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/page-types")
async def get_all_page_types():
    """
    获取所有支持的页面类型
    """
    return {
        "page_types": {
            "login": "登录页",
            "publish": "发布商品页",
            "publish_success": "发布成功页",
            "product_detail": "商品详情页",
            "order_list": "订单列表页",
            "order_detail": "订单详情页"
        }
    }


# 文档说明
EXTRACT_USAGE = """
## 使用示例

### 1. 获取可提取的字段
GET /api/extract/extract-fields/pinduoduo/publish_success

返回：
{
    "success": true,
    "extractable_fields": {
        "product_id": {
            "element_name": "product_id",
            "selector": "#goods-id",
            "selector_type": "css"
        },
        "product_url": {
            "element_name": "product_url",
            "selector": ".goods-link",
            "selector_type": "css"
        }
    }
}

### 2. 执行提取
POST /api/extract/product-info
{
    "platform": "拼多多",
    "page_type": "publish_success",
    "use_stored_elements": true
}

返回：
{
    "success": true,
    "product_id": "PPD-xxx",
    "product_url": "https://...",
    "title": "商品标题",
    "selectors_used": {
        "product_id": "#goods-id",
        "product_url": ".goods-link"
    }
}
"""
