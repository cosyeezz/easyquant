import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Clock, Database, FileText, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw, ChevronDown, ChevronRight, Terminal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'

// Internal LogViewer Component (Pure UI - Console Style)
function LogViewer({ autoRefresh, logs, status, onToggleSubscribe }) {
  const scrollRef = useRef(null)
  
  const [isExpanded, setIsExpanded] = useState(() => {
      return localStorage.getItem('logViewer.isExpanded') === 'true'
  })
  const [isSubscribed, setIsSubscribed] = useState(() => {
      return localStorage.getItem('logViewer.isSubscribed') === 'true'
  })

  useEffect(() => {
      if (onToggleSubscribe) {
          onToggleSubscribe(isSubscribed)
      }
  }, [])

  const handleSubscribeToggle = (e) => {
      e.stopPropagation()
      const newState = !isSubscribed
      setIsSubscribed(newState)
      localStorage.setItem('logViewer.isSubscribed', newState)
      if (onToggleSubscribe) onToggleSubscribe(newState)
      if (newState) {
          setIsExpanded(true)
          localStorage.setItem('logViewer.isExpanded', 'true')
      }
  }

  const handleExpandToggle = (e) => {
      e.preventDefault()
      const newState = !isExpanded
      setIsExpanded(newState)
      localStorage.setItem('logViewer.isExpanded', newState)
  }

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
    <div className="card mt-8 p-0 overflow-hidden border-eq-border-subtle shadow-sm bg-eq-bg-base">
      <div 
        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-eq-bg-elevated transition-colors select-none border-b border-eq-border-subtle"
        onClick={handleExpandToggle}
      >
        <div className="flex items-center gap-2">
           {isExpanded ? <ChevronDown className="w-4 h-4 text-eq-text-secondary" /> : <ChevronRight className="w-4 h-4 text-eq-text-secondary" />}
           <Terminal className="w-4 h-4 text-eq-primary-500" />
           <span className="text-sm font-medium text-eq-text-primary font-mono tracking-tight">SYSTEM_LOGS</span>
        </div>
        
        <div className="flex items-center gap-4">
           <button
             onClick={handleSubscribeToggle}
             className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-medium transition-all border ${
               isSubscribed 
                 ? 'bg-eq-success-bg border-eq-success-border text-eq-success-text hover:brightness-95' 
                 : 'bg-eq-bg-elevated border-eq-border-default text-eq-text-secondary hover:bg-eq-bg-overlay'
             }`}
           >
             <div className={`w-1.5 h-1.5 rounded-full ${isSubscribed ? 'bg-eq-success-solid animate-pulse' : 'bg-eq-text-muted'}`}></div>
             {isSubscribed ? 'LIVE' : 'PAUSED'}
           </button>

           <div className="flex items-center gap-1.5 text-xs font-mono text-eq-text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-eq-success-solid' : 'bg-eq-danger-solid'}`}></span>
              {status === 'connected' ? 'WS:CONN' : 'WS:DISC'}
           </div>
        </div>
      </div>
      
      {isExpanded && (
        <div 
            ref={scrollRef}
            className="bg-[#0D1117] p-4 font-mono text-xs h-96 overflow-y-auto"
        >
            {(!logs || logs.length === 0) ? (
            <div className="text-slate-500 italic">
                {isSubscribed ? "// Waiting for logs..." : "// Log stream paused."}
            </div>
            ) : (
            (logs || []).map((log, index) => (
                <div key={index} className="flex gap-2 text-slate-300 mb-0.5 leading-relaxed hover:bg-slate-800/30 -mx-2 px-2 rounded">
                    <span className="text-slate-500 select-none">[{new Date().toLocaleTimeString('en-GB', { hour12: false })}]</span>
                    <span className="text-emerald-400 break-all">{log.full_text || log.message}</span>
                </div>
            ))
            )}
        </div>
      )}
    </div>
  )
}

