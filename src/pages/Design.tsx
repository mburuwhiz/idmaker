import React, { useState, useEffect } from 'react'
import DesignCanvas from '../components/DesignCanvas'
import { useCanvasActions } from '../hooks/useCanvasActions'
import { Type, Image as ImageIcon, Tags, Trash2, Save } from 'lucide-react'

const Design: React.FC = () => {
  const [canvas, setCanvas] = useState<any>(null)
  const { addText, addPlaceholder, deleteSelected } = useCanvasActions(canvas)
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
          <button onClick={() => addPlaceholder()} className="p-2 hover:bg-gray-100 rounded text-blue-600 flex items-center gap-2">
            <Tags size={20} /> <span className="text-sm font-medium">Placeholder</span>
          </button>
          <button onClick={() => {}} className="p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center gap-2">
            <ImageIcon size={20} /> <span className="text-sm font-medium">Image</span>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button onClick={() => deleteSelected()} className="p-2 hover:bg-red-50 text-red-500 rounded">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
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
        <div className="flex-1 overflow-hidden">
          <DesignCanvas
            onCanvasReady={setCanvas}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
          />
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l p-6 overflow-auto shadow-xl">
          <h3 className="font-bold text-gray-800 mb-6 uppercase text-xs tracking-wider">Properties</h3>

          {selectedObject ? (
            <div className="space-y-6">
              {selectedObject.text !== undefined && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Text Content</label>
                  <textarea
                    value={selectedObject.text}
                    onChange={(e) => updateSelected('text', e.target.value)}
                    className="w-full border rounded p-2 text-sm h-20"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Font Size</label>
                  <input
                    type="number"
                    value={selectedObject.fontSize}
                    onChange={(e) => updateSelected('fontSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                  <input
                    type="color"
                    value={selectedObject.fill}
                    onChange={(e) => updateSelected('fill', e.target.value)}
                    className="w-full h-9 border rounded"
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
