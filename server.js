import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(cors())

// === Config ===
const BOT_TOKEN = process.env.BOT_TOKEN || ''
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:8080'
const ALLOW_DEV = (process.env.ALLOW_DEV || 'true').toLowerCase() === 'true'
const SPINS_PER_DAY = parseInt(process.env.SPINS_PER_DAY || '1', 10)

// === In-memory storage (demo) ===
/** @type {Record<string, { date: string, count: number, lastPrize?: any }>} */
const userDailySpins = Object.create(null)

/** Demo prize config. Weight = вероятность (чем больше, тем чаще выпадает). */
let prizes = [
  { label: 'Скидка 5%', weight: 10, color: '#F59E0B', id: 'vip1' },
  { label: 'Ничего', weight: 30, color: '#9CA3AF', id: 'nothing' },
  { label: 'Скидка 10% на Бабл-ти', weight: 15, color: '#10B981', id: 'disc50' },
  { label: '100 бонусов', weight: 10, color: '#3B82F6', id: 'r100' },
  { label: 'Лимонад в подарок', weight: 15, color: '#EC4899', id: 'stickers' },
  { label: 'Скидка  10% на десерт', weight: 5, color: '#8B5CF6', id: 'pro30' },
  { label: 'Доп скидка 10%', weight: 15, color: '#EF4444', id: 'disc5' }
  { label: 'Скидка 5%', weight: 15, color: '#EF4444', id: 'disc5' }
]

// === Telegram initData verification ===
/**
 * Verifies initData from Telegram WebApp
 * @param {string} initData
 * @returns {{ok: boolean, userId?: string, data?: Record<string,string>, reason?: string}}
 */
function verifyInitData(initData) {
  try {
    if (!initData || typeof initData !== 'string') {
      return { ok: false, reason: 'empty_init_data' }
    }
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    if (!hash) return { ok: false, reason: 'no_hash' }

    // Build data-check-string
    urlParams.delete('hash')
    const pairs = []
    for (const [key, value] of urlParams.entries()) {
      pairs.push(`${key}=${value}`)
    }
    pairs.sort()
    const dataCheckString = pairs.join('\n')

    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (hmac !== hash) return { ok: false, reason: 'bad_hash' }

    // Extract user id
    const userStr = urlParams.get('user')
    if (!userStr) return { ok: false, reason: 'no_user' }
    const user = JSON.parse(userStr)
    const userId = String(user.id)
    return { ok: true, userId, data: Object.fromEntries(urlParams.entries()) }
  } catch (e) {
    return { ok: false, reason: 'exception' }
  }
}

// === API ===
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

app.get('/api/prizes', (req, res) => {
  res.json({ ok: true, prizes })
})

app.post('/api/spin', (req, res) => {
  const { initData } = req.body || {}

  if (!BOT_TOKEN && !ALLOW_DEV) {
    return res.status(400).json({ ok: false, error: 'Server not configured: BOT_TOKEN is required' })
  }

  let userId = 'dev-user-42'
  if (BOT_TOKEN) {
    const ver = verifyInitData(initData)
    if (!ver.ok) return res.status(403).json({ ok: false, error: 'initData verification failed', reason: ver.reason })
    userId = ver.userId
  } else if (!ALLOW_DEV) {
    return res.status(403).json({ ok: false, error: 'Not allowed in dev mode' })
  }

  // Daily limit
  const today = new Date().toISOString().slice(0, 10)
  const rec = userDailySpins[userId] || { date: today, count: 0 }
  if (rec.date !== today) {
    rec.date = today
    rec.count = 0
  }
  if (rec.count >= SPINS_PER_DAY) {
    return res.status(429).json({ ok: false, error: 'daily_limit', message: `Лимит ${SPINS_PER_DAY} попыток в сутки исчерпан` })
  }

  // Weighted random choice
  const totalWeight = prizes.reduce((acc, p) => acc + (p.weight || 1), 0)
  let r = Math.random() * totalWeight
  let idx = 0
  for (let i = 0; i < prizes.length; i++) {
    r -= (prizes[i].weight || 1)
    if (r <= 0) { idx = i; break }
  }
  const prize = prizes[idx]

  rec.count += 1
  rec.lastPrize = { id: prize.id, label: prize.label, at: Date.now() }
  userDailySpins[userId] = rec

  res.json({ ok: true, index: idx, prize })
})

// serve static files (frontend) from /public
app.use('/', express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`[telegram-roulette-miniapp] listening on http://localhost:${PORT}`)
})
