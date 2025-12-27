
import pytest
import os
import shutil
from server.nodes.registry import NodeRegistry
from server.nodes.base import BaseNode, NodeCategory

def test_registry_discovery():
    registry = NodeRegistry()
    nodes = registry.get_all_nodes()
    assert isinstance(nodes, dict)
    # Check if DummyNode is in system category
    system_nodes = nodes[NodeCategory.SYSTEM.value]
    assert any(n["name"] == "DummyNode" for n in system_nodes)

def test_registry_get_node():
    registry = NodeRegistry()
    node_cls = registry.get_node_class("DummyNode")
    assert node_cls.__name__ == "DummyNode"
    with pytest.raises(KeyError):
        registry.get_node_class("NonExistentNode")
