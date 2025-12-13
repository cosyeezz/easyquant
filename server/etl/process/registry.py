import inspect
import pkgutil
import importlib
import logging
from typing import Dict, Type, List, Any
from server.etl.process.base import BaseHandler

logger = logging.getLogger(__name__)

class HandlerRegistry:
    """
    ETL 处理器注册表 (单例模式)。
    负责自动发现、注册和检索所有的 BaseHandler 子类。
    """
    _instance = None
    _handlers: Dict[str, Type[BaseHandler]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HandlerRegistry, cls).__new__(cls)
        return cls._instance

    def register(self, handler_cls: Type[BaseHandler]):
        """
        手动注册一个处理器类。
        """
        # 获取元数据中的 name，如果未实现 metadata 则跳过或报错
        try:
            meta = handler_cls.metadata()
            name = meta.get("name")
            if not name:
                raise ValueError(f"Handler {handler_cls} metadata missing 'name'")
            
            self._handlers[name] = handler_cls
        except NotImplementedError:
            # 忽略未实现 metadata 的抽象类
            pass

    def get_handler(self, name: str) -> Type[BaseHandler]:
        """
        根据名称获取处理器类。
        """
        handler = self._handlers.get(name)
        if not handler:
            raise ValueError(f"Handler '{name}' not found in registry.")
        return handler

    def get_handler_class(self, name: str) -> Type[BaseHandler]:
        """
        get_handler 的别名，更明确的命名。
        """
        return self.get_handler(name)

    def get_all_handlers_metadata(self) -> List[Dict[str, Any]]:
        """
        获取所有已注册处理器的元数据列表（供前端使用）。
        """
        return [h.metadata() for h in self._handlers.values()]

    def auto_discover(self, package_path: str):
        """
        自动扫描指定包路径下的所有模块，查找 BaseHandler 子类。
        
        :param package_path: 例如 'server.etl.process.handlers'
        """
        try:
            module = importlib.import_module(package_path)
            
            # 遍历包下的所有模块
            if hasattr(module, "__path__"):
                for _, name, _ in pkgutil.iter_modules(module.__path__):
                    full_module_name = f"{package_path}.{name}"
                    sub_module = importlib.import_module(full_module_name)
                    
                    # 检查模块中的所有成员
                    for _, obj in inspect.getmembers(sub_module):
                        if (inspect.isclass(obj) 
                            and issubclass(obj, BaseHandler) 
                            and obj is not BaseHandler):
                            self.register(obj)
        except Exception as e:
            logger.error(f"Error discovering handlers in {package_path}: {e}")

# 全局单例实例
registry = HandlerRegistry()
