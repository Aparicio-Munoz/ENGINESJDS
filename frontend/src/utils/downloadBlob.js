export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Give the browser time to start the download before releasing the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function getFilenameFromContentDisposition(header, fallback) {
  const value = String(header || '')
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) {
    try { return decodeURIComponent(utf8Match[1]) } catch { return utf8Match[1] }
  }

  const filenameMatch = value.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] || fallback
}
