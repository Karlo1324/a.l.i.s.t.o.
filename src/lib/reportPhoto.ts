export const MAX_REPORT_PHOTO_BYTES = 5_000_000

export async function prepareReportPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.')
  }
  if (!file.size) throw new Error('This photo is empty.')
  const image = new Image()
  const url = URL.createObjectURL(file)
  const canvas = document.createElement('canvas')
  try {
    image.src = url
    await image.decode()
    const longest = Math.max(image.naturalWidth, image.naturalHeight)
    for (let edge = Math.min(1600, longest); edge >= 1; edge = Math.floor(edge / 1.5)) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * edge / longest))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * edge / longest))
      const context = canvas.getContext('2d')
      if (!context) break
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.72))
      if (blob && blob.size > 0 && blob.size < MAX_REPORT_PHOTO_BYTES) return blob
    }
    throw new Error('Could not compress this photo.')
  } finally {
    URL.revokeObjectURL(url)
    canvas.width = canvas.height = 0
  }
}
