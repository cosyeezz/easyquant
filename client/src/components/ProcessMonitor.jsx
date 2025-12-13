import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Clock, Database, FileText, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'

// Internal LogViewer Component (Pure UI)
function LogViewer({ autoRefresh, logs, status, onToggleSubscribe }) {
  const scrollRef = useRef(null)
  
  // Initialize state from localStorage (persist user preference)
  const [isExpanded, setIsExpanded] = useState(() => {
      return localStorage.getItem('logViewer.isExpanded') === 'true'
  })
  const [isSubscribed, setIsSubscribed] = useState(() => {
      return localStorage.getItem('logViewer.isSubscribed') === 'true'
  })

  // Sync subscription state on mount (if persisted as true)
  useEffect(() => {
      if (onToggleSubscribe) {
          onToggleSubscribe(isSubscribed)
      }
  }, []) // Run once on mount

  // Handle subscription toggle
  const handleSubscribeToggle = (e) => {
      e.stopPropagation() // Prevent header click
      const newState = !isSubscribed
      setIsSubscribed(newState)
      localStorage.setItem('logViewer.isSubscribed', newState)
      
      if (onToggleSubscribe) {
          onToggleSubscribe(newState)
      }

      // Auto-expand if subscribing
      if (newState) {
          setIsExpanded(true)
          localStorage.setItem('logViewer.isExpanded', 'true')
      }
  }

  // Handle expand toggle
  const handleExpandToggle = (e) => {
      e.preventDefault()
      const newState = !isExpanded
      setIsExpanded(newState)
      localStorage.setItem('logViewer.isExpanded', newState)
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoRefresh && isExpanded && scrollRef.current) {
        const timer = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }, 0)
        return () => clearTimeout(timer)
    }
  }, [logs, autoRefresh, isExpanded])

  return (
    <div className="card mt-8">
      <div 
        className="card-header flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors select-none"
        onClick={handleExpandToggle}
      >
        <div className="flex items-center gap-2">
           {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
           <FileText className="w-5 h-5 text-primary-600" />
           <span className="font-medium text-slate-700">系统实时日志</span>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Subscription Toggle */}
           <button
             onClick={handleSubscribeToggle}
             className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
               isSubscribed 
                 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                 : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
             }`}
           >
             <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
             {isSubscribed ? '接收中' : '已暂停'}
           </button>

           <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {status === 'connected' ? 'WS连接' : 'WS断开'}
           </div>
        </div>
      </div>
      
      {isExpanded && (
        <div 
            ref={scrollRef}
            className="bg-slate-900 rounded-b-lg p-4 font-mono text-xs md:text-sm h-96 overflow-y-auto shadow-inner border-t border-slate-700"
        >
            {(!logs || logs.length === 0) ? (
            <div className="text-slate-500 italic">
                {isSubscribed ? "等待日志推送..." : "日志流已暂停，点击右上角按钮开始接收。"}
            </div>
            ) : (
            (logs || []).map((log, index) => (
                <div key={index} className="whitespace-pre-wrap text-emerald-400 border-b border-slate-800/50 pb-0.5 mb-0.5 last:border-0 hover:bg-slate-800/50 font-mono">
                {log.full_text || log.message}
                </div>
            ))
            )}
        </div>
      )}
    </div>
  )
}

function ProcessMonitor() {
  // WebSocket hook for process list updates AND logs
  const { 
    processes: wsProcesses, 
    status: wsStatus, 
    logs: wsLogs,
    subscribeProcesses, 
    unsubscribeProcesses,
    subscribeLogs,
    unsubscribeLogs,
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

  // 处理日志订阅开关 (仅在展开时订阅)
  // Fix: Wrap in useCallback to prevent infinite loop in LogViewer's useEffect
  const handleLogSubscribe = useCallback((shouldSubscribe) => {
      if (wsStatus !== 'connected') return
      if (shouldSubscribe) {
          subscribeLogs()
      } else {
          unsubscribeLogs()
      }
  }, [wsStatus, subscribeLogs, unsubscribeLogs])

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

      <LogViewer 
        autoRefresh={autoRefresh} 
        logs={wsLogs} 
        status={wsStatus} 
        onToggleSubscribe={handleLogSubscribe}
      />
    </div>
  )
}

export default ProcessMonitor