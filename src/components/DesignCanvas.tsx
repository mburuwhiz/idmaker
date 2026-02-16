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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: CR80_WIDTH_PX,
        height: CR80_HEIGHT_PX,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      })

      // Middle mouse pan
      canvas.on('mouse:down', (opt) => {
        const evt = opt.e as any
        if (evt.button === 1) { // Middle button
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

      // Zoom
      canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY
        let zoom = canvas.getZoom()
        zoom *= 0.999 ** delta
        if (zoom > 8) zoom = 8
        if (zoom < 0.25) zoom = 0.25
        canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom)
        opt.e.preventDefault()
        opt.e.stopPropagation()
      })

      fabricCanvasRef.current = canvas

      // Add Safe Margin Guide (visual only)
      const safeMargin = new fabric.Rect({
        left: SAFE_MARGIN_PX,
        top: SAFE_MARGIN_PX,
        width: CR80_WIDTH_PX - 2 * SAFE_MARGIN_PX,
        height: CR80_HEIGHT_PX - 2 * SAFE_MARGIN_PX,
        fill: 'transparent',
        stroke: '#ff0000',
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        strokeWidth: 1,
        opacity: 0.5,
      })
      // @ts-ignore
      safeMargin.isGuide = true
      canvas.add(safeMargin)

      if (onCanvasReady) {
        onCanvasReady(canvas)
      }
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
    <div className="flex items-center justify-center p-8 bg-gray-200 min-h-[600px] overflow-auto">
      <div className="shadow-2xl bg-white">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

export default DesignCanvas
