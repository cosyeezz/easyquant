import { useState } from 'react'
import { Activity, Database, Server, Table2, Cpu, Layers, Workflow, Sun, Moon } from 'lucide-react'
import ProcessMonitor from './components/ProcessMonitor'
import ETLTaskList from './components/ETLTaskList'
import ETLTaskEditor from './components/ETLTaskEditor'
import DataTableList from './components/DataTableList'
import DataTableEditor from './components/DataTableEditor'
import DifyCanvas from './components/DifyCanvas'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './contexts/ThemeContext'

function App() {
  const [activeTab, setActiveTab] = useState('dify-canvas') // Default to new canvas for testing
  const [editId, setEditId] = useState(null)
  const { theme, toggleTheme } = useTheme()
  
  // Global WebSocket Connection (for System Status)
  const { status, systemStatus } = useWebSocket()

  const handleNavigate = (tab, id = null) => {
    setActiveTab(tab)
    setEditId(id)
  }

  const tabs = [
    { id: 'tables', name: '数据表', icon: Table2 },
    { id: 'etl', name: 'ETL任务', icon: Database },
    { id: 'monitor', name: '进程监控', icon: Activity },
    { id: 'dify-canvas', name: 'Dify 画布', icon: Workflow },
  ]

  // Special full-screen mode for Dify Canvas
  if (activeTab === 'dify-canvas') {
      return (
          <div className="w-full h-screen flex flex-col">
              {/* Minimal Header for Navigation Back */}
              <div className="bg-white border-b border-divider-subtle px-4 py-2 flex items-center justify-between z-50 shadow-sm">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setActiveTab('etl')} className="text-text-tertiary hover:text-text-primary text-sm">
                        ← Back to App
                     </button>
                     <h1 className="font-semibold text-text-primary">Dify Workflow Canvas</h1>
                  </div>
              </div>
              <div className="flex-1 relative overflow-hidden">
                 <DifyCanvas />
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-eq-surface border-b border-eq-border-subtle sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-eq-primary-500 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-eq-primary-400">
                  EasyQuant
                </h1>
                <p className="text-xs text-eq-text-muted">量化交易监控系统</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md border border-eq-border-subtle text-eq-text-secondary hover:text-eq-text-primary hover:bg-eq-elevated transition-all"
                title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              >
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {/* Connection Status & System Metrics */}
              <div className={`flex items-center gap-4 px-4 py-2 rounded-lg border transition-all ${
                  status === 'connected'
                  ? 'bg-eq-success-bg border-eq-success-border text-eq-success-text'
                  : 'bg-eq-danger-bg border-eq-danger-border text-eq-danger-text'
              }`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-eq-success-solid animate-pulse' : 'bg-eq-danger-solid'}`}></div>
                    <span className="text-sm font-semibold">{status === 'connected' ? '在线' : '离线'}</span>
                </div>

                {status === 'connected' && systemStatus && (
                    <>
                        <div className="flex items-center gap-2 pl-4 border-l border-eq-border-subtle">
                            <Cpu className="w-4 h-4 opacity-75" />
                            <span className="text-sm font-mono text-eq-text-secondary">CPU:</span>
                            <span className="text-sm font-mono">{systemStatus.cpu_percent.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2 pl-4 border-l border-eq-border-subtle">
                            <Layers className="w-4 h-4 opacity-75" />
                            <span className="text-sm font-mono text-eq-text-secondary">MEM:</span>
                            <span className="text-sm font-mono">
                                {Math.round(systemStatus.memory_mb)} MB / {Math.round(systemStatus.sys_memory_total_mb / 1024)} GB
                            </span>
                        </div>
                    </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-eq-surface border-b border-eq-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id ||
                (tab.id === 'tables' && activeTab.startsWith('table')) ||
                (tab.id === 'etl' && activeTab.startsWith('etl'))
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-all duration-200 ${isActive ? 'border-eq-primary-500 text-eq-primary-400' : 'border-transparent text-eq-text-secondary hover:text-eq-text-primary hover:border-eq-border-default'}`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tables' && <DataTableList onNavigate={handleNavigate} />}
        {activeTab === 'table-new' && <DataTableEditor cloneFromId={editId} onNavigate={handleNavigate} />}
        {activeTab === 'table-edit' && <DataTableEditor tableId={editId} onNavigate={handleNavigate} />}
        {activeTab === 'etl' && <ETLTaskList onNavigate={handleNavigate} />}
        {activeTab === 'etl-new' && <ETLTaskEditor onNavigate={handleNavigate} />}
        {activeTab === 'etl-edit' && <ETLTaskEditor taskId={editId} onNavigate={handleNavigate} />}
        {activeTab === 'monitor' && <ProcessMonitor />}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-eq-border-subtle bg-eq-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-eq-text-muted">
            EasyQuant v1.0.0 - 量化交易系统监控平台
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
