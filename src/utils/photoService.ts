import smartcrop from 'smartcrop'

export async function processPhoto(imageBuffer: any, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      const result = await smartcrop.crop(img, { width, height })
      const crop = result.topCrop

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }
    img.onerror = reject
    // Convert Buffer to Uint8Array which Blob accepts
    const uint8Array = new Uint8Array(imageBuffer)
    img.src = URL.createObjectURL(new Blob([uint8Array]))
  })
}

export function matchPhoto(photos: string[], admNo: string): string | undefined {
  return photos.find(p => {
    const filename = p.split(/[\\/]/).pop()?.split('.')[0]
    return filename === admNo
  })
}