function ProcessMonitor() {
  const { 
    processes: wsProcesses, 
    status: wsStatus, 
    logs: wsLogs,
    subscribeProcesses, 
    unsubscribeProcesses,
    subscribeLogs,
    unsubscribeLogs,
    processRealtimeEvents,
    subscribeProcessEvents,
    unsubscribeProcessEvents,
    clearProcessEvents
  } = useWebSocket()
  
  const [processes, setProcesses] = useState([])
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [historyEvents, setHistoryEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
      if (wsStatus === 'connected') {
          subscribeProcesses()
      }
      return () => {
          if (wsStatus === 'connected') unsubscribeProcesses()
      }
  }, [wsStatus, subscribeProcesses, unsubscribeProcesses])

  useEffect(() => {
      if (wsProcesses && wsProcesses.length > 0) {
          setProcesses(wsProcesses)
          setLoading(false)
      }
  }, [wsProcesses])

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

  useEffect(() => {
    if (!selectedProcess) return
    clearProcessEvents()
    setHistoryEvents([])
    if (wsStatus === 'connected') {
        subscribeProcessEvents(selectedProcess)
    }
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

  const handleLogSubscribe = useCallback((shouldSubscribe) => {
      if (wsStatus !== 'connected') return
      if (shouldSubscribe) {
          subscribeLogs()
      } else {
          unsubscribeLogs()
      }
  }, [wsStatus, subscribeLogs, unsubscribeLogs])

  const parseProcessStatus = (event) => {
    if (!event || !event.payload) return null
    const payload = event.payload
    return {
      queueSize: payload.queue_size || payload.queueSize || 0,
      currentFile: payload.current_file || payload.currentFile || 'Wait...',
      processed: payload.processed || 0,
      total: payload.total || 0,
      progress: payload.progress || 0,
      status: payload.status || 'running',
      error: payload.error || null,
    }
  }

  const getStatusIndicator = (eventName) => {
    if (eventName.includes('started') || eventName.includes('running')) {
      return (
        <div className="flex items-center gap-1.5">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eq-info-text opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-eq-info-text"></span>
            </span>
            <span className="text-xs font-medium text-eq-text-secondary">Running</span>
        </div>
      )
    }
    if (eventName.includes('completed') || eventName.includes('finished')) {
      return (
        <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-eq-success-solid"></span>
            <span className="text-xs font-medium text-eq-text-secondary">Idle</span>
        </div>
      )
    }
    if (eventName.includes('error') || eventName.includes('failed')) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-eq-danger-solid"></span>
                <span className="text-xs font-medium text-eq-danger-text">Error</span>
            </div>
          )
    }
    return <span className="text-xs text-eq-text-muted">Unknown</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-eq-primary-500 animate-spin" />
          <p className="text-sm text-eq-text-secondary font-mono">Initializing connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fadeIn h-full flex flex-col">
       {/* Linear-Style Toolbar */}
       <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-eq-border-subtle/50 flex-shrink-0">
        
        {/* Left: Title & Info */}
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-eq-bg-elevated/50">
                <Activity className="w-3.5 h-3.5 text-eq-primary-500" />
                <span className="text-xs font-semibold text-eq-text-primary tracking-wide">PROCESS MONITOR</span>
             </div>
             <div className="w-px h-3.5 bg-eq-border-subtle"></div>
             <span className="text-[10px] text-eq-text-muted font-mono tracking-wider">REAL-TIME TELEMETRY</span>
        </div>

        {/* Right: Status */}
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-eq-bg-elevated/30 border border-eq-border-subtle">
                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-eq-success-solid animate-pulse' : 'bg-eq-danger-solid'}`}></span>
                <span className="text-[10px] font-mono font-medium text-eq-text-secondary">
                    {wsStatus === 'connected' ? 'WS:CONNECTED' : 'WS:DISCONNECTED'}
                </span>
             </div>
        </div>
      </div>

      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-eq-border-default rounded-lg bg-eq-bg-elevated/50">
          <Activity className="w-10 h-10 text-eq-text-muted mb-3" />
          <h3 className="text-sm font-medium text-eq-text-primary">No Active Processes</h3>
          <p className="text-xs text-eq-text-secondary mt-1">Start a task in the ETL Configuration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {processes.map((process) => {
            const status = parseProcessStatus(process.latest_event)
            const isSelected = selectedProcess === process.name

            return (
              <div
                key={process.name}
                onClick={() => setSelectedProcess(process.name)}
                className={`group relative p-5 bg-eq-bg-surface border rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isSelected
                    ? 'border-eq-primary-500 ring-1 ring-eq-primary-500 shadow-sm'
                    : 'border-eq-border-default hover:border-eq-border-strong'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-eq-primary-500 text-white' : 'bg-eq-bg-elevated text-eq-text-secondary group-hover:bg-eq-bg-overlay'}`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-eq-text-primary">{process.name}</h3>
                      <p className="text-[10px] text-eq-text-muted font-mono mt-0.5">
                        UPDATED {formatDistanceToNow(new Date(process.last_seen), { addSuffix: true }).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {getStatusIndicator(process.latest_event.event_name)}
                </div>

                {/* Metrics */}
                {status && (
                  <div className="space-y-4">
                    {/* Progress */}
                    {status.total > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-eq-text-secondary">Progress</span>
                          <span className="font-mono font-medium text-eq-text-primary">
                            {Math.round((status.processed / status.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-eq-bg-elevated rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-eq-primary-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(status.processed / status.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-eq-text-muted font-mono">
                            <span>{status.processed.toLocaleString()} PROCESSED</span>
                            <span>{status.total.toLocaleString()} TOTAL</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                         {/* Queue Metric */}
                        <div className="p-2.5 bg-eq-bg-elevated rounded border border-eq-border-subtle">
                            <span className="text-[10px] uppercase text-eq-text-secondary font-medium block mb-0.5">Queue Size</span>
                            <span className="text-lg font-mono font-semibold text-eq-text-primary">{status.queueSize}</span>
                        </div>
                        
                        {/* Current File (Mini) */}
                        <div className="p-2.5 bg-eq-bg-elevated rounded border border-eq-border-subtle col-span-2">
                             <div className="flex items-center gap-1.5 mb-1">
                                <FileText className="w-3 h-3 text-eq-text-secondary" />
                                <span className="text-[10px] uppercase text-eq-text-secondary font-medium">Processing File</span>
                             </div>
                             <p className="text-xs font-mono text-eq-text-primary truncate" title={status.currentFile}>
                                {status.currentFile}
                             </p>
                        </div>
                    </div>

                    {/* Error Box */}
                    {status.error && (
                      <div className="flex items-start gap-2 p-2 bg-eq-danger-bg border border-eq-danger-border rounded text-eq-danger-text">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <p className="text-xs">{status.error}</p>
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
        autoRefresh={true} 
        logs={wsLogs} 
        status={wsStatus} 
        onToggleSubscribe={handleLogSubscribe}
      />
    </div>
  )
}

export default ProcessMonitor