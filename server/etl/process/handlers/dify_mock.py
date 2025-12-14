from server.etl.process.base import BaseHandler
import logging
import asyncio

logger = logging.getLogger(__name__)

class LLMHandler(BaseHandler):
    """
    Mock LLM Handler for Dify Replica
    """
    @classmethod
    def metadata(cls):
        return {
            "name": "LLMHandler",
            "description": "Mock LLM Handler",
            "params": {
                "model": "string",
                "prompt": "text"
            }
        }

    def __init__(self, model: str = "gpt-3.5-turbo", prompt: str = ""):
        self.model = model
        self.prompt = prompt

    async def handle(self, data, context=None):
        logger.info(f"Running LLM Handler: Model={self.model}, Prompt={self.prompt[:20]}...")
        # In a real app, this would call OpenAI/Anthropic
        # For now, just pass data through or append a mock response
        
        if isinstance(data, dict):
            data['llm_output'] = "Mocked LLM Response"
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    item['llm_output'] = "Mocked LLM Response"
        
        # Simulate latency
        await asyncio.sleep(1)
        return data

class CodeHandler(BaseHandler):
    @classmethod
    def metadata(cls):
        return {
            "name": "CodeHandler",
            "description": "Executes custom code",
            "params": {
                "code": "text"
            }
        }

    def __init__(self, code: str = ""):
        self.code = code

    async def handle(self, data, context=None):
        logger.info(f"Running Code Handler")
        return data

class HttpRequestHandler(BaseHandler):
    @classmethod
    def metadata(cls):
        return {
            "name": "HttpRequestHandler",
            "description": "Makes HTTP requests",
            "params": {
                "url": "string",
                "method": "string"
            }
        }

    def __init__(self, url: str = "", method: str = "GET"):
        self.url = url
        self.method = method

    async def handle(self, data, context=None):
        logger.info(f"Running HTTP Request: {self.method} {self.url}")
        return data
