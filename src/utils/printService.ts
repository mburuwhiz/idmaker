import * as fabric from 'fabric'
import { jsPDF } from 'jspdf'
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

export async function renderCard(layoutJson: string, studentData: any, photoData?: string): Promise<HTMLCanvasElement> {
  const canvasElement = document.createElement('canvas')
  const canvas = new fabric.StaticCanvas(canvasElement, {
    width: CR80_WIDTH_PX,
    height: CR80_HEIGHT_PX,
  })

  await canvas.loadFromJSON(layoutJson)

  const objects = canvas.getObjects()

  for (const obj of objects as any[]) {
    // Replace text placeholders
    if (obj.text && obj.isPlaceholder) {
      const match = obj.text.match(/\{\{(.+)\}\}/)
      if (match) {
        const key = match[1]
        obj.set('text', studentData[key] || obj.text)
        if (!studentData[key]) {
          obj.set('fill', 'red')
        }
      }
    }

    // Replace photo placeholder
    if (obj.isPhotoPlaceholder && photoData) {
      const img = await fabric.Image.fromURL(photoData)
      img.set({
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.width / img.width!,
        scaleY: obj.height / img.height!,
      })
      canvas.remove(obj)
      canvas.add(img)
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

  const card1 = await renderCard(layoutJson, student1, photo1)
  const card2 = student2 ? await renderCard(layoutJson, student2, photo2) : null

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
