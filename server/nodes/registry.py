import importlib
import pkgutil
import inspect
import logging
from typing import Dict, List, Type, Any, Optional
from server.nodes.base import BaseNode, NodeCategory

logger = logging.getLogger(__name__)


class NodeRegistry:
    _instance: Optional["NodeRegistry"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NodeRegistry, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.nodes: Dict[str, Type[BaseNode]] = {}
        self.categories: Dict[str, List[str]] = {cat.value: [] for cat in NodeCategory}
        self._initialized = True
        self.discover_nodes()

    def discover_nodes(self):
        """
        Scans the server.nodes subpackages for BaseNode subclasses.
        """
        import server.nodes as nodes_pkg

        # Subpackages to scan
        subpackages = ["system", "logic", "etl", "quant", "mq"]

        for sub in subpackages:
            try:
                pkg_name = f"server.nodes.{sub}"
                package = importlib.import_module(pkg_name)

                for loader, module_name, is_pkg in pkgutil.walk_packages(
                    package.__path__, package.__name__ + "."
                ):
                    module = importlib.import_module(module_name)
                    for name, obj in inspect.getmembers(module):
                        if (
                            inspect.isclass(obj)
                            and issubclass(obj, BaseNode)
                            and obj is not BaseNode
                            and not inspect.isabstract(obj)
                        ):
                            node_id = obj.__name__
                            if node_id in self.nodes:
                                logger.warning(f"Duplicate node ID detected: {node_id}")
                                continue

                            self.nodes[node_id] = obj
                            self.categories[obj.category.value].append(node_id)
                            logger.info(
                                f"Registered node: {node_id} in category {obj.category.value}"
                            )
            except Exception as e:
                logger.error(f"Failed to scan subpackage {sub}: {e}")

    def get_all_nodes(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns all registered nodes grouped by category with their metadata.
        """
        result = {cat.value: [] for cat in NodeCategory}
        for node_id, node_class in self.nodes.items():
            result[node_class.category.value].append(node_class.get_metadata())
        return result

    def get_node_class(self, node_id: str) -> Type[BaseNode]:
        """
        Returns the class for a specific node ID.
        """
        if node_id not in self.nodes:
            raise KeyError(f"Node '{node_id}' not found in registry")
        return self.nodes[node_id]


# Singleton instance
registry = NodeRegistry()
