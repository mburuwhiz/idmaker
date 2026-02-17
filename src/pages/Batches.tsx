import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FileUp, Play, Table, Camera, Share2, PackageOpen } from 'lucide-react'

interface Batch {
  id: number
  name: string
  createdAt: string
}

interface BatchesProps {
  onViewData: (batchId: number) => void
  onPrint: (batchId: number) => void
}

const Batches: React.FC<BatchesProps> = ({ onViewData, onPrint }) => {
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    const data = await window.ipcRenderer.invoke('get-batches')
    setBatches(data)
  }

  const handleImport = async () => {
    const loadToast = toast.loading('Importing Excel...')
    try {
      const result = await window.ipcRenderer.invoke('import-excel')
      if (result) {
        toast.success(`Imported ${result.count} students!`, { id: loadToast })
        loadBatches()
      } else {
        toast.dismiss(loadToast)
      }
    } catch (e) {
      toast.error('Import failed', { id: loadToast })
    }
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
            <div>
              <h3 className="text-lg font-bold">{batch.name}</h3>
              <p className="text-sm text-gray-500">Created: {new Date(batch.createdAt).toLocaleString()}</p>
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
            </div>
          </div>
        ))}
        {batches.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed text-gray-400">
            No batches found. Import an Excel file to get started.
          </div>
        )}
      </div>
    </div>
  )
}

export default Batches
