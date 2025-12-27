
import pytest
from pydantic import BaseModel
from server.nodes.base import BaseNode, NodeCategory

class TestParams(BaseModel):
    foo: str

class ConcreteNode(BaseNode):
    category = NodeCategory.ETL
    class Parameters(TestParams):
        pass
        
    async def execute(self, context, params: TestParams, input_data=None):
        return {"result": params.foo}

def test_node_category_enum():
    assert NodeCategory.SYSTEM.value == "system"
    assert NodeCategory.LOGIC.value == "logic"
    assert NodeCategory.ETL.value == "etl"
    assert NodeCategory.QUANT.value == "quant"

@pytest.mark.asyncio
async def test_base_node_execution():
    node = ConcreteNode()
    params = TestParams(foo="bar")
    result = await node.execute(None, params)
    assert result == {"result": "bar"}

def test_node_metadata():
    meta = ConcreteNode.get_metadata()
    assert meta["name"] == "ConcreteNode"
    assert meta["category"] == "etl"
    assert "foo" in meta["parameters_schema"]["properties"]
