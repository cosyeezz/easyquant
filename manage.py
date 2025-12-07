import os
import sys
import subprocess
import platform
import signal
import time
import re
from pathlib import Path

# 配置
PROJECT_ROOT = Path(__file__).parent.absolute()
LOG_DIR = PROJECT_ROOT / "logs"
PID_FILE = LOG_DIR / "services.pid"

SERVER_CMD = [sys.executable, "server/main.py"]
# Windows 下 npm 命令需要 shell=True 或者通过 cmd /c 运行，或者直接找 npm.cmd
NPM_CMD = ["npm", "run", "dev"]
if platform.system() == "Windows":
    NPM_CMD = ["npm.cmd", "run", "dev"]

def ensure_log_dir():
    if not LOG_DIR.exists():
        print(f"Creating logs directory: {LOG_DIR}")
        LOG_DIR.mkdir(parents=True, exist_ok=True)

def read_pids():
    if not PID_FILE.exists():
        return {}
    pids = {}
    try:
        with open(PID_FILE, "r") as f:
            for line in f:
                if ":" in line:
                    name, pid = line.strip().split(":", 1)
                    pids[name] = int(pid)
    except Exception as e:
        print(f"Warning: Failed to read PID file: {e}")
    return pids

def write_pids(pids):
    with open(PID_FILE, "w") as f:
        for name, pid in pids.items():
            f.write(f"{name}:{pid}\n")

def check_port_in_use(port):
    """检查端口占用 (跨平台)"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_process_on_port(port):
    """根据端口杀进程 (仅用于后端兜底清理)"""
    print(f"Cleaning up process on port {port}...")
    if platform.system() == "Windows":
        try:
            # 查找 PID: netstat -ano | findstr :8000
            output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
            for line in output.splitlines():
                if "LISTENING" in line:
                    parts = line.split()
                    pid = parts[-1]
                    subprocess.run(["taskkill", "/F", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    else:
        try:
            # lsof -t -i:8000
            pid = subprocess.check_output(["lsof", "-t", f"-i:{port}"]).decode().strip()
            if pid:
                os.kill(int(pid), signal.SIGKILL)
        except Exception:
            pass

def kill_process_tree(pid):
    """杀死进程树"""
    try:
        if platform.system() == "Windows":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.kill(pid, signal.SIGTERM)
            # 对于 Unix，如果需要杀子进程，通常需要 PGID，但在 manage.py 这种简单场景下，
            # 只要主进程退出了，通常就释放了资源。如果不行，可以考虑 pkill -P
    except ProcessLookupError:
        pass
    except Exception as e:
        print(f"Failed to kill PID {pid}: {e}")

def force_stop(target="all"):
    """
    强力停止逻辑：
    1. 尝试读取 PID 文件停止
    2. 尝试根据端口/特征码兜底停止
    """
    pids = read_pids()
    
    # 1. PID 文件清理
    targets_to_kill = []
    if target == "all": targets_to_kill = list(pids.keys())
    elif target in pids: targets_to_kill = [target]

    for name in targets_to_kill:
        pid = pids[name]
        print(f"[{name}] Stopping PID (from file): {pid}...")
        kill_process_tree(pid)
        if name in pids: del pids[name]

    # 2. 兜底清理 (Port / Name)
    if target in ["all", "server"]:
        if check_port_in_use(8000):
            print("[Server] Port 8000 is still in use, forcing cleanup...")
            kill_process_on_port(8000)
    
    if target in ["all", "client"]:
        # 前端较难通过端口查杀(Vite端口不固定)，只能尝试 pkill (Unix only)
        # Windows 下 taskkill /IM node.exe 风险太大，暂不执行全局查杀，仅依赖 PID
        if platform.system() != "Windows":
            # 尝试查找包含 "vite" 的 node 进程
            subprocess.run(["pkill", "-f", "vite"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 更新 PID 文件
    write_pids(pids)

def start_services(target="all"):
    # 启动前先执行清理！
    print(f"Pre-start cleanup ({target})...")
    force_stop(target)
    time.sleep(1) # 给 OS 一点时间回收资源

    ensure_log_dir()
    pids = read_pids()
    
    # 准备环境变量，注入启动标记
    run_env = os.environ.copy()
    run_env["EASYQUANT_LAUNCHER"] = "1"
    
    # 关键：将项目根目录加入 PYTHONPATH，解决 'ModuleNotFoundError: No module named server'
    # Windows 使用 ; 分隔，Unix 使用 :
    path_sep = ";" if platform.system() == "Windows" else ":"
    current_pythonpath = run_env.get("PYTHONPATH", "")
    run_env["PYTHONPATH"] = str(PROJECT_ROOT) + (path_sep + current_pythonpath if current_pythonpath else "")
    
    print("=" * 50)
    print(f"Starting EasyQuant ({target}) on {platform.system()}...")
    print(f"Logs directory: {LOG_DIR}")
    print("=" * 50)

    # --- Start Server ---
    if target in ["all", "server"]:
        print("[Server] Starting backend service...")
        server_out = open(LOG_DIR / "server.log", "w", encoding='utf-8')
        server_err = open(LOG_DIR / "server.err.log", "w", encoding='utf-8')
        
        try:
            server_proc = subprocess.Popen(
                SERVER_CMD,
                cwd=PROJECT_ROOT,
                stdout=server_out,
                stderr=server_err,
                env=run_env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
            )
            pids['server'] = server_proc.pid
            print(f"[Server] Started with PID: {server_proc.pid}")
        except Exception as e:
            print(f"[Server] Failed to start: {e}")
        print("")

    # --- Start Client ---
    if target in ["all", "client"]:
        print("[Client] Starting frontend service...")
        client_out = open(LOG_DIR / "client.log", "w", encoding='utf-8')
        client_err = open(LOG_DIR / "client.err.log", "w", encoding='utf-8')

        try:
            client_proc = subprocess.Popen(
                NPM_CMD,
                cwd=PROJECT_ROOT / "client",
                stdout=client_out,
                stderr=client_err,
                env=run_env,
                shell=(platform.system() == "Windows"),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
            )
            pids['client'] = client_proc.pid
            print(f"[Client] Started with PID: {client_proc.pid}")
        except Exception as e:
            print(f"[Client] Failed to start: {e}")

    write_pids(pids)
    
    print("=" * 50)
    print(f"Action '{target}' completed.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python manage.py [start|stop] [all|server|client]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    target = sys.argv[2].lower() if len(sys.argv) > 2 else "all"
    
    if command == "start":
        start_services(target)
    elif command == "stop":
        force_stop(target)
        print("Done.")
    else:
        print(f"Unknown command: {command}")
        print("Usage: python manage.py [start|stop] [all|server|client]")

if __name__ == "__main__":
    main()
