import * as fabric from 'fabric'
import { jsPDF } from 'jspdf'
import { processPhoto } from './photoService'
import {
  mmToPx,
  CR80_WIDTH_PX,
  CR80_HEIGHT_PX,
  SLOT1_X_MM,
  SLOT1_Y_MM,
  SLOT2_Y_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM
} from './units'

export async function renderCard(
  layoutJson: string,
  studentData: any,
  photoData?: string,
  adjustments: { zoom: number, x: number, y: number } = { zoom: 1, x: 0, y: 0 }
): Promise<HTMLCanvasElement> {
  const canvasElement = document.createElement('canvas')
  const canvas = new fabric.StaticCanvas(canvasElement, {
    width: CR80_WIDTH_PX,
    height: CR80_HEIGHT_PX,
  })

  // @ts-ignore
  await canvas.loadFromJSON(layoutJson)

  // Ensure print background is white, ignoring designer workspace color
  canvas.backgroundColor = '#ffffff'

  const objects = [...canvas.getObjects()]

  for (const obj of objects as any[]) {
    // Hide any individual photo text/placeholder guides if they escape their groups
    if (obj.isPhotoText || obj.get?.('isPhotoText')) {
      obj.set('visible', false)
    }

    // Replace text placeholders (support multiple placeholders and handle spaces/casing)
    if (obj.text) {
      const originalText = obj.text
      let newText = originalText
      const placeholderRegex = /\{\{(.+?)\}\}/g
      const matches = originalText.match(placeholderRegex)
      let hasDataMatch = false

      if (matches) {
        for (const fullMatch of matches) {
          const key = fullMatch.slice(2, -2).trim()
          // Case-insensitive and space-insensitive lookup
          const dataKey = Object.keys(studentData).find(k => k.trim().toUpperCase() === key.toUpperCase())
          const value = dataKey ? studentData[dataKey] : undefined

          if (value !== undefined) {
            newText = newText.replaceAll(fullMatch, String(value))
            hasDataMatch = true
          }
        }
      }

      if (hasDataMatch) {
        obj.set('text', newText)
      } else if (obj.isPlaceholder && originalText.includes('{{')) {
        // If it's marked as placeholder but no data found, keep it red
        obj.set('fill', '#ff0000')
      }
    }

    // Handle Photo Placeholder
    if (obj.isPhotoPlaceholder) {
      // Always hide the "PHOTO" text guide during printing/export
      const children = obj.getObjects ? obj.getObjects() : (obj._objects || [])
      children.forEach((child: any) => {
        if (child.isPhotoText || child.get('isPhotoText')) {
          child.set('visible', false)
        }
      })

      if (photoData) {
        // Use scaled dimensions to handle resized placeholders
        const visualWidth = obj.getScaledWidth()
        const visualHeight = obj.getScaledHeight()

        try {
          // Apply smartcrop processing
          const processedData = await processPhoto(photoData, visualWidth, visualHeight)
          const img = await fabric.Image.fromURL(processedData)

          // Apply manual adjustments
          const { zoom, x, y } = adjustments

          // Calculate scaled dimensions based on visual dimensions
          const sw = visualWidth * zoom
          const sh = visualHeight * zoom

          // Calculate offsets (center-based scaling)
          const ox = (visualWidth - sw) / 2 + (x || 0)
          const oy = (visualHeight - sh) / 2 + (y || 0)

          img.set({
            left: obj.left + ox,
            top: obj.top + oy,
            width: sw,
            height: sh,
            clipPath: new fabric.Rect({
              left: obj.left,
              top: obj.top,
              width: visualWidth,
              height: visualHeight,
              absolutePositioned: true
            })
          })

          // Ensure image is at the same stacking order as the placeholder
          const index = canvas.getObjects().indexOf(obj)
          canvas.remove(obj)
          canvas.add(img)
          // @ts-ignore
          canvas.moveObjectTo(img, index)
          console.log(`[PrintService] Successfully replaced placeholder with photo at index ${index}`)
        } catch (err) {
          console.error('[PrintService] Failed to render photo object:', err)
        }
      } else {
        console.warn('[PrintService] No photo data provided for placeholder at', obj.left, obj.top)
      }
    }
  }

  canvas.renderAll()

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = CR80_WIDTH_PX
  tempCanvas.height = CR80_HEIGHT_PX
  const ctx = tempCanvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(canvas.getElement(), 0, 0)
  }

  return tempCanvas
}

