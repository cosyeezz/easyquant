import { useState, useEffect, useRef, useCallback } from 'react';

// 根据当前环境自动决定 WS 地址
// 开发环境下 Vite 代理了 /api，但 WebSocket 代理可能导致 Origin/Host 头不一致被后端拒绝 (403)
// 这里我们直接连接后端端口 8000，利用 CORS 允许跨域连接
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.hostname; // localhost or ip
const WS_PORT = '8001'; 

const WS_URL = `${WS_PROTOCOL}//${WS_HOST}:${WS_PORT}/ws/system`;

export function useWebSocket() {
  const ws = useRef(null);
  const [status, setStatus] = useState('disconnected'); // connecting, connected, disconnected
  const [systemStatus, setSystemStatus] = useState(null);
  // 日志流作为一个专门的状态
  const [logs, setLogs] = useState([]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

    setStatus('connecting');
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setStatus('connected');
      console.log('WS Connected');
      // 默认订阅系统状态
      socket.send(JSON.stringify({ action: 'subscribe', channels: ['system.status'] }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { channel, data } = msg;

        if (channel === 'system.status') {
          setSystemStatus(data);
        } else if (channel === 'logs') {
          // 追加日志，限制缓冲区大小
          setLogs(prev => {
            const newLogs = [...prev, data];
            if (newLogs.length > 500) return newLogs.slice(-500);
            return newLogs;
          });
        }
      } catch (e) {
        console.error("WS Parse Error:", e);
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      ws.current = null;
      // 3秒后重连
      setTimeout(connect, 3000);
    };
    
    socket.onerror = (err) => {
       console.error("WS Error:", err);
       socket.close();
    };

  }, []);

  useEffect(() => {
    connect();
    return () => {
        if (ws.current) {
            ws.current.close();
        }
    };
  }, [connect]);

  const subscribeLogs = useCallback(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ action: 'subscribe', channels: ['logs'] }));
      }
  }, []);

  const unsubscribeLogs = useCallback(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ action: 'unsubscribe', channels: ['logs'] }));
      }
  }, []);

  return { 
      status, 
      systemStatus, 
      logs,
      subscribeLogs,
      unsubscribeLogs
  };
}
