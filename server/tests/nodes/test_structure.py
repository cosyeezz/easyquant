
import importlib
import pytest

def test_nodes_package_structure():
    """Verify that the required node package structure exists."""
    packages = [
        "server.nodes",
        "server.nodes.system",
        "server.nodes.logic",
        "server.nodes.etl",
        "server.nodes.quant",
    ]
    
    for package in packages:
        try:
            importlib.import_module(package)
        except ImportError:
            pytest.fail(f"Could not import package: {package}")
