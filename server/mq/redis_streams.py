"""
Redis Streams MQ Implementation
"""

import time
import uuid
import logging
from typing import Optional

import redis

from server.mq.base import MQProducer, MQConsumer, Message, END_SIGNAL

logger = logging.getLogger(__name__)


class RedisStreamProducer(MQProducer):
    """Redis Streams 生产者"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.client = redis.from_url(redis_url, decode_responses=False)

    def send(self, topic: str, data: bytes) -> str:
        msg_id = self.client.xadd(topic, {"data": data})
        return msg_id.decode() if isinstance(msg_id, bytes) else msg_id

    def send_end_signal(self, topic: str) -> None:
        self.client.xadd(topic, {"data": END_SIGNAL})
        logger.info(f"Sent END signal to topic: {topic}")

    def close(self) -> None:
        self.client.close()


class RedisStreamConsumer(MQConsumer):
    """Redis Streams 消费者"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.client = redis.from_url(redis_url, decode_responses=False)
        self.topic: Optional[str] = None
        self.group: Optional[str] = None
        self.consumer_id = f"consumer-{uuid.uuid4().hex[:8]}"

    def subscribe(self, topic: str, group: str) -> None:
        self.topic = topic
        self.group = group

        try:
            self.client.xgroup_create(topic, group, id="0", mkstream=True)
            logger.info(f"Created consumer group: {group} for topic: {topic}")
        except redis.ResponseError as e:
            if "BUSYGROUP" in str(e):
                logger.debug(f"Consumer group {group} already exists")
            else:
                raise

    def poll(self, timeout: float = 1.0) -> Optional[Message]:
        if not self.topic or not self.group:
            raise RuntimeError("Must call subscribe() before poll()")

        result = self.client.xreadgroup(
            self.group,
            self.consumer_id,
            {self.topic: ">"},
            count=1,
            block=int(timeout * 1000),
        )

        if not result:
            return None

        topic_data = result[0]
        messages = topic_data[1]
        if not messages:
            return None

        msg_id, fields = messages[0]
        data = fields.get(b"data", b"")

        if data == END_SIGNAL:
            logger.info(f"Received END signal from topic: {self.topic}")

        return Message(
            id=msg_id.decode() if isinstance(msg_id, bytes) else msg_id,
            topic=self.topic,
            data=data,
            timestamp=time.time(),
        )

    def ack(self, message: Message) -> None:
        if not self.topic or not self.group:
            raise RuntimeError("Must call subscribe() before ack()")
        self.client.xack(self.topic, self.group, message.id)

    def close(self) -> None:
        self.client.close()
