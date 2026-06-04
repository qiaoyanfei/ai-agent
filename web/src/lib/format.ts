export function docStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '排队中',
    processing: '解析中',
    ready: '已就绪',
    failed: '失败',
  }
  return map[status] || status || '未知'
}

export function formatApiError(err: unknown): string {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  return String(err)
}

export function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
