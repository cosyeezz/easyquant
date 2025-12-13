import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/system"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # 1. 订阅系统状态和日志
            sub_msg = {
                "action": "subscribe",
                "channels": ["system.status", "logs", "system.processes"]
            }
            await websocket.send(json.dumps(sub_msg))
            print(f"Sent subscription: {sub_msg}")
            
            # 2. 监听消息
            print("Waiting for messages (Ctrl+C to stop)...")
            count = 0
            while True:
                msg = await websocket.recv()
                data = json.loads(msg)
                print(f"[{data['channel']}] Received data")
                if data['channel'] == 'logs':
                    print(f"   Log: {data['data']['message']}")
                elif data['channel'] == 'system.status':
                    print(f"   Status: CPU {data['data']['cpu_percent']}%")
                
                count += 1
                if count >= 5:
                    break
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_ws())
    except KeyboardInterrupt:
        pass
