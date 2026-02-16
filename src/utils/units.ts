export const DPI = 300
export const MM_TO_INCH = 25.4

export function mmToPx(mm: number): number {
  return mm * (DPI / MM_TO_INCH)
}

export function pxToMm(px: number): number {
  return px / (DPI / MM_TO_INCH)
}

export const CR80_WIDTH_MM = 86
export const CR80_HEIGHT_MM = 54

export const CR80_WIDTH_PX = Math.round(mmToPx(CR80_WIDTH_MM))
export const CR80_HEIGHT_PX = Math.round(mmToPx(CR80_HEIGHT_MM))

// Tray Anchors
export const SLOT1_X_MM = 31.8
export const SLOT1_Y_MM = 12.3
export const SLOT2_X_MM = SLOT1_X_MM
export const SLOT2_Y_MM = SLOT1_Y_MM + CR80_HEIGHT_MM + 31.5 // 31.5 is the gap

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
