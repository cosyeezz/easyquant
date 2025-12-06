import { useState, useEffect } from 'react'
import { Activity, Database, Server } from 'lucide-react'
import ETLConfig from './components/ETLConfig'
import ProcessMonitor from './components/ProcessMonitor'

function App() {
  const [activeTab, setActiveTab] = useState('etl-config')

  const tabs = [
    { id: 'etl-config', name: 'ETL配置', icon: Database },
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

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 rounded-lg">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-success-700">系统运行中</span>
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
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                  `}
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
        {activeTab === 'etl-config' && <ETLConfig />}
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
