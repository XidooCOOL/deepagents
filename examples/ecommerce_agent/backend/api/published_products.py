"""
已发布商品 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.database.models import get_db
from backend.database.publish_models import PublishedProduct, PublishRecord

router = APIRouter(prefix="/api/published", tags=["已发布商品"])


# ==================== Pydantic Models ====================

class PublishRecordCreate(BaseModel):
    title: str
    platform_product_id: str
    platform_url: Optional[str] = None
    platform: str
    store_id: Optional[int] = None
    store_name: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    description: Optional[str] = None
    sku_count: int = 0
    sku_data: Optional[List[Dict]] = []
    images: Optional[List[str]] = []
    source_link_params: Optional[Dict] = {}
    source_sku: Optional[Dict] = {}
    source_folder: Optional[str] = None
    template_id: Optional[str] = None
    task_id: Optional[str] = None


class PublishRecordResponse(BaseModel):
    id: int
    title: str
    platform_product_id: str
    platform_url: Optional[str]
    platform: str
    store_name: Optional[str]
    price: float
    original_price: Optional[float]
    status: str
    published_at: datetime
    sku_count: int
    view_count: int
    sales_count: int

    class Config:
        from_attributes = True


class PublishRecordUpdate(BaseModel):
    status: Optional[str] = None
    platform_url: Optional[str] = None
    review_status: Optional[str] = None
    review_message: Optional[str] = None
    view_count: Optional[int] = None
    sales_count: Optional[int] = None


# ==================== API Endpoints ====================

@router.post("/products", response_model=Dict[str, Any])
async def create_published_product(
    record: PublishRecordCreate,
    db: Session = Depends(get_db)
):
    """创建已发布商品记录"""
    try:
        # 检查是否已存在
        existing = db.query(PublishedProduct).filter(
            PublishedProduct.platform_product_id == record.platform_product_id
        ).first()
        
        if existing:
            # 更新已有记录
            for key, value in record.model_dump().items():
                if value is not None and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.now()
            db.commit()
            db.refresh(existing)
            return {
                "success": True,
                "message": "商品记录已更新",
                "data": {
                    "id": existing.id,
                    "platform_product_id": existing.platform_product_id,
                    "platform": existing.platform
                }
            }
        
        # 创建新记录
        db_record = PublishedProduct(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        return {
            "success": True,
            "message": "商品记录已创建",
            "data": {
                "id": db_record.id,
                "platform_product_id": db_record.platform_product_id,
                "platform": db_record.platform
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products", response_model=List[PublishRecordResponse])
async def get_published_products(
    platform: Optional[str] = Query(None),
    store_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """获取已发布商品列表"""
    query = db.query(PublishedProduct)
    
    if platform:
        query = query.filter(PublishedProduct.platform == platform)
    if store_id:
        query = query.filter(PublishedProduct.store_id == store_id)
    if status:
        query = query.filter(PublishedProduct.status == status)
    if keyword:
        query = query.filter(PublishedProduct.title.like(f"%{keyword}%"))
    
    total = query.count()
    products = query.order_by(PublishedProduct.published_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return products


@router.get("/products/{product_id}", response_model=Dict[str, Any])
async def get_published_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """获取已发布商品详情"""
    product = db.query(PublishedProduct).filter(
        PublishedProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "platform_product_id": product.platform_product_id,
        "platform_url": product.platform_url,
        "platform": product.platform,
        "store_id": product.store_id,
        "store_name": product.store_name,
        "price": product.price,
        "original_price": product.original_price,
        "sku_count": product.sku_count,
        "sku_data": product.sku_data,
        "images": product.images,
        "status": product.status,
        "is_active": product.is_active,
        "published_at": product.published_at,
        "updated_at": product.updated_at,
        "view_count": product.view_count,
        "sales_count": product.sales_count
    }


@router.put("/products/{product_id}")
async def update_published_product(
    product_id: int,
    update_data: PublishRecordUpdate,
    db: Session = Depends(get_db)
):
    """更新已发布商品"""
    product = db.query(PublishedProduct).filter(
        PublishedProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None and hasattr(product, key):
            setattr(product, key, value)
    
    product.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "更新成功"}


@router.delete("/products/{product_id}")
async def delete_published_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """删除已发布商品（软删除）"""
    product = db.query(PublishedProduct).filter(
        PublishedProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    product.is_active = False
    product.status = "deleted"
    product.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "删除成功"}


@router.post("/offline/{product_id}")
async def offline_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """下架商品"""
    product = db.query(PublishedProduct).filter(
        PublishedProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    product.status = "offline"
    product.offline_at = datetime.now()
    product.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "下架成功"}


@router.post("/relist/{product_id}")
async def relist_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """重新上架"""
    product = db.query(PublishedProduct).filter(
        PublishedProduct.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    product.status = "published"
    product.offline_at = None
    product.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "上架成功"}


# ==================== 统计 API ====================

@router.get("/stats")
async def get_publish_stats(
    platform: Optional[str] = Query(None),
    store_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """获取发布统计"""
    query = db.query(PublishedProduct).filter(PublishedProduct.is_active == True)
    
    if platform:
        query = query.filter(PublishedProduct.platform == platform)
    if store_id:
        query = query.filter(PublishedProduct.store_id == store_id)
    
    products = query.all()
    
    stats = {
        "total": len(products),
        "published": len([p for p in products if p.status == "published"]),
        "offline": len([p for p in products if p.status == "offline"]),
        "by_platform": {},
        "total_sales": sum(p.sales_count for p in products),
        "total_views": sum(p.view_count for p in products)
    }
    
    for product in products:
        platform_name = product.platform
        if platform_name not in stats["by_platform"]:
            stats["by_platform"][platform_name] = 0
        stats["by_platform"][platform_name] += 1
    
    return stats


@router.get("/search")
async def search_published_products(
    keyword: str = Query(...),
    platform: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """搜索已发布商品"""
    query = db.query(PublishedProduct).filter(
        PublishedProduct.is_active == True,
        PublishedProduct.title.like(f"%{keyword}%")
    )
    
    if platform:
        query = query.filter(PublishedProduct.platform == platform)
    
    total = query.count()
    products = query.order_by(PublishedProduct.published_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": p.id,
                "title": p.title,
                "platform": p.platform,
                "platform_product_id": p.platform_product_id,
                "price": p.price,
                "status": p.status,
                "published_at": p.published_at
            }
            for p in products
        ]
    }


# ==================== 批量操作 API ====================

@router.post("/batch-offline")
async def batch_offline_products(
    product_ids: List[int],
    db: Session = Depends(get_db)
):
    """批量下架"""
    count = 0
    for product_id in product_ids:
        product = db.query(PublishedProduct).filter(
            PublishedProduct.id == product_id
        ).first()
        if product:
            product.status = "offline"
            product.offline_at = datetime.now()
            count += 1
    
    db.commit()
    
    return {"success": True, "message": f"已下架 {count} 个商品"}
