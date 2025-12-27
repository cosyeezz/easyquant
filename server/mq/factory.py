"""
MQ Factory
"""

from typing import Literal

from server.mq.base import MQProducer, MQConsumer
from server.mq.redis_streams import RedisStreamProducer, RedisStreamConsumer


MQType = Literal["redis", "rocketmq"]


class MQFactory:
    """消息队列工厂"""

    def __init__(self, mq_type: MQType = "redis", config: dict = None):
        self.mq_type = mq_type
        self.config = config or {}

    def create_producer(self) -> MQProducer:
        if self.mq_type == "redis":
            redis_url = self.config.get("redis_url", "redis://localhost:6379")
            return RedisStreamProducer(redis_url)
        else:
            raise NotImplementedError(f"MQ type {self.mq_type} not implemented")

    def create_consumer(self) -> MQConsumer:
        if self.mq_type == "redis":
            redis_url = self.config.get("redis_url", "redis://localhost:6379")
            return RedisStreamConsumer(redis_url)
        else:
            raise NotImplementedError(f"MQ type {self.mq_type} not implemented")
