import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Database, Play, AlertTriangle, Copy, X, RefreshCw, Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'
import Select from './ui/Select'

function DataTableList({ onNavigate }) {
  const [tables, setTables] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Pagination & Filtering
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
      search: '',
      category_id: 'all',
      status: 'all'
  })
  
  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, table: null, error: null })
  const [publishModal, setPublishModal] = useState({ open: false, table: null, error: null })
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, []) // Initial load

  useEffect(() => {
    // Reload when pagination or filters trigger
    fetchData()
  }, [pagination.page, filters]) // Watch filters and page

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Prepare params
      const params = {
          page: pagination.page,
          page_size: pagination.pageSize,
      }
      if (filters.search) params.search = filters.search
      if (filters.category_id !== 'all') params.category_id = filters.category_id
      if (filters.status !== 'all') params.status = filters.status.toUpperCase() // API expects enum (CREATED, DRAFT)

      const [tablesResp, categoriesData] = await Promise.all([
        api.getDataTables(params),
        categories.length > 0 ? Promise.resolve(categories) : api.getTableCategories() // Don't reload cats if have them
      ])
      
      setTables(tablesResp.items)
      setPagination(prev => ({ ...prev, total: tablesResp.total }))
      
      if (categories.length === 0) setCategories(categoriesData)

    } catch (err) {
      setError(err.message || '加载失败，请检查后端服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.table) return
    setDeleting(true)
    setDeleteModal(prev => ({ ...prev, error: null }))
    try {
      await api.deleteDataTable(deleteModal.table.id)
      fetchData() // Reload list
      setDeleteModal({ open: false, table: null, error: null })
    } catch (error) {
      console.error('Failed to delete:', error)
      setDeleteModal(prev => ({ ...prev, error: error.response?.data?.detail || '删除失败' }))
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    if (!publishModal.table) return
    setPublishing(true)
    setPublishModal(prev => ({ ...prev, error: null }))
    try {
      await api.publishDataTable(publishModal.table.id)
      fetchData() // Reload list
      setPublishModal({ open: false, table: null, error: null })
    } catch (err) {
      setPublishModal(prev => ({ ...prev, error: err.response?.data?.detail || '发布失败' }))
    } finally {
      setPublishing(false)
    }
  }

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '-'
  }

  const CATEGORY_PALETTE = [
    'bg-eq-primary-500/15 text-eq-primary-400 border-eq-primary-500/30',
    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'bg-violet-500/15 text-violet-400 border-violet-500/30',
    'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'bg-rose-500/15 text-rose-400 border-rose-500/30',
    'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'bg-teal-500/15 text-teal-400 border-teal-500/30',
    'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
    'bg-lime-500/15 text-lime-400 border-lime-500/30',
  ]

  const getCategoryStyle = (id) => {
    if (!id) return 'bg-eq-elevated text-eq-text-secondary border-eq-border-subtle'
    const index = id % CATEGORY_PALETTE.length
    return CATEGORY_PALETTE[index]
  }

  // Handle Search Input (Debounced or Enter)
  const [searchInput, setSearchInput] = useState('')
  const handleSearchCommit = () => {
      setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1
      setFilters(prev => ({ ...prev, search: searchInput }))
  }

  const handleReset = () => {
    setSearchInput('')
    setFilters({ search: '', category_id: 'all', status: 'all' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Options for custom Select components
  const categoryOptions = [
      { label: '所有分类', value: 'all' },
      ...categories.map(c => ({ label: c.name, value: c.id })) // Value can be number now for our Select
  ]
  
  const statusOptions = [
      { label: '所有状态', value: 'all' },
      { label: '已发布', value: 'created' },
      { label: '草稿/待同步', value: 'draft' }
  ]
  
  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-eq-text-primary">数据表管理</h2>
              <p className="mt-1 text-eq-text-secondary">管理系统中的数据库表元数据</p>
            </div>
            <button onClick={() => onNavigate('table-new')} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-5 h-5" />
                新建数据表
            </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 bg-eq-surface p-4 rounded-lg border border-eq-border-subtle z-10 relative items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eq-text-muted" />
            <input
              type="text"
              placeholder="搜索表名、物理名..."
              className="input-field !pl-9 !pr-8 w-full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); handleSearchCommit() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-eq-text-muted hover:text-eq-text-primary p-0.5 rounded-full hover:bg-eq-elevated"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-40">
            <Select
                value={filters.category_id}
                onChange={(val) => { setFilters(prev => ({...prev, category_id: val})); setPagination(prev => ({...prev, page: 1})); }}
                options={categoryOptions}
                placeholder="选择分类"
                clearable={true}
                onClear={() => { setFilters(prev => ({...prev, category_id: 'all'})); setPagination(prev => ({...prev, page: 1})); }}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-40">
             <Select
                value={filters.status}
                onChange={(val) => { setFilters(prev => ({...prev, status: val})); setPagination(prev => ({...prev, page: 1})); }}
                options={statusOptions}
                placeholder="选择状态"
                clearable={true}
                onClear={() => { setFilters(prev => ({...prev, status: 'all'})); setPagination(prev => ({...prev, page: 1})); }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pl-2 border-l border-eq-border-subtle ml-1">
            <button
              onClick={handleReset}
              className="w-24 px-4 py-2 bg-eq-elevated border border-eq-border-subtle text-eq-text-secondary hover:text-eq-text-primary hover:border-eq-border-default rounded-md transition-all flex items-center justify-center gap-2"
              title="重置所有条件"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">重置</span>
            </button>

            <button
                onClick={handleSearchCommit}
                className="w-24 btn-primary px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap transition-all"
            >
                <Search className="w-4 h-4" />
                查询
            </button>
          </div>
        </div>
      </div>

      {loading && tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
           <Loader2 className="w-12 h-12 text-eq-primary-500 animate-spin" />
           <p className="text-eq-text-secondary">数据加载中...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="card text-center py-12">
            <Database className="w-16 h-16 text-eq-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-eq-text-primary mb-2">暂无数据表</h3>
            <p className="text-eq-text-secondary mb-4">没有找到匹配的数据表</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0 flex flex-col min-h-[500px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
                <thead className="bg-eq-elevated border-b border-eq-border-subtle">
                <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-eq-text-secondary">显示名称</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-eq-text-secondary">物理表名</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-eq-text-secondary">分类</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-eq-text-secondary">状态</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-eq-text-secondary">操作</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-eq-border-subtle">
                {tables.map((table) => {
                    const isPublished = table.status === 'created' || table.status === 'CREATED';
                    const isSyncNeeded = !isPublished && table.last_published_at;

                    return (
                    <tr key={table.id} className="hover:bg-eq-elevated transition-colors">
                        <td className="px-6 py-4">
                        <span className="font-medium text-eq-text-primary">{table.name}</span>
                        {table.description && (
                            <p className="text-xs text-eq-text-muted mt-1 line-clamp-1 max-w-xs" title={table.description}>{table.description}</p>
                        )}
                        </td>
                        <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-eq-elevated rounded text-sm text-eq-text-secondary font-mono">{table.table_name}</code>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`badge border ${getCategoryStyle(table.category_id)}`}>
                            {getCategoryName(table.category_id)}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        {isPublished ? (
                            <span className="px-2 py-1 bg-eq-success-bg text-eq-success-text rounded text-xs font-medium border border-eq-success-border">
                            已发布
                            </span>
                        ) : isSyncNeeded ? (
                            <span className="px-2 py-1 bg-violet-500/15 text-violet-400 rounded text-xs font-medium border border-violet-500/30 flex items-center gap-1 w-max">
                            待同步
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-eq-warning-bg text-eq-warning-text rounded text-xs font-medium border border-eq-warning-border">
                            草稿
                            </span>
                        )}
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                            {!isPublished && (
                            <button
                                onClick={() => setPublishModal({ open: true, table, error: null })}
                                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all ${
                                    isSyncNeeded
                                    ? 'bg-violet-600 hover:bg-violet-700'
                                    : 'bg-eq-primary-500 hover:bg-eq-primary-600'
                                }`}
                                title={isSyncNeeded ? "同步结构变更到数据库 (新增列)" : "发布并创建物理表"}
                            >
                                {isSyncNeeded ? <RefreshCw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                {isSyncNeeded ? '更新结构' : '发布'}
                            </button>
                            )}

                            <button onClick={() => onNavigate('table-new', table.id)} className="btn-icon" title="复制表结构">
                            <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => onNavigate('table-edit', table.id)} className="btn-icon" title="编辑内容">
                            <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteModal({ open: true, table, error: null })} className="btn-icon-danger" title="删除">
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-eq-border-subtle px-6 py-4 flex items-center justify-between bg-eq-elevated">
            <div className="text-sm text-eq-text-secondary">
                共 <span className="font-medium text-eq-text-primary">{pagination.total}</span> 条记录
                (第 {pagination.page} / {totalPages || 1} 页)
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1 || loading}
                    className="p-1 rounded hover:bg-eq-surface disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-5 h-5 text-eq-text-secondary" />
                </button>
                <button
                    onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                    disabled={pagination.page >= totalPages || loading}
                    className="p-1 rounded hover:bg-eq-surface disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="w-5 h-5 text-eq-text-secondary" />
                </button>
            </div>
          </div>

        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-eq-surface rounded-lg p-6 max-w-md w-full border border-eq-border-subtle animate-slideUp">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-eq-danger-bg rounded-full">
                <AlertTriangle className="w-6 h-6 text-eq-danger-text" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-eq-text-primary">
                  {(deleteModal.table?.status === 'CREATED' || deleteModal.table?.status === 'created') ? "高危操作警告" : "确认删除"}
                </h3>

                <div className="mt-2 text-eq-text-secondary text-sm">
                  {(deleteModal.table?.status === 'CREATED' || deleteModal.table?.status === 'created') ? (
                    <div className="space-y-2">
                      <p>您正在删除已发布的表 <span className="font-bold text-eq-text-primary">{deleteModal.table?.name}</span>。</p>
                      <p className="bg-eq-danger-bg border border-eq-danger-border p-2 rounded text-eq-danger-text">
                        警告：这将永久删除数据库中的物理表 <code className="font-mono bg-eq-elevated px-1 rounded">{deleteModal.table?.table_name}</code> 及其所有数据！
                      </p>
                      <p>此操作极度危险且不可恢复！</p>
                    </div>
                  ) : (
                    <p>确定要删除数据表 "{deleteModal.table?.name}" 吗？此操作不可恢复。</p>
                  )}
                </div>

                {deleteModal.error && (
                   <div className="mt-3 p-3 bg-eq-danger-bg border border-eq-danger-border rounded-lg text-eq-danger-text text-sm">
                     {deleteModal.error}
                   </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteModal({ open: false, table: null, error: null })}
                className="btn-secondary"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish / Sync Modal */}
      {publishModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-eq-surface rounded-lg p-6 max-w-md w-full border border-eq-border-subtle animate-slideUp">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${publishModal.table?.last_published_at ? 'bg-violet-500/15 text-violet-400' : 'bg-eq-warning-bg text-eq-warning-text'}`}>
                {publishModal.table?.last_published_at ? <RefreshCw className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-eq-text-primary">
                    {publishModal.table?.last_published_at ? '同步表结构变更' : '确认发布'}
                </h3>

                <div className="mt-2 text-eq-text-secondary text-sm">
                  <p className="mb-2">您即将{publishModal.table?.last_published_at ? '同步' : '发布'}表 <span className="font-semibold text-eq-text-primary">{publishModal.table?.name}</span>。</p>

                  {publishModal.table?.last_published_at ? (
                      <div className="p-3 bg-violet-500/15 text-violet-300 rounded-lg border border-violet-500/30 space-y-2">
                          <p className="font-medium">变更模式: 增量同步 (Sync)</p>
                          <ul className="list-disc list-inside text-xs space-y-1">
                            <li>检测新增字段并执行 <code className="bg-eq-elevated px-1 rounded">ADD COLUMN</code></li>
                            <li>注意：删除或重命名字段可能不会自动同步</li>
                          </ul>
                      </div>
                  ) : (
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>在数据库中创建物理表 <code className="bg-eq-elevated px-1 rounded">{publishModal.table?.table_name}</code></li>
                        <li>锁定表结构（不可再修改字段定义）</li>
                      </ul>
                  )}
                </div>

                {publishModal.error && (
                   <div className="mt-3 p-3 bg-eq-danger-bg border border-eq-danger-border rounded-lg text-eq-danger-text text-sm break-words">
                     <div className="font-semibold mb-1">操作失败:</div>
                     {publishModal.error}
                   </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPublishModal({ open: false, table: null, error: null })}
                className="btn-secondary"
                disabled={publishing}
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`flex items-center gap-2 text-white px-4 py-2 rounded-md font-medium transition-all ${
                     publishModal.table?.last_published_at
                     ? 'bg-violet-600 hover:bg-violet-700'
                     : 'bg-eq-primary-500 hover:bg-eq-primary-600'
                }`}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (publishModal.table?.last_published_at ? <RefreshCw className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
                {publishing ? '执行中...' : (publishModal.table?.last_published_at ? '确认同步' : '确认发布')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTableList