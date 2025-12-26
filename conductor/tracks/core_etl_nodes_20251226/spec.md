# Spec: 核心 ETL 节点库扩充

## 目标
提供一组开箱即用的工业级数据处理节点，覆盖常见的 ETL 场景。

## 核心需求
1. **Source Nodes:** CSV Reader, Excel Reader, SQL Source (PostgreSQL/MySQL).
2. **Transformation Nodes:** Filter (Row-level), Select Columns, Rename, Join (Inner/Left/Outer), Group By.
3. **Sink Nodes:** SQL Destination, CSV Exporter.
4. **Validation:** 每个节点必须支持 Schema 推导。
