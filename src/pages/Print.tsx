import React, { useState, useEffect } from 'react'
import { Printer, ChevronLeft, ChevronRight, FileText, Settings, X, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import { renderA4Sheet, exportToPdf, renderCard } from '../utils/printService'

interface PrintProps {
  initialBatchId?: number | null
}

const Print: React.FC<PrintProps> = ({ initialBatchId = null }) => {
  const [batches, setBatches] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [layouts, setLayouts] = useState<any[]>([])

  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(initialBatchId)
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null)

  const [students, setStudents] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [singlePreviewUrl, setSinglePreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewMode, setViewMode] = useState<'pair' | 'single'>('single')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const b = await window.ipcRenderer.invoke('get-batches')
    const p = await window.ipcRenderer.invoke('get-profiles')
    const l = await window.ipcRenderer.invoke('get-layouts')
    setBatches(b)
    setProfiles(p)
    setLayouts(l)

    if (p.length > 0) setSelectedProfileId(p.find((prof: any) => prof.isDefault)?.id || p[0].id)
    if (l.length > 0) setSelectedLayoutId(l[0].id)
  }

  useEffect(() => {
    if (selectedBatchId) {
      loadStudents(selectedBatchId)
    }
  }, [selectedBatchId])

  const loadStudents = async (batchId: number) => {
    const data = await window.ipcRenderer.invoke('get-students', batchId)
    setStudents(data.map((s: any) => ({ ...s, data: JSON.parse(s.data) })))
    setCurrentIndex(0)
  }

  useEffect(() => {
    updatePreview()
  }, [currentIndex, students, selectedProfileId, selectedLayoutId, viewMode])

  const updatePreview = async () => {
    if (students.length === 0 || !selectedProfileId || !selectedLayoutId) return

    const layout = layouts.find(l => l.id === selectedLayoutId)
    const profile = profiles.find(p => p.id === selectedProfileId)
    if (!layout || !profile) return

    if (viewMode === 'pair') {
      const student1 = students[currentIndex * 2]
      const student2 = students[currentIndex * 2 + 1]

      if (!student1) return

      const photo1 = student1.photoPath ? await window.ipcRenderer.invoke('read-photo', student1.photoPath) : null
      const photo2 = student2?.photoPath ? await window.ipcRenderer.invoke('read-photo', student2.photoPath) : null

      const p1Data = photo1 ? `data:image/jpeg;base64,${photo1}` : undefined
      const p2Data = photo2 ? `data:image/jpeg;base64,${photo2}` : undefined

      const sheet = await renderA4Sheet(student1.data, student2?.data, layout.content, profile, p1Data, p2Data)
      setPreviewUrl(sheet.toDataURL())
    } else {
      const student = students[currentIndex]
      if (!student) return

      const photo = student.photoPath ? await window.ipcRenderer.invoke('read-photo', student.photoPath) : null
      const pData = photo ? `data:image/jpeg;base64,${photo}` : undefined

      const card = await renderCard(layout.content, student.data, pData)
      setSinglePreviewUrl(card.toDataURL())
    }
  }

  const validateBatch = () => {
    const errors: string[] = []
    const admNos = new Set()

    students.forEach(s => {
      if (!s.photoPath) errors.push(`Missing photo for ${s.admNo}`)
      if (admNos.has(s.admNo)) errors.push(`Duplicate ADM_NO: ${s.admNo}`)
      admNos.add(s.admNo)
    })

    return errors
  }

  const handlePrintAll = async () => {
    if (students.length === 0 || !selectedProfileId || !selectedLayoutId) return

    const errors = validateBatch()
    if (errors.length > 0) {
      if (!confirm(`Found ${errors.length} potential issues:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}\n\nContinue anyway?`)) {
        return
      }
    }

    setIsGenerating(true)

    const profile = profiles.find(p => p.id === selectedProfileId)
    const layout = layouts.find(l => l.id === selectedLayoutId)
    const sheets: HTMLCanvasElement[] = []

    try {
      for (let i = 0; i < Math.ceil(students.length / 2); i++) {
        const s1 = students[i * 2]
        const s2 = students[i * 2 + 1]

        const photo1 = s1.photoPath ? await window.ipcRenderer.invoke('read-photo', s1.photoPath) : null
        const photo2 = s2?.photoPath ? await window.ipcRenderer.invoke('read-photo', s2.photoPath) : null

        const p1Data = photo1 ? `data:image/jpeg;base64,${photo1}` : undefined
        const p2Data = photo2 ? `data:image/jpeg;base64,${photo2}` : undefined

        const sheet = await renderA4Sheet(s1.data, s2?.data, layout.content, profile, p1Data, p2Data)
        sheets.push(sheet)
      }

      const batch = batches.find(b => b.id === selectedBatchId)
      await exportToPdf(sheets, batch?.name || 'Batch Export')
      toast.success('PDF Generated!')
    } catch (e) {
      console.error(e)
      toast.error('Error generating PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveEdit = async () => {
    const student = students[currentIndex]
    try {
      const parsed = JSON.parse(editData)
      await window.ipcRenderer.invoke('update-student', student.id, parsed, student.printStatus)
      setIsEditing(false)
      loadStudents(selectedBatchId!)
      toast.success('Record updated!')
    } catch (e) {
      toast.error('Invalid JSON')
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Production Preview</h1>
        <div className="bg-white p-1 rounded-lg border flex shadow-sm">
           <button
            onClick={() => { setViewMode('single'); setCurrentIndex(0); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
           >SINGLE</button>
           <button
            onClick={() => { setViewMode('pair'); setCurrentIndex(0); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'pair' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
           >TRAY PAIR</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Batch</label>
          <select
            className="w-full border rounded p-2"
            value={selectedBatchId || ''}
            onChange={(e) => setSelectedBatchId(Number(e.target.value))}
          >
            <option value="">Select a batch...</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Printer Profile</label>
          <select
            className="w-full border rounded p-2"
            value={selectedProfileId || ''}
            onChange={(e) => setSelectedProfileId(Number(e.target.value))}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Layout</label>
          <select
            className="w-full border rounded p-2"
            value={selectedLayoutId || ''}
            onChange={(e) => setSelectedLayoutId(Number(e.target.value))}
          >
             {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        <div className="flex-1 bg-gray-200/50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden p-8 relative">
          {viewMode === 'single' ? (
             singlePreviewUrl ? (
                <div className="relative group">
                   <img src={singlePreviewUrl} className="max-h-full shadow-[0_50px_100px_rgba(0,0,0,0.3)] bg-white rounded-lg transition-transform duration-500 hover:scale-105" alt="Card Preview" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-lg" />
                </div>
             ) : <div className="text-gray-400 italic font-medium">Select batch/layout for single preview</div>
          ) : (
            previewUrl ? (
              <img src={previewUrl} className="max-h-full shadow-2xl bg-white" alt="Tray Preview" />
            ) : (
              <div className="text-gray-400 italic font-medium">Select batch/layout for tray preview</div>
            )
          )}

          {isEditing && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-12">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm">Edit Student Data</h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <div className="p-6">
                    <textarea
                      className="w-full h-80 border rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                      value={editData}
                      onChange={(e) => setEditData(e.target.value)}
                    />
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex gap-3">
                    <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">SAVE CHANGES</button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 border bg-white rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">CANCEL</button>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="w-96 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> Controls</h3>

            <div className="flex items-center justify-between mb-6">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="p-3 border rounded-xl hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center">
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">
                  {viewMode === 'single' ? 'Student' : 'Tray Pair'}
                </div>
                <div className="font-black text-2xl text-slate-800">
                  {currentIndex + 1} <span className="text-gray-300 font-light mx-1">/</span> {viewMode === 'single' ? students.length : Math.ceil(students.length / 2)}
                </div>
              </div>
              <button
                disabled={currentIndex >= (viewMode === 'single' ? students.length : Math.ceil(students.length / 2)) - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="p-3 border rounded-xl hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <button
              onClick={async () => {
                const url = viewMode === 'single' ? singlePreviewUrl : previewUrl
                if (!url) return
                const link = document.createElement('a')
                link.download = `ID_Preview_${currentIndex + 1}.png`
                link.href = url
                link.click()
              }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition mb-3"
            >
              <Printer size={20} /> Download Current {viewMode === 'single' ? 'Card' : 'Pair'}
            </button>

            <button
              onClick={handlePrintAll}
              disabled={isGenerating}
              className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition"
            >
              <FileText size={20} /> {isGenerating ? 'Generating...' : 'Export Batch PDF'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm flex-1 overflow-auto">
             <h3 className="font-bold mb-4 text-xs uppercase text-gray-400 tracking-widest">Active Records</h3>

             {viewMode === 'single' ? (
                students[currentIndex] && (
                  <div className="flex flex-col h-full">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex-1">
                      <div className="text-[10px] text-blue-600 font-black mb-2 uppercase tracking-widest">Selected Student</div>
                      <div className="text-xl font-bold text-slate-800 mb-1">{students[currentIndex].data.NAME}</div>
                      <div className="text-sm text-slate-500 font-mono mb-6">{students[currentIndex].admNo}</div>

                      <div className="space-y-2 mb-8">
                        {Object.entries(students[currentIndex].data).slice(0, 5).map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-blue-100 pb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{k}</span>
                            <span className="text-xs text-slate-600 font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setEditData(JSON.stringify(students[currentIndex].data, null, 2))
                          setIsEditing(true)
                        }}
                        className="w-full py-2 bg-white border border-blue-200 rounded-lg text-blue-600 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-100 flex items-center justify-center gap-2"
                      >
                         <Edit size={14} /> EDIT RECORD
                      </button>
                    </div>
                  </div>
                )
             ) : (
               <>
                 {students[currentIndex * 2] && (
                   <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm shadow-blue-50">
                      <div className="text-[10px] text-blue-600 font-black mb-1 uppercase tracking-widest">SLOT 1 (TOP)</div>
                      <div className="font-bold text-slate-800">{students[currentIndex * 2].data.NAME}</div>
                      <div className="text-xs text-slate-500 font-mono">{students[currentIndex * 2].admNo}</div>
                   </div>
                 )}
                 {students[currentIndex * 2 + 1] && (
                   <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm shadow-indigo-50">
                      <div className="text-[10px] text-indigo-600 font-black mb-1 uppercase tracking-widest">SLOT 2 (BOTTOM)</div>
                      <div className="font-bold text-slate-800">{students[currentIndex * 2 + 1].data.NAME}</div>
                      <div className="text-xs text-slate-500 font-mono">{students[currentIndex * 2 + 1].admNo}</div>
                   </div>
                 )}
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Print
