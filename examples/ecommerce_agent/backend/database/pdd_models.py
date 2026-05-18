from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean
from backend.database.models import Base
from datetime import datetime


class PddStore(Base):
    """拼多多店铺"""
    __tablename__ = 'pdd_stores'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_name = Column(String(255), nullable=False, unique=True)
    shop_id = Column(String(100), nullable=False)
    admin_name = Column(String(100))
    status = Column(String(50), default='inactive')
    cdp_port = Column(Integer)
    is_running = Column(Boolean, default=False)
    last_extract = Column(DateTime)
    last_login = Column(DateTime)
    config = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'shop_name': self.shop_name,
            'shop_id': self.shop_id,
            'admin_name': self.admin_name,
            'status': self.status,
            'cdp_port': self.cdp_port,
            'is_running': self.is_running,
            'last_extract': self.last_extract.isoformat() if self.last_extract else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PddSalesData(Base):
    """拼多多销售数据"""
    __tablename__ = 'pdd_sales_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    orders = Column(Integer, default=0)
    gmv = Column(Float, default=0.0)
    visitors = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    avg_order_value = Column(Float, default=0.0)
    refund_amount = Column(Float, default=0.0)
    payment_amount = Column(Float, default=0.0)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'date': self.date.isoformat() if self.date else None,
            'orders': self.orders,
            'gmv': self.gmv,
            'visitors': self.visitors,
            'conversion_rate': self.conversion_rate,
            'avg_order_value': self.avg_order_value,
            'refund_amount': self.refund_amount,
            'payment_amount': self.payment_amount,
        }


class PddServicePerformance(Base):
    """拼多多客服绩效"""
    __tablename__ = 'pdd_service_performance'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    cs_name = Column(String(100))
    response_rate = Column(Float, default=0.0)
    satisfaction = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    total_inquiries = Column(Integer, default=0)
    resolved_inquiries = Column(Integer, default=0)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'date': self.date.isoformat() if self.date else None,
            'cs_name': self.cs_name,
            'response_rate': self.response_rate,
            'satisfaction': self.satisfaction,
            'avg_response_time': self.avg_response_time,
            'total_inquiries': self.total_inquiries,
            'resolved_inquiries': self.resolved_inquiries,
        }


class PddAdsData(Base):
    """拼多多推广数据"""
    __tablename__ = 'pdd_ads_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    spend = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    orders = Column(Integer, default=0)
    gmv = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    ctr = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    cvr = Column(Float, default=0.0)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'date': self.date.isoformat() if self.date else None,
            'spend': self.spend,
            'impressions': self.impressions,
            'clicks': self.clicks,
            'orders': self.orders,
            'gmv': self.gmv,
            'roi': self.roi,
            'ctr': self.ctr,
            'cpc': self.cpc,
            'cvr': self.cvr,
        }


class PddReview(Base):
    """拼多多评价数据"""
    __tablename__ = 'pdd_reviews'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    order_id = Column(String(100))
    product_name = Column(String(500))
    rating = Column(Integer)
    content = Column(Text)
    buyer_name = Column(String(100))
    review_time = Column(DateTime)
    has_reply = Column(Boolean, default=False)
    reply_content = Column(Text)
    reply_time = Column(DateTime)
    is_reported = Column(Boolean, default=False)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'order_id': self.order_id,
            'product_name': self.product_name,
            'rating': self.rating,
            'content': self.content,
            'buyer_name': self.buyer_name,
            'review_time': self.review_time.isoformat() if self.review_time else None,
            'has_reply': self.has_reply,
            'reply_content': self.reply_content,
            'is_reported': self.is_reported,
        }


class PddTaskRecord(Base):
    """拼多多任务记录"""
    __tablename__ = 'pdd_task_records'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_type = Column(String(50), nullable=False)
    store_id = Column(Integer)
    stores = Column(JSON)
    status = Column(String(50), default='pending')
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    result = Column(JSON)
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'task_type': self.task_type,
            'store_id': self.store_id,
            'stores': self.stores,
            'status': self.status,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'result': self.result,
            'error': self.error,
        }


class PddConfig(Base):
    """拼多多系统配置"""
    __tablename__ = 'pdd_config'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String(100), unique=True, nullable=False)
    config_value = Column(JSON)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'config_key': self.config_key,
            'config_value': self.config_value,
            'description': self.description,
        }


from datetime import date
