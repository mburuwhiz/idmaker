import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  LayoutTemplate, Download, Pencil, Trash2, Share2,
  PackageOpen, Plus, Search, ExternalLink
} from 'lucide-react'
import { ConfirmModal, PromptModal } from '../components/Modal'

interface Layout {
  id: number
  name: string
  content: string
}

interface LayoutsProps {
  onLoadLayout: (layout: Layout) => void
  onNewLayout: () => void
}

const Layouts: React.FC<LayoutsProps> = ({ onLoadLayout, onNewLayout }) => {
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [modal, setModal] = useState<{
    type: 'confirm' | 'prompt' | null,
    title: string,
    message: string,
    onConfirm?: (v?: any) => void,
    initialValue?: string,
    isDestructive?: boolean
  }>({
    type: null, title: '', message: ''
  })

  useEffect(() => {
    loadLayouts()
  }, [])

  const loadLayouts = async () => {
    try {
      const data = await window.ipcRenderer.invoke('get-layouts')
      setLayouts(data)
    } catch (e) {
      toast.error('Failed to load layouts')
    }
  }

  const handleDelete = (id: number) => {
    setModal({
      type: 'confirm',
      title: 'Delete Layout',
      message: 'Are you sure you want to delete this layout? This action cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await window.ipcRenderer.invoke('delete-layout', id)
          toast.success('Layout deleted')
          loadLayouts()
        } catch (e) {
          toast.error('Failed to delete layout')
        }
      }
    })
  }

  const handleRename = (layout: Layout) => {
    setModal({
      type: 'prompt',
      title: 'Rename Layout',
      message: 'Enter new name for the layout:',
      initialValue: layout.name,
      onConfirm: async (newName: string) => {
        if (newName && newName !== layout.name) {
          try {
            await window.ipcRenderer.invoke('save-layout', newName, layout.content)
            await window.ipcRenderer.invoke('delete-layout', layout.id)
            toast.success('Layout renamed')
            loadLayouts()
          } catch (e) {
            toast.error('Failed to rename layout')
          }
        }
      }
    })
  }

  const handleExportWid = async (layout: Layout) => {
    const res = await window.ipcRenderer.invoke('export-batch-wid', null, layout.id)
    if (res) toast.success('Layout exported as .wid')
  }

  const handleImportWid = async () => {
    const res = await window.ipcRenderer.invoke('import-batch-wid')
    if (res) {
      if (res.type === 'layout') {
        toast.success('Layout imported successfully!')
        loadLayouts()
      } else {
        toast.success('Batch imported! Switch to Batches to view.')
      }
    }
  }

  const handleDownloadJSON = (layout: Layout) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(layout.content);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", layout.name + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('JSON Exported');
  }

  const filteredLayouts = layouts.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Design Library</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage and share your ID templates</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImportWid}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition shadow-lg shadow-slate-200"
          >
            <PackageOpen size={18} /> Import .wid
          </button>
          <button
            onClick={onNewLayout}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            <Plus size={18} /> Create New
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search layouts by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-[1.5rem] pl-12 pr-6 py-4 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
        />
      </div>

      {filteredLayouts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLayouts.map(l => (
            <div key={l.id} className="group bg-white border border-slate-100 rounded-[2rem] p-6 transition-all hover:shadow-2xl hover:shadow-blue-100/50 hover:border-blue-500 relative flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <LayoutTemplate size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownloadJSON(l)} className="p-2 bg-white shadow-md border rounded-xl text-slate-400 hover:text-blue-600 transition-all" title="Export JSON"><Download size={16} /></button>
                  <button onClick={() => handleRename(l)} className="p-2 bg-white shadow-md border rounded-xl text-slate-400 hover:text-blue-600 transition-all" title="Rename"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(l.id)} className="p-2 bg-white shadow-md border rounded-xl text-red-300 hover:text-red-600 transition-all" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors truncate mb-1">{l.name}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>CR80 PVC</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span>300 DPI</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => onLoadLayout(l)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                >
                  <ExternalLink size={14} /> Open
                </button>
                <button
                  onClick={() => handleExportWid(l)}
                  className="px-4 py-3 border-2 border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all"
                  title="Share as .wid"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
           <LayoutTemplate size={64} className="mx-auto text-slate-100 mb-6" />
           <h3 className="font-black text-slate-300 uppercase tracking-widest">No layouts found</h3>
           {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-blue-600 font-bold uppercase text-[10px] tracking-widest">Clear Search</button>}
        </div>
      )}

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
      />
    </div>
  )
}

export default Layouts
