from fastapi import APIRouter, HTTPException
from pathlib import Path
import os

router = APIRouter()

# Assuming logs directory is relative to project root (where manage.py/main.py runs)
# Since we run from project root, 'logs' should be correct.
LOG_DIR = Path("logs")

@router.get("/logs/{service}")
async def get_logs(service: str, lines: int = 100):
    if service not in ["server", "client", "server.err", "client.err"]:
        raise HTTPException(status_code=400, detail="Invalid service name")
    
    # Handle error logs too
    filename = f"{service}.log" if not service.endswith(".err") else f"{service}.log"
    # Actually filename is just service.log or service.err.log?
    # manage.py names: server.log, server.err.log
    
    if service == "server": filename = "server.log"
    elif service == "client": filename = "client.log"
    elif service == "server.err": filename = "server.err.log"
    elif service == "client.err": filename = "client.err.log"
    
    log_file = LOG_DIR / filename
    if not log_file.exists():
        return {"lines": ["Log file not found."]}
    
    try:
        # Efficient tail is hard in pure python without reading whole file, 
        # but for < 10MB logs, readlines() is acceptable.
        # Improve later if needed.
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            # Seek to end? No, just read all for simplicity now.
            # Or use collections.deque for fixed size buffer
            from collections import deque
            last_lines = deque(f, maxlen=lines)
            return {"lines": list(last_lines)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
