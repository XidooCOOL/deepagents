"""
已发布商品数据库模型
记录发布成功的商品信息
"""
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, JSON, ForeignKey
from datetime import datetime

from .database import Base


class PublishedProduct(Base):
    """已发布商品记录"""
    __tablename__ = "published_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 商品基本信息
    title = Column(String(200), nullable=False, comment="商品标题")
    description = Column(Text, comment="商品描述")
    
    # 发布信息
    platform_product_id = Column(String(100), unique=True, nullable=False, comment="平台商品ID")
    platform_url = Column(String(500), comment="商品链接URL")
    
    # 平台和店铺
    platform = Column(String(50), nullable=False, comment="发布平台")
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True, comment="店铺ID")
    store_name = Column(String(100), comment="店铺名称")
    
    # 价格信息
    price = Column(Float, nullable=False, comment="商品价格")
    original_price = Column(Float, comment="原价")
    
    # SKU信息
    sku_count = Column(Integer, default=0, comment="SKU数量")
    sku_data = Column(JSON, comment="SKU详细信息")
    
    # 图片信息
    images = Column(JSON, default=list, comment="商品图片列表")
    
    # 来源信息
    source_link_params = Column(JSON, comment="来源链接参数")
    source_sku = Column(JSON, comment="来源SKU数据")
    source_folder = Column(String(500), comment="来源图片文件夹")
    
    # 状态
    status = Column(String(20), default="published", comment="状态：published/offline/deleted")
    is_active = Column(Boolean, default=True, comment="是否有效")
    
    # 关联
    template_id = Column(String(100), comment="使用的发布模板ID")
    task_id = Column(String(100), comment="关联的任务ID")
    
    # 审核信息
    review_status = Column(String(20), default="pending", comment="审核状态")
    review_message = Column(String(200), comment="审核信息")
    
    # 时间戳
    published_at = Column(DateTime, default=datetime.now, comment="发布时间")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    offline_at = Column(DateTime, nullable=True, comment="下架时间")
    
    # 统计
    view_count = Column(Integer, default=0, comment="浏览量")
    sales_count = Column(Integer, default=0, comment="销量")
    
    def __repr__(self):
        return f"<PublishedProduct(id={self.id}, title='{self.title}', platform='{self.platform}', product_id='{self.platform_product_id}')>"


class PublishRecord(Base):
    """发布记录"""
    __tablename__ = "publish_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 关联的已发布商品
    product_id = Column(Integer, ForeignKey("published_products.id"), nullable=True)
    
    # 任务信息
    task_id = Column(String(100), nullable=False, comment="任务ID")
    task_name = Column(String(200), comment="任务名称")
    
    # 操作信息
    action = Column(String(50), nullable=False, comment="操作类型：publish/offline/update/delete")
    status = Column(String(20), nullable=False, comment="状态：success/failed/partial")
    
    # 平台信息
    platform = Column(String(50), nullable=False, comment="平台")
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    store_name = Column(String(100), comment="店铺名称")
    
    # 商品信息
    product_title = Column(String(200), comment="商品标题")
    platform_product_id = Column(String(100), comment="平台商品ID")
    
    # 请求和响应
    request_data = Column(JSON, comment="请求数据")
    response_data = Column(JSON, comment="响应数据")
    error_message = Column(Text, comment="错误信息")
    
    # 截图
    screenshot_path = Column(String(500), comment="操作截图路径")
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<PublishRecord(id={self.id}, action='{self.action}', status='{self.status}')>"
