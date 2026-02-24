import * as fabric from 'fabric'
import { useCallback } from 'react'

export const useCanvasActions = (canvas: fabric.Canvas | null) => {
  const addText = useCallback((text: string = 'New Text') => {
    if (!canvas) return
    const textObj = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 40,
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
      fontSize: 40,
      fill: '#ff0000',
      fontWeight: 'bold',
    })
    // @ts-ignore
    textObj.isPlaceholder = true
    textObj.set('isPlaceholder', true)
    canvas.add(textObj)
    canvas.setActiveObject(textObj)
  }, [canvas])

  const addPhotoFrame = useCallback(() => {
    if (!canvas) return
    const rect = new fabric.Rect({
      left: 20,
      top: 50,
      width: 150,
      height: 180,
      fill: '#f3f4f6',
      stroke: '#9ca3af',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
    })
    // @ts-ignore
    rect.isPhotoFrame = true

    const text = new fabric.Text('PHOTO', {
      left: 20 + 75,
      top: 50 + 90,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#9ca3af',
      originX: 'center',
      originY: 'center',
    })
    // @ts-ignore
    text.isPhotoText = true
    text.set('isPhotoText', true)

    const group = new fabric.Group([rect, text], {
      left: 20,
      top: 50,
    })
    // @ts-ignore
    group.isPhotoPlaceholder = true
    group.set('isPhotoPlaceholder', true)

    canvas.add(group)
    canvas.setActiveObject(group)
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
    fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
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

  const duplicateSelected = useCallback(async () => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    const cloned = await activeObject.clone([
      'isPlaceholder', 'isPhotoPlaceholder', 'isPhotoFrame', 'isPhotoText',
      'fontWeight', 'fontStyle', 'fontFamily', 'rx', 'ry', 'underline',
      'stroke', 'fill', 'strokeWidth'
    ])

    canvas.discardActiveObject()
    cloned.set({
      left: cloned.left + 20,
      top: cloned.top + 20,
      evented: true,
    })

    if (cloned.type === 'activeSelection') {
      // active selection needs a reference to the canvas.
      cloned.canvas = canvas
      ;(cloned as fabric.ActiveSelection).forEachObject((obj: any) => {
        canvas.add(obj)
      })
      // this behaves as if the objects were selected
      cloned.setCoords()
    } else {
      canvas.add(cloned)
    }

    canvas.setActiveObject(cloned)
    canvas.requestRenderAll()
  }, [canvas])

  const groupSelected = useCallback(() => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'activeSelection') return

    // Attempt standard method first, fallback to manual
    try {
      if (typeof (activeObject as any).toGroup === 'function') {
        (activeObject as any).toGroup()
        canvas.requestRenderAll()
        return
      }
    } catch (e) {
      console.warn('toGroup failed, trying manual approach', e)
    }

    const objects = (activeObject as fabric.ActiveSelection).getObjects()
    canvas.discardActiveObject()

    const group = new fabric.Group(objects)
    objects.forEach(obj => canvas.remove(obj))
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
  }, [canvas])

  const ungroupSelected = useCallback(() => {
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (!activeObject || activeObject.type !== 'group') return

    // Attempt standard method first
    try {
      if (typeof (activeObject as any).toActiveSelection === 'function') {
        (activeObject as any).toActiveSelection()
        canvas.requestRenderAll()
        return
      }
    } catch (e) {
      console.warn('toActiveSelection failed, trying manual approach', e)
    }

    // Manual fallback (simplified, might lose transforms if API changed significantly)
    const group = activeObject as fabric.Group
    const objects = group.getObjects()

    // Naive restoration of objects to canvas
    // NOTE: This assumes objects retain or can easily restore canvas-relative coords.
    // In Fabric v6, strict transform restoration might require more complex logic.
    group.removeAll()
    canvas.remove(group)

    objects.forEach(obj => {
        // @ts-ignore
        if (obj.group === group) obj.group = undefined
        canvas.add(obj)
    })

    const selection = new fabric.ActiveSelection(objects, { canvas: canvas })
    canvas.setActiveObject(selection)
    canvas.requestRenderAll()
  }, [canvas])

  return {
    addText,
    addPlaceholder,
    addPhotoFrame,
    addRect,
    addLine,
    addImage,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
  }
}
