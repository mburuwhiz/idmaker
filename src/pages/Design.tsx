import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import DesignCanvas from '../components/DesignCanvas'
import { useCanvasActions } from '../hooks/useCanvasActions'
import {
  Type, Image as ImageIcon, Tags, Trash2, Save, Square, Minimize2,
  MoveUp, MoveDown, UserSquare, Bold, Italic, FileUp, ZoomIn, ZoomOut,
  Maximize, Settings2, Download, Trash, X, MousePointer2, Grid3X3,
  Underline as UnderlineIcon, Pencil, Magnet
} from 'lucide-react'
import { CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../utils/units'

const FONTS = [
  'Arial', 'Arial Black', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
  'Times New Roman', 'Didot', 'Georgia', 'American Typewriter',
  'Courier', 'Courier New', 'Monaco', 'Comic Sans MS',
  'Helvetica', 'Segoe UI', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'
]

const Design: React.FC = () => {
  const [canvas, setCanvas] = useState<any>(null)
  const { addText, addPlaceholder, addPhotoFrame, addRect, addLine, addImage, deleteSelected } = useCanvasActions(canvas)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [layoutName, setLayoutName] = useState('New Layout')
  const [savedLayouts, setSavedLayouts] = useState<any[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  useEffect(() => {
    loadLayouts()
  }, [])

  const loadLayouts = async () => {
    try {
      const data = await window.ipcRenderer.invoke('get-layouts')
      setSavedLayouts(data)
    } catch (e) {
      console.error('Failed to load layouts:', e)
    }
  }

  const handleLoad = async (layout: any) => {
    if (!canvas) return
    const loadToast = toast.loading('Loading layout...')
    try {
      await canvas.loadFromJSON(layout.content)

      // Re-add guides after loading JSON as loadFromJSON clears everything
      if (canvas.ensureGuides) {
        canvas.ensureGuides()
      }

      setLayoutName(layout.name)
      setShowTemplateManager(false)
      toast.success('Layout loaded!', { id: loadToast })
      // Auto zoom to fit after load
      setTimeout(handleZoomFit, 100)
    } catch (_e) {
      toast.error('Failed to load layout', { id: loadToast })
    }
  }

  const handleNew = () => {
    if (!canvas) return
    if (confirm('Create new layout? Current unsaved changes will be lost.')) {
      const objects = canvas.getObjects()
      objects.forEach((obj: any) => {
        if (!obj.isGuide) canvas.remove(obj)
      })
      canvas.backgroundColor = '#ffffff'
      if (canvas.ensureGuides) canvas.ensureGuides()

      setLayoutName('New Layout')
      canvas.renderAll()
      toast.success('New layout started')
      handleZoomFit()
    }
  }

  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const obj = canvas.getActiveObject()
      if (obj) {
        setSelectedObject({
            ...obj.toObject([
                'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
                'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
                'stroke', 'fill', 'strokeWidth'
            ]),
            type: obj.type, // Explicitly include type
            _actual: obj
        })
      } else {
        setSelectedObject(null)
      }
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => setSelectedObject(null))

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared')
    }
  }, [canvas])

  const handleSave = async () => {
    if (!canvas) {
      toast.error('Canvas not initialized');
      return;
    }
    const loadToast = toast.loading('Saving layout...');
    try {
      const content = JSON.stringify(canvas.toJSON([
        'isPlaceholder',
        'isPhotoPlaceholder',
        'isPhotoFrame',
        'isPhotoText',
        'fontWeight',
        'fontStyle',
        'fontFamily',
        'rx', 'ry', 'selectable', 'underline'
      ]));
      await window.ipcRenderer.invoke('save-layout', layoutName, content);
      loadLayouts();
      toast.success('Layout saved successfully!', { id: loadToast });
    } catch (e) {
      console.error('Save failed:', e);
      toast.error('Failed to save layout', { id: loadToast });
    }
  }

  const updateSelected = (prop: string | Record<string, any>, value?: any) => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    if (typeof prop === 'string') {
      activeObject.set(prop as any, value)
    } else {
      activeObject.set(prop)
    }
    canvas.requestRenderAll()

    setSelectedObject({
      ...activeObject.toObject([
        'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
        'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
        'stroke', 'fill', 'strokeWidth'
      ]),
      type: activeObject.type, // Explicitly include type
      _actual: activeObject
    })
  }

  const handleZoomIn = () => {
    // Zoom is handled automatically by CSS scale in DesignCanvas
    toast('Zoom is automatically optimized for your screen')
  }

  const handleZoomOut = () => {
    // Zoom is handled automatically by CSS scale in DesignCanvas
    toast('Zoom is automatically optimized for your screen')
  }

  const handleZoomFit = () => {
    // Already handled by DesignCanvas scale logic
    if (canvas && canvas.requestRenderAll) {
        canvas.requestRenderAll()
    }
  }

  const handleDeleteLayout = async (id: number) => {
    if (confirm('Are you sure you want to delete this layout?')) {
      try {
        await window.ipcRenderer.invoke('delete-layout', id)
        toast.success('Layout deleted')
        loadLayouts()
      } catch (e) {
        toast.error('Failed to delete layout')
      }
    }
  }

  const handleDownloadLayout = (layout: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(layout.content);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", layout.name + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Layout exported as JSON');
  }

  const handleRenameLayout = async (layout: any) => {
    const newName = prompt('Enter new name for layout:', layout.name)
    if (newName && newName !== layout.name) {
      try {
        await window.ipcRenderer.invoke('save-layout', newName, layout.content)
        // If we want to really rename (delete old one), we should do it
        await window.ipcRenderer.invoke('delete-layout', layout.id)
        toast.success('Layout renamed')
        loadLayouts()
      } catch (e) {
        toast.error('Failed to rename layout')
      }
    }
  }

  const handleDownloadSampleExcel = () => {
    if (!canvas) return
    const objects = canvas.getObjects()
    const placeholders = objects
      .filter((obj: any) => (obj as any).isPlaceholder)
      .map((obj: any) => {
        const match = (obj.text || '').match(/\{\{(.+)\}\}/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (placeholders.length === 0) {
      toast.error('No placeholders found in current layout')
      return
    }

    // Add ADM_NO as it's required for matching photos
    const headers = [...new Set(['ADM_NO', ...placeholders])]

    const csvContent = headers.join(',') + '\n' + headers.map(() => 'sample_data').join(',')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${layoutName.replace(/\s+/g, '_')}_sample.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Sample CSV downloaded!')
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Modern Toolbar */}
      <div className="bg-white border-b px-6 py-2.5 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNew}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 flex items-center gap-2 bg-white transition-all active:scale-95 shadow-sm"
            title="New Layout"
          >
            <FileUp size={16} className="rotate-180" /> <span className="text-[10px] font-black uppercase tracking-wider">New</span>
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200/50">
            <button onClick={() => addText()} className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-700 flex items-center gap-2 transition-all group" title="Add Text">
              <Type size={18} className="group-hover:text-blue-600" /> <span className="text-[10px] font-black uppercase tracking-tight">Text</span>
            </button>
            <button onClick={() => addPlaceholder()} className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-blue-600 flex items-center gap-2 transition-all" title="Add Variable Field">
              <Tags size={18} /> <span className="text-[10px] font-black uppercase tracking-tight text-blue-700">Field</span>
            </button>
            <button onClick={() => addPhotoFrame()} className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg text-indigo-600 flex items-center gap-2 transition-all" title="Add Photo Slot">
              <UserSquare size={18} /> <span className="text-[10px] font-black uppercase tracking-tight text-indigo-700">Photo</span>
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1" />
            <button onClick={() => addRect()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-700 transition-all" title="Rectangle">
              <Square size={18} />
            </button>
            <button onClick={() => addLine()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-700 transition-all" title="Line">
              <Minimize2 size={18} className="rotate-45" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-700 transition-all" title="Upload Image">
              <ImageIcon size={18} />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (f) => {
                      if (f.target?.result) addImage(f.target.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <button onClick={() => deleteSelected()} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete Selected Object">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200/50">
             <button onClick={handleZoomOut} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all" title="Zoom Out"><ZoomOut size={16} /></button>
             <button onClick={handleZoomFit} className="px-2 py-1.5 hover:bg-white rounded-lg text-slate-600 text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-none hover:shadow-sm"><Maximize size={14} /> Fit</button>
             <button onClick={handleZoomIn} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all" title="Zoom In"><ZoomIn size={16} /></button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="font-bold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-blue-500 w-40 bg-white rounded-lg px-3 py-1.5 h-9 text-sm transition-all shadow-sm"
              placeholder="Layout Name..."
            />
            <button
              onClick={() => setShowTemplateManager(true)}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 bg-white transition-all shadow-sm active:scale-95"
              title="Template Library"
            >
              <Settings2 size={18} />
            </button>
          </div>

          <button
             onClick={handleDownloadSampleExcel}
             className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 bg-white hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase"
             title="Download Sample Excel for this layout"
          >
             <Download size={16} /> Sample Data
          </button>

          <button onClick={handleSave} className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-black uppercase tracking-wider text-[11px] hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95">
            <Save size={18} /> Save Layout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex">
        {/* Sidebar Left: Layers/Pages (Placeholder) */}
        <div className="w-12 bg-white border-r flex flex-col items-center py-4 gap-4 text-slate-400">
           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MousePointer2 size={20} /></div>
           <button onClick={() => setShowGrid(!showGrid)} title="Toggle Grid" className={`p-2 hover:bg-slate-50 rounded-lg transition-colors ${showGrid ? 'text-blue-600 bg-blue-50 border border-blue-100 shadow-sm' : ''}`}><Grid3X3 size={20} /></button>
           <button onClick={() => setSnapToGrid(!snapToGrid)} title="Toggle Snap" className={`p-2 hover:bg-slate-50 rounded-lg transition-colors ${snapToGrid ? 'text-indigo-600 bg-indigo-50 border border-indigo-100 shadow-sm' : ''}`}><Magnet size={20} /></button>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 bg-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-6 py-2.5 text-[10px] font-black text-slate-500 flex justify-between uppercase tracking-[0.2em] border-b border-slate-800 shadow-lg z-10">
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> CR80 Standard Layout</span>
                <span className="text-slate-700">|</span>
                <span>{CR80_WIDTH_MM} x {CR80_HEIGHT_MM} MM (300 DPI)</span>
            </div>
            <span>Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-12 bg-slate-950">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

            <DesignCanvas
              onCanvasReady={setCanvas}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
            />
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l shadow-2xl z-10 flex flex-col">
          <div className="p-6 border-b bg-slate-50/50">
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Properties</h3>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {selectedObject ? (
              <div className="space-y-6">
                {selectedObject.text !== undefined && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Text Content</label>
                      <textarea
                        value={selectedObject.text}
                        onChange={(e) => updateSelected('text', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Font Family</label>
                      <select
                        value={FONTS.includes(selectedObject.fontFamily) ? selectedObject.fontFamily : 'Custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'Custom') updateSelected('fontFamily', e.target.value)
                        }}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white shadow-sm"
                      >
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="Custom">Custom / System Font...</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Font Size</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.fontSize || 0)}
                      onChange={(e) => updateSelected('fontSize', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          (selectedObject.type === 'line' || selectedObject.type === 'polyline')
                            ? (selectedObject.stroke || '#000000')
                            : (selectedObject.fill || '#000000')
                        }
                        onChange={(e) => {
                          const color = e.target.value
                          if (selectedObject.type === 'line' || selectedObject.type === 'polyline') {
                            updateSelected('stroke', color)
                          } else if (selectedObject.type === 'rect') {
                            updateSelected({ fill: color, stroke: color })
                          } else {
                            updateSelected('fill', color)
                          }
                        }}
                        className="w-full h-10 rounded-xl cursor-pointer border-2 border-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Stroke Width</label>
                    <input
                      type="number"
                      value={selectedObject.strokeWidth || 0}
                      onChange={(e) => updateSelected('strokeWidth', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {selectedObject.text !== undefined && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSelected('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl transition-all ${selectedObject.fontWeight === 'bold' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Bold size={18} />
                    </button>
                    <button
                      onClick={() => updateSelected('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl transition-all ${selectedObject.fontStyle === 'italic' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Italic size={18} />
                    </button>
                    <button
                      onClick={() => updateSelected('underline', !selectedObject.underline)}
                      className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl transition-all ${selectedObject.underline ? 'bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <UnderlineIcon size={18} />
                    </button>
                  </div>
                )}

                <div>
                   <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Opacity</label>
                      <span className="text-xs font-bold text-slate-600">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                   </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedObject.opacity ?? 1}
                    onChange={(e) => updateSelected('opacity', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="pt-4 border-t flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Stacking Order</label>
                    <div className="flex gap-2">
                        <button
                        onClick={() => {
                            selectedObject._actual.bringToFront()
                            canvas.requestRenderAll()
                        }}
                        className="flex-1 flex items-center justify-center gap-2 p-2.5 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                        <MoveUp size={14} /> Front
                        </button>
                        <button
                        onClick={() => {
                            selectedObject._actual.sendToBack()
                            canvas.requestRenderAll()
                        }}
                        className="flex-1 flex items-center justify-center gap-2 p-2.5 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                        <MoveDown size={14} /> Back
                        </button>
                    </div>
                </div>

                {selectedObject.isPlaceholder && (
                  <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100">
                    <p className="text-[11px] text-white font-medium leading-relaxed">
                        This is a <span className="font-black">Dynamic Field</span>. Content will be replaced by Excel data using the <span className="font-mono bg-blue-700 px-1 rounded">{'{{COLUMN}}'}</span> format.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="mb-4 flex justify-center text-slate-200">
                    <div className="relative">
                        <ImageIcon size={64} strokeWidth={1} />
                        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg text-blue-500">
                            <MousePointer2 size={24} />
                        </div>
                    </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Select an object</p>
                <p className="text-[11px] text-slate-400 mt-1">To view and edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-8">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Template Library</h2>
                    <p className="text-xs font-medium text-slate-400">Manage and load your saved production layouts</p>
                 </div>
                 <button onClick={() => setShowTemplateManager(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-auto p-8 bg-white">
                 {savedLayouts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                       {savedLayouts.map(l => (
                          <div key={l.id} className="group border-2 border-slate-100 hover:border-blue-500 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100 flex flex-col justify-between bg-slate-50/30 hover:bg-white">
                             <div>
                                <div className="flex justify-between items-start mb-4">
                                   <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <Maximize size={24} />
                                   </div>
                                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleDownloadLayout(l)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Export JSON"><Download size={18} /></button>
                                      <button onClick={() => handleRenameLayout(l)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Rename"><Pencil size={18} /></button>
                                      <button onClick={() => handleDeleteLayout(l.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete"><Trash size={18} /></button>
                                   </div>
                                </div>
                                <h3 className="font-black text-slate-800 text-lg uppercase group-hover:text-blue-600 transition-colors">{l.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID CARD TEMPLATE • CR80</p>
                             </div>
                             <button
                                onClick={() => handleLoad(l)}
                                className="mt-8 w-full py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200"
                             >
                                Load Template
                             </button>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200">
                       <Maximize size={48} className="mx-auto text-slate-300 mb-4" />
                       <h3 className="font-black text-slate-400 uppercase tracking-widest">No templates found</h3>
                       <p className="text-sm text-slate-400 mt-2">Start by creating and saving a new layout in the designer.</p>
                    </div>
                 )}
              </div>

              <div className="px-8 py-6 border-t bg-slate-50/50 flex justify-end gap-3">
                 <button
                    onClick={() => setShowTemplateManager(false)}
                    className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition shadow-lg shadow-slate-200"
                 >
                    Close Library
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default Design
