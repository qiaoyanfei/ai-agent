export function isEditableFilename(filename: string): boolean {
  const lower = filename.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')
}
