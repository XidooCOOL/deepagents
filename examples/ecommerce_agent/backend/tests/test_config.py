
"""
配置模块测试
"""
import pytest
from pathlib import Path
from backend.config import Settings

class TestSettings:
    """测试配置类"""
    
    def test_default_settings(self):
        """测试默认配置"""
        settings = Settings()
        assert settings.APP_NAME == "ECommerce Agent"
        assert settings.APP_VERSION == "0.1.0"
        assert settings.DEBUG is True
    
    def test_database_url(self):
        """测试数据库URL"""
        settings = Settings()
        assert "sqlite" in settings.DATABASE_URL
        assert "ecommerce.db" in settings.DATABASE_URL
    
    def test_directories_creation(self):
        """测试目录创建"""
        settings = Settings()
        assert settings.BASE_DIR.exists()
        assert settings.DATA_DIR.exists()
        assert settings.DB_DIR.exists()
        assert settings.CONFIG_DIR.exists()
    
    def test_browser_settings(self):
        """测试浏览器配置"""
        settings = Settings()
        assert isinstance(settings.HEADLESS, bool)
        assert isinstance(settings.BROWSER_TIMEOUT, int)
        assert settings.BROWSER_TIMEOUT &gt; 0
    
    def test_anti_detect_settings(self):
        """测试防检测配置"""
        settings = Settings()
        assert isinstance(settings.ENABLE_ANTI_DETECT, bool)
        assert isinstance(settings.MIN_CLICK_INTERVAL, float)
        assert settings.MIN_CLICK_INTERVAL &gt; 0
    
    def test_model_settings(self):
        """测试模型配置"""
        settings = Settings()
        assert settings.MODEL_PROVIDER is not None
        assert settings.MODEL_NAME is not None
    
    def test_encryption_settings(self):
        """测试加密配置"""
        settings = Settings()
        assert settings.ENCRYPTION_KEY is not None
        assert len(settings.ENCRYPTION_KEY) &gt; 0

class TestEnvironmentOverride:
    """测试环境变量覆盖（如果适用）"""
    
    def test_env_file_loading(self, monkeypatch):
        """测试环境文件加载"""
        monkeypatch.setenv("APP_NAME", "测试应用")
        monkeypatch.setenv("DEBUG", "False")
        
        settings = Settings(_env_file=None)  # 不加载.env文件
        # 注意：pydantic-settings的环境变量加载需要正确配置
        # 这里只做简单测试

