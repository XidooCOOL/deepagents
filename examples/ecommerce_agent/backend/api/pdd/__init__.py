from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.pdd_integration import pddopen_adapter, pddopen_data_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pdd", tags=["拼多多"])


class StoreAddRequest(BaseModel):
    shop_name: str
    shop_id: str
    admin_name: Optional[str] = None


class ExtractRequest(BaseModel):
    shop_name: str
    date: Optional[str] = None


class BatchExtractRequest(BaseModel):
    shops: List[str]
    data_type: str = "sales"  # sales, service, ads, all
    date: Optional[str] = None


class ReviewExtractRequest(BaseModel):
    shop_name: str
    pages: Optional[int] = None
    reply: bool = False
    report: bool = False


@router.get("/stores")
async def list_stores():
    """获取所有店铺列表"""
    try:
        stores = await pddopen_adapter.list_stores()
        return {"success": True, "data": stores}
    except Exception as e:
        logger.error(f"获取店铺列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stores")
async def add_store(request: StoreAddRequest):
    """添加新店铺"""
    try:
        result = pddopen_adapter.add_store(
            request.shop_name, 
            request.shop_id, 
            request.admin_name
        )
        
        if result['success']:
            return {"success": True, "message": "店铺添加成功"}
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '添加失败'))
    except Exception as e:
        logger.error(f"添加店铺失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stores/{shop_name}/stop")
async def stop_store(shop_name: str):
    """停止店铺浏览器"""
    try:
        result = pddopen_adapter.stop_store(shop_name)
        
        if result['success']:
            return {"success": True, "message": f"店铺 {shop_name} 已停止"}
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '停止失败'))
    except Exception as e:
        logger.error(f"停止店铺失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stores/stop-all")
async def stop_all_stores():
    """停止所有店铺浏览器"""
    try:
        result = pddopen_adapter.stop_all_stores()
        
        if result['success']:
            return {"success": True, "message": "所有店铺已停止"}
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '停止失败'))
    except Exception as e:
        logger.error(f"停止所有店铺失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check(shop_name: Optional[str] = None):
    """健康检查"""
    try:
        result = pddopen_adapter.health_check(shop_name)
        
        return {
            "success": result['success'],
            "data": result['stdout'] if result['success'] else result.get('stderr'),
            "message": "健康检查完成"
        }
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/sales")
async def extract_sales(request: ExtractRequest):
    """提取销售数据"""
    try:
        result = pddopen_adapter.extract_sales(request.shop_name, request.date)
        
        if result['success']:
            return {
                "success": True, 
                "message": f"成功提取 {request.shop_name} 销售数据",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '提取失败'))
    except Exception as e:
        logger.error(f"提取销售数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/service")
async def extract_service(request: ExtractRequest):
    """提取客服绩效"""
    try:
        result = pddopen_adapter.extract_service(request.shop_name, request.date)
        
        if result['success']:
            return {
                "success": True,
                "message": f"成功提取 {request.shop_name} 客服绩效",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '提取失败'))
    except Exception as e:
        logger.error(f"提取客服绩效失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/ads")
async def extract_ads(request: ExtractRequest):
    """提取推广数据"""
    try:
        result = pddopen_adapter.extract_ads(request.shop_name, request.date)
        
        if result['success']:
            return {
                "success": True,
                "message": f"成功提取 {request.shop_name} 推广数据",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '提取失败'))
    except Exception as e:
        logger.error(f"提取推广数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/all")
async def extract_all(request: ExtractRequest):
    """提取全部数据"""
    try:
        result = pddopen_adapter.extract_all(request.shop_name, request.date)
        
        if result['success']:
            return {
                "success": True,
                "message": f"成功提取 {request.shop_name} 全部数据",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '提取失败'))
    except Exception as e:
        logger.error(f"提取全部数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/reviews")
async def extract_reviews(request: ReviewExtractRequest):
    """提取评价"""
    try:
        result = pddopen_adapter.extract_reviews(
            request.shop_name,
            request.pages,
            request.reply,
            request.report
        )
        
        if result['success']:
            return {
                "success": True,
                "message": f"成功提取 {request.shop_name} 评价",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '提取失败'))
    except Exception as e:
        logger.error(f"提取评价失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch/extract")
async def batch_extract(request: BatchExtractRequest):
    """批量提取数据"""
    try:
        result = pddopen_adapter.batch_operation(
            request.shops,
            request.data_type,
            request.date
        )
        
        if result['success']:
            return {
                "success": True,
                "message": f"成功批量提取 {len(request.shops)} 个店铺数据",
                "output": result['stdout']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('stderr', '批量提取失败'))
    except Exception as e:
        logger.error(f"批量提取失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/sales")
async def get_sales_data(shop_name: str):
    """获取销售数据"""
    try:
        data = pddopen_data_manager.get_latest_sales_data(shop_name)
        
        if data is None:
            return {"success": True, "data": [], "message": "暂无销售数据"}
        
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"获取销售数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/ads")
async def get_ads_data():
    """获取推广数据"""
    try:
        data = pddopen_data_manager.get_latest_promotion_data()
        
        if data is None:
            return {"success": True, "data": [], "message": "暂无推广数据"}
        
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"获取推广数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/execution-log")
async def get_execution_log():
    """获取执行日志"""
    try:
        log = pddopen_data_manager.get_execution_log()
        
        if log is None:
            return {"success": True, "data": {}, "message": "暂无执行日志"}
        
        return {"success": True, "data": log}
    except Exception as e:
        logger.error(f"获取执行日志失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/browser-state")
async def get_browser_state():
    """获取浏览器状态"""
    try:
        state = pddopen_data_manager.get_browser_state()
        
        if state is None:
            return {"success": True, "data": {}, "message": "暂无浏览器状态"}
        
        return {"success": True, "data": state}
    except Exception as e:
        logger.error(f"获取浏览器状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(days: int = 7):
    """获取执行统计"""
    try:
        result = pddopen_adapter.get_stats(days)
        
        if result['success']:
            return {
                "success": True,
                "data": result['data']
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', '获取统计失败'))
    except Exception as e:
        logger.error(f"获取统计失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
