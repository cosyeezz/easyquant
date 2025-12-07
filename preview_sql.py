from server.storage.ddl_generator import DDLGenerator

def show_sample_sql():
    table_name = "daily_bars"
    table_comment = "日线行情数据"
    columns_schema = [
        {"name": "ts_code", "type": "VARCHAR", "is_pk": True, "comment": "股票代码"},
        {"name": "trade_date", "type": "DATE", "is_pk": True, "comment": "交易日期"},
        {"name": "open", "type": "NUMERIC", "comment": "开盘价"},
        {"name": "close", "type": "NUMERIC", "comment": "收盘价"},
        {"name": "vol", "type": "BIGINT", "comment": "成交量"}
    ]

    print(f"--- Generated SQL Preview for '{table_name}' ---")
    try:
        sqls = DDLGenerator.generate_create_table_sqls(table_name, table_comment, columns_schema)
        for sql in sqls:
            print(sql)
    except Exception as e:
        print(f"Error generating DDL: {e}")
    print("---------------------------------------------")

if __name__ == "__main__":
    show_sample_sql()
