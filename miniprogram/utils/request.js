const { baseUrl } = require('./config')

function request(path, options = {}) {
  const token = wx.getStorageSync('token')
  const header = Object.assign(
    { 'Content-Type': 'application/json' },
    options.header || {},
  )
  if (token) {
    header.Authorization = `Bearer ${token}`
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        const detail =
          (res.data && (res.data.detail || res.data.message)) ||
          `请求失败 (${res.statusCode})`
        reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)))
      },
      fail(err) {
        const msg = err.errMsg || '网络错误'
        console.error('[API]', path, msg)
        reject(
          new Error(
            msg.includes('fail') && path.includes('/auth/')
              ? `${msg}（真机请把 config.js 里 USE_REAL_DEVICE 设为 true，并填 Mac 局域网 IP）`
              : msg,
          ),
        )
      },
    })
  })
}

module.exports = { request }
