import multiprocessing
import os
import time
import abc

class BaseMonitor(abc.ABC):
    """
    一个用于多进程监控的基类。

    所有需要被监控的工作进程都应继承此类。它提供了一种标准化的方式
    来报告进程的状态、PID、心跳和自定义指标。状态信息通过一个
    共享的字典（例如 `multiprocessing.Manager().dict()`）进行传递，
    以便主监控进程可以收集和展示所有工作进程的状态。

    Attributes:
        _name (str): 进程的唯一名称。
        _pid (int): 进程的PID。
        _shared_status_dict (dict): 用于在进程间共享状态的字典。
        _status (dict): 存储此进程当前状态的本地字典。
    """

    def __init__(self, name: str, shared_status_dict: dict):
        """
        初始化监控基类。

        Args:
            name (str): 此进程的唯一标识符。
            shared_status_dict (dict): 一个由 `multiprocessing.Manager().dict()` 创建的
                                       共享字典，用于跨进程存储状态。
        """
        if not isinstance(name, str) or not name:
            raise ValueError("`name` must be a non-empty string.")
        if not hasattr(shared_status_dict, 'get'):
            raise TypeError("`shared_status_dict` must be a dict-like object, "
                            "preferably from `multiprocessing.Manager()`.")

        self._name = name
        self._pid = os.getpid()
        self._shared_status_dict = shared_status_dict
        self._status = {
            'name': self._name,
            'pid': self._pid,
            'start_time': time.time(),
            'last_update': time.time(),
            'status': 'initializing',
            'metrics': {}
        }
        self._update_shared_status()

    def _update_shared_status(self):
        """
        将当前进程的状态更新到共享字典中。
        每次状态变更时调用此方法。
        """
        self._status['last_update'] = time.time()
        self._shared_status_dict[self._name] = self._status

    def set_status(self, status: str):
        """
        设置进程的主要状态。

        例如: 'running', 'idle', 'error', 'finished'.

        Args:
            status (str): 描述进程当前状态的字符串。
        """
        self._status['status'] = status
        self._update_shared_status()

    def update_metric(self, key: str, value):
        """
        更新或添加一个自定义的监控指标。

        子类可以使用此方法来报告特定于其任务的数据，
        例如处理的记录数、当前的投资组合价值等。

        Args:
            key (str): 指标的名称 (例如, 'records_processed')。
            value: 指标的值 (可以是任何可序列化的类型)。
        """
        self._status['metrics'][key] = value
        self._update_shared_status()
        
    def increment_metric(self, key: str, increment_value: (int, float) = 1):
        """
        对一个现有的数字指标进行增量更新。如果指标不存在，则从0开始。

        Args:
            key (str): 指标的名称。
            increment_value (int or float): 增加的值，默认为1。
        """
        current_value = self._status['metrics'].get(key, 0)
        if not isinstance(current_value, (int, float)):
            current_value = 0
        self.update_metric(key, current_value + increment_value)

    @abc.abstractmethod
    def run(self):
        """
        抽象方法，所有子类必须实现此方法。
        这是进程执行其主要工作逻辑的入口点。
        """
        self.set_status('running')
        # ... 子类的工作逻辑在这里实现 ...
        self.set_status('finished')
