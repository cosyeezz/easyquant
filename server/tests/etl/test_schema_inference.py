import pytest
from server.etl.process.base import BaseHandler
from server.etl.process.handlers.column_mapping import ColumnMappingHandler

def test_base_handler_interface():
    """Test that BaseHandler defines the get_output_schema interface."""
    assert hasattr(BaseHandler, "get_output_schema"), "BaseHandler missing get_output_schema"

def test_base_handler_default_inference():
    """Test BaseHandler default inference (passthrough)."""
    input_schema = {
        "columns": [{"name": "col1", "type": "int"}]
    }
    # Call directly on BaseHandler or a concrete subclass that doesn't override it
    output = BaseHandler.get_output_schema({}, input_schema)
    assert output == input_schema
    
    # Test with None input
    assert BaseHandler.get_output_schema({}, None) == {"columns": []}

def test_column_mapping_inference():
    """Test that ColumnMappingHandler correctly infers output schema."""
    mapping = {"old_col": "new_col"}
    
    input_schema = {
        "columns": [
            {"name": "old_col", "type": "string"},
            {"name": "keep_col", "type": "int"}
        ]
    }
    
    # We expect get_output_schema to be a class method that takes config and input_schema
    output_schema = ColumnMappingHandler.get_output_schema(
        config={"mapping": mapping}, 
        input_schema=input_schema
    )
    
    output_names = {c['name']: c['type'] for c in output_schema['columns']}
    
    # Check renaming
    assert "new_col" in output_names
    assert output_names["new_col"] == "string"
    
    # Check removal of old name
    assert "old_col" not in output_names
    
    # Check retention of other cols
    assert "keep_col" in output_names
    assert output_names["keep_col"] == "int"
