"""
初始化电商平台 DOM 元素配置
将预设的选择器加载到数据库
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database.models import SessionLocal, init_database
from backend.database.models import DOMElement
from configs.elements.ecommerce_elements import ALL_PLATFORM_ELEMENTS


def init_ecommerce_elements():
    """初始化电商平台元素配置"""
    print("🚀 开始初始化电商平台 DOM 元素配置...")
    
    # 初始化数据库
    init_database()
    
    db = SessionLocal()
    
    try:
        # 统计
        total_added = 0
        total_updated = 0
        
        for platform_code, platform_data in ALL_PLATFORM_ELEMENTS.items():
            platform_name = platform_data.get("platform_name", platform_code)
            pages = platform_data.get("pages", {})
            
            print(f"\n📦 处理平台: {platform_name} ({platform_code})")
            
            for page_key, page_data in pages.items():
                page_name = page_data.get("page_name", page_key)
                elements = page_data.get("elements", [])
                
                print(f"  📄 页面: {page_name} ({page_key}) - {len(elements)} 个元素")
                
                for elem in elements:
                    elem_name = elem.get("name", "")
                    display_name = elem.get("display_name", elem_name)
                    description = elem.get("description", "")
                    selectors = elem.get("selectors", [])
                    action_type = elem.get("action_type", "click")
                    
                    # 检查是否已存在
                    existing = db.query(DOMElement).filter(
                        DOMElement.platform == platform_code,
                        DOMElement.page == page_key,
                        DOMElement.name == elem_name
                    ).first()
                    
                    if existing:
                        # 更新
                        existing.selectors = selectors
                        existing.description = description
                        existing.action_type = action_type
                        existing.updated_at = __import__('datetime').datetime.now()
                        total_updated += 1
                    else:
                        # 创建
                        new_elem = DOMElement(
                            platform=platform_code,
                            page=page_key,
                            name=elem_name,
                            display_name=display_name,
                            description=description,
                            selectors=selectors,
                            selector_type=selectors[0].get("type", "css") if selectors else "css",
                            selector=selectors[0].get("value", "") if selectors else "",
                            action_type=action_type,
                            is_active=True,
                            version=1
                        )
                        db.add(new_elem)
                        total_added += 1
                    
                    print(f"    ✅ {display_name} ({elem_name})")
        
        db.commit()
        
        print(f"\n✅ 初始化完成！")
        print(f"   新增: {total_added} 个元素")
        print(f"   更新: {total_updated} 个元素")
        print(f"   总计: {total_added + total_updated} 个元素")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def show_element_stats():
    """显示元素统计"""
    db = SessionLocal()
    
    try:
        from sqlalchemy import func
        
        # 按平台统计
        print("\n📊 元素统计：\n")
        
        results = db.query(
            DOMElement.platform,
            DOMElement.page,
            func.count(DOMElement.id).label("count")
        ).group_by(
            DOMElement.platform,
            DOMElement.page
        ).all()
        
        # 按平台分组显示
        platform_stats = {}
        for platform, page, count in results:
            if platform not in platform_stats:
                platform_stats[platform] = []
            platform_stats[platform].append((page, count))
        
        for platform, pages in platform_stats.items():
            print(f"  🏪 {platform}:")
            for page, count in pages:
                print(f"      - {page}: {count} 个元素")
        
    finally:
        db.close()


if __name__ == "__main__":
    init_ecommerce_elements()
    show_element_stats()
