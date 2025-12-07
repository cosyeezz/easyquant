from typing import Dict, List, Any
from sqlalchemy import MetaData, Table, Column
from sqlalchemy.schema import CreateTable
from sqlalchemy.types import (
    VARCHAR, INTEGER, BIGINT, FLOAT, BOOLEAN, DATE, 
    TIMESTAMP, NUMERIC, JSON, Text
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION, JSONB, TIMESTAMP as PG_TIMESTAMP

# 映射前端类型字符串到 SQLAlchemy 类型
TYPE_MAPPING = {
    "VARCHAR": VARCHAR,
    "TEXT": Text,
    "INT": INTEGER,
    "INTEGER": INTEGER,
    "BIGINT": BIGINT,
    "FLOAT": FLOAT,
    "DOUBLE PRECISION": DOUBLE_PRECISION, 
    "NUMERIC": NUMERIC,
    "BOOLEAN": BOOLEAN,
    "DATE": DATE,
    "TIMESTAMP": TIMESTAMP,
    "TIMESTAMPTZ": PG_TIMESTAMP(timezone=True), 
    "JSON": JSON,
    "JSONB": JSONB, 
}

class DDLGenerator:
    """
    负责将 DataTableConfig 的元数据转换为可执行的 SQL DDL 语句。
    """

    @staticmethod
    def generate_create_table_sqls(table_name: str, table_comment: str, columns_schema: List[Dict[str, Any]]) -> List[str]:
        """
        生成建表 SQL 语句列表，包含：
        1. CREATE TABLE ...
        2. COMMENT ON TABLE ...
        3. COMMENT ON COLUMN ...
        """
        metadata = MetaData()
        columns = []
        comments = {} # col_name -> comment

        for col_def in columns_schema:
            col_name = col_def["name"]
            type_str = col_def["type"].split("(")[0].upper().strip() # 简单处理 'VARCHAR(20)' -> 'VARCHAR'
            is_pk = col_def.get("is_pk", False)
            comment = col_def.get("comment", "")
            
            sql_type_cls = TYPE_MAPPING.get(type_str, VARCHAR)
            # 实例化类型对象
            sql_type = sql_type_cls()

            col_obj = Column(col_name, sql_type, primary_key=is_pk)
            columns.append(col_obj)
            
            if comment:
                comments[col_name] = comment

        # 创建临时的 Table 对象
        table = Table(table_name, metadata, *columns)

        # 生成 CREATE TABLE 语句 (针对 PostgreSQL)
        # compile 返回的对象转为 string 即可
        create_stmt = CreateTable(table).compile(dialect=postgresql.dialect())
        
        sql_lines = [str(create_stmt) + ";"]
        
        # 表注释
        if table_comment:
            safe_table_comment = table_comment.replace("'", "''")
            sql_lines.append(f"COMMENT ON TABLE {table_name} IS '{safe_table_comment}';")

        # 列注释
        for col_name, comment in comments.items():
            safe_comment = comment.replace("'", "''")
            sql_lines.append(f"COMMENT ON COLUMN {table_name}.{col_name} IS '{safe_comment}';")
            
        return sql_lines

    @staticmethod
    def generate_index_sqls(table_name: str, indexes_schema: List[Dict[str, Any]]) -> List[str]:
        sqls = []
        for idx in indexes_schema:
            idx_name = idx["name"]
            cols = idx["columns"]
            is_unique = idx.get("unique", False)
            
            unique_str = "UNIQUE" if is_unique else ""
            cols_str = ", ".join(cols)
            
            # 简单的 SQL 拼接，生产环境可能需要更严谨的 quote_ident
            sql = f"CREATE {unique_str} INDEX {idx_name} ON {table_name} ({cols_str});"
            sqls.append(sql)
        return sqls