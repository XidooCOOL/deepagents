"""
从页面 DOM 提取商品信息
发布成功后，从页面元素中提取商品标题、ID、链接等信息
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter(prefix="/api/extract", tags=["DOM元素提取"])


class ExtractionConfig(BaseModel):
    """提取配置"""
    platform: str
    page_type: str  # publish_success, product_detail, etc.
    selectors: Dict[str, str]  # {field_name: selector}
    
    # 可选：使用预配置的 DOM 元素
    use_stored_elements: bool = False
    element_names: List[str] = []  # 使用预存的元素名称


class ExtractionResult(BaseModel):
    """提取结果"""
    success: bool
    product_id: Optional[str] = None
    product_url: Optional[str] = None
    title: Optional[str] = None
    price: Optional[float] = None
    raw_data: Dict[str, Any] = {}
    error: Optional[str] = None


# 预定义的平台提取配置
PLATFORM_EXTRACTION_CONFIGS = {
    "pinduoduo": {
        "publish_success": {
            "product_id": "#goods-id, [data-goods-id], .goods-id",
            "product_url": ".goods-link, [href*='goods']",
            "title": ".goods-title, .item-title",
            "price": ".goods-price, .price"
        },
        "product_detail": {
            "product_id": "[data-goods-id], #goodsId",
            "title": ".goods-title",
            "price": ".price"
        }
    },
    "douyin": {
        "publish_success": {
            "product_id": "[data-product-id], .product-id",
            "product_url": "a[href*='product']",
            "title": ".product-title"
        },
        "product_detail": {
            "product_id": "[data-product-id]"
        }
    },
    "taobao": {
        "publish_success": {
            "product_id": "#itemId, [data-item-id]",
            "product_url": ".item-link"
        }
    },
    "jd": {
        "publish_success": {
            "product_id": "[data-sku]"
        }
    }
}


@router.post("/product-info", response_model=ExtractionResult)
async def extract_product_info(config: ExtractionConfig):
    """
    从页面 DOM 提取商品信息
    
    流程：
    1. 根据平台和页面类型获取提取配置
    2. 如果使用预配置元素，从数据库获取选择器
    3. 执行提取逻辑（实际由 Playwright 执行）
    4. 返回提取结果
    """
    try:
        # 获取提取配置
        selectors = config.selectors
        
        if config.use_stored_elements:
            # 从预配置元素获取选择器
            selectors = await get_selectors_from_elements(config)
        
        if not selectors:
            # 使用默认配置
            platform_configs = PLATFORM_EXTRACTION_CONFIGS.get(config.platform.lower(), {})
            page_config = platform_configs.get(config.page_type, {})
            selectors = page_config
        
        # 执行提取（模拟）
        # 实际场景中，这里会调用 Playwright 执行真正的提取
        result = {
            "success": True,
            "product_id": f"EXTRACT-{config.platform.upper()}-{config.page_type}",
            "product_url": f"https://{config.platform}.com/goods/EXAMPLE",
            "title": "提取的商品标题",
            "raw_data": {
                "selectors_used": selectors,
                "page_type": config.page_type
            }
        }
        
        return ExtractionResult(**result)
        
    except Exception as e:
        return ExtractionResult(
            success=False,
            error=str(e)
        )


async def get_selectors_from_elements(config: ExtractionConfig) -> Dict[str, str]:
    """
    从预配置的 DOM 元素获取选择器
    """
    # 实际场景：从数据库读取元素配置
    return {}


@router.get("/platform-configs")
async def get_platform_configs():
    """获取所有平台的提取配置"""
    return {
        platform: {
            "pages": list(pages.keys()),
            "selectors": pages
        }
        for platform, pages in PLATFORM_EXTRACTION_CONFIGS.items()
    }


@router.post("/validate-selectors")
async def validate_selectors(config: ExtractionConfig):
    """
    验证选择器是否有效
    """
    # 实际场景：使用 Playwright 测试选择器
    return {
        "valid": True,
        "message": "选择器验证通过"
    }


# 示例：拼多多发布成功页面提取配置
PINDUODUO_PUBLISH_SUCCESS_EXAMPLE = """
拼多多发布成功页面提取配置示例：

1. 商品ID选择器：
   - CSS: #goods-id
   - CSS: [data-goods-id]
   - CSS: .goods-id
   - XPath: //*[contains(@class, 'goods-id')]

2. 商品链接选择器：
   - CSS: .goods-link
   - XPath: //a[contains(@href, 'goods')]

3. 商品标题选择器：
   - CSS: .goods-title
   - CSS: .item-title
   - XPath: //*[contains(@class, 'title')]

4. 商品价格选择器：
   - CSS: .goods-price
   - CSS: .price

使用方法：
POST /api/extract/product-info
{
    "platform": "pinduoduo",
    "page_type": "publish_success",
    "selectors": {
        "product_id": "#goods-id",
        "product_url": ".goods-link",
        "title": ".goods-title"
    }
}
"""
