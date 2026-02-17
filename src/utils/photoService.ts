import smartcrop from 'smartcrop'

export async function processPhoto(source: string | ArrayBuffer, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        if (!img.width || !img.height) {
          throw new Error('Loaded image has no dimensions')
        }
        console.log(`[PhotoService] Processing image of size ${img.width}x${img.height} for target ${width}x${height}`)

        // If image is very small or smartcrop fails, we still want to show something
        let result;
        try {
          result = await smartcrop.crop(img, {
            width,
            height,
            ruleOfThirds: true,
            minScale: 1.0, // Ensure it doesn't zoom out too much
          })
        } catch (e) {
          console.warn('[PhotoService] Smartcrop failed, using center crop fallback', e)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (ctx) {
          if (result && result.topCrop) {
            const crop = result.topCrop
            ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
          } else {
            // Center crop fallback
            const imgAspect = img.width / img.height
            const targetAspect = width / height

            let sx, sy, sw, sh
            if (imgAspect > targetAspect) {
              sh = img.height
              sw = sh * targetAspect
              sx = (img.width - sw) / 2
              sy = 0
            } else {
              sw = img.width
              sh = sw / targetAspect
              sx = 0
              sy = (img.height - sh) / 2
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
          }

          // Use high quality jpeg
          resolve(canvas.toDataURL('image/jpeg', 0.95))
        } else {
          throw new Error('Failed to get canvas context')
        }
      } catch (err) {
        console.error('[PhotoService] Critical error during processing:', err)
        reject(err)
      }
    }

    img.onerror = () => {
      console.error('[PhotoService] Failed to load image. Source length:', typeof source === 'string' ? source.length : 'N/A')
      reject(new Error('Failed to load image for processing'))
    }

    if (typeof source === 'string' && source.length > 0) {
      if (source.startsWith('data:')) {
        img.src = source
      } else {
        // Highly robust base64 detection by checking magic numbers
        // PNG starts with iVBORw0KGgo...
        // JPEG starts with /9j/...
        let mime = 'image/jpeg' // Default to jpeg
        const prefix = source.substring(0, 30)

        if (prefix.includes('iVBORw0KGgo')) {
          mime = 'image/png'
        } else if (prefix.includes('/9j/')) {
          mime = 'image/jpeg'
        } else {
          console.warn('[PhotoService] Unrecognized base64 header, defaulting to image/jpeg. Prefix:', prefix.substring(0, 10))
        }

        img.src = `data:${mime};base64,${source}`
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
