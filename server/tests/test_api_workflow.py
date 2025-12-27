
import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

def test_get_node_definitions():
    # We need to set EASYQUANT_LAUNCHER=1 to bypass the startup check in main.py
    import os
    os.environ["EASYQUANT_LAUNCHER"] = "1"
    
    response = client.get("/api/v1/workflow/definitions")
    assert response.status_code == 200
    data = response.json()
    
    # Check that we have the 4 categories
    assert "system" in data
    assert "etl" in data
    assert "logic" in data
    assert "quant" in data
    
    # Check that our sample nodes are present
    system_nodes = data["system"]
    assert any(n["name"] == "ProcessSchedulerNode" for n in system_nodes)
    
    etl_nodes = data["etl"]
    assert any(n["name"] == "CsvReaderNode" for n in etl_nodes)
    
    # Verify schema structure for one node
    scheduler = next(n for n in system_nodes if n["name"] == "ProcessSchedulerNode")
    assert "parameters_schema" in scheduler
    assert "concurrency" in scheduler["parameters_schema"]["properties"]
