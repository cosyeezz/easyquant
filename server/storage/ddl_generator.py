from typing import Dict, List, Any, Tuple
import re
from sqlalchemy import MetaData, Table, Column
from sqlalchemy.schema import CreateTable
from sqlalchemy.types import (
    VARCHAR, INTEGER, BIGINT, FLOAT, BOOLEAN, DATE, 
    TIMESTAMP, NUMERIC, JSON, Text, CHAR
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION, JSONB, TIMESTAMP as PG_TIMESTAMP, ARRAY, UUID

# PostgreSQL Reserved Keywords (subset of common ones to avoid)
RESERVED_KEYWORDS = {
    "ALL", "ANALYSE", "ANALYZE", "AND", "ANY", "ARRAY", "AS", "ASC", "ASYMMETRIC", "AUTHORIZATION",
    "BINARY", "BOTH", "CASE", "CAST", "CHECK", "COLLATE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS",
    "CURRENT_DATE", "CURRENT_ROLE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "DEFAULT",
    "DEFERRABLE", "DESC", "DISTINCT", "DO", "ELSE", "END", "EXCEPT", "FALSE", "FOR", "FOREIGN",
    "FREEZE", "FROM", "FULL", "GRANT", "GROUP", "HAVING", "ILIKE", "IN", "INITIALLY", "INNER",
    "INTERSECT", "INTO", "IS", "ISNULL", "JOIN", "LATERAL", "LEADING", "LEFT", "LIKE", "LIMIT",
    "LOCALTIME", "LOCALTIMESTAMP", "NATURAL", "NEW", "NOT", "NOTNULL", "NULL", "OFF", "OFFSET",
    "OLD", "ON", "ONLY", "OR", "ORDER", "OUTER", "OVERLAPS", "PLACING", "PRIMARY", "REFERENCES",
    "RIGHT", "SELECT", "SESSION_USER", "SIMILAR", "SOME", "SYMMETRIC", "TABLE", "THEN", "TO",
    "TRAILING", "TRUE", "UNION", "UNIQUE", "USER", "USING", "VERBOSE", "WHEN", "WHERE", "WINDOW", "WITH"
}

class DDLGenerator:
    """
    负责将 DataTableConfig 的元数据转换为可执行的 SQL DDL 语句。
    """

    @staticmethod
    def _parse_type(type_str: str):
        """
        Parse types like 'VARCHAR(20)', 'NUMERIC(10, 2)', 'INT'
        """
        type_str = type_str.strip().upper()
        
        # Handle Arrays like VARCHAR[] or INT[]
        is_array = False
        if type_str.endswith('[]'):
            is_array = True
            type_str = type_str[:-2]

        base_type = None
        args = []

        if '(' in type_str and type_str.endswith(')'):
            match = re.match(r"([A-Z0-9_]+)\((.+)\)", type_str)
            if match:
                type_name = match.group(1)
                args_str = match.group(2)
                args = [int(a.strip()) if a.strip().isdigit() else a.strip() for a in args_str.split(',')]
                
                if type_name == 'VARCHAR': base_type = VARCHAR(*args)
                elif type_name == 'CHAR': base_type = CHAR(*args)
                elif type_name == 'NUMERIC': base_type = NUMERIC(*args)
                # Add more parameterized types if needed
                else: base_type = VARCHAR(*args) # Fallback
        else:
            type_name = type_str
            if type_name == 'INT' or type_name == 'INTEGER': base_type = INTEGER()
            elif type_name == 'BIGINT': base_type = BIGINT()
            elif type_name == 'TEXT': base_type = Text()
            elif type_name == 'DOUBLE PRECISION': base_type = DOUBLE_PRECISION()
            elif type_name == 'FLOAT': base_type = FLOAT()
            elif type_name == 'BOOLEAN': base_type = BOOLEAN()
            elif type_name == 'JSON': base_type = JSON()
            elif type_name == 'JSONB': base_type = JSONB()
            elif type_name == 'DATE': base_type = DATE()
            elif type_name == 'TIME': base_type = postgresql.TIME()
            elif type_name == 'TIMESTAMP': base_type = TIMESTAMP()
            elif type_name == 'TIMESTAMPTZ': base_type = PG_TIMESTAMP(timezone=True)
            elif type_name == 'UUID': base_type = UUID()
            else: base_type = VARCHAR() # Default fallback

        if is_array:
            return ARRAY(base_type)
        return base_type

    @staticmethod
    def validate_schema(table_name: str, columns_schema: List[Dict[str, Any]], indexes_schema: List[Dict[str, Any]]) -> Tuple[bool, str | None]:
        """
        Validate the table schema before creation.
        Returns: (is_valid, error_message)
        """
        # 1. Check Table Name
        if not re.match(r"^[a-z_][a-z0-9_]*$", table_name):
            return False, f"表名 '{table_name}' 格式无效 (仅限小写字母, 数字, 下划线)"
        if table_name.upper() in RESERVED_KEYWORDS:
            return False, f"表名 '{table_name}' 是保留关键字"

        # 2. Check Columns
        col_names = set()
        pk_defined = False
        
        if not columns_schema:
             return False, "表必须至少包含一个字段"

        for col in columns_schema:
            name = col.get("name")
            if not name:
                return False, "字段名不能为空"
            
            if not re.match(r"^[a-z_][a-z0-9_]*$", name):
                return False, f"字段名 '{name}' 格式无效"
            
            if name.upper() in RESERVED_KEYWORDS:
                return False, f"字段名 '{name}' 是保留关键字"
            
            if name in col_names:
                return False, f"字段名 '{name}' 重复"
            col_names.add(name)

            if col.get("is_pk"):
                pk_defined = True

        # 3. Check Primary Key (Warning or Error? Let's make it strict for now)
        if not pk_defined:
            return False, "必须定义主键 (Primary Key)"

        # 4. Check Indexes
        for idx in indexes_schema:
            idx_cols = idx.get("columns", [])
            if not idx_cols:
                return False, f"索引 '{idx.get('name')}' 未指定任何列"
            for c in idx_cols:
                if c not in col_names:
                    return False, f"索引引用的列 '{c}' 不存在"

        return True, None

    @staticmethod
    def generate_create_table_sqls(table_name: str, table_comment: str, columns_schema: List[Dict[str, Any]]) -> List[str]:
        """
        生成建表 SQL 语句列表
        """
        metadata = MetaData()
        columns = []
        comments = {} 

        for col_def in columns_schema:
            col_name = col_def["name"]
            type_str = col_def["type"]
            is_pk = col_def.get("is_pk", False)
            comment = col_def.get("comment", "")
            
            sql_type = DDLGenerator._parse_type(type_str)

            col_obj = Column(col_name, sql_type, primary_key=is_pk)
            columns.append(col_obj)
            
            if comment:
                comments[col_name] = comment

        # 创建临时的 Table 对象
        table = Table(table_name, metadata, *columns)

        # 生成 CREATE TABLE 语句
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
            idx_name = idx.get("name", "").strip()
            cols = idx["columns"]
            is_unique = idx.get("unique", False)
            
            # Auto-generate index name if missing
            if not idx_name:
                clean_cols = [c.replace('"', '').replace(' ', '') for c in cols]
                base = "_".join(clean_cols)
                # Truncate to avoid too long names (Postgres limit 63 chars usually)
                idx_name = f"idx_{table_name}_{base}"[:60]

            unique_str = "UNIQUE" if is_unique else ""
            cols_str = ", ".join(cols)
            
            # Double check syntax: CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON table (col1, col2)
            sql = f"CREATE {unique_str} INDEX IF NOT EXISTS {idx_name} ON {table_name} ({cols_str});"
            sqls.append(sql)
        return sqls

    @staticmethod
    def generate_sync_sqls(table_name: str, current_db_columns: List[Dict[str, Any]], new_schema_columns: List[Dict[str, Any]]) -> List[str]:
        """
        生成同步表结构的 DDL (Add/Drop/Alter)
        current_db_columns: [{'name': 'id', 'type': INTEGER(), ...}, ...] (来自 inspect)
        new_schema_columns: [{'name': 'id', 'type': 'INT', ...}, ...] (来自 config)
        """
        sqls = []
        
        # Build maps
        db_col_map = {c['name']: c for c in current_db_columns}
        new_col_map = {c['name']: c for c in new_schema_columns}
        
        # 1. Handle ADD and ALTER
        for col in new_schema_columns:
            name = col['name']
            type_str = col['type']
            comment = col.get('comment', '')
            
            # Parse target type
            target_type = DDLGenerator._parse_type(type_str).compile(dialect=postgresql.dialect())
            
            if name not in db_col_map:
                # ADD
                sqls.append(f"ALTER TABLE {table_name} ADD COLUMN {name} {target_type};")
                if comment:
                    safe_comment = comment.replace("'", "''")
                    sqls.append(f"COMMENT ON COLUMN {table_name}.{name} IS '{safe_comment}';")
            else:
                # Column exists, check for comment update
                db_comment = db_col_map[name].get('comment')
                # Config comment might be None or empty string, normalize to None or empty for comparison
                # Usually db returns None if no comment.
                new_comment = comment or None
                
                if db_comment != new_comment:
                    safe_comment = (new_comment or "").replace("'", "''")
                    sqls.append(f"COMMENT ON COLUMN {table_name}.{name} IS '{safe_comment}';")

                # ALTER TYPE? (Skipped for safety as discussed)
                pass

        # 2. Handle DROP
        for name in db_col_map:
            if name not in new_col_map:
                sqls.append(f"ALTER TABLE {table_name} DROP COLUMN {name};")
        
        return sqls