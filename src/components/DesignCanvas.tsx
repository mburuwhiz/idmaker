import React, { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (canvasRef.current && containerRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: '#0f172a', // Dark workspace background
        preserveObjectStacking: true,
        selection: true,
      })

      const zoomToCenter = () => {
        if (!containerRef.current || !fabricCanvasRef.current) return
        const padding = 60
        const clientWidth = containerRef.current.clientWidth
        const clientHeight = containerRef.current.clientHeight

        if (clientWidth === 0 || clientHeight === 0) return

        // Calculate required zoom to fit card + padding
        const scaleX = clientWidth / (CR80_WIDTH_PX + padding * 2)
        const scaleY = clientHeight / (CR80_HEIGHT_PX + padding * 2)
        const zoom = Math.min(scaleX, scaleY, 2.0)

        // Calculate translation to center logical (0,0) to (1016, 638)
        const offsetX = (clientWidth - CR80_WIDTH_PX * zoom) / 2
        const offsetY = (clientHeight - CR80_HEIGHT_PX * zoom) / 2

        const c = fabricCanvasRef.current
        c.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY])
        c.requestRenderAll()
      }

      // @ts-ignore
      canvas.zoomToCenter = zoomToCenter

      // Zooming with Alt + Wheel
      canvas.on('mouse:wheel', function(this: fabric.Canvas, opt) {
        if (!opt.e.altKey) return;
        const delta = opt.e.deltaY;
        let zoom = this.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 10) zoom = 10;
        if (zoom < 0.01) zoom = 0.01;
        this.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      // Panning with Alt + Drag or Middle Click
      let isDragging = false;
      let lastPosX: number, lastPosY: number;

      canvas.on('mouse:down', function(this: fabric.Canvas, opt) {
        const evt = opt.e as MouseEvent;
        if (evt.altKey === true || (evt as any).button === 1) {
          isDragging = true;
          this.selection = false;
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
          if (opt.e.preventDefault) opt.e.preventDefault();
        }
      });

      canvas.on('mouse:move', function(this: fabric.Canvas, opt) {
        if (isDragging) {
          const e = opt.e as MouseEvent;
          const vpt = this.viewportTransform;
          if (vpt) {
            vpt[4] += e.clientX - lastPosX;
            vpt[5] += e.clientY - lastPosY;
            this.requestRenderAll();
          }
          lastPosX = e.clientX;
          lastPosY = e.clientY;
        }
      });

      canvas.on('mouse:up', function(this: fabric.Canvas) {
        if (isDragging) {
          this.setViewportTransform(this.viewportTransform!);
          isDragging = false;
          this.selection = true;
        }
      });

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
      requestAnimationFrame(zoomToCenter)

      if (onCanvasReady) {
        onCanvasReady(canvas)
      }

      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current
          canvas.setDimensions({
            width: clientWidth,
            height: clientHeight
          })
          // Use requestAnimationFrame to ensure dimensions are applied before zooming
          requestAnimationFrame(zoomToCenter)
        }
      })
      resizeObserver.observe(containerRef.current)

      return () => {
        resizeObserver.disconnect()
        canvas.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [onCanvasReady])

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 overflow-hidden relative">
      <canvas ref={canvasRef} />

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
