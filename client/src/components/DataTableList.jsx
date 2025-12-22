import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Database, Play, AlertTriangle, Copy, X, RefreshCw, Search, RotateCcw, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'
import Select from './ui/Select'

function DataTableList({ onNavigate }) {
  const [tables, setTables] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
      search: '',
      category_id: 'all',
      status: 'all'
  })
  
  const [deleteModal, setDeleteModal] = useState({ open: false, table: null, error: null })
  const [publishModal, setPublishModal] = useState({ open: false, table: null, error: null })
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Hover state for table rows to show actions
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchData()
  }, [pagination.page, filters])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
          page: pagination.page,
          page_size: pagination.pageSize,
      }
      if (filters.search) params.search = filters.search
      if (filters.category_id !== 'all') params.category_id = filters.category_id
      if (filters.status !== 'all') params.status = filters.status.toUpperCase()

      const [tablesResp, categoriesData] = await Promise.all([
        api.getDataTables(params),
        categories.length > 0 ? Promise.resolve(categories) : api.getTableCategories()
      ])
      
      setTables(tablesResp.items)
      setPagination(prev => ({ ...prev, total: tablesResp.total }))
      
      if (categories.length === 0) setCategories(categoriesData)

    } catch (err) {
      setError(err.message || 'Failed to load data.')
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
      fetchData()
      setDeleteModal({ open: false, table: null, error: null })
    } catch (error) {
      setDeleteModal(prev => ({ ...prev, error: error.response?.data?.detail || 'Delete failed' }))
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
      fetchData()
      setPublishModal({ open: false, table: null, error: null })
    } catch (err) {
      setPublishModal(prev => ({ ...prev, error: err.response?.data?.detail || 'Publish failed' }))
    } finally {
      setPublishing(false)
    }
  }

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '-'
  }

  // Refined pastel palette for tags
  const CATEGORY_PALETTE = [
    'bg-blue-50 text-blue-700 border-blue-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-purple-50 text-purple-700 border-purple-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-cyan-50 text-cyan-700 border-cyan-100',
  ]

  const getCategoryStyle = (id) => {
    if (!id) return 'bg-eq-bg-elevated text-eq-text-secondary border-eq-border-default'
    const index = id % CATEGORY_PALETTE.length
    return CATEGORY_PALETTE[index]
  }

  const [searchInput, setSearchInput] = useState('')
  const handleSearchCommit = () => {
      setPagination(prev => ({ ...prev, page: 1 }))
      setFilters(prev => ({ ...prev, search: searchInput }))
  }

  const handleReset = () => {
    setSearchInput('')
    setFilters({ search: '', category_id: 'all', status: 'all' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const categoryOptions = [
      { label: 'All Categories', value: 'all' },
      ...categories.map(c => ({ label: c.name, value: c.id }))
  ]
  
  const statusOptions = [
      { label: 'All Status', value: 'all' },
      { label: 'Published', value: 'created' },
      { label: 'Draft', value: 'draft' }
  ]
  
  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  return (
    <div className="space-y-3 animate-fadeIn h-full flex flex-col">
      {/* Linear-Style Toolbar */}
      <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-eq-border-subtle/50">
        
        {/* Left: Unified Filter Bar */}
        <div className="flex items-center gap-2">
            
            {/* Search - Ghost Style */}
            <div className="group flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-eq-bg-elevated/50">
                <Search className="w-3.5 h-3.5 text-eq-text-muted group-hover:text-eq-text-secondary" />
                <input
                    type="text"
                    placeholder="Search..."
                    className="bg-transparent border-none p-0 text-xs w-24 focus:w-48 transition-all duration-300 text-eq-text-primary placeholder:text-eq-text-muted focus:ring-0"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
                />
            </div>

            {/* Divider */}
            <div className="w-px h-3.5 bg-eq-border-subtle mx-1"></div>

            {/* Filters - Ghost Style */}
            <div className="flex items-center gap-1">
                <div className="min-w-[100px]">
                    <Select
                        value={filters.category_id}
                        onChange={(val) => { setFilters(prev => ({...prev, category_id: val})); setPagination(prev => ({...prev, page: 1})); }}
                        options={categoryOptions}
                        placeholder="Category"
                        size="sm"
                        variant="ghost"
                    />
                </div>
                <div className="w-px h-3.5 bg-eq-border-subtle mx-1"></div>
                <div className="min-w-[90px]">
                    <Select
                        value={filters.status}
                        onChange={(val) => { setFilters(prev => ({...prev, status: val})); setPagination(prev => ({...prev, page: 1})); }}
                        options={statusOptions}
                        placeholder="Status"
                        size="sm"
                        variant="ghost"
                    />
                </div>
            </div>

            {/* Actions */}
            {(filters.search || filters.category_id !== 'all' || filters.status !== 'all') && (
                <>
                    <div className="w-px h-3.5 bg-eq-border-subtle mx-1"></div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-eq-text-muted hover:text-eq-text-primary hover:bg-eq-bg-elevated rounded transition-colors"
                    >
                        <X className="w-3 h-3" />
                        <span className="font-medium">Reset</span>
                    </button>
                </>
            )}
        </div>

        {/* Right: Primary Action */}
        <div className="flex items-center gap-4">
             <span className="text-[10px] text-eq-text-muted font-mono tracking-wider">
                {tables.length} / {pagination.total} ROWS
             </span>
             <div className="w-px h-3.5 bg-eq-border-subtle"></div>
            <button 
                onClick={() => onNavigate('table-new')} 
                className="btn-primary !py-1 !px-3 !text-[11px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
                <Plus className="w-3.5 h-3.5" />
                New Table
            </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading && tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 py-12">
            <Loader2 className="w-8 h-8 text-eq-primary-500 animate-spin" />
            <p className="text-sm text-eq-text-secondary">Loading Data...</p>
            </div>
        ) : tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 bg-eq-bg-elevated/20 rounded-xl m-4">
                <div className="p-4 rounded-full bg-eq-bg-elevated mb-4">
                    <Database className="w-8 h-8 text-eq-text-muted/50" />
                </div>
                <h3 className="text-sm font-medium text-eq-text-primary">No Data Tables Found</h3>
                <p className="text-xs text-eq-text-secondary mt-1 max-w-xs text-center leading-relaxed">
                    Start by creating a new table definition to organize your quantitative data.
                </p>
                <button 
                    onClick={() => onNavigate('table-new')} 
                    className="mt-6 btn-secondary !py-1.5 !px-4 text-xs font-medium"
                >
                    Create Table
                </button>
            </div>
        ) : (
            <div className="bg-eq-bg-surface border border-eq-border-default rounded-lg overflow-hidden shadow-sm flex flex-col flex-1">
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-eq-bg-elevated/50 border-b border-eq-border-subtle text-eq-text-secondary sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                        <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-[25%]">Display Name</th>
                        <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-[20%]">Physical Table</th>
                        <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-[15%]">Category</th>
                        <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider w-[15%]">Status</th>
                        <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-eq-border-subtle">
                    {tables.map((table) => {
                        const isPublished = table.status === 'created' || table.status === 'CREATED';
                        const isSyncNeeded = !isPublished && table.last_published_at;

                        return (
                        <tr 
                            key={table.id} 
                            className="group hover:bg-eq-bg-elevated/50 transition-colors"
                            onMouseEnter={() => setHoveredRow(table.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                        >
                            <td className="px-6 py-2.5 align-middle">
                                <div className="font-medium text-eq-text-primary text-sm">{table.name}</div>
                                {table.description && (
                                    <div className="text-[10px] text-eq-text-muted mt-0.5 line-clamp-1 max-w-[200px]">{table.description}</div>
                                )}
                            </td>
                            <td className="px-6 py-2.5 align-middle">
                                <code className="font-mono text-[11px] text-eq-text-secondary bg-eq-bg-elevated px-1.5 py-0.5 rounded border border-eq-border-subtle select-all">
                                    {table.table_name}
                                </code>
                            </td>
                            <td className="px-6 py-2.5 align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryStyle(table.category_id)}`}>
                                    {getCategoryName(table.category_id)}
                                </span>
                            </td>
                            <td className="px-6 py-2.5 align-middle">
                            {isPublished ? (
                                <div className="flex items-center gap-1.5 text-eq-success-text">
                                    <span className="w-1.5 h-1.5 rounded-full bg-eq-success-solid"></span>
                                    <span className="text-[11px] font-medium">Published</span>
                                </div>
                            ) : isSyncNeeded ? (
                                <div className="flex items-center gap-1.5 text-eq-primary-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-eq-primary-500 animate-pulse"></span>
                                    <span className="text-[11px] font-medium">Update Needed</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-eq-warning-text">
                                    <span className="w-1.5 h-1.5 rounded-full bg-eq-warning-solid"></span>
                                    <span className="text-[11px] font-medium">Draft</span>
                                </div>
                            )}
                            </td>
                            <td className="px-6 py-2.5 align-middle text-right">
                                <div className={`flex items-center justify-end gap-1 transition-opacity duration-200 ${hoveredRow === table.id ? 'opacity-100' : 'opacity-60'}`}>
                                    {!isPublished && (
                                    <button
                                        onClick={() => setPublishModal({ open: true, table, error: null })}
                                        className={`p-1.5 rounded-md transition-colors ${
                                            isSyncNeeded ? 'text-eq-primary-500 hover:bg-eq-primary-500/10' : 'text-eq-primary-500 hover:bg-eq-primary-500/10'
                                        }`}
                                        title={isSyncNeeded ? "Sync Structure" : "Publish"}
                                    >
                                        {isSyncNeeded ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    </button>
                                    )}

                                    <button onClick={() => onNavigate('table-new', table.id)} className="p-1.5 text-eq-text-secondary hover:text-eq-text-primary hover:bg-eq-bg-overlay rounded-md" title="Clone">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => onNavigate('table-edit', table.id)} className="p-1.5 text-eq-text-secondary hover:text-eq-text-primary hover:bg-eq-bg-overlay rounded-md" title="Edit">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setDeleteModal({ open: true, table, error: null })} className="p-1.5 text-eq-text-muted hover:text-eq-danger-text hover:bg-eq-danger-bg rounded-md" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
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
            <div className="border-t border-eq-border-subtle px-4 py-2 flex items-center justify-between bg-eq-bg-elevated/30 text-xs">
                <div className="text-eq-text-secondary">
                    Showing <span className="font-medium text-eq-text-primary">{tables.length}</span> of <span className="font-medium text-eq-text-primary">{pagination.total}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page <= 1 || loading}
                        className="p-1 rounded hover:bg-eq-bg-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 text-eq-text-primary" />
                    </button>
                    <span className="text-eq-text-primary px-2 font-medium">
                        {pagination.page} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                        disabled={pagination.page >= totalPages || loading}
                        className="p-1 rounded hover:bg-eq-bg-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5 text-eq-text-primary" />
                    </button>
                </div>
            </div>

            </div>
        )}
      </div>

      {/* Delete Modal - Refined */}
      {deleteModal.open && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-eq-bg-surface rounded-lg p-6 max-w-md w-full border border-eq-border-subtle shadow-xl animate-slideUp">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-eq-danger-bg rounded-full flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-eq-danger-text" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-eq-text-primary leading-tight">
                  {(deleteModal.table?.status?.toUpperCase() === 'CREATED') ? "Critical Action Warning" : "Confirm Deletion"}
                </h3>

                <div className="mt-3 text-eq-text-secondary text-sm leading-relaxed">
                  {(deleteModal.table?.status?.toUpperCase() === 'CREATED') ? (
                    <div className="space-y-3">
                      <p>You are about to delete a <strong>published</strong> table <span className="text-eq-text-primary">{deleteModal.table?.name}</span>.</p>
                      <div className="bg-eq-danger-bg/50 border border-eq-danger-border p-3 rounded text-eq-danger-text text-xs">
                        <strong>WARNING:</strong> This will permanently DROP the physical table <code className="font-mono bg-white/50 px-1 rounded">{deleteModal.table?.table_name}</code> and destroy ALL data within it.
                      </div>
                      <p>This action is irreversible.</p>
                    </div>
                  ) : (
                    <p>Are you sure you want to delete table "{deleteModal.table?.name}"? This cannot be undone.</p>
                  )}
                </div>

                {deleteModal.error && (
                   <div className="mt-3 p-3 bg-eq-danger-bg border border-eq-danger-border rounded text-eq-danger-text text-sm">
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
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal - Refined */}
      {publishModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-eq-bg-surface rounded-lg p-6 max-w-md w-full border border-eq-border-subtle shadow-xl animate-slideUp">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full flex-shrink-0 ${publishModal.table?.last_published_at ? 'bg-eq-info-bg text-eq-info-text' : 'bg-eq-warning-bg text-eq-warning-text'}`}>
                {publishModal.table?.last_published_at ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-eq-text-primary leading-tight">
                    {publishModal.table?.last_published_at ? 'Sync Structure Changes' : 'Publish Table'}
                </h3>

                <div className="mt-3 text-eq-text-secondary text-sm leading-relaxed">
                  <p className="mb-3">You are about to {publishModal.table?.last_published_at ? 'sync' : 'publish'} table <span className="font-medium text-eq-text-primary">{publishModal.table?.name}</span>.</p>

                  {publishModal.table?.last_published_at ? (
                      <div className="p-3 bg-eq-info-bg/50 border border-eq-info-border rounded-lg text-eq-info-text text-xs space-y-1">
                          <p className="font-semibold">Incremental Sync Mode</p>
                          <ul className="list-disc list-inside opacity-90">
                            <li>New columns will be added via <code className="bg-white/50 px-1 rounded">ADD COLUMN</code></li>
                            <li>Existing data is preserved.</li>
                          </ul>
                      </div>
                  ) : (
                      <ul className="list-disc list-inside space-y-1 ml-1 text-eq-text-primary">
                        <li>Create physical table <code className="font-mono bg-eq-bg-elevated px-1 rounded border border-eq-border-subtle">{publishModal.table?.table_name}</code></li>
                        <li>Lock schema definition</li>
                      </ul>
                  )}
                </div>

                {publishModal.error && (
                   <div className="mt-3 p-3 bg-eq-danger-bg border border-eq-danger-border rounded text-eq-danger-text text-sm">
                     <span className="font-semibold block mb-1">Error:</span>
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
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`flex items-center gap-2 text-white px-4 py-2 rounded-md font-medium transition-all shadow-sm ${
                     publishModal.table?.last_published_at
                     ? 'bg-eq-primary-500 hover:bg-eq-primary-600'
                     : 'bg-eq-success-solid hover:bg-eq-success-text' // Green for first publish
                }`}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (publishModal.table?.last_published_at ? <RefreshCw className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
                {publishing ? 'Executing...' : (publishModal.table?.last_published_at ? 'Confirm Sync' : 'Confirm Publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTableList