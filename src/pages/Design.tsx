import React, { useState, useEffect } from 'react'
import { useRef } from 'react'
import DesignCanvas from '../components/DesignCanvas'
import { useCanvasActions } from '../hooks/useCanvasActions'
import { Type, Image as ImageIcon, Tags, Trash2, Save, Square, Minimize2, MoveUp, MoveDown, UserSquare } from 'lucide-react'
import { CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../utils/units'

const FONTS = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Trebuchet MS', 'Impact']

const Design: React.FC = () => {
  const [canvas, setCanvas] = useState<any>(null)
  const { addText, addPlaceholder, addPhotoFrame, addRect, addLine, addImage, deleteSelected } = useCanvasActions(canvas)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [layoutName, setLayoutName] = useState('New Layout')

  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      setSelectedObject(canvas.getActiveObject())
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
    if (!canvas) return
    const content = JSON.stringify(canvas.toJSON(['isPlaceholder']))
    await window.ipcRenderer.invoke('save-layout', layoutName, content)
    alert('Layout saved!')
  }

  const updateSelected = (prop: string, value: any) => {
    if (!selectedObject) return
    selectedObject.set(prop, value)
    canvas.requestRenderAll()
    setSelectedObject({ ...selectedObject.toObject(['isPlaceholder']), _actual: selectedObject })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="font-bold text-gray-800 border-none focus:ring-0 w-48"
          />
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button onClick={() => addText()} className="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2">
            <Type size={20} /> <span className="text-sm font-medium">Text</span>
          </button>
          <button onClick={() => addPlaceholder()} className="p-2 hover:bg-gray-100 rounded text-blue-600 flex items-center gap-2" title="Variable Data">
            <Tags size={20} /> <span className="text-sm font-medium">Field</span>
          </button>
          <button onClick={() => addPhotoFrame()} className="p-2 hover:bg-gray-100 rounded text-indigo-600 flex items-center gap-2" title="Passport Photo Slot">
            <UserSquare size={20} /> <span className="text-sm font-medium">Photo</span>
          </button>
          <button onClick={() => addRect()} className="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2">
            <Square size={20} /> <span className="text-sm font-medium">Rect</span>
          </button>
          <button onClick={() => addLine()} className="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2">
            <Minimize2 size={20} className="rotate-45" /> <span className="text-sm font-medium">Line</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2">
            <ImageIcon size={20} /> <span className="text-sm font-medium">Logo</span>
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
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button onClick={() => deleteSelected()} className="p-2 hover:bg-red-50 text-red-500 rounded">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter">
            {CR80_WIDTH_MM} x {CR80_HEIGHT_MM} mm
          </div>
          <div className="flex items-center gap-4 mr-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              Grid
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
              Snap
            </label>
          </div>
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 font-bold hover:bg-blue-700 transition">
            <Save size={18} /> Save Layout
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 overflow-hidden relative flex">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-4 py-1 text-[10px] font-bold text-slate-400 flex justify-between uppercase">
            <span>Workspace: CR80 Card (300 DPI)</span>
            <span>Guides: 3mm Safe Margin Visible</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <DesignCanvas
              onCanvasReady={setCanvas}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
            />
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l p-6 overflow-auto shadow-xl">
          <h3 className="font-bold text-gray-800 mb-6 uppercase text-xs tracking-wider">Properties</h3>

          {selectedObject ? (
            <div className="space-y-6">
              {selectedObject.text !== undefined && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Text Content</label>
                    <textarea
                      value={selectedObject.text}
                      onChange={(e) => updateSelected('text', e.target.value)}
                      className="w-full border rounded p-2 text-sm h-20 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Font Family</label>
                    <select
                      value={selectedObject.fontFamily}
                      onChange={(e) => updateSelected('fontFamily', e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                    >
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Font Size</label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.fontSize || 0)}
                    onChange={(e) => updateSelected('fontSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Color</label>
                  <input
                    type="color"
                    value={selectedObject.fill}
                    onChange={(e) => updateSelected('fill', e.target.value)}
                    className="w-full h-9 border rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Opacity ({Math.round(selectedObject.opacity * 100)}%)</label>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={selectedObject.opacity}
                  onChange={(e) => updateSelected('opacity', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    selectedObject._actual.bringToFront()
                    canvas.requestRenderAll()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 p-2 border rounded text-xs hover:bg-gray-50"
                >
                  <MoveUp size={14} /> Front
                </button>
                <button
                  onClick={() => {
                    selectedObject._actual.sendToBack()
                    canvas.requestRenderAll()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 p-2 border rounded text-xs hover:bg-gray-50"
                >
                  <MoveDown size={14} /> Back
                </button>
              </div>

              {selectedObject.type === 'image' && (
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="grayscale"
                    onChange={() => {
                      // Simple grayscale simulation in properties
                      // In a full app, we'd use Fabric filters
                    }}
                  />
                  <label htmlFor="grayscale" className="text-xs text-gray-600">Grayscale</label>
                </div>
              )}

              {selectedObject.isPlaceholder && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <p className="text-xs text-blue-700">This is a dynamic placeholder. Use <strong>{'{{COLUMN_NAME}}'}</strong> format.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="mb-2 flex justify-center"><ImageIcon size={32} opacity={0.2} /></div>
              <p className="text-sm italic">Select an object to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Design
