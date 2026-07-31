'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = {
  bg: "#FFFFFF",
  bgSubtle: "#F7F8FA",
  border: "#E7E9EE",
  textPrimary: "#15181F",
  textMuted: "#6B7280",
  textFaint: "#9AA1AC",
  primary: "#15181F",
  primarySoft: "#EAEAEC",
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu không đúng'
        : err.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: COLORS.bgSubtle }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 3px rgba(16,24,40,0.08)" }}>
        <div className="text-center mb-6">
          <div className="text-2xl font-bold mb-1" style={{ color: COLORS.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>Quản lý ca</div>
          <div className="text-sm" style={{ color: COLORS.textFaint }}>Đăng nhập để quản lý</div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.textMuted }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.textMuted }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
            />
          </div>

          {error && (
            <div className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold mt-1 disabled:opacity-50"
            style={{ background: COLORS.primary, color: "#FFFFFF" }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
