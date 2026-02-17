import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import DesignCanvas from '../components/DesignCanvas'
import { useCanvasActions } from '../hooks/useCanvasActions'
import {
  Type, Image as ImageIcon, Tags, Trash2, Save, Square, Minimize2,
  MoveUp, MoveDown, UserSquare, Bold, Italic, FileUp, ZoomIn, ZoomOut,
  Maximize, Settings2, Download, Trash, X, MousePointer2, Grid3X3,
  Underline as UnderlineIcon, Pencil, Magnet, LayoutTemplate
} from 'lucide-react'
import { CR80_WIDTH_MM, CR80_HEIGHT_MM, CR80_WIDTH_PX, CR80_HEIGHT_PX } from '../utils/units'

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

      // Force standard dimensions in case the layout was saved with wrong ones
      canvas.setDimensions({ width: CR80_WIDTH_PX, height: CR80_HEIGHT_PX })

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
    toast('Scale is auto-optimized for your workspace')
  }

  const handleZoomOut = () => {
    toast('Scale is auto-optimized for your workspace')
  }

  const handleZoomFit = () => {
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
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      {/* Modern High-End Toolbar */}
      <div className="bg-white border-b px-8 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r">
             <LayoutTemplate className="text-blue-600" size={24} />
             <div>
                <h1 className="text-sm font-black uppercase tracking-tighter text-slate-800 leading-none">ID Designer</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">v1.0 Professional</p>
             </div>
          </div>

          <button
            onClick={handleNew}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 flex items-center gap-2 bg-white transition-all active:scale-95 shadow-sm"
            title="New Layout"
          >
            <FileUp size={18} className="rotate-180" /> <span className="text-[10px] font-black uppercase tracking-wider hidden lg:inline">New</span>
          </button>

          <div className="h-10 w-px bg-slate-200" />

          <div className="flex items-center bg-slate-50 rounded-2xl p-1.5 gap-1 border border-slate-200">
            <button onClick={() => addText()} className="px-4 py-2 hover:bg-white hover:shadow-md rounded-xl text-slate-700 flex items-center gap-2 transition-all group" title="Add Text">
              <Type size={18} className="group-hover:text-blue-600" /> <span className="text-[10px] font-black uppercase tracking-tight">Text</span>
            </button>
            <button onClick={() => addPlaceholder()} className="px-4 py-2 hover:bg-white hover:shadow-md rounded-xl text-blue-600 flex items-center gap-2 transition-all" title="Add Variable Field">
              <Tags size={18} /> <span className="text-[10px] font-black uppercase tracking-tight text-blue-700">Field</span>
            </button>
            <button onClick={() => addPhotoFrame()} className="px-4 py-2 hover:bg-white hover:shadow-md rounded-xl text-indigo-600 flex items-center gap-2 transition-all" title="Add Photo Slot">
              <UserSquare size={18} /> <span className="text-[10px] font-black uppercase tracking-tight text-indigo-700">Photo</span>
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={() => addRect()} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-700 transition-all" title="Rectangle">
              <Square size={20} />
            </button>
            <button onClick={() => addLine()} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-700 transition-all" title="Line">
              <Minimize2 size={20} className="rotate-45" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-700 transition-all" title="Upload Image">
              <ImageIcon size={20} />
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
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1 border border-slate-200">
             <button onClick={handleZoomOut} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all" title="Zoom Out"><ZoomOut size={16} /></button>
             <button onClick={handleZoomFit} className="px-3 py-1.5 hover:bg-white rounded-xl text-slate-700 text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-none hover:shadow-sm"><Maximize size={14} /> Center View</button>
             <button onClick={handleZoomIn} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all" title="Zoom In"><ZoomIn size={16} /></button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="font-bold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-blue-500 w-48 bg-slate-50 rounded-xl px-4 py-2 h-11 text-sm transition-all shadow-inner"
              placeholder="Layout Name..."
            />
            <button
              onClick={() => setShowTemplateManager(true)}
              className="p-3 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 bg-white transition-all shadow-sm active:scale-95"
              title="Template Library"
            >
              <Settings2 size={20} />
            </button>
          </div>

          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-3 font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition shadow-xl shadow-blue-200 active:scale-95">
            <Save size={20} /> Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex bg-slate-900">
        {/* Sidebar Left: Quick Actions */}
        <div className="w-16 bg-white border-r flex flex-col items-center py-6 gap-6 text-slate-400 z-20">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><MousePointer2 size={24} /></div>
           <button onClick={() => setShowGrid(!showGrid)} title="Toggle Grid" className={`p-3 hover:bg-slate-50 rounded-2xl transition-all ${showGrid ? 'text-blue-600 bg-blue-50 border border-blue-100 shadow-sm' : ''}`}><Grid3X3 size={24} /></button>
           <button onClick={() => setSnapToGrid(!snapToGrid)} title="Toggle Snap" className={`p-3 hover:bg-slate-50 rounded-2xl transition-all ${snapToGrid ? 'text-indigo-600 bg-indigo-50 border border-indigo-100 shadow-sm' : ''}`}><Magnet size={24} /></button>
           <div className="flex-1" />
           <button onClick={deleteSelected} className="p-3 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-2xl transition-all border border-transparent hover:border-red-100" title="Delete Selected">
            <Trash2 size={24} />
          </button>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="bg-slate-950/50 backdrop-blur-md px-8 py-3 text-[10px] font-black text-slate-500 flex justify-between uppercase tracking-[0.2em] border-b border-white/5 shadow-2xl z-10">
            <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-emerald-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div> Active Canvas</span>
                <span className="text-slate-800">/</span>
                <span className="text-slate-400 font-mono">PVC CR80 • {CR80_WIDTH_MM} x {CR80_HEIGHT_MM} MM</span>
            </div>
            <div className="flex gap-4">
                <span>Snap: <span className={snapToGrid ? 'text-blue-400' : 'text-slate-600'}>{snapToGrid ? 'Active' : 'Disabled'}</span></span>
                <span className="text-slate-800">|</span>
                <button onClick={handleDownloadSampleExcel} className="hover:text-white transition-colors flex items-center gap-2"><Download size={12}/> Sample Data</button>
            </div>
          </div>

          {/* THE CANVAS CONTAINER - Now truly centered and taking up full space */}
          <div className="flex-1 relative overflow-hidden">
            <DesignCanvas
              onCanvasReady={setCanvas}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
            />
          </div>
        </div>

        {/* Properties Panel - Sleek Dark Mode Interface */}
        <div className="w-80 bg-white border-l shadow-2xl z-20 flex flex-col">
          <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-[0.2em]">Properties</h3>
            {selectedObject && <span className="text-[10px] font-bold bg-slate-200 px-2 py-1 rounded-md text-slate-600 uppercase tracking-tighter">{selectedObject.type}</span>}
          </div>

          <div className="flex-1 overflow-auto p-8 space-y-8">
            {selectedObject ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                {selectedObject.text !== undefined && (
                  <>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Text Content</label>
                      <textarea
                        value={selectedObject.text}
                        onChange={(e) => updateSelected('text', e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl p-4 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-slate-50"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Typography</label>
                      <select
                        value={FONTS.includes(selectedObject.fontFamily) ? selectedObject.fontFamily : 'Custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'Custom') updateSelected('fontFamily', e.target.value)
                        }}
                        className="w-full border border-slate-200 rounded-2xl p-3 text-sm bg-white shadow-sm font-medium"
                      >
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="Custom">Custom / System Font...</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Size</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.fontSize || 0)}
                      onChange={(e) => updateSelected('fontSize', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Color</label>
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
                        className="w-full h-11 rounded-2xl cursor-pointer border-2 border-slate-100 p-1 bg-white shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Stroke</label>
                    <input
                      type="number"
                      value={selectedObject.strokeWidth || 0}
                      onChange={(e) => updateSelected('strokeWidth', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                </div>

                {selectedObject.text !== undefined && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateSelected('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl transition-all ${selectedObject.fontWeight === 'bold' ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Bold size={20} />
                    </button>
                    <button
                      onClick={() => updateSelected('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl transition-all ${selectedObject.fontStyle === 'italic' ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Italic size={20} />
                    </button>
                    <button
                      onClick={() => updateSelected('underline', !selectedObject.underline)}
                      className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl transition-all ${selectedObject.underline ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <UnderlineIcon size={20} />
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Layer Opacity</label>
                      <span className="text-xs font-black text-slate-800">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                   </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedObject.opacity ?? 1}
                    onChange={(e) => updateSelected('opacity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="pt-8 border-t space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Stacking Order</label>
                    <div className="flex gap-3">
                        <button
                        onClick={() => {
                            selectedObject._actual.bringToFront()
                            canvas.requestRenderAll()
                        }}
                        className="flex-1 flex items-center justify-center gap-3 p-3.5 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        >
                        <MoveUp size={16} /> Front
                        </button>
                        <button
                        onClick={() => {
                            selectedObject._actual.sendToBack()
                            canvas.requestRenderAll()
                        }}
                        className="flex-1 flex items-center justify-center gap-3 p-3.5 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        >
                        <MoveDown size={16} /> Back
                        </button>
                    </div>
                </div>

                {selectedObject.isPlaceholder && (
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] shadow-xl shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                        <Tags size={64} />
                    </div>
                    <p className="text-[11px] text-white font-bold leading-relaxed relative z-10">
                        This <span className="text-blue-200">Dynamic Field</span> will be replaced by Excel data using the <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-white border border-white/20">{'{{COLUMN}}'}</span> format.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-32 flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-200 shadow-inner">
                    <MousePointer2 size={40} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ready to Edit</p>
                <p className="text-[11px] text-slate-400 mt-2 max-w-[160px] mx-auto font-medium">Select any element on the canvas to adjust its properties.</p>
              </div>
            )}
          </div>

          <div className="p-8 border-t bg-slate-50/50">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workspace Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             </div>
             <div className="text-[10px] font-bold text-slate-600">300 DPI Rendering Engaged</div>
          </div>
        </div>
      </div>

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] w-full max-w-4xl flex flex-col overflow-hidden border border-white/20">
              <div className="px-12 py-10 border-b flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Template Library</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your production assets</p>
                 </div>
                 <button onClick={() => setShowTemplateManager(false)} className="p-4 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-800 hover:rotate-90">
                    <X size={32} />
                 </button>
              </div>

              <div className="flex-1 overflow-auto p-12 bg-white">
                 {savedLayouts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-8">
                       {savedLayouts.map(l => (
                          <div key={l.id} className="group border-2 border-slate-100 hover:border-blue-600 rounded-[2.5rem] p-8 transition-all hover:shadow-2xl hover:shadow-blue-100 flex flex-col justify-between bg-slate-50/30 hover:bg-white relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => handleDownloadLayout(l)} className="p-2.5 bg-white shadow-md border rounded-xl text-slate-600 hover:text-blue-600 transition-all" title="Export JSON"><Download size={20} /></button>
                                <button onClick={() => handleRenameLayout(l)} className="p-2.5 bg-white shadow-md border rounded-xl text-slate-600 hover:text-blue-600 transition-all" title="Rename"><Pencil size={20} /></button>
                                <button onClick={() => handleDeleteLayout(l.id)} className="p-2.5 bg-white shadow-md border rounded-xl text-red-400 hover:text-red-600 transition-all" title="Delete"><Trash size={20} /></button>
                             </div>

                             <div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all w-fit mb-6 border border-slate-100 group-hover:border-blue-500">
                                   <LayoutTemplate size={32} />
                                </div>
                                <h3 className="font-black text-slate-800 text-xl uppercase group-hover:text-blue-600 transition-colors">{l.name}</h3>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Standard PVC • CR80 Landscape</p>
                             </div>
                             <button
                                onClick={() => handleLoad(l)}
                                className="mt-10 w-full py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-blue-200"
                             >
                                Load Project
                             </button>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                       <LayoutTemplate size={64} className="mx-auto text-slate-200 mb-6" />
                       <h3 className="font-black text-slate-400 uppercase tracking-[0.2em]">No templates available</h3>
                       <p className="text-sm text-slate-400 mt-4 max-w-xs mx-auto font-medium">Create and save your first professional ID layout to see it here.</p>
                    </div>
                 )}
              </div>

              <div className="px-12 py-10 border-t bg-slate-50/50 flex justify-end gap-4">
                 <button
                    onClick={() => setShowTemplateManager(false)}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition shadow-2xl shadow-slate-300"
                 >
                    Return to Designer
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default Design
