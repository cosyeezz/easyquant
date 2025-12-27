"""
Message Queue Base Interfaces
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class Message:
    """消息数据结构"""
    id: str
    topic: str
    data: bytes
    timestamp: float


class MQProducer(ABC):
    """消息生产者接口"""

    @abstractmethod
    def send(self, topic: str, data: bytes) -> str:
        pass

    @abstractmethod
    def send_end_signal(self, topic: str) -> None:
        pass

    @abstractmethod
    def close(self) -> None:
        pass


class MQConsumer(ABC):
    """消息消费者接口"""

    @abstractmethod
    def subscribe(self, topic: str, group: str) -> None:
        pass

    @abstractmethod
    def poll(self, timeout: float = 1.0) -> Optional[Message]:
        pass

    @abstractmethod
    def ack(self, message: Message) -> None:
        pass

    @abstractmethod
    def close(self) -> None:
        pass


END_SIGNAL = b"__END__"