export async function renderA4Sheet(
  student1: any,
  student2: any,
  layoutJson: string,
  profile: any,
  photo1?: string,
  photo2?: string
): Promise<HTMLCanvasElement> {
  const a4Canvas = document.createElement('canvas')
  a4Canvas.width = mmToPx(A4_WIDTH_MM)
  a4Canvas.height = mmToPx(A4_HEIGHT_MM)
  const ctx = a4Canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get context')

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height)

  const { offsetX, offsetY, slot2YOffset, scaleX, scaleY } = profile

  const adj1 = student1.data._adjustments || { zoom: 1, x: 0, y: 0 }
  const card1 = await renderCard(layoutJson, student1.data, photo1, adj1)

  const adj2 = student2?.data?._adjustments || { zoom: 1, x: 0, y: 0 }
  const card2 = student2 ? await renderCard(layoutJson, student2.data, photo2, adj2) : null

  // Slot 1
  const s1x = mmToPx(SLOT1_X_MM + offsetX)
  const s1y = mmToPx(SLOT1_Y_MM + offsetY)
  ctx.drawImage(
    card1,
    s1x, s1y,
    CR80_WIDTH_PX * scaleX,
    CR80_HEIGHT_PX * scaleY
  )

  // Slot 2
  if (card2) {
    const s2x = mmToPx(SLOT1_X_MM + offsetX)
    const s2y = mmToPx(SLOT2_Y_MM + offsetY + slot2YOffset)
    ctx.drawImage(
      card2,
      s2x, s2y,
      CR80_WIDTH_PX * scaleX,
      CR80_HEIGHT_PX * scaleY
    )
  }

  return a4Canvas
}

export async function exportToPdf(sheets: HTMLCanvasElement[], title: string = 'Student IDs') {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  })

  // Set Metadata
  pdf.setProperties({
    title: title,
    author: 'whizpoint Solutions',
    subject: 'student id',
    creator: 'Whizpoint ID',
    keywords: 'id cards, printing'
  })

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) pdf.addPage()
    const imgData = sheets[i].toDataURL('image/jpeg', 1.0)
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
  }

  pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`)
}

export async function printTestSheet(profile: any) {
  const a4Canvas = document.createElement('canvas')
  a4Canvas.width = mmToPx(A4_WIDTH_MM)
  a4Canvas.height = mmToPx(A4_HEIGHT_MM)
  const ctx = a4Canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height)

  ctx.strokeStyle = 'black'
  ctx.lineWidth = 2

  const { offsetX, offsetY, slot2YOffset, scaleX, scaleY } = profile

  // Slot 1 Outline
  const s1x = mmToPx(SLOT1_X_MM + offsetX)
  const s1y = mmToPx(SLOT1_Y_MM + offsetY)
  ctx.strokeRect(s1x, s1y, CR80_WIDTH_PX * scaleX, CR80_HEIGHT_PX * scaleY)

  // Slot 2 Outline
  const s2x = mmToPx(SLOT1_X_MM + offsetX)
  const s2y = mmToPx(SLOT2_Y_MM + offsetY + slot2YOffset)
  ctx.strokeRect(s2x, s2y, CR80_WIDTH_PX * scaleX, CR80_HEIGHT_PX * scaleY)

  await exportToPdf([a4Canvas], 'Calibration_Test_Sheet')
}
