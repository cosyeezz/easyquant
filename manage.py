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
# 假设 easy-canvas 与 easyquant 同级
CANVAS_ROOT = PROJECT_ROOT.parent / "easy-canvas"
CLIENT_ROOT = PROJECT_ROOT / "client"
LOG_DIR = PROJECT_ROOT / "logs"
PID_FILE = LOG_DIR / "services.pid"

SERVER_CMD = [sys.executable, "server/main.py"]

# Windows 下 npm 命令需要 shell=True 或者通过 cmd /c 运行
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

def force_stop(service_name):
    """
    通过查找端口占用强制停止服务。
    Server: 8000
    Web (Client): 3000
    Canvas: 3001
    """
    targets = []
    if service_name in ["server", "all"]:
        targets.append(("Server", 8000))
    if service_name in ["web", "all"]:
        targets.append(("Web", 3000))
    if service_name in ["canvas", "all"]:
        targets.append(("Canvas", 3001))

    for name, port in targets:
        print(f"[{name}] Checking port {port}...")
        
        pids = set()
        if platform.system() == "Windows":
            try:
                cmd = f"netstat -ano | findstr :{port}"
                output = subprocess.check_output(cmd, shell=True).decode()
                for line in output.splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 5 and "LISTENING" in parts:
                         local_addr = parts[1]
                         pid = parts[-1]
                         if local_addr.endswith(f":{port}"):
                             pids.add(pid)
            except subprocess.CalledProcessError:
                pass
            except Exception as e:
                print(f"  Error checking port {port} (Windows): {e}")
        else:
            try:
                result = subprocess.run(
                    ["lsof", "-t", "-i", f":{port}"], 
                    capture_output=True, 
                    text=True
                )
                found = result.stdout.strip().split('\n')
                pids.update([p for p in found if p])
            except FileNotFoundError:
                 print("  Warning: 'lsof' command not found.")
            except Exception as e:
                print(f"  Error checking port {port} (Unix): {e}")

        if not pids:
            print(f"  No process found on port {port}.")
            continue

        for pid in pids:
            try:
                pid_int = int(pid)
                print(f"  Killing PID {pid_int} on port {port}...")
                if platform.system() == "Windows":
                    subprocess.run(["taskkill", "/F", "/PID", str(pid_int)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    os.kill(pid_int, signal.SIGTERM)
            except Exception:
                pass

    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
        except OSError:
            pass

def run_migrations():
    print("[Migration] Checking and applying database schema (alembic upgrade head)...")
    try:
        cmd = [sys.executable, "-m", "alembic", "upgrade", "head"]
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        if result.returncode != 0:
            print("[Migration] FAILED!")
            print(result.stderr)
            raise RuntimeError("Database migration failed.")
        else:
            print("[Migration] Success.")
    except Exception as e:
        print(f"[Migration] Critical Error: {e}")
        sys.exit(1)

def start_services(target="all"):
    print(f"Pre-start cleanup ({target})...")
    force_stop(target)
    time.sleep(1) 

    if target in ["all", "server"]:
        run_migrations()

    ensure_log_dir()
    pids = read_pids()
    
    run_env = os.environ.copy()
    run_env["EASYQUANT_LAUNCHER"] = "1"
    run_env["PYTHONIOENCODING"] = "utf-8"
    
    path_sep = ";" if platform.system() == "Windows" else ":"
    current_pythonpath = run_env.get("PYTHONPATH", "")
    run_env["PYTHONPATH"] = str(PROJECT_ROOT) + (path_sep + current_pythonpath if current_pythonpath else "")
    
    env_prefix = "EASYQUANT_LAUNCHER=1 " if platform.system() != "Windows" else ""

    print("=" * 50)
    print(f"Starting EasyQuant ({target}) on {platform.system()}...")
    print("=" * 50)

    # --- Start Server (8000) ---
    if target in ["all", "server"]:
        print("[Server] Starting backend service...")
        server_log = LOG_DIR / "server.log"
        server_err = LOG_DIR / "server.err.log"
        cmd_str = f'{env_prefix}"{sys.executable}" -u server/main.py > "{server_log}" 2> "{server_err}"'
        
        try:
            proc = subprocess.Popen(
                cmd_str, cwd=PROJECT_ROOT, env=run_env, shell=True,
                stdin=subprocess.DEVNULL,
                start_new_session=(platform.system() != "Windows"),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
            )
            pids['server'] = proc.pid + 1 if platform.system() != "Windows" else proc.pid
            print(f"[Server] Started (PID: {proc.pid})")
        except Exception as e:
            print(f"[Server] Failed: {e}")

    # --- Start Web Client (3000) ---
    if target in ["all", "web"]:
        if not CLIENT_ROOT.exists():
            print(f"[Web] Error: Client directory not found at {CLIENT_ROOT}")
        else:
            print("[Web] Starting Legacy Web Client (Vite)...")
            web_log = LOG_DIR / "web.log"
            web_err = LOG_DIR / "web.err.log"
            
            # Check for node_modules
            if not (CLIENT_ROOT / "node_modules").exists():
                 print("[Web] Installing dependencies...")
                 subprocess.run("npm install", shell=True, cwd=CLIENT_ROOT)

            npm_cmd_str = " ".join(NPM_CMD)
            cmd_str = f'{env_prefix}{npm_cmd_str} > "{web_log}" 2> "{web_err}"'

            try:
                proc = subprocess.Popen(
                    cmd_str, cwd=CLIENT_ROOT, env=run_env, shell=True,
                    stdin=subprocess.DEVNULL,
                    start_new_session=(platform.system() != "Windows"),
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
                )
                pids['web'] = proc.pid
                print(f"[Web] Started (PID: {proc.pid})")
            except Exception as e:
                print(f"[Web] Failed: {e}")

    # --- Start Canvas Client (3001) ---
    if target in ["all", "canvas"]:
        if not CANVAS_ROOT.exists():
            print(f"[Canvas] Error: Easy-Canvas directory not found at {CANVAS_ROOT}")
        else:
            print("[Canvas] Starting Easy-Canvas (Next.js)...")
            canvas_log = LOG_DIR / "canvas.log"
            canvas_err = LOG_DIR / "canvas.err.log"
            
            # 假设 easy-canvas 已经安装好依赖
            npm_cmd_str = " ".join(NPM_CMD)
            cmd_str = f'{env_prefix}{npm_cmd_str} > "{canvas_log}" 2> "{canvas_err}"'

            try:
                proc = subprocess.Popen(
                    cmd_str, cwd=CANVAS_ROOT, env=run_env, shell=True,
                    stdin=subprocess.DEVNULL,
                    start_new_session=(platform.system() != "Windows"),
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
                )
                pids['canvas'] = proc.pid
                print(f"[Canvas] Started (PID: {proc.pid})")
            except Exception as e:
                print(f"[Canvas] Failed: {e}")

    write_pids(pids)
    print("=" * 50)

def main():
    if len(sys.argv) < 2:
        print("Usage: python manage.py [start|stop] [all|server|web|canvas]")
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

if __name__ == "__main__":
    main()
