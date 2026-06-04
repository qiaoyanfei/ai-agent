/** API 根地址，不要末尾斜杠。开发默认 /api（vite 代理到 8000） */
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api'
