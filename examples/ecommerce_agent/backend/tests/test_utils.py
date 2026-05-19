
"""
工具模块测试
"""
import pytest
from backend.utils.encryption import EncryptionManager, CredentialManager

class TestEncryptionManager:
    """测试加密管理器"""
    
    def test_encrypt_decrypt(self):
        """测试加密和解密"""
        key = "test_key_1234567890123456789012"  # 32字节密钥
        manager = EncryptionManager(key)
        
        original_text = "这是一个测试消息"
        encrypted = manager.encrypt(original_text)
        
        assert encrypted != original_text
        assert isinstance(encrypted, str)
        
        decrypted = manager.decrypt(encrypted)
        assert decrypted == original_text
    
    def test_encryption_different_results(self):
        """测试相同内容加密结果不同"""
        key = "test_key_1234567890123456789012"
        manager = EncryptionManager(key)
        
        text = "相同内容"
        encrypted1 = manager.encrypt(text)
        encrypted2 = manager.encrypt(text)
        
        # 由于IV随机，加密结果应该不同
        assert encrypted1 != encrypted2
        
        # 但解密应该相同
        assert manager.decrypt(encrypted1) == text
        assert manager.decrypt(encrypted2) == text
    
    def test_decrypt_invalid_data(self):
        """测试解密无效数据"""
        key = "test_key_1234567890123456789012"
        manager = EncryptionManager(key)
        
        with pytest.raises(Exception):
            manager.decrypt("invalid_encrypted_data")

class TestCredentialManager:
    """测试凭证管理器"""
    
    def test_credential_manager_init(self, test_session):
        """测试凭证管理器初始化"""
        manager = CredentialManager(test_session)
        assert manager is not None
        assert manager.encryption is not None
    
    def test_store_and_retrieve_credential(self, test_session):
        """测试存储和获取凭证"""
        manager = CredentialManager(test_session)
        
        # 这里可以测试凭证管理功能
        # 取决于具体实现
        pass

