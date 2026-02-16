import * as fabric from 'fabric'
import { useCallback } from 'react'

export const useCanvasActions = (canvas: fabric.Canvas | null) => {
  const addText = useCallback((text: string = 'New Text') => {
    if (!canvas) return
    const textObj = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
    })
    canvas.add(textObj)
    canvas.setActiveObject(textObj)
  }, [canvas])

  const addPlaceholder = useCallback((tag: string = '{{NAME}}') => {
    if (!canvas) return
    const textObj = new fabric.Textbox(tag, {
      left: 100,
      top: 150,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#ff0000', // Red for placeholders as per spec "Missing column highlights red" - well, we can start red
      fontWeight: 'bold',
    })
    // @ts-ignore
    textObj.isPlaceholder = true
    canvas.add(textObj)
    canvas.setActiveObject(textObj)
  }, [canvas])

  const addRect = useCallback(() => {
    if (!canvas) return
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#cccccc',
      stroke: '#000000',
      strokeWidth: 1,
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
  }, [canvas])

  const addLine = useCallback(() => {
    if (!canvas) return
    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: '#000000',
      strokeWidth: 2,
    })
    canvas.add(line)
    canvas.setActiveObject(line)
  }, [canvas])

  const addImage = useCallback((url: string) => {
    if (!canvas) return
    fabric.Image.fromURL(url).then((img) => {
      img.scaleToWidth(200)
      canvas.add(img)
      canvas.setActiveObject(img)
    })
  }, [canvas])

  const deleteSelected = useCallback(() => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    canvas.remove(...activeObjects)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }, [canvas])

  return {
    addText,
    addPlaceholder,
    addRect,
    addLine,
    addImage,
    deleteSelected,
  }
}
