import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { hasSupabaseConfig } from '../../lib/supabase'
import { LoginCharacters, type CharacterInteraction } from './LoginCharacters'
import logoImage from '../../logodudde.png'
import toast from 'react-hot-toast'
import './AuthPage.css'

// ─── Google SVG icon ────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// ─── Main AuthPage ──────────────────────────────────────
export function AuthPage() {
  // ═══════════════════════════════════════════════════════
  // ORIGINAL AUTH STATE & LOGIC — UNCHANGED
  // ═══════════════════════════════════════════════════════
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { login, register, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!hasSupabaseConfig) {
      const msg = 'System Configuration Error: Missing Supabase environment variables. Please check your Vercel settings or local .env.'
      setError(msg)
      toast.error(msg)
      return
    }

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (isLogin) {
      const user = await login(email, password)
      if (!user) {
        const storeError = useAuthStore.getState().error || 'Invalid email or password.'
        setError(storeError)
        toast.error(storeError)
      }
    } else {
      // Confirm password validation
      if (password !== confirmPassword) {
        const msg = 'Passwords do not match. Please try again.'
        setError(msg)
        toast.error(msg)
        return
      }

      const result = await register(email, password)
      if (!result.user) {
        const storeError = useAuthStore.getState().error || 'Registration failed.'
        setError(storeError)
        toast.error(storeError)
      } else if (result.pendingApproval) {
        // Registration succeeded but account is pending
        toast.success('Registration successful! Your account is pending approval from the Super Admin.', { duration: 6000 })
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setIsLogin(true)
        setError('')
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // NEW UI STATE — for character interactions only
  // ═══════════════════════════════════════════════════════
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [eyeIconHovered, setEyeIconHovered] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)

  // RAF-throttled mouse tracking
  const rafRef = useRef(0)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({ x: e.clientX, y: e.clientY })
    })
  }, [])

  // ═══════════════════════════════════════════════════════
  // Character interaction state derivation
  // ═══════════════════════════════════════════════════════
  const interaction: CharacterInteraction = useMemo(() => {
    if (eyeIconHovered || showPassword) return 'lookAway'
    if (buttonHovered) return 'buttonHover'
    if (passwordFocused) return 'password'
    if (emailFocused) return 'email'
    return 'idle'
  }, [eyeIconHovered, showPassword, buttonHovered, passwordFocused, emailFocused])

  // ═══════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════
  return (
    <div className="auth-page-root" onMouseMove={handleMouseMove}>
      {/* ─── LEFT PANEL: Characters ─── */}
      <div className="auth-left-panel">
        <div className="auth-characters-scene">
          <LoginCharacters
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            interaction={interaction}
          />
        </div>
        <div className="auth-left-branding">
          <img src={logoImage} alt="Trading Journal" className="auth-left-logo" />
          <h2>Trading Journal</h2>
          <p>Track, analyze, and improve your trading performance</p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login form ─── */}
      <div className="auth-right-panel">
        <motion.div
          className="auth-form-container"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Heading */}
          <h1 className="auth-form-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-form-subtitle">
            {isLogin
              ? 'Enter your credentials to access your trading journal'
              : 'Start your trading journey with a free account'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Error */}
            {error && (
              <motion.div
                className="auth-error-msg"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                key={error}
              >
                {error}
              </motion.div>
            )}

            {/* Email field */}
            <div className="auth-form-field">
              <label className="auth-form-label" htmlFor="auth-email">
                Email address
              </label>
              <div className="auth-form-input-wrapper">
                <input
                  id="auth-email"
                  type="email"
                  className="auth-form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="auth-form-field">
              <label className="auth-form-label" htmlFor="auth-password">
                Password
              </label>
              <div className="auth-form-input-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-form-input auth-form-input-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  onMouseEnter={() => setEyeIconHovered(true)}
                  onMouseLeave={() => setEyeIconHovered(false)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.8} />
                  ) : (
                    <Eye size={18} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password field — registration only */}
            {!isLogin && (
              <div className="auth-form-field">
                <label className="auth-form-label" htmlFor="auth-confirm-password">
                  Confirm Password
                </label>
                <div className="auth-form-input-wrapper">
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-form-input auth-form-input-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} strokeWidth={1.8} />
                    ) : (
                      <Eye size={18} strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me / Forgot password */}
            {isLogin && (
              <div className="auth-form-row">
                <label className="auth-remember-me">
                  <input
                    type="checkbox"
                    className="auth-remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <button type="button" className="auth-forgot-link">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="auth-submit-btn"
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading && <span className="auth-spinner" />}
              {isLoading
                ? 'Processing...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <div className="auth-divider-line" />
          </div>

          {/* Google login — visual only (no existing Google auth integration) */}
          <button type="button" className="auth-google-btn">
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Switch login ↔ register */}
          <p className="auth-switch-text">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setConfirmPassword('')
              }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
