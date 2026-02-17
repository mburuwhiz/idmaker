import smartcrop from 'smartcrop'

export async function processPhoto(source: string | ArrayBuffer, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        console.log(`[PhotoService] Processing image of size ${img.width}x${img.height} for target ${width}x${height}`)
        // smartcrop works best if we give it the target aspect ratio
        const result = await smartcrop.crop(img, { width, height })
        const crop = result.topCrop

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Draw the cropped area into the target dimensions (object-fit: cover equivalent)
          ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.95))
        } else {
          throw new Error('Failed to get canvas context')
        }
      } catch (err) {
        console.error('[PhotoService] Error during cropping:', err)
        // Fallback to basic draw if smartcrop fails
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
           ctx.drawImage(img, 0, 0, width, height)
           resolve(canvas.toDataURL('image/jpeg', 0.95))
        } else {
           reject(err)
        }
      }
    }
    img.onerror = (e) => {
      console.error('[PhotoService] Failed to load image for cropping. Source length:', typeof source === 'string' ? source.length : 'N/A')
      reject(new Error('Failed to load image for cropping: ' + e))
    }

    if (typeof source === 'string') {
      if (source.startsWith('data:')) {
        img.src = source
      } else {
        // Assume it is base64 without prefix if it doesn't have it
        img.src = `data:image/jpeg;base64,${source}`
      }
    } else {
      const uint8Array = new Uint8Array(source)
      img.src = URL.createObjectURL(new Blob([uint8Array]))
    }
  })
}

export function matchPhoto(photos: string[], admNo: string): string | undefined {
  return photos.find(p => {
    const filename = p.split(/[\\/]/).pop()?.split('.')[0]
    return filename === admNo
  })
}
