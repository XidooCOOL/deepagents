"""
拼多多/电商平台商品发布模板
支持多数据源配置：一个链接 = 图片文件夹 + 链接参数 + SKU数据
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PlatformType(str, Enum):
    DOUYIN = "douyin"
    PINDUODUO = "pinduoduo"
    TAOBAO = "taobao"
    JD = "jd"
    XIAOHONGSHU = "xiaohongshu"


class DataSourceType(str, Enum):
    EXCEL = "excel"           # Excel文件
    CSV = "csv"               # CSV文件
    IMAGE_FOLDER = "image_folder"  # 图片文件夹
    JSON = "json"             # JSON数据


class FieldType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    IMAGE = "image"
    SELECT = "select"


# ==================== 数据源配置 ====================

class DataSource(BaseModel):
    """数据源配置"""
    id: str
    name: str
    type: DataSourceType
    
    # 文件类数据源
    file_path: Optional[str] = None
    
    # 图片文件夹类
    folder_path: Optional[str] = None
    include_subfolders: bool = False
    
    # Excel/CSV 配置
    sheet_name: Optional[str] = None
    has_header: bool = True
    start_row: int = 1  # 从哪一行开始读取
    
    # 字段定义
    fields: List["DataField"] = []
    
    # 预览数据
    preview: Optional[List[Dict]] = None


class DataField(BaseModel):
    """数据字段定义"""
    name: str              # 字段名（英文）
    label: str             # 显示名（中文）
    column_name: Optional[str] = None  # Excel列名（用于映射）
    field_type: FieldType = FieldType.TEXT
    
    # 验证规则
    required: bool = False
    default_value: Optional[Any] = None
    
    # 选项类字段
    options: Optional[List[str]] = None


# ==================== 发布模板 ====================

class PublishTemplate(BaseModel):
    """商品发布模板"""
    id: str
    name: str
    description: str = ""
    platform: PlatformType
    
    # 数据源配置（支持多个数据源）
    data_sources: List[DataSource] = []
    
    # 链接参数字段（来自 data_source）
    link_params: List[DataField] = []
    
    # SKU字段（来自 data_source）
    sku_fields: List[DataField] = []
    
    # 关联关系
    # 图片文件夹如何与参数数据关联
    folder_relation: Optional[Dict[str, str]] = None
    # 例如: {"folder_name": "标题"} 表示用标题作为文件夹名
    
    # 发布设置
    settings: "PublishSettings" = None
    
    # 状态
    is_active: bool = True
    use_count: int = 0
    created_at: datetime = None
    updated_at: datetime = None


class PublishSettings(BaseModel):
    """发布设置"""
    # 发布平台
    publish_platforms: List[PlatformType] = []
    
    # 自动处理
    auto_generate_title: bool = False
    auto_generate_desc: bool = False
    
    # 价格策略
    price_formula: Optional[str] = None  # 如: cost * 1.5
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    
    # 图片设置
    max_images: int = 9
    image_order: str = "sequence"  # sequence/folder_sort
    
    # SKU设置
    sku_merge: bool = False  # 多个SKU是否合并
    default_stock: int = 100


# ==================== 发布任务 ====================

class PublishJob(BaseModel):
    """发布任务"""
    id: str
    template_id: str
    template_name: str
    
    # 数据源配置
    data_source_configs: List["DataSourceConfig"] = []
    
    # 要发布的商品列表
    products: List["ProductToPublish"] = []
    
    # 任务设置
    settings: PublishSettings = None
    
    # 状态
    status: str = "pending"  # pending/running/completed/failed
    progress: float = 0.0
    
    # 统计
    total_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DataSourceConfig(BaseModel):
    """数据源配置实例"""
    data_source_id: str
    file_path: Optional[str] = None
    folder_path: Optional[str] = None
    mappings: Dict[str, str] = {}  # 模板字段 -> Excel列名
    filters: Dict[str, Any] = {}  # 数据过滤条件


class ProductToPublish(BaseModel):
    """待发布的商品"""
    id: str
    index: int  # 在数据源中的行号/序号
    
    # 图片文件夹
    image_folder: str
    images: List[str] = []
    
    # 链接参数
    link_params: Dict[str, Any] = {}
    
    # SKU数据
    sku_data: List[Dict[str, Any]] = []
    
    # 发布状态
    status: str = "pending"  # pending/running/success/failed
    error_message: Optional[str] = None
    
    # 平台发布结果
    platform_results: Dict[str, Any] = {}


# ==================== 示例模板配置 ====================

EXAMPLE_PINDUODUO_TEMPLATE = {
    "id": "pinduoduo_product_template",
    "name": "拼多多商品发布模板",
    "description": "适用于拼多多平台的商品批量发布",
    "platform": "pinduoduo",
    
    "data_sources": [
        {
            "id": "link_params",
            "name": "链接参数表",
            "type": "excel",
            "file_path": "",
            "sheet_name": "Sheet1",
            "fields": [
                {"name": "title", "label": "商品标题", "required": True},
                {"name": "price", "label": "商品价格", "required": True, "field_type": "number"},
                {"name": "origin", "label": "产地"},
                {"name": "brand", "label": "品牌"},
                {"name": "category", "label": "分类"},
                {"name": "description", "label": "商品描述", "field_type": "text"}
            ]
        },
        {
            "id": "sku_data",
            "name": "SKU数据表",
            "type": "excel",
            "file_path": "",
            "sheet_name": "Sheet1",
            "fields": [
                {"name": "sku_id", "label": "SKU编号", "required": True},
                {"name": "specs", "label": "规格"},
                {"name": "stock", "label": "库存", "required": True, "field_type": "number"},
                {"name": "price", "label": "SKU价格", "field_type": "number"}
            ]
        },
        {
            "id": "images",
            "name": "图片文件夹",
            "type": "image_folder",
            "folder_path": "",
            "include_subfolders": True,
            "fields": []
        }
    ],
    
    "link_params": [
        {"name": "title", "label": "商品标题", "required": True},
        {"name": "price", "label": "商品价格", "required": True, "field_type": "number"},
        {"name": "origin", "label": "产地"},
        {"name": "brand", "label": "品牌"},
        {"name": "category", "label": "分类"}
    ],
    
    "sku_fields": [
        {"name": "sku_id", "label": "SKU编号", "required": True},
        {"name": "specs", "label": "规格"},
        {"name": "stock", "label": "库存", "required": True, "field_type": "number"}
    ],
    
    "folder_relation": {
        "folder_pattern": "{title}",  # 文件夹名用标题
        "match_field": "title"
    },
    
    "settings": {
        "publish_platforms": ["pinduoduo"],
        "auto_generate_title": False,
        "price_formula": None,
        "max_images": 9,
        "default_stock": 100
    }
}


# ==================== 使用流程 ====================

USAGE_FLOW = """
商品批量发布使用流程：

1️⃣ 创建模板
   - 配置数据源：链接参数Excel、SKU Excel、图片文件夹
   - 定义字段映射关系
   - 设置发布规则

2️⃣ 选择数据
   - 上传/选择链接参数Excel
   - 上传/选择SKU Excel
   - 指定图片文件夹根目录

3️⃣ 数据关联
   - 系统根据标题自动匹配对应图片文件夹
   - 可手动调整关联关系

4️⃣ 预览确认
   - 预览所有待发布的商品列表
   - 检查图片、参数、SKU是否正确

5️⃣ 执行发布
   - 选择目标平台
   - 批量执行发布任务
   - 实时查看进度和结果
"""
