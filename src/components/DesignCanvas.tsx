import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { CR80_WIDTH_PX, CR80_HEIGHT_PX, SAFE_MARGIN_PX } from '../utils/units'

interface DesignCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void
  showGrid?: boolean
  snapToGrid?: boolean
}

const WORKSPACE_SIZE = 3000 // Large enough to see anything far off-canvas

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  onCanvasReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (canvasRef.current && containerRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: WORKSPACE_SIZE,
        height: WORKSPACE_SIZE,
        backgroundColor: '#0f172a', // Dark workspace background
        preserveObjectStacking: true,
      })

      // Center the CR80 card area in the large workspace
      const offsetX = (WORKSPACE_SIZE - CR80_WIDTH_PX) / 2
      const offsetY = (WORKSPACE_SIZE - CR80_HEIGHT_PX) / 2
      canvas.setViewportTransform([1, 0, 0, 1, offsetX, offsetY])

      // Ensure guides function
      const ensureGuides = () => {
        const objects = canvas.getObjects()
        objects.forEach((obj: any) => {
          if ((obj as any).isGuide) canvas.remove(obj)
        })

        // Card Background (Visual representation of the ID)
        const cardBg = new fabric.Rect({
            left: 0,
            top: 0,
            width: CR80_WIDTH_PX,
            height: CR80_HEIGHT_PX,
            fill: '#ffffff',
            selectable: false,
            evented: false,
            excludeFromExport: true,
            shadow: new fabric.Shadow({
                color: 'rgba(0,0,0,0.5)',
                blur: 30,
                offsetX: 0,
                offsetY: 10
            })
        })
        // @ts-ignore
        cardBg.isGuide = true
        canvas.add(cardBg)
        canvas.sendObjectToBack(cardBg)

        // Safe Margin Guide
        const safeMargin = new fabric.Rect({
          left: SAFE_MARGIN_PX,
          top: SAFE_MARGIN_PX,
          width: CR80_WIDTH_PX - 2 * SAFE_MARGIN_PX,
          height: CR80_HEIGHT_PX - 2 * SAFE_MARGIN_PX,
          fill: 'transparent',
          stroke: '#f87171',
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
          strokeWidth: 1,
          opacity: 0.4,
        })
        // @ts-ignore
        safeMargin.isGuide = true
        canvas.add(safeMargin)
        canvas.bringObjectToFront(safeMargin)
        canvas.requestRenderAll()
      }

      // @ts-ignore
      canvas.ensureGuides = ensureGuides

      fabricCanvasRef.current = canvas
      ensureGuides()

      if (onCanvasReady) {
        onCanvasReady(canvas)
      }
    }

    // Auto-scaling logic - optimized to fit the CARD in view, but allowing space around it
    const updateScale = () => {
      if (!containerRef.current) return
      const padding = 120 // Space around the card to see off-canvas objects
      const { clientWidth, clientHeight } = containerRef.current

      // We want the card + padding to fit
      const targetWidth = CR80_WIDTH_PX + padding * 2
      const targetHeight = CR80_HEIGHT_PX + padding * 2

      const scaleX = clientWidth / targetWidth
      const scaleY = clientHeight / targetHeight

      const newScale = Math.min(scaleX, scaleY, 2.0)
      setScale(newScale)
    }

    const resizeObserver = new ResizeObserver(updateScale)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    updateScale()

    return () => resizeObserver.disconnect()
  }, [onCanvasReady])

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 overflow-hidden relative flex items-center justify-center">
      {/* Centered Workspace Container */}
      <div
        className="transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)"
        style={{
            width: WORKSPACE_SIZE,
            height: WORKSPACE_SIZE,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-10 left-10 flex flex-col gap-3 pointer-events-none z-20">
        <div className="bg-blue-600/90 text-white text-[10px] px-4 py-2 rounded-xl backdrop-blur-md uppercase font-black tracking-[0.2em] shadow-2xl border border-white/20">
          Landscape Mode: 86 x 54 mm
        </div>
        <div className="bg-slate-900/80 text-slate-400 text-[10px] px-4 py-2 rounded-xl backdrop-blur-md uppercase font-black tracking-[0.1em] shadow-xl border border-white/5">
          Resolution: {CR80_WIDTH_PX} x {CR80_HEIGHT_PX} PX (300 DPI)
        </div>
      </div>
    </div>
  )
}

export default DesignCanvas
