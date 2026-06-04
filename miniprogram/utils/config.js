/**
 * API 根地址（不要带末尾 /）
 *
 * 开发：模拟器 127.0.0.1；真机用 Mac 局域网 IP
 * 上线：IS_PRODUCTION = true，并填写已备案的 HTTPS 域名（见 docs/MINIPROGRAM.md 发布章节）
 */
const IS_PRODUCTION = false
const PROD_BASE_URL = 'https://api.example.com' // 改成你的正式 API 域名

const USE_REAL_DEVICE = true // 真机调试 true；只在电脑模拟器测时改 false
const DEV_LAN_HOST = '192.168.1.8' // Mac Wi-Fi IP：ipconfig getifaddr en0

const baseUrl = IS_PRODUCTION
  ? PROD_BASE_URL
  : USE_REAL_DEVICE
    ? `http://${DEV_LAN_HOST}:8000`
    : 'http://127.0.0.1:8000'

module.exports = { baseUrl }
