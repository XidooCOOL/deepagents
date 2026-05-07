"""
商品库 API 接口
图片管理、Excel 模板、商品 CRUD
"""
import os
import json
import hashlib
import mimetypes
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import math

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
import shutil

router = APIRouter(prefix="/api/product-library", tags=["商品库"])


# ==================== 数据模型 ====================

class ImageInfo(BaseModel):
    path: str
    filename: str
    relative_path: str
    file_size: int
    file_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail: Optional[str] = None


class FolderScanRequest(BaseModel):
    path: str
    include_subfolders: bool = False
    extensions: List[str] = ["jpg", "jpeg", "png", "gif", "webp"]
    max_count: int = 1000


class FolderScanResult(BaseModel):
    total: int
    images: List[ImageInfo]
    folders: List[str]
    scan_time: float


class ExcelPreviewRequest(BaseModel):
    file_path: str
    sheet_index: int = 0
    max_rows: int = 10


class ExcelColumn(BaseModel):
    index: int
    name: str
    type: str
    sample_values: List[Any]
    required: bool = False


class ExcelPreviewResult(BaseModel):
    columns: List[ExcelColumn]
    rows: List[Dict]
    total_rows: int
    file_info: Dict[str, Any]


# ==================== 工具函数 ====================

def get_file_info(file_path: str) -> Dict[str, Any]:
    """获取文件信息"""
    stat = os.stat(file_path)
    path_obj = Path(file_path)
    
    return {
        "filename": path_obj.name,
        "size": stat.st_size,
        "size_formatted": format_file_size(stat.st_size),
        "extension": path_obj.suffix.lower(),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
    }


