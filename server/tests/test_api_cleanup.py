import pytest
from httpx import AsyncClient, ASGITransport
from server.main import app

@pytest.mark.asyncio
async def test_legacy_nodes_api_removed():
    """Verify that legacy node management APIs are removed (return 404)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # List nodes
        response = await ac.get("/api/v1/nodes")
        assert response.status_code == 404, f"Expected 404 for /api/v1/nodes, got {response.status_code}"

        # Get specific node
        response = await ac.get("/api/v1/nodes/1")
        assert response.status_code == 404, f"Expected 404 for /api/v1/nodes/1, got {response.status_code}"
        
        # Legacy create
        response = await ac.post("/api/v1/nodes", json={"name": "test"})
        assert response.status_code == 404, f"Expected 404 for POST /api/v1/nodes, got {response.status_code}"