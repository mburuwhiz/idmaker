import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { CR80_WIDTH_PX, CR80_HEIGHT_PX, SAFE_MARGIN_PX } from '../utils/units'

interface DesignCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void
  showGrid?: boolean
  snapToGrid?: boolean
}

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
        width: CR80_WIDTH_PX,
        height: CR80_HEIGHT_PX,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      })

      // Strict clipping to the card area
      canvas.clipPath = new fabric.Rect({
        left: 0,
        top: 0,
        width: CR80_WIDTH_PX,
        height: CR80_HEIGHT_PX,
        absolutePositioned: true
      })

      // Ensure guides function
      const ensureGuides = () => {
        const objects = canvas.getObjects()
        objects.forEach((obj: any) => {
          if ((obj as any).isGuide) canvas.remove(obj)
        })

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

    // Auto-scaling logic - optimized for landscape
    const updateScale = () => {
      if (!containerRef.current) return
      const padding = 80 // Reduced padding for better visibility
      const { clientWidth, clientHeight } = containerRef.current

      const availableWidth = clientWidth - padding
      const availableHeight = clientHeight - padding

      const scaleX = availableWidth / CR80_WIDTH_PX
      const scaleY = availableHeight / CR80_HEIGHT_PX

      // We want the card to fit comfortably but not be too small
      const newScale = Math.min(scaleX, scaleY, 1.2)
      setScale(newScale)
    }

    const resizeObserver = new ResizeObserver(updateScale)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    updateScale()

    return () => resizeObserver.disconnect()
  }, [onCanvasReady])

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 overflow-hidden relative flex items-center justify-center">
      {/* Background patterns for a more "design" feel */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Centered Workspace Container */}
      <div
        className="shadow-[0_0_100px_rgba(0,0,0,0.7)] border-[16px] border-slate-800 rounded-[2rem] overflow-hidden bg-white transition-all duration-500 ease-out"
        style={{
            width: CR80_WIDTH_PX,
            height: CR80_HEIGHT_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-10 left-10 flex flex-col gap-3 pointer-events-none">
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