def format_file_size(size: int) -> str:
    """格式化文件大小"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def get_image_dimensions(file_path: str) -> tuple:
    """获取图片尺寸（需要 PIL，但这里是简化版）"""
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            return img.size
    except:
        return None, None


def generate_thumbnail_path(image_path: str, thumbnail_dir: str = "data/thumbnails") -> str:
    """生成缩略图路径"""
    path_obj = Path(image_path)
    thumbnail_name = f"{path_obj.stem}_thumb{path_obj.suffix}"
    return os.path.join(thumbnail_dir, path_obj.parent.name, thumbnail_name)


# ==================== 图片管理 API ====================

@router.post("/scan-folder")
async def scan_folder(request: FolderScanRequest):
    """扫描文件夹获取图片"""
    import time
    start_time = time.time()
    
    if not os.path.exists(request.path):
        raise HTTPException(status_code=400, detail=f"路径不存在: {request.path}")
    
    if not os.path.isdir(request.path):
        raise HTTPException(status_code=400, detail=f"路径不是文件夹: {request.path}")
    
    images = []
    folders = set()
    extensions = [f".{ext.lower()}" for ext in request.extensions]
    
    try:
        for root, dirs, files in os.walk(request.path):
            # 记录子文件夹
            if request.include_subfolders and root != request.path:
                folders.add(os.path.relpath(root, request.path))
            
            for file in files:
                if len(images) >= request.max_count:
                    break
                    
                file_ext = os.path.splitext(file)[1].lower()
                if file_ext in extensions:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, request.path)
                    
                    try:
                        stat = os.stat(full_path)
                        width, height = get_image_dimensions(full_path)
                        
                        # 计算缩放比例
                        display_width = 200
                        display_height = 200
                        if width and height:
                            ratio = min(display_width / width, display_height / height)
                            display_width = int(width * ratio)
                            display_height = int(height * ratio)
                        
                        images.append({
                            "path": full_path,
                            "filename": file,
                            "relative_path": rel_path,
                            "file_size": stat.st_size,
                            "file_size_formatted": format_file_size(stat.st_size),
                            "file_type": file_ext[1:],
                            "width": width,
                            "height": height,
                            "display_width": display_width,
                            "display_height": display_height,
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except Exception as e:
                        continue
            
            if len(images) >= request.max_count:
                break
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"扫描失败: {str(e)}")
    
    scan_time = time.time() - start_time
    
    return {
        "total": len(images),
        "images": images,
        "folders": list(folders),
        "scan_time": round(scan_time, 2)
    }


@router.get("/image/{filename:path}")
async def get_image(filename: str, width: int = Query(None), height: int = Query(None)):
    """获取图片，支持缩放"""
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="图片不存在")
    
    # 如果需要缩放，动态生成缩略图
    if width or height:
        try:
            from PIL import Image
            
            with Image.open(filename) as img:
                original_width, original_height = img.size
                
                # 计算缩放比例
                if width and height:
                    ratio = min(width / original_width, height / original_height)
                elif width:
                    ratio = width / original_width
                else:
                    ratio = height / original_height
                
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
                
                # 缩放
                resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # 保存到内存
                import io
                output = io.BytesIO()
                resized.save(output, format=img.format or 'JPEG')
                output.seek(0)
                
                return StreamingResponse(output, media_type=f"image/{img.format.lower()}")
                
        except ImportError:
            pass
    
    # 直接返回原图
    return FileResponse(filename)


@router.get("/folder-tree")
async def get_folder_tree(root_path: str = None):
    """获取文件夹树形结构"""
    if not root_path:
        # 默认数据目录
        root_path = os.path.join(os.getcwd(), "data", "images")
    
    if not os.path.exists(root_path):
        return {"total": 0, "folders": []}
    
    folders = []
    
    def scan(path: str, depth: int = 0):
        if depth > 3:  # 最多3层
            return
        
        try:
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path):
                    folders.append({
                        "name": item,
                        "path": item_path,
                        "depth": depth,
                        "has_images": any(
                            f.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp'))
                            for f in os.listdir(item_path) if os.path.isfile(os.path.join(item_path, f))
                        )
                    })
                    scan(item_path, depth + 1)
        except PermissionError:
            pass
    
    scan(root_path)
    
    return {"total": len(folders), "folders": folders}


@router.post("/batch-select")
async def batch_select_images(paths: List[str]):
    """批量获取图片信息"""
    images = []
    
    for path in paths:
        if os.path.exists(path) and os.path.isfile(path):
            images.append(get_file_info(path))
    
    return {"total": len(images), "images": images}


# ==================== Excel 管理 API ====================

@router.post("/excel/preview")
async def preview_excel(request: ExcelPreviewRequest):
    """预览 Excel 文件"""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=400, detail=f"文件不存在: {request.file_path}")
    
    file_ext = os.path.splitext(request.file_path)[1].lower()
    
    if file_ext not in ['.xlsx', '.xls', '.csv']:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx, .xls, .csv 文件")
    
    try:
        # 读取 Excel
        if file_ext == '.csv':
            import pandas as pd
            df = pd.read_csv(request.file_path, nrows=request.max_rows + 1, encoding='utf-8')
        else:
            import pandas as pd
            df = pd.read_excel(request.file_path, sheet_name=request.sheet_index, nrows=request.max_rows + 1)
        
        # 文件信息
        file_info = get_file_info(request.file_path)
        file_info["total_rows"] = len(pd.read_excel(request.file_path, sheet_name=request.sheet_index) if file_ext != '.csv' else pd.read_csv(request.file_path))
        
        # 列信息
        columns = []
        for idx, col_name in enumerate(df.columns):
            col_type = str(df[col_name].dtype)
            sample_values = df[col_name].dropna().head(3).tolist()
            
            columns.append({
                "index": idx,
                "name": str(col_name),
                "type": infer_column_type(df[col_name]),
                "sample_values": [str(v) for v in sample_values],
                "required": False
            })
        
        # 数据行
        rows = df.head(request.max_rows).fillna("").to_dict('records')
        rows = [{str(k): str(v) for k, v in row.items()} for row in rows]
        
        return {
            "columns": columns,
            "rows": rows,
            "total_rows": file_info["total_rows"],
            "file_info": file_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取失败: {str(e)}")


def infer_column_type(series) -> str:
    """推断列类型"""
    if series.dtype == 'object':
        # 检查是否像数字
        try:
            series.astype(float)
            return "number"
        except:
            pass
        return "text"
    elif 'int' in str(series.dtype) or 'float' in str(series.dtype):
        return "number"
    elif 'datetime' in str(series.dtype):
        return "date"
    return "text"


@router.post("/excel/parse")
async def parse_excel_with_mapping(request: dict):
    """根据映射配置解析 Excel"""
    file_path = request.get("file_path")
    mappings = request.get("mappings", {})  # {模板字段: Excel列名}
    row_range = request.get("row_range", None)  # [start, end]
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="文件不存在")
    
    try:
        import pandas as pd
        
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8')
        else:
            df = pd.read_excel(file_path)
        
        # 范围筛选
        if row_range:
            df = df.iloc[row_range[0]:row_range[1]]
        
        results = []
        for idx, row in df.iterrows():
            item = {}
            for field, excel_col in mappings.items():
                if excel_col in df.columns:
                    item[field] = row[excel_col]
                else:
                    item[field] = None
            item["_excel_row"] = idx + 2  # Excel行号（跳过表头）
            results.append(item)
        
        return {
            "total": len(results),
            "items": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


@router.post("/excel/validate")
async def validate_excel_mapping(file_path: str, mappings: dict):
    """验证 Excel 映射配置"""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="文件不存在")
    
    try:
        import pandas as pd
        
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8')
        else:
            df = pd.read_excel(file_path)
        
        errors = []
        warnings = []
        
        # 检查映射的列是否存在
        for field, excel_col in mappings.items():
            if excel_col not in df.columns:
                errors.append(f"列 '{excel_col}' 不存在于文件中")
            else:
                # 检查数据类型
                col_type = infer_column_type(df[excel_col])
                if field in ['price', 'stock', 'cost_price'] and col_type != 'number':
                    warnings.append(f"字段 '{field}' 映射到列 '{excel_col}'，但该列类型为 {col_type}，可能需要转换")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "columns": list(df.columns),
            "total_rows": len(df)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证失败: {str(e)}")


# ==================== 商品管理 API ====================

@router.get("/products")
async def get_products(
    store_id: int = Query(None),
    status: str = Query(None),
    category: str = Query(None),
    keyword: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """获取商品列表"""
    # 模拟数据
    products = [
        {
            "id": 1,
            "product_id": "PRD100001",
            "title": "2024夏季新款运动鞋",
            "price": 299.00,
            "original_price": 399.00,
            "stock": 150,
            "status": "ready",
            "category": "服装鞋帽",
            "tags": ["夏季", "运动", "新品"],
            "images": [
                "data/images/shoes/1.jpg",
                "data/images/shoes/2.jpg",
                "data/images/shoes/3.jpg"
            ],
            "created_at": "2024-01-15 10:00:00"
        },
        {
            "id": 2,
            "product_id": "PRD100002",
            "title": "智能蓝牙耳机Pro",
            "price": 199.00,
            "original_price": 299.00,
            "stock": 80,
            "status": "published",
            "category": "数码产品",
            "tags": ["蓝牙", "耳机", "数码"],
            "images": [
                "data/images/headphones/1.jpg"
            ],
            "created_at": "2024-01-20 10:00:00"
        }
    ]
    
    # 筛选
    if store_id:
        products = [p for p in products if p.get("store_id") == store_id]
    if status:
        products = [p for p in products if p.get("status") == status]
    if category:
        products = [p for p in products if p.get("category") == category]
    if keyword:
        products = [p for p in products if keyword.lower() in p.get("title", "").lower()]
    
    total = len(products)
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": products[start:end]
    }


@router.post("/products/from-excel")
async def create_products_from_excel(request: dict):
    """从 Excel 创建商品"""
    file_path = request.get("file_path")
    mappings = request.get("mappings", {})
    images_folder = request.get("images_folder", None)
    include_subfolders = request.get("include_subfolders", False)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="文件不存在")
    
    try:
        import pandas as pd
        
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8')
        else:
            df = pd.read_excel(file_path)
        
        products = []
        errors = []
        
        # 扫描图片
        image_map = {}
        if images_folder and os.path.exists(images_folder):
            scan_result = await scan_folder(FolderScanRequest(
                path=images_folder,
                include_subfolders=include_subfolders
            ))
            for img in scan_result["images"]:
                # 按文件名索引
                filename = os.path.splitext(img["filename"])[0]
                if filename not in image_map:
                    image_map[filename] = []
                image_map[filename].append(img["path"])
        
        for idx, row in df.iterrows():
            try:
                product = {
                    "id": idx + 1,
                    "product_id": f"PRD{100000 + idx + 1}",
                    "excel_row": idx + 2,
                    "images": []
                }
                
                for field, excel_col in mappings.items():
                    if excel_col in df.columns:
                        value = row[excel_col]
                        if pd.notna(value):
                            product[field] = value
                        else:
                            product[field] = None
                    else:
                        product[field] = None
                
                # 匹配图片
                title = str(product.get("title", ""))
                for filename, paths in image_map.items():
                    if filename in title or title in filename:
                        product["images"].extend(paths)
                        break
                
                products.append(product)
                
            except Exception as e:
                errors.append(f"行 {idx + 2}: {str(e)}")
        
        return {
            "total": len(products),
            "created": len(products),
            "errors": errors,
            "products": products
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建失败: {str(e)}")


@router.get("/stats")
async def get_product_stats():
    """获取商品统计"""
    return {
        "total": 156,
        "ready": 45,
        "published": 98,
        "offline": 13,
        "by_category": {
            "服装鞋帽": 45,
            "数码产品": 32,
            "家居用品": 28,
            "食品饮料": 25,
            "美妆护肤": 26
        },
        "recent_creates": 12,
        "recent_published": 8
    }


@router.post("/products/{product_id}/match-images")
async def match_images_to_product(product_id: str, request: dict):
    """为商品匹配图片"""
    title = request.get("title", "")
    images_folder = request.get("images_folder")
    include_subfolders = request.get("include_subfolders", False)
    
    if not images_folder or not os.path.exists(images_folder):
        raise HTTPException(status_code=400, detail="图片文件夹不存在")
    
    scan_result = await scan_folder(FolderScanRequest(
        path=images_folder,
        include_subfolders=include_subfolders
    ))
    
    # 简单的模糊匹配
    matched = []
    for img in scan_result["images"]:
        filename = os.path.splitext(img["filename"])[0]
        if any(keyword in filename for keyword in title.split() if len(keyword) > 2):
            matched.append(img)
    
    return {
        "product_id": product_id,
        "title": title,
        "matched_count": len(matched),
        "images": matched[:5]  # 最多返回5张
    }
