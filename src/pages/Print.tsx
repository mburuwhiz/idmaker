import React, { useState, useEffect } from 'react'
import { Printer, ChevronLeft, ChevronRight, FileText, Settings } from 'lucide-react'
import { renderA4Sheet, exportToPdf } from '../utils/printService'
import { generateExceptionReport } from '../utils/dataService'

const Print: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [layouts, setLayouts] = useState<any[]>([])

  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null)

  const [students, setStudents] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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
  }, [currentIndex, students, selectedProfileId, selectedLayoutId])

  const updatePreview = async () => {
    if (students.length === 0 || !selectedProfileId || !selectedLayoutId) return

    const student1 = students[currentIndex * 2]
    const student2 = students[currentIndex * 2 + 1]
    const profile = profiles.find(p => p.id === selectedProfileId)
    const layout = layouts.find(l => l.id === selectedLayoutId)

    if (!student1 || !profile || !layout) return

    const sheet = await renderA4Sheet(student1.data, student2?.data, layout.content, profile)
    setPreviewUrl(sheet.toDataURL())
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

    const failedStudents: any[] = []
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

        // Track failures (e.g. missing photo)
        if (!s1.photoPath) {
          failedStudents.push({ ...s1, exceptionReason: 'Missing Photo' })
        }
        if (s2 && !s2.photoPath) {
          failedStudents.push({ ...s2, exceptionReason: 'Missing Photo' })
        }

        const sheet = await renderA4Sheet(s1.data, s2?.data, layout.content, profile)
        sheets.push(sheet)
      }

      const batch = batches.find(b => b.id === selectedBatchId)
      await exportToPdf(sheets, batch?.name || 'Batch Export')

      if (failedStudents.length > 0) {
        if (confirm(`Batch exported. ${failedStudents.length} cards had issues. Generate Exception Report?`)) {
          generateExceptionReport(failedStudents)
        }
      }
    } catch (e) {
      console.error(e)
      alert('Error generating PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Print Queue</h1>

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
        <div className="flex-1 bg-gray-100 rounded-xl border flex items-center justify-center overflow-auto p-8">
          {previewUrl ? (
            <img src={previewUrl} className="max-h-full shadow-2xl bg-white" alt="Tray Preview" />
          ) : (
            <div className="text-gray-400 italic">Select a batch to see preview</div>
          )}
        </div>

        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> Controls</h3>

            <div className="flex items-center justify-between mb-6">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase">Pair</div>
                <div className="font-bold">{currentIndex + 1} / {Math.ceil(students.length / 2) || 0}</div>
              </div>
              <button
                disabled={currentIndex >= Math.ceil(students.length / 2) - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight />
              </button>
            </div>

            <button
              onClick={() => {}}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition mb-3"
            >
              <Printer size={20} /> Print Current Pair
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
             <h3 className="font-bold mb-4">Students in this pair</h3>
             {students[currentIndex * 2] && (
               <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
                  <div className="text-xs text-blue-600 font-bold">SLOT 1</div>
                  <div className="font-medium text-slate-800">{students[currentIndex * 2].data.NAME}</div>
                  <div className="text-xs text-slate-500">{students[currentIndex * 2].admNo}</div>
               </div>
             )}
             {students[currentIndex * 2 + 1] && (
               <div className="p-3 bg-red-50 rounded border border-red-100">
                  <div className="text-xs text-red-600 font-bold">SLOT 2</div>
                  <div className="font-medium text-slate-800">{students[currentIndex * 2 + 1].data.NAME}</div>
                  <div className="text-xs text-slate-500">{students[currentIndex * 2 + 1].admNo}</div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Print
