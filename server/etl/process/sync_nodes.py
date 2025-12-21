import asyncio
import logging
import sys
import os

# Ensure project root is in python path
sys.path.append(os.getcwd())

from sqlalchemy import select
from server.storage.database import AsyncSessionFactory
from server.storage.models.workflow_node import WorkflowNode
from server.etl.process.registry import registry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sync_nodes")

async def sync_nodes():
    """
    Scans for all registered BaseHandler subclasses and updates the workflow_nodes table.
    """
    logger.info("Starting node synchronization...")

    # 1. Discover Handlers
    # Scan the handlers directory
    registry.auto_discover("server.etl.process.handlers")
    
    handlers_metadata = []
    # registry.get_all_handlers_metadata() returns list of dicts
    # We also need the class path, so let's iterate manually over registry._handlers
    
    for name, handler_cls in registry._handlers.items():
        try:
            meta = handler_cls.metadata()
            # Add handler_path manually as it's not part of metadata() usually
            handler_path = f"{handler_cls.__module__}.{handler_cls.__name__}"
            
            node_data = {
                "name": meta["name"], # Internal ID
                "title": meta.get("title", meta.get("name")),
                "category": meta.get("category", "other"),
                "type": meta.get("type", "generic"),
                "icon": meta.get("icon", ""),
                "description": meta.get("description", ""),
                "parameters_schema": meta.get("params_schema", {}),
                "ui_config": meta.get("ui_config", {}),
                "handler_path": handler_path,
                "is_active": True
            }
            handlers_metadata.append(node_data)
            logger.info(f"Discovered node: {node_data['name']} ({handler_path})")
            
        except Exception as e:
            logger.error(f"Error processing handler {handler_cls}: {e}")

    if not handlers_metadata:
        logger.warning("No handlers found! Check your discover path.")
        return

    # 2. Sync to Database
    async with AsyncSessionFactory() as session:
        for data in handlers_metadata:
            stmt = select(WorkflowNode).where(WorkflowNode.name == data["name"])
            result = await session.execute(stmt)
            existing_node = result.scalar_one_or_none()

            if existing_node:
                # Update existing
                logger.info(f"Updating node: {data['name']}")
                existing_node.title = data["title"]
                existing_node.category = data["category"]
                existing_node.type = data["type"]
                existing_node.icon = data["icon"]
                existing_node.description = data["description"]
                existing_node.parameters_schema = data["parameters_schema"]
                existing_node.ui_config = data["ui_config"]
                existing_node.handler_path = data["handler_path"]
                existing_node.updated_at =  datetime.utcnow()
            else:
                # Insert new
                logger.info(f"Inserting new node: {data['name']}")
                new_node = WorkflowNode(**data)
                session.add(new_node)
        
        await session.commit()
        logger.info("Node synchronization complete.")

from datetime import datetime

if __name__ == "__main__":
    asyncio.run(sync_nodes())
