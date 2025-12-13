import { useState } from 'react'
import { Activity, Database, Server, Table2, Cpu } from 'lucide-react'
import ProcessMonitor from './components/ProcessMonitor'
import ETLTaskList from './components/ETLTaskList'
import ETLTaskEditor from './components/ETLTaskEditor'
import DataTableList from './components/DataTableList'
import DataTableEditor from './components/DataTableEditor'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const [activeTab, setActiveTab] = useState('etl')
  const [editId, setEditId] = useState(null)
  
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
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  EasyQuant
                </h1>
                <p className="text-xs text-slate-500">量化交易监控系统</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status & CPU Metric */}
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all ${
                  status === 'connected' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <span className="text-sm font-semibold">{status === 'connected' ? '在线' : '离线'}</span>
                </div>
                
                {status === 'connected' && systemStatus && (
                    <div className="flex items-center gap-2 pl-3 border-l border-emerald-200/50">
                        <Cpu className="w-4 h-4 opacity-75" />
                        <span className="text-sm font-mono">{systemStatus.cpu_percent.toFixed(1)}%</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
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
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-all duration-200 ${isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
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
      <footer className="mt-16 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            EasyQuant v1.0.0 - 量化交易系统监控平台
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
