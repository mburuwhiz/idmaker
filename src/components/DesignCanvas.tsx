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
          if (obj.isGuide) canvas.remove(obj)
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

    // Auto-scaling logic
    const updateScale = () => {
      if (!containerRef.current) return
      const padding = 100
      const { clientWidth, clientHeight } = containerRef.current
      const scaleX = (clientWidth - padding) / CR80_WIDTH_PX
      const scaleY = (clientHeight - padding) / CR80_HEIGHT_PX
      const newScale = Math.min(scaleX, scaleY, 1.5) // Max 150% zoom
      setScale(newScale)
    }

    const resizeObserver = new ResizeObserver(updateScale)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    updateScale()

    return () => resizeObserver.disconnect()
  }, [onCanvasReady])

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 overflow-hidden relative flex items-center justify-center p-12">
      {/* Centered Workspace Container */}
      <div
        className="shadow-[0_0_80px_rgba(0,0,0,0.6)] border-[12px] border-slate-800 rounded-2xl overflow-hidden bg-white transition-transform duration-300 ease-out"
        style={{
            width: CR80_WIDTH_PX,
            height: CR80_HEIGHT_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end pointer-events-none opacity-50">
        <div className="bg-slate-900/80 text-white text-[9px] px-3 py-1.5 rounded-full backdrop-blur-md uppercase font-black tracking-[0.1em] shadow-xl border border-white/10">
          Fixed Resolution: {CR80_WIDTH_PX} x {CR80_HEIGHT_PX} PX
        </div>
      </div>
    </div>
  )
}

export default DesignCanvas
