import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Printer, Download, User, Info, AlertCircle, ChevronsLeft, ChevronsRight, Edit, Save, Camera, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { renderCard } from '../utils/printService'

interface PreviewIndividualProps {
  batchId: number
  onExit: () => void
}

const PreviewIndividual: React.FC<PreviewIndividualProps> = ({ batchId, onExit }) => {
  const [students, setStudents] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [batchName, setBatchName] = useState('Batch')
  const [layouts, setLayouts] = useState<any[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, l, b] = await Promise.all([
        window.ipcRenderer.invoke('get-students', batchId),
        window.ipcRenderer.invoke('get-layouts'),
        window.ipcRenderer.invoke('get-batches')
      ])

      // Filter out students who failed photo matching or are missing required photo
      const filtered = s.filter((item: any) => item.printStatus !== 'failed' && item.photoPath)
      setStudents(filtered.map((item: any) => ({ ...item, data: JSON.parse(item.data) })))
      setLayouts(l)

      const batch = b.find((item: any) => item.id === batchId)
      if (batch) {
          setBatchName(batch.name)
          if (batch.layoutId) {
              setSelectedLayoutId(batch.layoutId)
          } else if (l.length > 0) {
              setSelectedLayoutId(l[0].id)
          }
      } else if (l.length > 0) {
          setSelectedLayoutId(l[0].id)
      }
    } catch (e) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    updatePreview()
  }, [currentIndex, students, selectedLayoutId])

  const updatePreview = async () => {
    if (students.length === 0 || !selectedLayoutId) return

    const layout = layouts.find(l => l.id === selectedLayoutId)
    if (!layout) return

    const student = students[currentIndex]
    let pData: string | undefined = undefined

    if (student.photoPath) {
        try {
            const photo = await window.ipcRenderer.invoke('read-photo', student.photoPath)
            if (photo) {
                const ext = student.photoPath.split('.').pop()?.toLowerCase() || 'jpeg'
                const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
                pData = `data:${mime};base64,${photo}`
            }
        } catch (err) {
            console.error('[Preview] Failed to load photo:', err)
        }
    }

    // Apply adjustments if they exist in data
    const adjustments = student.data._adjustments || { zoom: 1, x: 0, y: 0 }

    const card = await renderCard(layout.content, student.data, pData, adjustments)
    setPreviewUrl(card.toDataURL())
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white z-[100]">
        <div className="flex flex-col items-center">
           <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="font-bold tracking-widest uppercase text-xs">Preparing High-Res Previews...</p>
        </div>
      </div>
    )
  }

  const currentStudent = students[currentIndex]

  const handleSaveEdit = async () => {
    try {
        await window.ipcRenderer.invoke('update-student', currentStudent.id, editData, 'pending')
        toast.success('Record updated')
        setIsEditing(false)
        loadData()
    } catch (e) {
        toast.error('Failed to update record')
    }
  }

  const changePhoto = async () => {
    const res = await window.ipcRenderer.invoke('open-file')
    if (res) {
        const newData = { ...editData, _manualPhoto: res }
        setEditData(newData)
        // We also need to update the student in DB to point to this new photo path
        await window.ipcRenderer.invoke('update-student-photo', currentStudent.id, res)
        toast.success('Photo updated')
    }
  }

  const updateAdjustment = (key: string, val: number) => {
    const adjustments = editData._adjustments || { zoom: 1, x: 0, y: 0 }
    const newAdjustments = { ...adjustments, [key]: val }
    setEditData({ ...editData, _adjustments: newAdjustments })
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-[100] animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/20">
              <User className="text-white" size={24} />
           </div>
           <div>
              <h2 className="text-white font-black text-lg uppercase tracking-tight leading-none">Individual Card Preview</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Batch ID: {batchId} • Total Records: {students.length}</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end mr-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Layout</label>
              <select
                className="bg-slate-800 text-white text-xs font-bold border-none rounded-lg focus:ring-2 focus:ring-blue-500 px-3 py-1.5"
                value={selectedLayoutId || ''}
                onChange={(e) => setSelectedLayoutId(Number(e.target.value))}
              >
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
           </div>
           <button
             onClick={onExit}
             className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-xl transition-all border border-red-500/20 active:scale-95"
           >
              <X size={24} />
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Info Panel */}
        <div className="w-96 border-r border-white/5 bg-slate-900/30 p-8 overflow-auto">
           {currentStudent ? (
             <div className="space-y-8">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-2xl">
                   <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Student Identity</div>
                   <h3 className="text-2xl font-black text-white leading-tight">{currentStudent.data.NAME || 'NO NAME'}</h3>
                   <p className="text-slate-400 font-mono text-sm mt-1">{currentStudent.admNo}</p>

                   <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                      {Object.entries(currentStudent.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-500 uppercase">{key}</span>
                           <span className="text-xs font-medium text-slate-300">{String(value)}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className={`rounded-2xl p-6 border flex items-center gap-4 ${currentStudent.photoPath ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                   {currentStudent.photoPath ? <Printer size={32} /> : <AlertCircle size={32} />}
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">Resource Status</div>
                      <div className="font-bold text-sm uppercase">{currentStudent.photoPath ? 'Photo Linked' : 'Missing Photo'}</div>
                   </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 text-blue-400">
                   <div className="flex items-center gap-2 mb-2">
                      <Info size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Projection Mode</span>
                   </div>
                   <p className="text-xs leading-relaxed font-medium">Use this view for details confirmation. All details shown here are exactly what will be printed.</p>
                </div>

                <button
                    onClick={() => {
                        setEditData({ ...currentStudent.data })
                        setIsEditing(true)
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                    <Edit size={20} /> Edit Record Details
                </button>
             </div>
           ) : (
             <div className="text-slate-500 italic text-center py-20">No record selected</div>
           )}
        </div>

        {/* Center Preview Panel */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
           {/* Backdrop Glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

           {previewUrl ? (
             <div className="relative group transition-all duration-700 hover:scale-[1.02] mb-20 md:mb-0">
                <img
                    src={previewUrl}
                    className="max-h-full shadow-[0_80px_150px_rgba(0,0,0,0.8)] border-[12px] border-white/5 rounded-3xl"
                    alt="Individual Card Preview"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
             </div>
           ) : (
             <div className="text-slate-600 font-black uppercase tracking-[0.2em] animate-pulse">Rendering...</div>
           )}

           {/* Navigation Overlay (Bottom) */}
           <div className="absolute bottom-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur-2xl px-6 py-4 rounded-[1.5rem] border border-white/10 shadow-2xl scale-90 sm:scale-100 flex-wrap justify-center max-w-[90%]">
              <div className="flex items-center gap-1">
                <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(0)}
                    className="p-3 hover:bg-white/10 rounded-full text-slate-400 disabled:opacity-20 transition-all"
                >
                    <ChevronsLeft size={24} />
                </button>
                <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="p-3 hover:bg-white/10 rounded-full text-white disabled:opacity-20 transition-all"
                >
                    <ChevronLeft size={32} />
                </button>
              </div>

              <div className="flex flex-col items-center min-w-[100px]">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Record</div>
                 <div className="text-xl font-black text-white leading-none">
                    {currentIndex + 1} <span className="text-slate-700 font-light">/</span> {students.length}
                 </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                    disabled={currentIndex >= students.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="p-3 hover:bg-white/10 rounded-full text-white disabled:opacity-20 transition-all"
                >
                    <ChevronRight size={32} />
                </button>
                <button
                    disabled={currentIndex >= students.length - 1}
                    onClick={() => setCurrentIndex(students.length - 1)}
                    className="p-3 hover:bg-white/10 rounded-full text-slate-400 disabled:opacity-20 transition-all"
                >
                    <ChevronsRight size={24} />
                </button>
              </div>

              <div className="h-10 w-px bg-white/10 mx-2" />

              <button
                onClick={() => {
                    if (!previewUrl) return
                    const link = document.createElement('a')
                    const safeBatchName = batchName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
                    link.download = `${safeBatchName}_${currentIndex + 1}.png`
                    link.href = previewUrl
                    link.click()
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-xl active:scale-95"
              >
                 <Download size={16} /> Download
              </button>
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-8">
              <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="bg-blue-600 p-2 rounded-xl">
                              <Edit className="text-white" size={20} />
                          </div>
                          <div>
                              <h3 className="text-white font-black uppercase tracking-tight">Edit Record Details</h3>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Adjust data and photo for this card</p>
                          </div>
                      </div>
                      <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white transition">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Textual Identity Data
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                            {Object.entries(editData).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                                <div key={key} className="space-y-1.5 group">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">{key}</label>
                                    <input
                                        type="text"
                                        value={String(value)}
                                        onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 outline-none transition-all"
                                    />
                                </div>
                            ))}
                          </div>
                      </div>

                      <div className="space-y-8">
                          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Photo Adjustment</div>

                          <div className="aspect-square bg-slate-800 rounded-3xl overflow-hidden border border-white/5 relative group">
                              {currentStudent.photoPath ? (
                                  <img
                                    src={((): string => {
                                        const photo = window.ipcRenderer.sendSync('read-photo-sync', currentStudent.photoPath)
                                        const ext = currentStudent.photoPath.split('.').pop()?.toLowerCase() || 'jpeg'
                                        const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
                                        return `data:${mime};base64,${photo}`
                                    })()}
                                    className="w-full h-full object-cover opacity-50"
                                  />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                                      <Camera size={48} />
                                  </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={changePhoto}
                                    className="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl"
                                  >
                                      Change Photo
                                  </button>
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Zoom Level</span>
                                  <div className="flex items-center gap-4">
                                      <button onClick={() => updateAdjustment('zoom', Math.max(0.1, (editData._adjustments?.zoom || 1) - 0.1))} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700"><Minus size={14}/></button>
                                      <span className="text-white font-mono text-xs w-12 text-center">{((editData._adjustments?.zoom || 1) * 100).toFixed(0)}%</span>
                                      <button onClick={() => updateAdjustment('zoom', (editData._adjustments?.zoom || 1) + 0.1)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700"><Plus size={14}/></button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Offset X</span>
                                      <input
                                        type="number"
                                        value={editData._adjustments?.x || 0}
                                        onChange={(e) => updateAdjustment('x', Number(e.target.value))}
                                        className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-white text-xs"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Offset Y</span>
                                      <input
                                        type="number"
                                        value={editData._adjustments?.y || 0}
                                        onChange={(e) => updateAdjustment('y', Number(e.target.value))}
                                        className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-white text-xs"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900 sticky bottom-0 flex flex-col sm:flex-row gap-4 z-20">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                      >
                          <Save size={18} /> Commit Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border border-white/10"
                      >
                          Discard
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}

export default PreviewIndividual
