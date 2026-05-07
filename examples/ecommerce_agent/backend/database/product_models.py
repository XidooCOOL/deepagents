"""
商品库数据库模型
支持商品管理、商品模板、图片库
"""
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class ProductStatus(enum.Enum):
    DRAFT = "draft"           # 草稿
    READY = "ready"          # 待发布
    PUBLISHED = "published"   # 已发布
    OFFLINE = "offline"      # 已下架


class ProductGroup(Base):
    """商品分组"""
    __tablename__ = "product_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="分组名称")
    description = Column(Text, comment="分组描述")
    parent_id = Column(Integer, ForeignKey("product_groups.id"), nullable=True, comment="父分组ID")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    products = relationship("Product", back_populates="group")
    children = relationship("ProductGroup", backref="parent", remote_side=[id])


class Product(Base):
    """商品表"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), unique=True, nullable=False, comment="商品ID")
    
    # 基础信息
    title = Column(String(200), nullable=False, comment="商品标题")
    description = Column(Text, comment="商品描述")
    category = Column(String(50), comment="商品分类")
    tags = Column(JSON, default=list, comment="商品标签")
    
    # 价格信息
    price = Column(Float, nullable=False, comment="商品价格")
    original_price = Column(Float, comment="原价")
    cost_price = Column(Float, comment="成本价")
    profit_margin = Column(Float, comment="利润率")
    
    # 库存
    stock = Column(Integer, default=0, comment="库存数量")
    low_stock_threshold = Column(Integer, default=10, comment="低库存阈值")
    
    # 图片
    images = Column(JSON, default=list, comment="图片路径列表")
    thumbnail = Column(String(500), comment="缩略图路径")
    main_image = Column(String(500), comment="主图路径")
    
    # 状态
    status = Column(String(20), default="draft", comment="状态：draft/ready/published/offline")
    is_featured = Column(Boolean, default=False, comment="是否推荐")
    
    # 关联
    group_id = Column(Integer, ForeignKey("product_groups.id"), nullable=True, comment="分组ID")
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True, comment="店铺ID")
    template_id = Column(Integer, ForeignKey("product_templates.id"), nullable=True, comment="使用的模板ID")
    
    # Excel 来源
    excel_source = Column(String(500), comment="来源Excel文件")
    excel_row = Column(Integer, comment="来源Excel行号")
    
    # 平台发布信息
    platform_published = Column(JSON, default=dict, comment="各平台发布状态 {platform: {product_id, status, url}}")
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    published_at = Column(DateTime, nullable=True, comment="发布时间")
    
    # 关系
    group = relationship("ProductGroup", back_populates="products")
    store = relationship("Store", back_populates="products")
    template = relationship("ProductTemplate", back_populates="products")


class ProductTemplate(Base):
    """商品模板"""
    __tablename__ = "product_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="模板名称")
    description = Column(Text, comment="模板描述")
    
    # 标题和描述模板（支持变量占位符）
    title_template = Column(String(500), comment="标题模板 {name} - {brand}")
    description_template = Column(Text, comment="描述模板")
    
    # 价格配置
    default_price = Column(Float, comment="默认价格")
    price_range_min = Column(Float, comment="价格区间最小值")
    price_range_max = Column(Float, comment="价格区间最大值")
    price_formula = Column(String(200), comment="价格计算公式，如: cost * 1.5")
    
    # 默认图片
    default_images_folder = Column(String(500), comment="默认图片文件夹路径")
    default_images = Column(JSON, default=list, comment="默认图片列表")
    
    # 参数映射（Excel列名 -> 模板变量）
    column_mappings = Column(JSON, default=dict, comment="列映射 {excel列名: 模板变量}")
    
    # 分类和标签
    category = Column(String(50), comment="默认分类")
    default_tags = Column(JSON, default=list, comment="默认标签")
    
    # 工作流关联
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True, comment="关联工作流")
    
    # 设置
    is_active = Column(Boolean, default=True, comment="是否启用")
    sort_order = Column(Integer, default=0, comment="排序")
    
    # 统计
    use_count = Column(Integer, default=0, comment="使用次数")
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    products = relationship("Product", back_populates="template")


class ProductImage(Base):
    """图片库"""
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 路径信息
    original_path = Column(String(500), nullable=False, comment="原始路径")
    relative_path = Column(String(500), comment="相对路径")
    thumbnail_path = Column(String(500), comment="缩略图路径")
    
    # 文件信息
    filename = Column(String(200), nullable=False, comment="文件名")
    file_size = Column(Integer, comment="文件大小（字节）")
    file_type = Column(String(20), comment="文件类型")
    width = Column(Integer, comment="图片宽度")
    height = Column(Integer, comment="图片高度")
    
    # 目录信息
    folder = Column(String(500), comment="所属文件夹")
    folder_hash = Column(String(64), comment="文件夹哈希（用于去重）")
    
    # 标签和分组
    tags = Column(JSON, default=list, comment="图片标签")
    category = Column(String(50), comment="图片分类")
    
    # 使用统计
    use_count = Column(Integer, default=0, comment="使用次数")
    last_used_at = Column(DateTime, nullable=True, comment="最后使用时间")
    
    # 状态
    is_favorite = Column(Boolean, default=False, comment="是否收藏")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ImageFolder(Base):
    """图片文件夹配置"""
    __tablename__ = "image_folders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="文件夹名称")
    path = Column(String(500), nullable=False, unique=True, comment="文件夹路径")
    
    # 读取设置
    include_subfolders = Column(Boolean, default=False, comment="包含子文件夹")
    recursive_scan = Column(Boolean, default=False, comment="递归扫描")
    
    # 过滤设置
    allowed_extensions = Column(JSON, default=lambda: ["jpg", "jpeg", "png", "gif", "webp"], 
                               comment="允许的扩展名")
    exclude_patterns = Column(JSON, default=list, comment="排除模式")
    
    # 统计
    total_images = Column(Integer, default=0, comment="图片总数")
    last_scan_at = Column(DateTime, nullable=True, comment="最后扫描时间")
    
    # 状态
    is_active = Column(Boolean, default=True, comment="是否启用")
    auto_sync = Column(Boolean, default=False, comment="自动同步")
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ExcelTemplate(Base):
    """Excel模板"""
    __tablename__ = "excel_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="模板名称")
    description = Column(Text, comment="模板描述")
    
    # 文件信息
    file_path = Column(String(500), nullable=False, comment="文件路径")
    file_hash = Column(String(64), comment="文件哈希")
    sheet_name = Column(String(100), default="Sheet1", comment="工作表名称")
    has_header = Column(Boolean, default=True, comment="是否有表头")
    
    # 列配置
    columns = Column(JSON, default=list, comment="列配置 [{name, index, type, required, mapping}]")
    
    # 预览
    preview_rows = Column(Integer, default=5, comment="预览行数")
    preview_data = Column(JSON, default=list, comment="预览数据")
    
    # 映射配置
    field_mappings = Column(JSON, default=dict, comment="字段映射")
    
    # 统计
    total_rows = Column(Integer, default=0, comment="总行数")
    used_rows = Column(Integer, default=0, comment="已使用行数")
    
    # 设置
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ProductDraft(Base):
    """商品草稿（用于发布前编辑）"""
    __tablename__ = "product_drafts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 关联
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, comment="关联商品ID")
    template_id = Column(Integer, ForeignKey("product_templates.id"), nullable=True, comment="关联模板ID")
    excel_row = Column(Integer, comment="Excel行号")
    
    # 草稿数据
    draft_data = Column(JSON, nullable=False, comment="草稿数据")
    
    # 状态
    status = Column(String(20), default="editing", comment="状态：editing/confirmed/published")
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
