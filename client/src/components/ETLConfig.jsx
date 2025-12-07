import { useState } from 'react'
import { Play, Settings, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Modal from './Modal'

function ETLConfig() {
  const [config, setConfig] = useState({
    processCount: '',
    dataSource: 'local',
    batchSize: 1000,
    parallelTasks: 4,
  })

  const [isRunning, setIsRunning] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleInputChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleStartETL = () => {
    setIsRunning(true)
    // 这里将来会调用API启动ETL进程
    console.log('Starting ETL with config:', config)

    // 模拟启动过程
    setTimeout(() => {
      setIsRunning(false)
      setShowModal(true)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">ETL配置</h2>
          <p className="mt-1 text-slate-600">配置数据加载和处理流程参数</p>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基础配置 */}
        <div className="card">
          <div className="card-header">
            <Settings className="w-5 h-5 text-primary-600" />
            基础配置
          </div>

          <div className="space-y-4">
            {/* 进程数配置 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ETL进程数量
                <span className="ml-2 text-xs text-slate-500">(留空则自动分配)</span>
              </label>
              <input
                type="number"
                value={config.processCount}
                onChange={(e) => handleInputChange('processCount', e.target.value)}
                placeholder="自动分配"
                min="1"
                max="16"
                className="input-field"
              />
              <p className="mt-1 text-xs text-slate-500">
                建议: CPU核心数的 50-75%，当前系统推荐 4-6 个进程
              </p>
            </div>

            {/* 数据源选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                数据源类型
              </label>
              <select
                value={config.dataSource}
                onChange={(e) => handleInputChange('dataSource', e.target.value)}
                className="input-field"
              >
                <option value="local">本地文件</option>
                <option value="api">API接口</option>
                <option value="database">数据库</option>
                <option value="qmt">QMT量化交易终端</option>
              </select>
            </div>

            {/* 批处理大小 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                批处理大小
              </label>
              <input
                type="number"
                value={config.batchSize}
                onChange={(e) => handleInputChange('batchSize', parseInt(e.target.value))}
                min="100"
                max="10000"
                step="100"
                className="input-field"
              />
              <p className="mt-1 text-xs text-slate-500">
                每批处理的记录数，影响内存占用和处理速度
              </p>
            </div>
          </div>
        </div>

        {/* 高级配置 */}
        <div className="card">
          <div className="card-header">
            <FileText className="w-5 h-5 text-primary-600" />
            高级配置
          </div>

          <div className="space-y-4">
            {/* 并行任务数 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                并行任务数
              </label>
              <input
                type="range"
                value={config.parallelTasks}
                onChange={(e) => handleInputChange('parallelTasks', parseInt(e.target.value))}
                min="1"
                max="16"
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-sm text-slate-600 mt-1">
                <span>1</span>
                <span className="font-semibold text-primary-600">{config.parallelTasks}</span>
                <span>16</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                每个进程内部的并行任务数量
              </p>
            </div>

            {/* 数据验证 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="dataValidation"
                defaultChecked
                className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex-1">
                <label htmlFor="dataValidation" className="text-sm font-medium text-slate-700 cursor-pointer">
                  启用数据验证
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  对输入数据进行格式和完整性检查
                </p>
              </div>
            </div>

            {/* 错误处理 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="errorRetry"
                defaultChecked
                className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex-1">
                <label htmlFor="errorRetry" className="text-sm font-medium text-slate-700 cursor-pointer">
                  失败自动重试
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  遇到临时错误时自动重试，最多3次
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 配置预览 */}
      <div className="card bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="card-header">
          <AlertCircle className="w-5 h-5 text-primary-600" />
          配置预览
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">进程数</p>
            <p className="text-2xl font-bold text-slate-800">
              {config.processCount || '自动'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">数据源</p>
            <p className="text-2xl font-bold text-slate-800">
              {config.dataSource === 'local' ? '本地' :
               config.dataSource === 'api' ? 'API' :
               config.dataSource === 'database' ? '数据库' : 'QMT'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">批大小</p>
            <p className="text-2xl font-bold text-slate-800">{config.batchSize}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">并行数</p>
            <p className="text-2xl font-bold text-slate-800">{config.parallelTasks}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        <button className="btn-secondary">
          重置配置
        </button>
        <button
          onClick={handleStartETL}
          disabled={isRunning}
          className="btn-primary flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              启动中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              启动ETL
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {isRunning && (
        <div className="card bg-gradient-to-r from-success-50 to-success-100 border-success-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-success-600" />
            <div>
              <p className="font-semibold text-success-900">ETL进程正在启动</p>
              <p className="text-sm text-success-700">
                请在"进程监控"页签查看实时状态和进度
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 成功弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="启动成功！"
        message="ETL进程已成功启动，你可以在【进程监控】页签查看实时运行状态和处理进度。"
        type="success"
      />
    </div>
  )
}

export default ETLConfig
