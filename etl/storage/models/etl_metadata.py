from sqlalchemy import Column, Integer, String, DateTime, func
from .base import Base

class ETLMetadata(Base):
    """
    用于记录ETL处理元数据的模型，是实现幂等性的核心。
    """
    __tablename__ = 'etl_metadata'

    id = Column(Integer, primary_key=True)
    
    # 数据源的唯一标识符，例如文件路径
    source_identifier = Column(String, unique=True, index=True, nullable=False, comment="数据源的唯一标识符，如文件路径")
    
    # 数据源内容的哈希值（例如 SHA256），用于检测内容是否变化
    source_hash = Column(String, nullable=False, comment="数据源内容的SHA256哈希值")
    
    # 处理完成的时间戳
    processed_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="处理完成时间")

    def __repr__(self):
        return f"<ETLMetadata(source='{self.source_identifier}', hash='{self.source_hash[:10]}...')>"
