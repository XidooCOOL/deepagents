import subprocess
import json
import os
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class PddopenAdapter:
    """pddopen CLI 工具适配器"""
    
    def __init__(self, pddopen_path: str = None):
        if pddopen_path is None:
            self.pddopen_path = Path(__file__).parent.parent.parent.parent / "pddopen"
        else:
            self.pddopen_path = Path(pddopen_path)
        
        self.script_path = self.pddopen_path / "scripts" / "pdd-open.js"
        
    def _run_command(self, args: List[str], timeout: int = 300) -> Dict[str, Any]:
        """执行 pddopen 命令"""
        try:
            cmd = ["node", str(self.script_path)] + args
            logger.info(f"执行命令: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                cwd=str(self.pddopen_path),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': '命令执行超时',
                'stdout': '',
                'stderr': ''
            }
        except Exception as e:
            logger.error(f"命令执行失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'stdout': '',
                'stderr': ''
            }
    
    async def list_stores(self) -> List[Dict[str, Any]]:
        """列出所有店铺"""
        result = self._run_command(['--list'])
        
        if not result['success']:
            logger.error(f"列出店铺失败: {result.get('stderr', result.get('error'))}")
            return []
        
        stores = []
        for line in result['stdout'].strip().split('\n'):
            if line and '|' in line:
                parts = line.split('|')
                if len(parts) >= 3:
                    stores.append({
                        'shop_name': parts[0].strip(),
                        'cdp_port': parts[1].strip(),
                        'status': parts[2].strip()
                    })
        
        return stores
    
    def add_store(self, shop_name: str, shop_id: str, admin_name: str = None) -> Dict[str, Any]:
        """添加新店铺"""
        args = ['--add', shop_name, shop_id]
        if admin_name:
            args.append(admin_name)
        
        result = self._run_command(args)
        return result
    
    def stop_store(self, shop_name: str) -> Dict[str, Any]:
        """停止店铺浏览器"""
        result = self._run_command(['--stop', shop_name])
        return result
    
    def stop_all_stores(self) -> Dict[str, Any]:
        """停止所有店铺浏览器"""
        result = self._run_command(['--stop-all'])
        return result
    
    def health_check(self, shop_name: str = None) -> Dict[str, Any]:
        """健康检查"""
        args = ['--health']
        if shop_name:
            args.insert(1, shop_name)
        
        result = self._run_command(args, timeout=120)
        return result
    
    def extract_sales(self, shop_name: str, date: str = None) -> Dict[str, Any]:
        """提取销售数据"""
        args = [shop_name, '--extract']
        if date:
            args.extend(['--date', date])
        
        result = self._run_command(args)
        return result
    
    def extract_service(self, shop_name: str, month: str = None) -> Dict[str, Any]:
        """提取客服绩效"""
        args = [shop_name, '--service']
        if month:
            args.append(month)
        
        result = self._run_command(args)
        return result
    
    def extract_ads(self, shop_name: str, date: str = None) -> Dict[str, Any]:
        """提取推广数据"""
        args = [shop_name, '--ads']
        if date:
            args.extend(['--date', date])
        
        result = self._run_command(args)
        return result
    
    def extract_all(self, shop_name: str, date: str = None) -> Dict[str, Any]:
        """提取全部数据"""
        args = [shop_name, '--all']
        if date:
            args.extend(['--date', date])
        
        result = self._run_command(args)
        return result
    
    def extract_reviews(self, shop_name: str, pages: int = None, 
                       reply: bool = False, report: bool = False) -> Dict[str, Any]:
        """提取评价"""
        args = [shop_name, '--review']
        if pages:
            args.extend(['--pages', str(pages)])
        if reply:
            args.append('--reply')
        if report:
            args.append('--report')
        
        result = self._run_command(args)
        return result
    
    def batch_operation(self, shops: List[str], data_type: str = 'sales', 
                       date: str = None) -> Dict[str, Any]:
        """批量操作"""
        args = ['--batch', ','.join(shops)]
        if data_type == 'sales':
            args.append('--extract')
        elif data_type == 'ads':
            args.append('--ads')
        elif data_type == 'service':
            args.append('--service')
        elif data_type == 'all':
            args.append('--all')
        
        if date:
            args.extend(['--date', date])
        
        result = self._run_command(args)
        return result
    
    def get_stats(self, days: int = 7) -> Dict[str, Any]:
        """获取执行统计"""
        result = self._run_command(['--stats', str(days)], timeout=60)
        
        if result['success']:
            return {
                'success': True,
                'data': result['stdout']
            }
        return result


class PddopenDataManager:
    """pddopen 数据管理器"""
    
    def __init__(self, adapter: PddopenAdapter):
        self.adapter = adapter
        self.data_path = adapter.pddopen_path / "data"
    
    def get_latest_sales_data(self, shop_name: str) -> Optional[Dict[str, Any]]:
        """获取最新的销售数据"""
        excel_file = self.data_path / "Sales_Data.xlsx"
        
        if not excel_file.exists():
            logger.warning(f"销售数据文件不存在: {excel_file}")
            return None
        
        try:
            import pandas as pd
            df = pd.read_excel(excel_file, sheet_name=shop_name)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"读取销售数据失败: {str(e)}")
            return None
    
    def get_latest_promotion_data(self) -> Optional[Dict[str, Any]]:
        """获取最新的推广数据"""
        excel_file = self.data_path / "Promotion_Data.xlsx"
        
        if not excel_file.exists():
            logger.warning(f"推广数据文件不存在: {excel_file}")
            return None
        
        try:
            import pandas as pd
            df = pd.read_excel(excel_file)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"读取推广数据失败: {str(e)}")
            return None
    
    def get_execution_log(self) -> Optional[Dict[str, Any]]:
        """获取执行日志"""
        log_file = self.data_path / "execution_log.json"
        
        if not log_file.exists():
            return None
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"读取执行日志失败: {str(e)}")
            return None
    
    def get_browser_state(self) -> Optional[Dict[str, Any]]:
        """获取浏览器状态"""
        state_file = self.data_path / "browser_state.json"
        
        if not state_file.exists():
            return None
        
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"读取浏览器状态失败: {str(e)}")
            return None


pddopen_adapter = PddopenAdapter()
pddopen_data_manager = PddopenDataManager(pddopen_adapter)
