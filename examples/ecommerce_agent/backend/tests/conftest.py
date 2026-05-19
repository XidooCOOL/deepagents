
"""
测试配置和fixtures
"""
import pytest
import tempfile
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import Base, get_db
from backend.config import settings

@pytest.fixture
def temp_db_path():
    """创建临时数据库文件"""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        return f.name

@pytest.fixture
def test_engine(temp_db_path):
    """创建测试数据库引擎"""
    engine = create_engine(f'sqlite:///{temp_db_path}', connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_session(test_engine):
    """创建测试数据库会话"""
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def mock_settings():
    """模拟配置对象"""
    class MockSettings:
        DEBUG = True
        DATABASE_URL = "sqlite:///:memory:"
        APP_NAME = "Test ECommerce Agent"
        APP_VERSION = "0.1.0"
    return MockSettings()

@pytest.fixture
def sample_store_data():
    """示例店铺数据"""
    return {
        "name": "测试店铺",
        "platform": "douyin",
        "username": "test_user",
        "password": "test_pass",
        "is_active": True
    }

@pytest.fixture
def sample_task_data():
    """示例任务数据"""
    return {
        "store_id": 1,
        "task_type": "publish",
        "name": "测试发布任务",
        "status": "pending",
        "progress": 0,
        "total_steps": 10
    }

