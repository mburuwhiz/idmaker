import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import DesignCanvas from '../components/DesignCanvas'
import Modal from '../components/Modal'
import { useCanvasActions } from '../hooks/useCanvasActions'
import {
  Type, Image as ImageIcon, Tags, Trash2, Save, Square, Minimize2,
  MoveUp, MoveDown, UserSquare, Bold, Italic, FileUp,
  Maximize, Settings2, Download, Trash, X, MousePointer2, Grid3X3,
  Underline as UnderlineIcon, Pencil, Magnet, LayoutTemplate, Undo2, Redo2, Copy,
  Search, Calendar, FileJson, Table, Grid
} from 'lucide-react'
import { CR80_WIDTH_MM, CR80_HEIGHT_MM, CR80_WIDTH_PX, CR80_HEIGHT_PX } from '../utils/units'

const DEFAULT_FONTS = [
  'Clarendon BT', 'Clarendon Lt BT', 'Clarendon',
  'Arial', 'Arial Black', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
  'Times New Roman', 'Didot', 'Georgia', 'American Typewriter',
  'Courier', 'Courier New', 'Monaco', 'Comic Sans MS',
  'Helvetica', 'Segoe UI', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'
]

const Design: React.FC = () => {
  const [canvas, setCanvas] = useState<any>(null)
  const { addText, addPlaceholder, addPhotoFrame, addRect, addLine, addImage, deleteSelected, duplicateSelected } = useCanvasActions(canvas)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isRedoing = useRef(false)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [layoutName, setLayoutName] = useState('New Layout')
  const [savedLayouts, setSavedLayouts] = useState<any[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [availableFonts, setAvailableFonts] = useState<string[]>(DEFAULT_FONTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Modals
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'default' | 'danger' }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  })
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean, title: string, value: string, onConfirm: (val: string) => void }>({
    isOpen: false, title: '', value: '', onConfirm: () => {}
  })

  const clipboard = useRef<any>(null)

  useEffect(() => {
    loadLayouts()

    // Load system fonts safely
    if (window.ipcRenderer) {
        window.ipcRenderer.invoke('get-system-fonts').then((fonts: any) => {
            if (Array.isArray(fonts)) {
                // Clean font names (remove quotes if present)
                const cleanFonts = fonts.map(f => f.replace(/['"]+/g, ''))
                // Ensure priority fonts are at the top
                const priorityFonts = ['Clarendon BT', 'Clarendon Lt BT', 'Clarendon']
                const otherFonts = Array.from(new Set([...DEFAULT_FONTS, ...cleanFonts]))
                    .filter(f => !priorityFonts.includes(f))
                    .sort()

                setAvailableFonts([...priorityFonts, ...otherFonts])
            }
        }).catch(console.error)
    }
  }, [])

  const saveToHistory = (c: any) => {
    if (!c || isRedoing.current) return
    const json = JSON.stringify(c.toJSON([
      'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
      'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'selectable', 'underline'
    ]))

    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(json)
        // Keep last 50 states
        if (newHistory.length > 50) newHistory.shift()
        return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }

  const restoreWorkspace = (c: any) => {
    if (!c) return;
    const WORKSPACE_SIZE = 3000;
    c.setDimensions({ width: WORKSPACE_SIZE, height: WORKSPACE_SIZE });
    const offsetX = (WORKSPACE_SIZE - CR80_WIDTH_PX) / 2;
    const offsetY = (WORKSPACE_SIZE - CR80_HEIGHT_PX) / 2;
    c.setViewportTransform([1, 0, 0, 1, offsetX, offsetY]);
    if (c.ensureGuides) c.ensureGuides();
    c.renderAll();
  }

  const undo = async () => {
    if (historyIndex > 0 && canvas) {
      isRedoing.current = true
      const prevState = history[historyIndex - 1]
      await canvas.loadFromJSON(prevState)
      restoreWorkspace(canvas)
      setHistoryIndex(historyIndex - 1)
      isRedoing.current = false
    }
  }

  const redo = async () => {
    if (historyIndex < history.length - 1 && canvas) {
      isRedoing.current = true
      const nextState = history[historyIndex + 1]
      await canvas.loadFromJSON(nextState)
      restoreWorkspace(canvas)
      setHistoryIndex(historyIndex + 1)
      isRedoing.current = false
    }
  }

  // Layout Persistence: Save draft to localStorage
  const saveDraft = (c: any) => {
    if (!c) return
    const content = JSON.stringify(c.toJSON([
      'isPlaceholder',
      'isPhotoPlaceholder',
      'isPhotoFrame',
      'isPhotoText',
      'fontWeight',
      'fontStyle',
      'fontFamily',
      'rx', 'ry', 'selectable', 'underline'
    ]));
    localStorage.setItem('whizpoint_design_draft', content)
    localStorage.setItem('whizpoint_design_name', layoutName)
  }

  useEffect(() => {
    if (!canvas) return

    const handleCanvasChange = () => {
      saveDraft(canvas)
      saveToHistory(canvas)
    }

    canvas.on('object:modified', handleCanvasChange)
    canvas.on('object:added', handleCanvasChange)
    canvas.on('object:removed', handleCanvasChange)
    canvas.on('path:created', handleCanvasChange)
    canvas.on('object:scaling', handleCanvasChange)
    canvas.on('object:rotating', handleCanvasChange)
    canvas.on('object:skewing', handleCanvasChange)

    return () => {
      canvas.off('object:modified', handleCanvasChange)
      canvas.off('object:added', handleCanvasChange)
      canvas.off('object:removed', handleCanvasChange)
      canvas.off('path:created', handleCanvasChange)
      canvas.off('object:scaling', handleCanvasChange)
      canvas.off('object:rotating', handleCanvasChange)
      canvas.off('object:skewing', handleCanvasChange)
    }
  }, [canvas, layoutName])

  // Load draft on mount
  useEffect(() => {
    if (!canvas) return

    const draft = localStorage.getItem('whizpoint_design_draft')
    // Initialize history with empty state if no draft
    if (!draft && history.length === 0) {
        saveToHistory(canvas)
    }
    const savedName = localStorage.getItem('whizpoint_design_name')

    if (draft && canvas.getObjects().filter((obj: any) => !obj.isGuide).length === 0) {
      canvas.loadFromJSON(draft).then(() => {
          restoreWorkspace(canvas)
          if (savedName) setLayoutName(savedName)
          setTimeout(handleZoomFit, 100)
      })
    }
  }, [canvas])

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
      // Explicitly clear before loading
      canvas.clear()
      await canvas.loadFromJSON(layout.content)
      restoreWorkspace(canvas)

      setLayoutName(layout.name)
      setShowTemplateManager(false)
      // Save as draft immediately when loaded
      saveDraft(canvas)
      toast.success('Layout loaded!', { id: loadToast })
      // Auto zoom to fit after load
      setTimeout(handleZoomFit, 100)
    } catch (_e) {
      toast.error('Failed to load layout', { id: loadToast })
    }
  }

  const performNewLayout = () => {
    if (!canvas) return
    const objects = canvas.getObjects()
    objects.forEach((obj: any) => {
        if (!obj.isGuide) canvas.remove(obj)
    })

    if (canvas.ensureGuides) canvas.ensureGuides()

    setLayoutName('New Layout')
    canvas.renderAll()
    localStorage.removeItem('whizpoint_design_draft')
    localStorage.removeItem('whizpoint_design_name')
    toast.success('New layout started')
    handleZoomFit()
    setConfirmModal(prev => ({ ...prev, isOpen: false }))
  }

  const handleNew = () => {
    setConfirmModal({
        isOpen: true,
        title: 'Create New Layout?',
        message: 'Current unsaved changes will be lost. Are you sure you want to start over?',
        onConfirm: performNewLayout,
        variant: 'danger'
    })
  }

  useEffect(() => {
    if (!canvas) return

    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault()
            undo()
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault()
            redo()
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault()
            duplicateSelected()
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const activeObject = canvas.getActiveObject()
            if (activeObject) {
              activeObject.clone([
                'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
                'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
                'stroke', 'fill', 'strokeWidth'
              ]).then((cloned: any) => {
                clipboard.current = cloned
              })
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            if (clipboard.current) {
                clipboard.current.clone([
                    'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
                    'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
                    'stroke', 'fill', 'strokeWidth'
                ]).then((clonedObj: any) => {
                    canvas.discardActiveObject()
                    clonedObj.set({
                        left: clonedObj.left + 20,
                        top: clonedObj.top + 20,
                        evented: true,
                    })
                    if (clonedObj.type === 'activeSelection') {
                        clonedObj.canvas = canvas
                        clonedObj.forEachObject((obj: any) => {
                            canvas.add(obj)
                        })
                        clonedObj.setCoords()
                    } else {
                        canvas.add(clonedObj)
                    }
                    clipboard.current.top += 20
                    clipboard.current.left += 20
                    canvas.setActiveObject(clonedObj)
                    canvas.requestRenderAll()
                })
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            // Only delete if not in an input/textarea
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                deleteSelected()
            }
        }
    }

    window.addEventListener('keydown', handleKeyDown)

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
      window.removeEventListener('keydown', handleKeyDown)
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared')
    }
  }, [canvas, historyIndex, history])

  const handleSave = async () => {
    if (!canvas) {
      toast.error('Canvas not initialized');
      return;
    }

    const originalDim = { width: canvas.width, height: canvas.height };
    const originalVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

    // Force standard dimensions and reset viewport before saving
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width: CR80_WIDTH_PX, height: CR80_HEIGHT_PX });

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
    } finally {
      canvas.setDimensions(originalDim);
      canvas.setViewportTransform(originalVpt);
      canvas.renderAll();
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
    saveDraft(canvas)

    setSelectedObject({
      ...activeObject.toObject([
        'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
        'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
        'stroke', 'fill', 'strokeWidth'
      ]),
      type: activeObject.type,
      _actual: activeObject
    })
  }

  const handleZoomFit = () => {
    if (canvas) {
        restoreWorkspace(canvas)
        canvas.requestRenderAll()
    }
  }

  const performDeleteLayout = async (id: number) => {
    try {
        await window.ipcRenderer.invoke('delete-layout', id)
        toast.success('Layout deleted')
        loadLayouts()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
    } catch (e) {
        toast.error('Failed to delete layout')
    }
  }

  const handleDeleteLayout = (id: number) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Layout?',
        message: 'This action cannot be undone. Are you sure you want to proceed?',
        onConfirm: () => performDeleteLayout(id),
        variant: 'danger'
    })
  }

  const handleExportWid = async (layout: any) => {
    try {
      const result = await window.ipcRenderer.invoke('export-layout-wid', layout.id)
      if (result) toast.success('Design package exported!')
    } catch (e) {
      toast.error('Failed to export package')
    }
  }

  const handleImportWid = async () => {
    try {
      const result = await window.ipcRenderer.invoke('import-layout-wid')
      if (result) {
        toast.success(`Imported: ${result.name}`)
        loadLayouts()
      }
    } catch (e) {
      toast.error('Failed to import package: ' + (e as Error).message)
    }
  }

  const performRenameLayout = async (layout: any, newName: string) => {
    if (newName && newName !== layout.name) {
      try {
        await window.ipcRenderer.invoke('save-layout', newName, layout.content)
        await window.ipcRenderer.invoke('delete-layout', layout.id)
        toast.success('Layout renamed')
        loadLayouts()
        setPromptModal(prev => ({ ...prev, isOpen: false }))
      } catch (e) {
        toast.error('Failed to rename layout')
      }
    }
  }

  const handleRenameLayout = (layout: any) => {
    setPromptModal({
        isOpen: true,
        title: 'Rename Layout',
        value: layout.name,
        onConfirm: (newName) => performRenameLayout(layout, newName)
    })
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

  const filteredLayouts = savedLayouts.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      {/* Modern Compact Toolbar */}
      <div className="bg-white border-b px-2 md:px-4 py-1.5 flex items-center justify-between shadow-sm z-30 flex-wrap gap-y-1.5">
        <div className="flex items-center gap-1.5 md:gap-3 flex-wrap">
          <div className="flex items-center gap-2 pr-2 border-r hidden sm:flex">
             <LayoutTemplate className="text-blue-600" size={18} />
             <div>
                <h1 className="text-[10px] font-black uppercase tracking-tighter text-slate-800 leading-none">ID Designer</h1>
                <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Professional</p>
             </div>
          </div>

          {/* History Group */}
          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
             <button onClick={handleNew} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all active:scale-95" title="New Layout"><FileUp size={14} className="rotate-180" /></button>
             <div className="w-px h-3 bg-slate-200 mx-0.5" />
             <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 disabled:opacity-30 transition-all" title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
             <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 disabled:opacity-30 transition-all" title="Redo (Ctrl+Y)"><Redo2 size={14} /></button>
             <button onClick={duplicateSelected} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all" title="Duplicate (Ctrl+D)"><Copy size={14} /></button>
          </div>

          {/* Element Creation Group */}
          <div className="flex items-center bg-slate-50 rounded-lg p-0.5 gap-0.5 border border-slate-200">
            <button onClick={() => addText()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-700 flex items-center gap-1 transition-all group" title="Add Text">
              <Type size={14} className="group-hover:text-blue-600" /> <span className="text-[8px] font-black uppercase hidden lg:inline">Text</span>
            </button>
            <button onClick={() => addPlaceholder()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-blue-600 flex items-center gap-1 transition-all" title="Add Variable Field">
              <Tags size={14} /> <span className="text-[8px] font-black uppercase hidden lg:inline">Field</span>
            </button>
            <button onClick={() => addPhotoFrame()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-indigo-600 flex items-center gap-1 transition-all" title="Add Photo Slot">
              <UserSquare size={14} /> <span className="text-[8px] font-black uppercase hidden lg:inline">Photo</span>
            </button>
            <div className="w-px h-3 bg-slate-200 mx-0.5" />
            <button onClick={() => addRect()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-700 transition-all" title="Rectangle"><Square size={14} /></button>
            <button onClick={() => addLine()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-700 transition-all" title="Line"><Minimize2 size={14} className="rotate-45" /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-700 transition-all" title="Upload Image">
              <ImageIcon size={14} />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (f) => { if (f.target?.result) addImage(f.target.result as string) }; reader.readAsDataURL(file) }
              }} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Info - Compact */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
             <button onClick={handleZoomFit} className="px-2 py-1 hover:bg-white rounded-md text-slate-700 text-[8px] font-black uppercase transition-all flex items-center gap-1 shadow-none hover:shadow-sm"><Maximize size={10} /> Reset View</button>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="font-bold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-blue-500 w-24 md:w-32 bg-slate-50 rounded-lg px-2 py-1 h-7 text-[10px] transition-all"
              placeholder="Name..."
            />
            <button
              onClick={() => setShowTemplateManager(true)}
              className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 bg-white transition-all shadow-sm"
              title="Templates Library"
            >
              <Settings2 size={14} />
            </button>
          </div>

          <button onClick={handleSave} className="bg-blue-600 text-white px-3 md:px-4 py-1.5 rounded-lg flex items-center gap-2 font-black uppercase tracking-wider text-[9px] hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95">
            <Save size={14} className="hidden xs:block" /> Save
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

          {/* THE CANVAS CONTAINER */}
          <div className="flex-1 relative overflow-hidden">
            <DesignCanvas
              onCanvasReady={setCanvas}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
            />
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-72 bg-white border-l shadow-2xl z-20 flex flex-col">
          <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em]">Properties</h3>
            {selectedObject && <span className="text-[9px] font-bold bg-slate-200 px-2 py-0.5 rounded-md text-slate-600 uppercase tracking-tighter">{selectedObject.type}</span>}
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {selectedObject ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                {selectedObject.text !== undefined && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Text Content</label>
                      <textarea
                        value={selectedObject.text}
                        onChange={(e) => updateSelected('text', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-slate-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Typography</label>
                      <select
                        value={availableFonts.includes(selectedObject.fontFamily) ? selectedObject.fontFamily : 'Custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'Custom') updateSelected('fontFamily', e.target.value)
                        }}
                        className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-white shadow-sm font-medium"
                      >
                        {availableFonts.map(f => <option key={f} value={f}>{f}</option>)}
                        <option value="Custom">Custom / System Font...</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Size</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.fontSize || 0)}
                      onChange={(e) => updateSelected('fontSize', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Color</label>
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

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Stroke</label>
                    <input
                      type="number"
                      value={selectedObject.strokeWidth || 0}
                      onChange={(e) => updateSelected('strokeWidth', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="px-6 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <LayoutTemplate className="text-blue-600" /> Template Library
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Manage and organize your ID card designs.</p>
                 </div>
                 <button onClick={() => setShowTemplateManager(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                    <X size={20} />
                 </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-3 border-b bg-slate-50 flex justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <button
                        onClick={handleImportWid}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                      >
                          <FileUp size={14} /> Import Package
                      </button>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                              <Table size={16} />
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                              <Grid size={16} />
                          </button>
                      </div>
                  </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto bg-slate-50/50">
                 {filteredLayouts.length > 0 ? (
                    <>
                    {viewMode === 'list' ? (
                        <div className="min-w-full inline-block align-middle">
                            <div className="border-b border-slate-200 bg-slate-50 sticky top-0 px-6 py-2 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <div className="col-span-5">Name</div>
                                <div className="col-span-3">Created</div>
                                <div className="col-span-2 text-center">Format</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredLayouts.map(l => (
                                    <div key={l.id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-white items-center transition-colors group">
                                        <div className="col-span-5 flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <FileJson size={18} />
                                            </div>
                                            <span className="font-semibold text-slate-700 text-sm">{l.name}</span>
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-500 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Unknown'}
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                CR80
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleLoad(l)} className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors" title="Open">
                                                <LayoutTemplate size={16} />
                                            </button>
                                            <button onClick={() => handleExportWid(l)} className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors" title="Export Design Package (.wid)">
                                                <Download size={16} />
                                            </button>
                                            <button onClick={() => handleRenameLayout(l)} className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors" title="Rename">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteLayout(l.id)} className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-md transition-colors" title="Delete">
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredLayouts.map(l => (
                            <div key={l.id} className="group bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 transition-all hover:shadow-md flex flex-col relative h-56">
                                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg mb-3 border border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                                    <LayoutTemplate size={32} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>

                                <div className="space-y-1 mb-3">
                                    <h3 className="font-bold text-slate-700 text-sm truncate" title={l.name}>{l.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Unknown'}</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleLoad(l)}
                                        className="flex-1 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wide text-slate-500 transition-all"
                                    >
                                        Open
                                    </button>
                                    <button onClick={() => handleDeleteLayout(l.id)} className="p-1.5 bg-white border hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg text-slate-400 transition-all" title="Delete">
                                        <Trash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                    </>
                 ) : (
                    <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <LayoutTemplate size={32} className="text-slate-300" />
                       </div>
                       <h3 className="font-bold text-slate-600 text-lg">No templates found</h3>
                       <p className="text-sm text-slate-400 mt-2 max-w-xs">{searchTerm ? 'Try adjusting your search terms.' : 'Create a new design and save it to build your library.'}</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

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

export default Design
