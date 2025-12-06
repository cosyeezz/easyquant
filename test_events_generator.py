"""
测试数据生成脚本 - 用于快速测试前端界面

运行此脚本会向API发送模拟的ETL事件数据，
这样你就可以立即在前端看到进程监控效果，
而不需要等待真正的ETL进程运行。

使用方法:
    python test_events_generator.py
"""
import asyncio
import random
import time
from datetime import datetime
import httpx

API_BASE_URL = "http://localhost:8000/api/v1"

# 模拟的进程名称
PROCESS_NAMES = [
    "ETL_Pipeline_1",
    "ETL_Pipeline_2",
    "ETL_Pipeline_3",
    "Data_Loader_Alpha",
]

# 模拟的文件名
SAMPLE_FILES = [
    "stock_data_2024_01.csv",
    "stock_data_2024_02.csv",
    "futures_tick_data.parquet",
    "options_chain_2024.json",
    "market_depth_snapshot.csv",
]

# 事件类型
EVENT_TYPES = [
    "loader.task.started",
    "loader.queue.status",
    "loader.file.processing",
    "loader.progress.update",
    "loader.task.completed",
    "loader.error.occurred",
]


async def send_event(client: httpx.AsyncClient, process_name: str, event_name: str, payload: dict):
    """发送事件到API"""
    try:
        response = await client.post(
            f"{API_BASE_URL}/events",
            json={
                "process_name": process_name,
                "event_name": event_name,
                "payload": payload
            }
        )
        if response.status_code == 201:
            print(f"✓ [{process_name}] {event_name}")
        else:
            print(f"✗ 发送失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 错误: {e}")


async def simulate_etl_process(client: httpx.AsyncClient, process_name: str):
    """模拟一个ETL进程的完整生命周期"""

    # 1. 任务启动
    await send_event(client, process_name, "loader.task.started", {
        "status": "started",
        "timestamp": datetime.now().isoformat()
    })
    await asyncio.sleep(1)

    # 2. 处理多个文件
    total_records = random.randint(5000, 20000)
    processed = 0

    for file_name in random.sample(SAMPLE_FILES, k=random.randint(2, 4)):
        file_size = random.randint(1000, 5000)

        # 开始处理文件
        await send_event(client, process_name, "loader.file.processing", {
            "current_file": file_name,
            "file_size": file_size,
            "status": "processing"
        })
        await asyncio.sleep(0.5)

        # 处理文件的进度
        for _ in range(random.randint(3, 8)):
            processed += random.randint(200, 800)
            if processed > total_records:
                processed = total_records

            queue_size = random.randint(0, 100)

            await send_event(client, process_name, "loader.queue.status", {
                "queue_size": queue_size,
                "current_file": file_name,
                "processed": processed,
                "total": total_records,
                "progress": round((processed / total_records) * 100, 2)
            })

            await asyncio.sleep(random.uniform(0.5, 1.5))

            if processed >= total_records:
                break

    # 3. 可能的错误 (20%概率)
    if random.random() < 0.2:
        await send_event(client, process_name, "loader.error.occurred", {
            "error": "网络连接超时，正在重试...",
            "retry_count": 1,
            "current_file": random.choice(SAMPLE_FILES)
        })
        await asyncio.sleep(2)

    # 4. 任务完成
    await send_event(client, process_name, "loader.task.completed", {
        "status": "completed",
        "processed": total_records,
        "total": total_records,
        "duration_seconds": random.randint(30, 180),
        "timestamp": datetime.now().isoformat()
    })


async def main():
    """主函数"""
    print("=" * 60)
    print("EasyQuant 测试数据生成器")
    print("=" * 60)
    print(f"目标API: {API_BASE_URL}")
    print(f"模拟进程数: {len(PROCESS_NAMES)}")
    print("=" * 60)
    print()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 测试API连接
        try:
            response = await client.get("http://localhost:8000/")
            print(f"✓ API连接成功: {response.json()['service']}")
            print()
        except Exception as e:
            print(f"✗ 无法连接到API: {e}")
            print("  请确保后端服务正在运行: python server/main.py")
            return

        # 并行运行多个模拟进程
        tasks = [
            simulate_etl_process(client, process_name)
            for process_name in PROCESS_NAMES
        ]

        await asyncio.gather(*tasks)

    print()
    print("=" * 60)
    print("✓ 所有测试数据已生成完毕")
    print("  请访问前端查看效果: http://localhost:3000")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
