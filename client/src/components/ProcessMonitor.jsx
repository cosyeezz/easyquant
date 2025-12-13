import { useState, useEffect, useRef } from 'react'
import { Activity, Clock, Database, FileText, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'

// Internal LogViewer Component
function LogViewer({ autoRefresh }) {
  // Use independent WebSocket connection for logs to avoid re-render noise in main App
  const { logs, subscribeLogs, unsubscribeLogs, status } = useWebSocket()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (status === 'connected') {
        subscribeLogs()
    }
    return () => {
        if (status === 'connected') unsubscribeLogs()
    }
  }, [status, subscribeLogs, unsubscribeLogs])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoRefresh && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoRefresh])

  return (
    <div className="card mt-8">
      <div className="card-header flex justify-between items-center">
        <div className="flex items-center gap-2">
           <FileText className="w-5 h-5 text-primary-600" />
           系统实时日志 (WebSocket)
        </div>
        <div className="flex items-center gap-2 text-xs">
           <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
           {status === 'connected' ? '已连接' : '断开'}
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="bg-slate-900 rounded-lg p-4 font-mono text-xs md:text-sm h-96 overflow-y-auto shadow-inner border border-slate-700"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 italic">等待日志推送...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap text-emerald-400 border-b border-slate-800/50 pb-0.5 mb-0.5 last:border-0 hover:bg-slate-800/50 font-mono">
              {log.full_text || log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProcessMonitor() {
  // WebSocket hook for process list updates
  const { 
    processes: wsProcesses, 
    status: wsStatus, 
    subscribeProcesses, 
    unsubscribeProcesses,
    // Real-time events
    processRealtimeEvents,
    subscribeProcessEvents,
    unsubscribeProcessEvents,
    clearProcessEvents
  } = useWebSocket()
  
  const [processes, setProcesses] = useState([])
  const [selectedProcess, setSelectedProcess] = useState(null)
  
  // 分离历史事件和实时事件
  const [historyEvents, setHistoryEvents] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // 订阅进程列表更新
  useEffect(() => {
      if (wsStatus === 'connected') {
          subscribeProcesses()
      }
      return () => {
          if (wsStatus === 'connected') unsubscribeProcesses()
      }
  }, [wsStatus, subscribeProcesses, unsubscribeProcesses])

  // 当 WebSocket 数据到来时更新本地状态
  useEffect(() => {
      if (wsProcesses && wsProcesses.length > 0) {
          setProcesses(wsProcesses)
          setLoading(false)
      }
  }, [wsProcesses])

  // 初始加载一次 (HTTP Fallback for faster first paint)
  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const data = await api.getProcesses()
        setProcesses(data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch processes:', error)
        setLoading(false)
      }
    }
    fetchProcesses()
  }, [])

  // 选中进程变化时：拉取历史 + 订阅实时
  useEffect(() => {
    if (!selectedProcess) return

    // 1. 清理上一轮的实时数据
    clearProcessEvents()
    setHistoryEvents([])
    
    // 2. 订阅新的实时流
    if (wsStatus === 'connected') {
        subscribeProcessEvents(selectedProcess)
    }

    // 3. 拉取历史数据
    const fetchHistory = async () => {
      try {
        const events = await api.getProcessEvents(selectedProcess, 100)
        setHistoryEvents(events)
      } catch (error) {
        console.error('Failed to fetch process events:', error)
      }
    }
    fetchHistory()

    return () => {
        if (wsStatus === 'connected') {
            unsubscribeProcessEvents(selectedProcess)
        }
    }
  }, [selectedProcess, wsStatus, subscribeProcessEvents, unsubscribeProcessEvents, clearProcessEvents])

  // 合并显示事件 (实时 + 历史)
  // 简单的去重策略：过滤掉 id 已经存在于历史中的实时事件（防止边界重叠）
  const displayEvents = [
      ...processRealtimeEvents.filter(rt => !historyEvents.some(h => h.id === rt.id)),
      ...historyEvents
  ]

  // 解析事件payload中的状态信息
  const parseProcessStatus = (event) => {
    if (!event || !event.payload) return null

    const payload = event.payload
    return {
      queueSize: payload.queue_size || payload.queueSize || 0,
      currentFile: payload.current_file || payload.currentFile || '未知',
      processed: payload.processed || 0,
      total: payload.total || 0,
      progress: payload.progress || 0,
      status: payload.status || 'running',
      error: payload.error || null,
    }
  }

  // 获取状态徽章
  const getStatusBadge = (eventName) => {
    if (eventName.includes('started') || eventName.includes('running')) {
      return <span className="badge-info">运行中</span>
    }
    if (eventName.includes('completed') || eventName.includes('finished')) {
      return <span className="badge-success">已完成</span>
    }
    if (eventName.includes('error') || eventName.includes('failed')) {
      return <span className="badge-danger">错误</span>
    }
    if (eventName.includes('warning')) {
      return <span className="badge-warning">警告</span>
    }
    return <span className="badge bg-slate-100 text-slate-700">未知</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">正在建立实时连接...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">进程监控</h2>
          <p className="mt-1 text-slate-600">实时监控所有ETL进程的运行状态 (WebSocket Full-Duplex)</p>
        </div>
        {/* Removed Auto Refresh Button as it's no longer needed */}
      </div>

      {/* Process List */}
      {processes.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无运行中的进程</h3>
          <p className="text-slate-500">请在"ETL配置"页签启动进程</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {processes.map((process) => {
            const status = parseProcessStatus(process.latest_event)
            const isSelected = selectedProcess === process.name

            return (
              <div
                key={process.name}
                onClick={() => setSelectedProcess(process.name)}
                className={`card cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'ring-2 ring-primary-500 shadow-xl scale-105'
                    : 'hover:shadow-xl hover:scale-102'
                }`}
              >
                {/* Process Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{process.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(process.last_seen), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(process.latest_event.event_name)}
                </div>

                {/* Process Stats */}
                {status && (
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    {status.total > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">处理进度</span>
                          <span className="font-semibold text-primary-600">
                            {Math.round((status.processed / status.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(status.processed / status.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {status.processed.toLocaleString()} / {status.total.toLocaleString()} 条记录
                        </p>
                      </div>
                    )}

                    {/* Queue Size */}
                    {status.queueSize > 0 && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">队列大小</span>
                        <span className="text-lg font-bold text-slate-800">{status.queueSize}</span>
                      </div>
                    )}

                    {/* Current File */}
                    {status.currentFile && status.currentFile !== '未知' && (
                      <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg">
                        <FileText className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary-600 mb-1">当前处理文件</p>
                          <p className="text-sm font-medium text-primary-900 truncate">
                            {status.currentFile}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {status.error && (
                      <div className="flex items-start gap-2 p-3 bg-danger-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-danger-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-danger-600 mb-1">错误信息</p>
                          <p className="text-sm text-danger-900">{status.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Detailed Event Log */}
      {selectedProcess && displayEvents.length > 0 && (
        <div className="card">
          <div className="card-header flex justify-between">
            <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" />
                {selectedProcess} - 事件日志
            </div>
            <span className="text-xs text-slate-400">实时连接中...</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {event.event_name.includes('error') ? (
                    <AlertTriangle className="w-5 h-5 text-danger-600" />
                  ) : event.event_name.includes('completed') ? (
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  ) : (
                    <Activity className="w-5 h-5 text-primary-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800">{event.event_name}</span>
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {event.payload && (
                    <pre className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <LogViewer autoRefresh={autoRefresh} />
    </div>
  )
}

export default ProcessMonitor
