import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FileUp, Play, Table, Camera, Share2, PackageOpen, Trash2, Pencil, Layout } from 'lucide-react'
import { ConfirmModal, PromptModal } from '../components/Modal'

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
  const [modal, setModal] = useState<{ type: 'confirm' | 'prompt' | null, title: string, message: string, onConfirm?: (v?: any) => void, initialValue?: string, isDestructive?: boolean, placeholder?: string }>({
    type: null, title: '', message: ''
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

  const handleImport = async () => {
    setModal({
      type: 'prompt',
      title: 'Import Excel',
      message: 'Enter a name for this new batch:',
      placeholder: 'Batch Name...',
      onConfirm: async (batchName: string) => {
        if (!batchName) {
          toast.error('Batch name is required')
          return
        }
        const loadToast = toast.loading('Importing Excel...')
        try {
          const result = await window.ipcRenderer.invoke('import-excel', batchName)
          if (result) {
            toast.success(`Imported ${result.count} students into "${batchName}"!`, { id: loadToast })
            loadBatches()
          } else {
            toast.dismiss(loadToast)
          }
        } catch (e) {
          toast.error('Import failed', { id: loadToast })
        }
      }
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

  const handleDeleteBatch = async (batchId: number) => {
    setModal({
      type: 'confirm',
      title: 'Delete Batch',
      message: 'Are you sure you want to delete this batch and all its student records? This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await window.ipcRenderer.invoke('delete-batch', batchId)
          toast.success('Batch deleted')
          loadBatches()
        } catch (e) {
          toast.error('Failed to delete batch')
        }
      }
    })
  }

  const handleRenameBatch = async (batch: Batch) => {
    setModal({
      type: 'prompt',
      title: 'Rename Batch',
      message: 'Enter new name for the batch:',
      initialValue: batch.name,
      onConfirm: async (newName: string) => {
        if (newName && newName !== batch.name) {
          try {
            await window.ipcRenderer.invoke('rename-batch', batch.id, newName)
            toast.success('Batch renamed')
            loadBatches()
          } catch (e) {
            toast.error('Failed to rename batch')
          }
        }
      }
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
                if (res.type === 'layout') {
                    toast.success('Layout imported successfully! You can find it in the Designer.')
                    loadInitialData()
                } else {
                    toast.success(`Imported ${res.count} students from .wid file!`)
                    loadBatches()
                }
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

      <ConfirmModal
        isOpen={modal.type === 'confirm'}
        onClose={() => setModal({ ...modal, type: null })}
        onConfirm={modal.onConfirm || (() => {})}
        title={modal.title}
        message={modal.message}
        isDestructive={modal.isDestructive}
      />
      <PromptModal
        isOpen={modal.type === 'prompt'}
        onClose={() => setModal({ ...modal, type: null })}
        onConfirm={modal.onConfirm || (() => {})}
        title={modal.title}
        message={modal.message}
        initialValue={modal.initialValue}
        placeholder={modal.placeholder}
      />
    </div>
  )
}

export default Batches
