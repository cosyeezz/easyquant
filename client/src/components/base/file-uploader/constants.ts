
export const FILE_EXTS: Record<string, string[]> = {
  image: ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'],
  audio: ['MP3', 'M4A', 'WAV', 'WEBM', 'AMR'],
  video: ['MP4', 'MOV', 'MPEG', 'MPGA'],
  document: [
    'TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'DOC', 'PPTX', 'PPT', 'CSV', 'EML', 'MSG',
    'XML', 'JSON', 'YAML', 'YML',
  ],
  custom: [],
}

export const FILE_URL_REGEX = /^https?:\/\/.+/
export const AUDIO_SIZE_LIMIT = 10 * 1024 * 1024 // 10MB
export const FILE_SIZE_LIMIT = 10 * 1024 * 1024 // 10MB
export const IMG_SIZE_LIMIT = 10 * 1024 * 1024 // 10MB
export const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024 // 100MB
export const MAX_FILE_UPLOAD_LIMIT = 10

export const getInputVars = (text: string) => {
  if (!text)
    return []
  const reg = /\{\{#(.+?)#\}\}/g
  const matches = text.matchAll(reg)
  const results = []
  for (const match of matches) {
    results.push(match[1].split('.'))
  }
  return results
}
