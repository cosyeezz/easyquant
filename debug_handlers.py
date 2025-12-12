import sys
import os

# 把当前目录加入 path，以便能 import server 模块
sys.path.append(os.getcwd())

from server.etl.process.registry import registry

print("Scanning handlers...")
registry.auto_discover("server.etl.process.handlers")

handlers = registry.get_all_handlers_metadata()
print(f"Found {len(handlers)} handlers.")
for h in handlers:
    print(f"- {h['name']}: {h.get('label', 'No Label')}")

if any(h['name'] == 'GroupHandler' for h in handlers):
    print("SUCCESS: GroupHandler found!")
else:
    print("FAILURE: GroupHandler NOT found.")
