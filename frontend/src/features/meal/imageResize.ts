const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8

/**
 * 업로드 전 리사이즈·압축 — 긴 변 1024px, JPEG 80%.
 * 원본 사진(수 MB)을 100~300KB로 줄여 분석 업로드를 가볍게 한다.
 */
export async function resizeImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file // Canvas 미지원 환경: 원본 그대로 (분석은 가능)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
