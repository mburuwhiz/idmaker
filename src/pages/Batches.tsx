import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FileUp, Play, Table, Camera, Share2, PackageOpen, Trash2, Pencil, Layout } from 'lucide-react'
import Modal from '../components/Modal'

interface Batch {
  id: number
  name: string
  createdAt: string
  layoutId?: number
}

interface BatchesProps {
  onViewData: (batchId: number) => void
  onPrint: (batchId: number) => void
  onPreview: (batchId: number) => void
}

const Batches: React.FC<BatchesProps> = ({ onViewData, onPrint, onPreview }) => {
  const [batches, setBatches] = useState<Batch[]>([])
  const [layouts, setLayouts] = useState<any[]>([])

  // Modals
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'default' | 'danger' }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  })
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean, title: string, value: string, onConfirm: (val: string) => void }>({
    isOpen: false, title: '', value: '', onConfirm: () => {}
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const [bData, lData] = await Promise.all([
      window.ipcRenderer.invoke('get-batches'),
      window.ipcRenderer.invoke('get-layouts')
    ])
    setBatches(bData)
    setLayouts(lData)
  }

  const loadBatches = async () => {
    const data = await window.ipcRenderer.invoke('get-batches')
    setBatches(data)
  }

  const performImport = async (batchName: string) => {
    if (!batchName.trim()) {
        toast.error('Batch name is required')
        return
    }
    const loadToast = toast.loading('Importing Excel...')
    try {
      const result = await window.ipcRenderer.invoke('import-excel', batchName)
      if (result) {
        toast.success(`Imported ${result.count} students!`, { id: loadToast })
        loadBatches()
      } else {
        toast.dismiss(loadToast)
      }
      setPromptModal(prev => ({ ...prev, isOpen: false }))
    } catch (e) {
      toast.error('Import failed', { id: loadToast })
    }
  }

  const handleImport = () => {
     setPromptModal({
        isOpen: true,
        title: 'Enter Batch Name',
        value: `Batch ${new Date().toLocaleDateString()}`,
        onConfirm: performImport
     })
  }

  const handleMatchPhotos = async (batchId: number) => {
    const dirPath = await window.ipcRenderer.invoke('open-directory')
    if (dirPath) {
      const loadToast = toast.loading('Matching photos...')
      try {
        const count = await window.ipcRenderer.invoke('match-photos', batchId, dirPath)
        toast.success(`Matched ${count} photos!`, { id: loadToast })
      } catch (e) {
        toast.error('Photo matching failed', { id: loadToast })
      }
    }
  }

  const performDeleteBatch = async (batchId: number) => {
    try {
        await window.ipcRenderer.invoke('delete-batch', batchId)
        toast.success('Batch deleted')
        loadBatches()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
    } catch (e) {
        toast.error('Failed to delete batch')
    }
  }

  const handleDeleteBatch = (batchId: number) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Batch?',
        message: 'Are you sure you want to delete this batch and all its student records? This cannot be undone.',
        onConfirm: () => performDeleteBatch(batchId),
        variant: 'danger'
    })
  }

  const performRenameBatch = async (batch: Batch, newName: string) => {
    if (newName && newName !== batch.name) {
      try {
        await window.ipcRenderer.invoke('rename-batch', batch.id, newName)
        toast.success('Batch renamed')
        loadBatches()
        setPromptModal(prev => ({ ...prev, isOpen: false }))
      } catch (e) {
        toast.error('Failed to rename batch')
      }
    }
  }

  const handleRenameBatch = (batch: Batch) => {
    setPromptModal({
        isOpen: true,
        title: 'Rename Batch',
        value: batch.name,
        onConfirm: (newName) => performRenameBatch(batch, newName)
    })
  }

  const handleUpdateBatchLayout = async (batchId: number, layoutId: number) => {
    try {
      await window.ipcRenderer.invoke('update-batch-layout', batchId, layoutId)
      toast.success('Batch layout updated')
      loadBatches()
    } catch (e) {
      toast.error('Failed to update batch layout')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Print Batches</h1>
          <button
            onClick={async () => {
              const res = await window.ipcRenderer.invoke('import-batch-wid')
              if (res) {
                toast.success(`Imported ${res.count} students from .wid file!`)
                loadBatches()
              }
            }}
            className="bg-slate-700 text-white px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition"
            title="Import .wid Sharing File"
          >
            <PackageOpen size={20} /> Import .wid
          </button>
        <button
          onClick={handleImport}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <FileUp size={20} /> Import Excel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {batches.map(batch => (
          <div key={batch.id} className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-800 truncate">{batch.name}</h3>
                <button
                  onClick={() => handleRenameBatch(batch)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                  title="Rename Batch"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Created: {new Date(batch.createdAt).toLocaleString()}</p>

              <div className="flex items-center gap-2">
                 <Layout size={14} className="text-slate-400" />
                 <select
                   value={batch.layoutId || ''}
                   onChange={(e) => handleUpdateBatchLayout(batch.id, Number(e.target.value))}
                   className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                 >
                   <option value="">Choose Layout...</option>
                   {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                   const res = await window.ipcRenderer.invoke('export-batch-wid', batch.id)
                   if (res) toast.success('.wid bundle exported!')
                }}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition text-slate-500"
                title="Export for sharing (.wid)"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => handleMatchPhotos(batch.id)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                <Camera size={18} /> Match Photos
              </button>
              <button
                onClick={() => onPreview(batch.id)}
                className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50/50 rounded-lg hover:bg-blue-600 hover:text-white transition font-bold"
              >
                 <Play size={18} /> Preview Individual
              </button>
              <button
                onClick={() => onViewData(batch.id)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                 <Table size={18} /> View Data
              </button>
              <button
                onClick={() => onPrint(batch.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Play size={18} /> Start Printing
              </button>
              <button
                onClick={() => handleDeleteBatch(batch.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                title="Delete Batch"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {batches.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed text-gray-400">
            No batches found. Import an Excel file to get started.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        variant={confirmModal.variant}
        footer={
          <>
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmModal.onConfirm}
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-lg ${confirmModal.variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
            >
              Confirm
            </button>
          </>
        }
      >
        <p className="text-slate-600">{confirmModal.message}</p>
      </Modal>

      {/* Prompt Modal */}
      <Modal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
        title={promptModal.title}
        footer={
          <>
             <button
              onClick={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => promptModal.onConfirm(promptModal.value)}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-200"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
            <input
                type="text"
                value={promptModal.value}
                onChange={(e) => setPromptModal(prev => ({ ...prev, value: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                autoFocus
                onKeyDown={(e) => {
                    if(e.key === 'Enter') promptModal.onConfirm(promptModal.value)
                }}
            />
        </div>
      </Modal>
    </div>
  )
}

export default Batches
