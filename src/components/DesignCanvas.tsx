import React, { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { CR80_WIDTH_PX, CR80_HEIGHT_PX, mmToPx, SAFE_MARGIN_PX } from '../utils/units'

interface DesignCanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void
  showGrid?: boolean
  snapToGrid?: boolean
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  onCanvasReady,
  showGrid = false,
  snapToGrid = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (canvasRef.current && containerRef.current && !fabricCanvasRef.current) {
      const container = containerRef.current
      const width = container.clientWidth || 1000
      const height = container.clientHeight || 800

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: '#cbd5e1', // slate-300 for workspace
        preserveObjectStacking: true,
      })

      // Handle window resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect
            canvas.setDimensions({ width, height })
            canvas.calcOffset()
        }
      })
      resizeObserver.observe(container)

      // Mouse wheel zoom
      canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY
        let zoom = canvas.getZoom()
        zoom *= 0.999 ** delta
        if (zoom > 20) zoom = 20
        if (zoom < 0.01) zoom = 0.01
        canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom)
        opt.e.preventDefault()
        opt.e.stopPropagation()
      })

      // Alt + click or middle-button pan
      canvas.on('mouse:down', (opt) => {
        const evt = opt.e as any
        if (evt.altKey || evt.button === 1) {
          // @ts-ignore
          canvas.isDragging = true
          canvas.selection = false
          // @ts-ignore
          canvas.lastPosX = evt.clientX
          // @ts-ignore
          canvas.lastPosY = evt.clientY
        }
      })
      canvas.on('mouse:move', (opt) => {
        // @ts-ignore
        if (canvas.isDragging) {
          const e = opt.e as any
          const vpt = canvas.viewportTransform!
          // @ts-ignore
          vpt[4] += e.clientX - canvas.lastPosX
          // @ts-ignore
          vpt[5] += e.clientY - canvas.lastPosY
          canvas.requestRenderAll()
          // @ts-ignore
          canvas.lastPosX = e.clientX
          // @ts-ignore
          canvas.lastPosY = e.clientY
        }
      })
      canvas.on('mouse:up', () => {
        canvas.setViewportTransform(canvas.viewportTransform!)
        // @ts-ignore
        canvas.isDragging = false
        canvas.selection = true
      })

      fabricCanvasRef.current = canvas

      // Add Card Background (The actual printable area guide)
      const cardBg = new fabric.Rect({
        left: 0,
        top: 0,
        width: CR80_WIDTH_PX,
        height: CR80_HEIGHT_PX,
        fill: '#ffffff',
        selectable: false,
        evented: false,
        shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 30,
            offsetX: 0,
            offsetY: 15
        })
      })
      // @ts-ignore
      cardBg.isGuide = true
      canvas.add(cardBg)

      // Add Safe Margin Guide (Optional, non-selectable)
      const safeMargin = new fabric.Rect({
        left: SAFE_MARGIN_PX,
        top: SAFE_MARGIN_PX,
        width: CR80_WIDTH_PX - 2 * SAFE_MARGIN_PX,
        height: CR80_HEIGHT_PX - 2 * SAFE_MARGIN_PX,
        fill: 'transparent',
        stroke: '#f87171', // red-400
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        strokeWidth: 1,
        opacity: 0.3,
      })
      // @ts-ignore
      safeMargin.isGuide = true
      canvas.add(safeMargin)

      if (onCanvasReady) {
        onCanvasReady(canvas)
      }

      // Initial centering
      const vpt = canvas.viewportTransform!
      vpt[4] = (width - CR80_WIDTH_PX) / 2
      vpt[5] = (height - CR80_HEIGHT_PX) / 2
      canvas.requestRenderAll()
    }

    const canvas = fabricCanvasRef.current
    if (canvas) {
      const gridPx = mmToPx(1)

      const handleMoving = (opt: any) => {
        if (snapToGrid) {
          opt.target.set({
            left: Math.round(opt.target.left / gridPx) * gridPx,
            top: Math.round(opt.target.top / gridPx) * gridPx
          })
        }
      }

      canvas.on('object:moving', handleMoving)

      return () => {
        canvas.off('object:moving', handleMoving)
      }
    }
  }, [onCanvasReady, snapToGrid, showGrid])

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-300 overflow-hidden relative">
      <canvas ref={canvasRef} />

      {/* Zoom indicator overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end pointer-events-none">
        <div className="bg-slate-900/80 text-white text-[9px] px-3 py-1.5 rounded-full backdrop-blur-md uppercase font-black tracking-[0.1em] shadow-xl border border-white/10">
          Middle Click or Alt+Drag to Pan • Scroll to Zoom
        </div>
      </div>
    </div>
  )
}

export default DesignCanvas
