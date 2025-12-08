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

def get_client_port():
    """
    尝试从 client/vite.config.js 读取配置的端口。
    默认返回 3000。
    """
    config_path = PROJECT_ROOT / "client" / "vite.config.js"
    default_port = 3000
    try:
        if not config_path.exists():
            return default_port
        
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()
            
            # 1. 尝试匹配 server: { ... port: 3000 ... }
            # 使用 DOTALL 模式让 . 匹配换行符
            match = re.search(r'server:\s*\{[^}]*port:\s*(\d+)', content, re.DOTALL)
            if match:
                return int(match.group(1))
            
            # 2. 简单的后备匹配
            match_simple = re.search(r'port:\s*(\d+)', content)
            if match_simple:
                return int(match_simple.group(1))
                
    except Exception as e:
        print(f"Warning: Could not parse vite.config.js for port: {e}")
    
    return default_port

def force_stop(service_name):
    """
    通过查找端口占用强制停止服务。
    Server: 8000
    Client: 动态读取 (默认 3000)
    """
    ports = []
    if service_name in ["server", "all"]:
        ports.append(8000)
    if service_name in ["client", "all"]:
        ports.append(get_client_port())

    for port in ports:
        print(f"[{service_name.upper() if service_name != 'all' else 'SYSTEM'}] Checking port {port}...")
        try:
            # 使用 lsof 查找占用端口的 PID
            # -t: terse (only PIDs)
            # -i: internet files
            result = subprocess.run(
                ["lsof", "-t", "-i", f":{port}"], 
                capture_output=True, 
                text=True
            )
            pids = result.stdout.strip().split('\n')
            pids = [p for p in pids if p] # filter empty strings

            if not pids:
                print(f"  No process found on port {port}.")
                continue

            for pid in pids:
                try:
                    pid_int = int(pid)
                    print(f"  Killing PID {pid_int} on port {port}...")
                    os.kill(pid_int, signal.SIGTERM) # Try gentle kill first
                    # Optional: wait and force kill if needed
                except ValueError:
                    pass
                except ProcessLookupError:
                    print(f"  PID {pid} already gone.")
                except Exception as e:
                    print(f"  Error killing PID {pid}: {e}")
                    
        except FileNotFoundError:
             print("  Warning: 'lsof' command not found. Cannot kill by port automatically.")
        except Exception as e:
            print(f"  Error checking port {port}: {e}")

    # Clean up PID file just in case
    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
            print(f"Removed PID file: {PID_FILE}")
        except OSError:
            pass

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
        server_log = LOG_DIR / "server.log"
        server_err_log = LOG_DIR / "server.err.log"
        
        # Use shell redirection to avoid file descriptor issues when parent exits
        cmd_str = f'"{sys.executable}" server/main.py > "{server_log}" 2> "{server_err_log}"'
        
        try:
            server_proc = subprocess.Popen(
                cmd_str,
                cwd=PROJECT_ROOT,
                env=run_env,
                shell=True,
                stdin=subprocess.DEVNULL, # Detach stdin to prevent 'Bad file descriptor'
                # On Unix, start_new_session=True creates a new process group/session
                start_new_session=(platform.system() != "Windows"),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
            )
            pids['server'] = server_proc.pid + 1 if platform.system() != "Windows" else server_proc.pid # Shell pid vs child pid? Actually shell pid is what we get.
            # Wait, if shell=True, pids['server'] is the PID of the shell (sh/bash).
            # Killing the shell usually kills the child if they are in the same group.
            print(f"[Server] Started with PID: {server_proc.pid}")
        except Exception as e:
            print(f"[Server] Failed to start: {e}")
        print("")

    # --- Start Client ---
    if target in ["all", "client"]:
        print("[Client] Starting frontend service...")
        client_log = LOG_DIR / "client.log"
        client_err_log = LOG_DIR / "client.err.log"
        
        # npm run dev
        npm_cmd_str = " ".join(NPM_CMD)
        cmd_str = f'{npm_cmd_str} > "{client_log}" 2> "{client_err_log}"'

        try:
            client_proc = subprocess.Popen(
                cmd_str,
                cwd=PROJECT_ROOT / "client",
                env=run_env,
                shell=True,
                stdin=subprocess.DEVNULL, # Detach stdin
                start_new_session=(platform.system() != "Windows"),
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
