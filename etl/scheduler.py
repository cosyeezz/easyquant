import asyncio
from concurrent.futures import ProcessPoolExecutor
from typing import Callable, Any
import logging

from .data_loader.base import BaseLoader
from .processing.pipeline import Pipeline

logger = logging.getLogger(__name__)

def _run_pipeline_task(pipeline_factory: Callable[[], Pipeline], item: Any) -> Any:
    """
    一个独立的顶层函数，用于在子进程中执行任务。
    它会创建一个新的Pipeline实例并运行它。
    
    注意: 此函数必须在模块的顶层，以便能够被子进程正确地序列化和调用。
    
    :param pipeline_factory: 用于创建Pipeline实例的工厂函数。
    :param item: 要处理的数据项 (例如，一个文件路径)。
    :return: Pipeline运行的结果。
    """
    try:
        pipeline = pipeline_factory()
        # 每个子进程都有自己的事件循环，因此在这里使用 asyncio.run
        return asyncio.run(pipeline.run(item))
    except Exception as e:
        logger.error(f"子进程在处理 '{item}' 时发生错误: {e}", exc_info=True)
        # 可以选择重新抛出异常，或返回一个错误标记
        raise

class Scheduler:
    """
    顶层调度器，负责连接所有组件并驱动整个ETL过程。
    它实现“宏观多进程并行，微观异步并发”的核心模型。
    """

    def __init__(
        self,
        loader: BaseLoader,
        pipeline_factory: Callable[[], Pipeline],
        max_workers: int = 4,
    ):
        """
        初始化调度器。

        :param loader: 数据加载器实例，用于异步获取所有待处理的数据单元。
        :param pipeline_factory: 一个无参数的函数 (工厂函数)，当调用它时，
                                 会返回一个全新的、配置好的 Pipeline 实例。
                                 这是实现多进程安全的关键，确保每个进程都有
                                 自己的 Pipeline、Handler，以及独立的资源
                                 (如数据库连接)。
        :param max_workers: 并行执行的最大工作进程数。
        """
        self.loader = loader
        self.pipeline_factory = pipeline_factory
        self.max_workers = max_workers

    async def run(self):
        """
        启动ETL调度流程。
        1. 从 Loader 异步获取所有待处理项。
        2. 创建一个进程池。
        3. 将处理任务分发给池中的工作进程。
        4. 异步等待所有任务完成。
        """
        logger.info("调度器启动，开始从加载器获取数据...")
        
        # 异步地从加载器收集所有项目
        items_to_process = [item async for item in self.loader.load()]
        
        if not items_to_process:
            logger.warning("没有从加载器获取到需要处理的数据。调度结束。")
            return

        logger.info(f"数据加载完成，共 {len(items_to_process)} 个项目待处理。")
        logger.info(f"将使用最多 {self.max_workers} 个工作进程进行并行处理。")

        # 获取当前正在运行的事件循环
        loop = asyncio.get_running_loop()
        
        # 使用 ProcessPoolExecutor 来执行CPU密集型或需要隔离的任务
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # 为每个项目创建一个在 executor 中运行的任务
            tasks = [
                loop.run_in_executor(
                    executor,
                    _run_pipeline_task,
                    self.pipeline_factory,
                    item
                )
                for item in items_to_process
            ]
            
            # 异步等待所有任务完成
            results = await asyncio.gather(*tasks)
            logger.info("所有ETL任务已在所有进程中完成。")
            return results

