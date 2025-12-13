import { useState, useEffect, useRef, useCallback } from 'react';

// 动态判断 WebSocket URL
// 在开发环境中，Vite 代理会处理 /ws，但在生产或某些设置中可能需要完整 URL
const WS_PORT = '8000';
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.hostname}:${WS_PORT}/ws/system`;

export function useWebSocket() {
  const ws = useRef(null);
  const [status, setStatus] = useState('disconnected'); // connecting, connected, disconnected
  const [systemStatus, setSystemStatus] = useState(null);
  // 日志流作为一个专门的状态
  const [logs, setLogs] = useState([]);
  // 进程列表流
  const [processes, setProcesses] = useState([]);
  // 特定进程的实时事件流
  const [processRealtimeEvents, setProcessRealtimeEvents] = useState([]);

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
        } else if (channel === 'system.processes') {
          setProcesses(data);
        } else if (channel === 'logs') {
          // 追加日志，限制缓冲区大小
          setLogs(prev => {
            const newLogs = [...prev, data];
            if (newLogs.length > 500) return newLogs.slice(-500);
            return newLogs;
          });
        } else if (channel && channel.startsWith('process.events.')) {
           // 实时进程事件
           setProcessRealtimeEvents(prev => [data, ...prev]); // 新的在前面，或者后面？通常列表显示是新的在上面
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

  const subscribeProcesses = useCallback(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ action: 'subscribe', channels: ['system.processes'] }));
      }
  }, []);

  const unsubscribeProcesses = useCallback(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ action: 'unsubscribe', channels: ['system.processes'] }));
      }
  }, []);

  const subscribeProcessEvents = useCallback((processName) => {
      if (ws.current?.readyState === WebSocket.OPEN && processName) {
          ws.current.send(JSON.stringify({ action: 'subscribe', channels: [`process.events.${processName}`] }));
      }
  }, []);

  const unsubscribeProcessEvents = useCallback((processName) => {
      if (ws.current?.readyState === WebSocket.OPEN && processName) {
          ws.current.send(JSON.stringify({ action: 'unsubscribe', channels: [`process.events.${processName}`] }));
      }
  }, []);
  
  const clearProcessEvents = useCallback(() => {
      setProcessRealtimeEvents([]);
  }, []);

  return { 
      status, 
      systemStatus, 
      logs,
      processes,
      processRealtimeEvents,
      subscribeLogs,
      unsubscribeLogs,
      subscribeProcesses,
      unsubscribeProcesses,
      subscribeProcessEvents,
      unsubscribeProcessEvents,
      clearProcessEvents
  };
}
