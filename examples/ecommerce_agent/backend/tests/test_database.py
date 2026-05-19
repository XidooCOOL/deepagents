
"""
数据库模型测试
"""
import pytest
from datetime import datetime
from backend.database.models import (
    Store, Task, TaskLog, ScheduledTask, OperationLog,
    DailyData, DOMElement, KnowledgeItem, ExperienceItem,
    BrowserTab, AppConfig, WebhookConfig, MessageTemplate
)

class TestStoreModel:
    """测试店铺模型"""
    
    def test_create_store(self, test_session):
        """测试创建店铺"""
        store = Store(
            name="测试店铺",
            platform="douyin",
            username="test_user",
            is_active=True
        )
        test_session.add(store)
        test_session.commit()
        
        assert store.id is not None
        assert store.name == "测试店铺"
        assert store.platform == "douyin"
        assert store.is_active is True
    
    def test_store_relationships(self, test_session):
        """测试店铺关系"""
        store = Store(name="测试店铺", platform="douyin")
        test_session.add(store)
        test_session.commit()
        
        task = Task(store_id=store.id, task_type="publish", name="测试任务")
        test_session.add(task)
        test_session.commit()
        
        assert len(store.tasks) == 1
        assert store.tasks[0].name == "测试任务"

class TestTaskModel:
    """测试任务模型"""
    
    def test_create_task(self, test_session):
        """测试创建任务"""
        store = Store(name="测试店铺", platform="douyin")
        test_session.add(store)
        test_session.commit()
        
        task = Task(
            store_id=store.id,
            task_type="publish",
            name="测试发布任务",
            status="pending",
            progress=0,
            total_steps=10
        )
        test_session.add(task)
        test_session.commit()
        
        assert task.id is not None
        assert task.task_type == "publish"
        assert task.status == "pending"
    
    def test_task_progress_update(self, test_session):
        """测试任务进度更新"""
        store = Store(name="测试店铺", platform="douyin")
        test_session.add(store)
        test_session.commit()
        
        task = Task(
            store_id=store.id,
            task_type="publish",
            status="pending",
            progress=0,
            total_steps=10
        )
        test_session.add(task)
        test_session.commit()
        
        task.status = "running"
        task.progress = 50
        task.current_step = "Step 5"
        test_session.commit()
        
        updated_task = test_session.query(Task).get(task.id)
        assert updated_task.status == "running"
        assert updated_task.progress == 50
        assert updated_task.current_step == "Step 5"

class TestTaskLogModel:
    """测试任务日志模型"""
    
    def test_create_task_log(self, test_session):
        """测试创建任务日志"""
        store = Store(name="测试店铺", platform="douyin")
        test_session.add(store)
        test_session.commit()
        
        task = Task(store_id=store.id, task_type="publish", name="测试任务")
        test_session.add(task)
        test_session.commit()
        
        log = TaskLog(
            task_id=task.id,
            step_id=1,
            level="info",
            message="测试日志消息",
            data='{"key": "value"}'
        )
        test_session.add(log)
        test_session.commit()
        
        assert log.id is not None
        assert log.message == "测试日志消息"
        assert log.level == "info"

class TestDOMElementModel:
    """测试DOM元素模型"""
    
    def test_create_dom_element(self, test_session):
        """测试创建DOM元素"""
        element = DOMElement(
            platform="douyin",
            page="login",
            name="username_input",
            selectors=["#username", "[name='username']"],
            description="用户名输入框",
            version=1,
            is_active=True
        )
        test_session.add(element)
        test_session.commit()
        
        assert element.id is not None
        assert element.platform == "douyin"
        assert len(element.selectors) == 2
        assert element.is_active is True
    
    def test_query_dom_elements(self, test_session):
        """测试查询DOM元素"""
        elements = [
            DOMElement(platform="douyin", page="login", name="username", selectors=["#u1"]),
            DOMElement(platform="douyin", page="login", name="password", selectors=["#p1"]),
            DOMElement(platform="pinduoduo", page="login", name="username", selectors=["#u2"])
        ]
        for e in elements:
            test_session.add(e)
        test_session.commit()
        
        douyin_elements = test_session.query(DOMElement).filter_by(platform="douyin").all()
        assert len(douyin_elements) == 2
        
        login_elements = test_session.query(DOMElement).filter_by(platform="douyin", page="login").all()
        assert len(login_elements) == 2

class TestScheduledTaskModel:
    """测试定时任务模型"""
    
    def test_create_scheduled_task(self, test_session):
        """测试创建定时任务"""
        store = Store(name="测试店铺", platform="douyin")
        test_session.add(store)
        test_session.commit()
        
        scheduled_task = ScheduledTask(
            store_id=store.id,
            task_type="publish",
            name="每日定时发布",
            cron_expression="0 9 * * *",
            is_active=True
        )
        test_session.add(scheduled_task)
        test_session.commit()
        
        assert scheduled_task.id is not None
        assert scheduled_task.cron_expression == "0 9 * * *"
        assert scheduled_task.is_active is True

class TestOtherModels:
    """测试其他模型"""
    
    def test_knowledge_item(self, test_session):
        """测试知识项"""
        item = KnowledgeItem(
            type="product",
            title="产品发布指南",
            content="这是产品发布的详细指南...",
            extra_data={"tags": ["guide", "product"]}
        )
        test_session.add(item)
        test_session.commit()
        
        assert item.id is not None
        assert item.type == "product"
    
    def test_webhook_config(self, test_session):
        """测试Webhook配置"""
        config = WebhookConfig(
            name="飞书告警",
            platform="feishu",
            url="https://example.com/webhook",
            events=["task_failed", "task_completed"],
            is_active=True
        )
        test_session.add(config)
        test_session.commit()
        
        assert config.id is not None
        assert config.platform == "feishu"
    
    def test_message_template(self, test_session):
        """测试消息模板"""
        template = MessageTemplate(
            name="任务完成通知",
            template_type="notification",
            platform="feishu",
            title="任务完成",
            content="任务 {task_name} 已完成",
            is_default=True
        )
        test_session.add(template)
        test_session.commit()
        
        assert template.id is not None
        assert template.is_default is True

