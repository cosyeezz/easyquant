import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/system"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # 订阅日志频道
            sub_msg = {
                "action": "subscribe",
                "channels": ["logs", "system.status"]
            }
            await websocket.send(json.dumps(sub_msg))
            print(f"Sent subscription: {sub_msg}")
            
            # 监听消息
            for i in range(5):
                msg = await websocket.recv()
                print(f"Received: {msg}")
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
