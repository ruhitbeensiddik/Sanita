import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { hasSupabaseConfig } from '../../lib/supabase'
import { LoginCharacters, type CharacterInteraction } from './LoginCharacters'
import logoImage from '../../forexdairy-logo.png'
import toast from 'react-hot-toast'
import './AuthPage.css'

// ─── Main AuthPage ──────────────────────────────────────
export function AuthPage() {
  // ═══════════════════════════════════════════════════════
  // ORIGINAL AUTH STATE & LOGIC — UNCHANGED
  // ═══════════════════════════════════════════════════════
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
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
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        const msg = 'Email addresses do not match.'
        setError(msg)
        toast.error(msg)
        return
      }

      if (password !== confirmPassword) {
        const msg = 'Passwords do not match. Please try again.'
        setError(msg)
        toast.error(msg)
        return
      }

      if (!firstName.trim() || !lastName.trim()) {
        const msg = 'Please enter your first name and last name.'
        setError(msg)
        toast.error(msg)
        return
      }

      const result = await register(email.trim(), password, firstName.trim(), lastName.trim())
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
        setFirstName('')
        setLastName('')
        setConfirmEmail('')
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
          <img src={logoImage} alt="Forex Dairy" className="auth-left-logo" />
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

            {/* First Name & Last Name — registration only */}
            {!isLogin && (
              <div className="auth-form-field" style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="auth-form-label" htmlFor="auth-first-name">
                    First Name
                  </label>
                  <div className="auth-form-input-wrapper">
                    <input
                      id="auth-first-name"
                      type="text"
                      className="auth-form-input"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="auth-form-label" htmlFor="auth-last-name">
                    Last Name
                  </label>
                  <div className="auth-form-input-wrapper">
                    <input
                      id="auth-last-name"
                      type="text"
                      className="auth-form-input"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>
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

            {/* Confirm Email — registration only */}
            {!isLogin && (
              <div className="auth-form-field">
                <label className="auth-form-label" htmlFor="auth-confirm-email">
                  Confirm Email
                </label>
                <div className="auth-form-input-wrapper">
                  <input
                    id="auth-confirm-email"
                    type="email"
                    className="auth-form-input"
                    placeholder="you@example.com"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

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

          {/* Login info message */}
          {isLogin && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '13px', color: 'var(--color-muted-foreground, #888)', lineHeight: 1.5 }}>
              Please sign up first if you do not have an account.<br />
              Google sign-in is currently disabled.
            </div>
          )}

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
                setFirstName('')
                setLastName('')
                setConfirmEmail('')
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
