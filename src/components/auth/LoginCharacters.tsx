import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────
export type CharacterInteraction =
  | 'idle'
  | 'email'
  | 'password'
  | 'lookAway'
  | 'buttonHover'

interface Props {
  mouseX: number
  mouseY: number
  interaction: CharacterInteraction
}

// ─── Canvas ──────────────────────────────────────────────────
const VW = 440
const VH = 340
const GY = 285

// ─── Mouth paths (M…C structure for smooth interpolation) ───
const MO = {
  smile:   'M-7,0 C-3.5,6 3.5,6 7,0',
  big:     'M-9,-1 C-5,10 5,10 9,-1',
  flat:    'M-6,0 C-3,0 3,0 6,0',
  worried: 'M-5,2 C-2,-3 2,-3 5,2',
  grimace: 'M-6,0 C-3,3 3,-3 6,0',
  smirk:   'M-5,1 C-2,-1 2,4 5,-1',
  nervous: 'M-5,0 C-3,2 3,-2 5,0',
  excited: 'M-9,-2 C-5,10 5,10 9,-2',
}

// ─── Eyebrow paths (M…Q structure for interpolation) ────────
const BR = {
  neutral:  'M-8,0 Q0,-2.5 8,0',
  raised:   'M-8,3 Q0,-6 8,3',
  furrowL:  'M-8,-1 Q-2,-2.5 8,3',
  furrowR:  'M-8,3 Q2,-2.5 8,-1',
  worriedL: 'M-8,2 Q-1,-4.5 8,0',
  worriedR: 'M-8,0 Q1,-4.5 8,2',
  skepticL: 'M-8,0 Q0,-2 8,0',
  skepticR: 'M-8,3 Q0,-5.5 8,3',
  squint:   'M-8,-1 Q0,2 8,-1',
  excited:  'M-8,4.5 Q0,-7 8,4.5',
}

// ─── Character config ───────────────────────────────────────
// RENDER ORDER: first element = furthest back, last = front
interface CharDef {
  id: string
  x: number
  color: string
  darkBody?: boolean
  bodyType: 'path' | 'rect'
  bodyPath?: string
  bodyRect?: { x: number; y: number; width: number; height: number; rx: number }
  shadowRx: number
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  scleraR: number
  pupilR: number
  maxPup: number
  browGap: number
  browColor: string
  mouthPos: { x: number; y: number }
  mouthColor: string
  floatDur: number
  floatDelay: number
  floatAmt: number
  swayAmt: number
  laDelay: number
  laRotate: number
}

const CHARS: CharDef[] = [
  // ── 1. PURPLE (back-left, tallest) ──
  {
    id: 'purple',
    x: 128,
    color: '#7C5CFC',
    bodyType: 'rect',
    bodyRect: { x: -31, y: -172, width: 62, height: 172, rx: 22 },
    shadowRx: 34,
    leftEye: { x: -12, y: -126 },
    rightEye: { x: 12, y: -126 },
    scleraR: 8.5,
    pupilR: 4,
    maxPup: 3.5,
    browGap: 5,
    browColor: '#5236b8',
    mouthPos: { x: 0, y: -100 },
    mouthColor: '#5236b8',
    floatDur: 4.2,
    floatDelay: 0.4,
    floatAmt: 7,
    swayAmt: 2.5,
    laDelay: 0.12,
    laRotate: 0,
  },
  // ── 2. DARK (back-center, narrow) ──
  {
    id: 'dark',
    x: 218,
    color: '#1E2D3D',
    darkBody: true,
    bodyType: 'rect',
    bodyRect: { x: -17, y: -132, width: 34, height: 132, rx: 14 },
    shadowRx: 22,
    leftEye: { x: -7, y: -96 },
    rightEye: { x: 7, y: -96 },
    scleraR: 6.5,
    pupilR: 3,
    maxPup: 2.8,
    browGap: 4,
    browColor: '#c8d8e8',
    mouthPos: { x: 0, y: -70 },
    mouthColor: '#c8d8e8',
    floatDur: 3.4,
    floatDelay: 0.8,
    floatAmt: 4,
    swayAmt: 1.5,
    laDelay: 0.06,
    laRotate: 8,
  },
  // ── 3. YELLOW (front-right, medium dome) ──
  {
    id: 'yellow',
    x: 268,
    color: '#F5C842',
    bodyType: 'path',
    bodyPath: 'M-44,0 C-44,-12 -38,-42 -20,-52 C-8,-58 8,-58 20,-52 C38,-42 44,-12 44,0 Z',
    shadowRx: 38,
    leftEye: { x: -16, y: -34 },
    rightEye: { x: 14, y: -34 },
    scleraR: 8,
    pupilR: 3.8,
    maxPup: 3.5,
    browGap: 4,
    browColor: '#a58318',
    mouthPos: { x: -1, y: -14 },
    mouthColor: '#a58318',
    floatDur: 3.8,
    floatDelay: 0.2,
    floatAmt: 5.5,
    swayAmt: 2,
    laDelay: 0.2,
    laRotate: -14,
  },
  // ── 4. ORANGE BLOB — FRONT, biggest, dominant ──
  {
    id: 'blob',
    x: 172,
    color: '#F4845F',
    bodyType: 'path',
    bodyPath: 'M-76,0 C-76,-16 -68,-56 -50,-74 C-35,-87 -18,-96 0,-96 C18,-96 35,-87 50,-74 C68,-56 76,-16 76,0 Z',
    shadowRx: 62,
    leftEye: { x: -20, y: -56 },
    rightEye: { x: 20, y: -56 },
    scleraR: 10,
    pupilR: 4.8,
    maxPup: 4.2,
    browGap: 5,
    browColor: '#b84530',
    mouthPos: { x: 0, y: -28 },
    mouthColor: '#b84530',
    floatDur: 3.6,
    floatDelay: 0,
    floatAmt: 5,
    swayAmt: 1.8,
    laDelay: 0,
    laRotate: -28,
  },
]

// ─── Expression system ──────────────────────────────────────
interface Expr {
  lB: string; rB: string; mo: string
  oMo: boolean; oRx: number; oRy: number
  eyeY: number; pSc: number
}

const DEF: Expr = {
  lB: BR.neutral, rB: BR.neutral,
  mo: MO.smile, oMo: false,
  oRx: 3.5, oRy: 4.5, eyeY: 1, pSc: 1,
}

function getExpr(id: string, st: CharacterInteraction, ph: number): Expr {
  const e = { ...DEF }

  if (id === 'blob') {
    if (st === 'idle')          { e.mo = MO.smile }
    else if (st === 'email')    { e.lB = BR.raised; e.rB = BR.raised; e.mo = ph === 1 ? MO.smirk : MO.smile; e.eyeY = 1.08 }
    else if (st === 'password') { e.lB = BR.furrowL; e.rB = BR.furrowR; e.mo = ph === 1 ? MO.nervous : MO.worried; e.eyeY = 0.92 }
    else if (st === 'lookAway') { e.lB = BR.raised; e.rB = BR.raised; e.oMo = true; e.oRx = 4.5; e.oRy = 5.5; e.eyeY = 1.2 }
    else if (st === 'buttonHover') { e.lB = BR.excited; e.rB = BR.excited; e.mo = MO.excited; e.eyeY = 1.12 }
  }
  else if (id === 'purple') {
    if (st === 'idle')          { e.mo = MO.smile }
    else if (st === 'email')    { e.lB = BR.neutral; e.rB = BR.skepticR; e.mo = ph === 1 ? MO.smirk : MO.smile; e.eyeY = 1.05 }
    else if (st === 'password') { e.lB = BR.furrowL; e.rB = BR.furrowR; e.mo = MO.flat; e.eyeY = 0.94; e.pSc = 0.82 }
    else if (st === 'lookAway') { e.lB = BR.worriedL; e.rB = BR.worriedR; e.mo = MO.grimace }
    else if (st === 'buttonHover') { e.lB = BR.raised; e.rB = BR.raised; e.mo = MO.big; e.eyeY = 1.08 }
  }
  else if (id === 'dark') {
    if (st === 'idle')          { e.lB = BR.worriedL; e.rB = BR.worriedR; e.mo = MO.nervous }
    else if (st === 'email')    { e.lB = BR.raised; e.rB = BR.raised; e.mo = ph === 1 ? MO.flat : MO.nervous; e.eyeY = 1.1 }
    else if (st === 'password') { e.lB = BR.furrowL; e.rB = BR.furrowR; e.mo = MO.worried; e.eyeY = 0.88 }
    else if (st === 'lookAway') { e.lB = BR.squint; e.rB = BR.squint; e.mo = MO.grimace; e.eyeY = 0.04 }
    else if (st === 'buttonHover') { e.lB = BR.raised; e.rB = BR.raised; e.mo = MO.smile; e.eyeY = 1.06 }
  }
  else if (id === 'yellow') {
    if (st === 'idle')          { e.mo = MO.big }
    else if (st === 'email')    { e.lB = BR.raised; e.rB = BR.raised; e.mo = ph === 1 ? MO.excited : MO.big; e.eyeY = 1.12 }
    else if (st === 'password') { e.lB = BR.skepticL; e.rB = BR.skepticR; e.mo = MO.smirk; e.eyeY = 0.86; e.pSc = 0.82 }
    else if (st === 'lookAway') { e.lB = BR.raised; e.rB = BR.raised; e.oMo = true; e.oRx = 2.8; e.oRy = 3.2; e.eyeY = 0.92 }
    else if (st === 'buttonHover') { e.lB = BR.excited; e.rB = BR.excited; e.mo = MO.excited; e.eyeY = 1.16 }
  }
  return e
}

// ─── Squeeze-line data (dark block) ─────────────────────────
const SQ_L = [
  { x1: -9, y1: -5, x2: -14, y2: -9 },
  { x1: -10, y1: 0, x2: -15, y2: 0 },
  { x1: -9, y1: 5, x2: -13, y2: 9 },
]
const SQ_R = [
  { x1: 9, y1: -5, x2: 14, y2: -9 },
  { x1: 10, y1: 0, x2: 15, y2: 0 },
  { x1: 9, y1: 5, x2: 13, y2: 9 },
]

// ═════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════
export function LoginCharacters({ mouseX, mouseY, interaction }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [blinks, setBlinks] = useState<Record<string, boolean>>({
    blob: false, purple: false, dark: false, yellow: false,
  })
  const [phase, setPhase] = useState(0)

  // ── Blinking ──
  useEffect(() => {
    const ids: number[] = []
    const go = (key: string) => {
      const d = 2400 + Math.random() * 3200
      const id = window.setTimeout(() => {
        setBlinks(p => ({ ...p, [key]: true }))
        const cid = window.setTimeout(() => {
          setBlinks(p => ({ ...p, [key]: false }))
          go(key)
        }, 110 + Math.random() * 50)
        ids.push(cid)
      }, d)
      ids.push(id)
    }
    CHARS.forEach(c => go(c.id))
    return () => ids.forEach(clearTimeout)
  }, [])

  // ── Expression phase cycling ──
  useEffect(() => {
    if (interaction === 'email' || interaction === 'password') {
      const iv = setInterval(() => setPhase(p => (p + 1) % 3), 2200)
      return () => clearInterval(iv)
    }
    setPhase(0)
  }, [interaction])

  // ── Mouse → SVG coords ──
  const ms = (() => {
    if (!svgRef.current) return { x: VW * 1.4, y: VH * 0.35 }
    const r = svgRef.current.getBoundingClientRect()
    if (r.width === 0) return { x: VW * 1.4, y: VH * 0.35 }
    return {
      x: ((mouseX - r.left) / r.width) * VW,
      y: ((mouseY - r.top) / r.height) * VH,
    }
  })()

  // ── Pupil offset ──
  const pup = (c: CharDef, ex: number, ey: number) => {
    const wx = c.x + ex, wy = GY + ey
    if (interaction === 'lookAway') {
      if (c.id === 'blob')   return { x: -c.maxPup, y: -c.maxPup * 0.3 }
      if (c.id === 'purple') return { x: 0, y: 0 }
      if (c.id === 'dark')   return { x: 0, y: 0 }
      if (c.id === 'yellow') return { x: c.maxPup * 0.15, y: -c.maxPup }
    }
    const dx = ms.x - wx, dy = ms.y - wy
    const a = Math.atan2(dy, dx)
    const t = Math.min(Math.sqrt(dx * dx + dy * dy) / 100, 1)
    return { x: Math.cos(a) * c.maxPup * t, y: Math.sin(a) * c.maxPup * t * 0.6 }
  }

  // ── Continuous cursor-based body lean ──
  const cursorLean = (c: CharDef) => {
    return Math.max(-7, Math.min(7, ((ms.x - c.x) / 280) * 5.5))
  }

  const isLA = interaction === 'lookAway'

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', maxWidth: '500px', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Decorative dots ── */}
      <circle cx="38" cy="45" r="4" fill="#F4845F" opacity="0.12" />
      <circle cx="400" cy="30" r="3" fill="#7C5CFC" opacity="0.08" />
      <rect x="410" y="170" width="6" height="6" rx="2" fill="#F5C842" opacity="0.1" transform="rotate(45 413 173)" />
      <circle cx="22" cy="180" r="4.5" fill="#1E2D3D" opacity="0.05" />

      {/* ── Ground ── */}
      <line x1="40" y1={GY + 5} x2={370} y2={GY + 5} stroke="#DDD8CE" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* ━━━ CHARACTERS (back→front: purple, dark, yellow, orange) ━━━ */}
      {CHARS.map((c) => {
        const ex = getExpr(c.id, interaction, phase)
        const isB = blinks[c.id] && !isLA
        const lp = pup(c, c.leftEye.x, c.leftEye.y)
        const rp = pup(c, c.rightEye.x, c.rightEye.y)

        // ── Body rotation: cursor lean + state offset ──
        let finalRot: number
        let finalScale = 1
        if (isLA) {
          finalRot = c.laRotate
          finalScale = 0.97
        } else if (interaction === 'buttonHover') {
          finalRot = cursorLean(c) * 0.5
          finalScale = 1.06
        } else {
          const stOff = interaction === 'email' ? 1.5 : interaction === 'password' ? -1 : 0
          finalRot = cursorLean(c) + stOff
          finalScale = interaction === 'email' ? 1.02 : interaction === 'password' ? 0.98 : 1
        }

        // ── Eye openness ──
        const eyeScY = isB ? 0.06
          : (isLA && c.id === 'dark') ? 0.04
          : ex.eyeY < 1 ? ex.eyeY : 1
        const eyeScX = ex.eyeY > 1 ? 0.7 + ex.eyeY * 0.3 : 1

        return (
          <g key={c.id} transform={`translate(${c.x},${GY})`}>

            {/* ── Shadow ── */}
            <motion.ellipse cx={0} cy={7} ry={3} fill="rgba(0,0,0,0.06)"
              animate={{ rx: [c.shadowRx, c.shadowRx * 0.78, c.shadowRx], opacity: [0.06, 0.03, 0.06] }}
              transition={{ duration: c.floatDur, repeat: Infinity, ease: 'easeInOut', delay: c.floatDelay }}
            />

            {/* ── Float (y bounce + x sway for organic feel) ── */}
            <motion.g
              animate={{
                y: [0, -c.floatAmt * 0.4, -c.floatAmt, -c.floatAmt * 0.6, 0],
                x: [0, c.swayAmt, 0, -c.swayAmt * 0.6, 0],
              }}
              transition={{
                y: { duration: c.floatDur, repeat: Infinity, ease: 'easeInOut', delay: c.floatDelay },
                x: { duration: c.floatDur * 1.35, repeat: Infinity, ease: 'easeInOut', delay: c.floatDelay },
              }}
            >
              {/* ── Body lean (cursor-tracked + state) ── */}
              <motion.g
                animate={{ rotate: finalRot, scale: finalScale }}
                transition={{
                  rotate: {
                    duration: isLA ? 0.45 : 0.25,
                    ease: isLA ? [0.34, 1.56, 0.64, 1] : 'easeOut',
                    delay: isLA ? c.laDelay : 0,
                  },
                  scale: { duration: 0.3, ease: 'easeOut', delay: isLA ? c.laDelay : 0 },
                }}
              >
                {/* ━━ BODY ━━ */}
                {c.bodyType === 'path' && c.bodyPath
                  ? <path d={c.bodyPath} fill={c.color} />
                  : c.bodyRect
                    ? <rect {...c.bodyRect} fill={c.color} />
                    : null}

                {/* ━━ EYEBROWS ━━ */}
                <g transform={`translate(${c.leftEye.x}, ${c.leftEye.y - c.scleraR - c.browGap})`}>
                  <motion.path d={ex.lB} animate={{ d: ex.lB }}
                    transition={{ duration: 0.4, delay: c.laDelay }}
                    fill="none" stroke={c.browColor} strokeWidth={1.8} strokeLinecap="round" />
                </g>
                <g transform={`translate(${c.rightEye.x}, ${c.rightEye.y - c.scleraR - c.browGap})`}>
                  <motion.path d={ex.rB} animate={{ d: ex.rB }}
                    transition={{ duration: 0.4, delay: c.laDelay }}
                    fill="none" stroke={c.browColor} strokeWidth={1.8} strokeLinecap="round" />
                </g>

                {/* ━━ LEFT EYE ━━ */}
                <g transform={`translate(${c.leftEye.x}, ${c.leftEye.y})`}>
                  <motion.g
                    animate={{ scaleY: eyeScY, scaleX: eyeScX }}
                    transition={{ duration: isB ? 0.08 : 0.25, ease: 'easeInOut', delay: isB ? 0 : c.laDelay }}
                  >
                    <circle cx={0} cy={0} r={c.scleraR} fill="white" />
                    <motion.circle cx={0} cy={0} r={c.pupilR * ex.pSc} fill="#1a1a2e"
                      animate={{ x: lp.x, y: lp.y }}
                      transition={{ duration: 0.18, ease: 'easeOut' }} />
                  </motion.g>
                </g>

                {/* ━━ RIGHT EYE ━━ */}
                <g transform={`translate(${c.rightEye.x}, ${c.rightEye.y})`}>
                  <motion.g
                    animate={{ scaleY: eyeScY, scaleX: eyeScX }}
                    transition={{ duration: isB ? 0.08 : 0.25, ease: 'easeInOut', delay: isB ? 0 : c.laDelay }}
                  >
                    <circle cx={0} cy={0} r={c.scleraR} fill="white" />
                    <motion.circle cx={0} cy={0} r={c.pupilR * ex.pSc} fill="#1a1a2e"
                      animate={{ x: rp.x, y: rp.y }}
                      transition={{ duration: 0.18, ease: 'easeOut' }} />
                  </motion.g>
                </g>

                {/* ━━ MOUTH ━━ */}
                <g transform={`translate(${c.mouthPos.x}, ${c.mouthPos.y})`}>
                  <motion.path d={ex.mo}
                    animate={{ d: ex.mo, opacity: ex.oMo ? 0 : 1 }}
                    transition={{ duration: 0.4, delay: c.laDelay }}
                    fill="none" stroke={c.mouthColor} strokeWidth={2} strokeLinecap="round" />
                  <motion.ellipse cx={0} cy={0}
                    fill={c.mouthColor} fillOpacity={0.12}
                    stroke={c.mouthColor} strokeWidth={1.8}
                    animate={{ rx: ex.oMo ? ex.oRx : 0.1, ry: ex.oMo ? ex.oRy : 0.1, opacity: ex.oMo ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: c.laDelay }} />
                </g>

                {/* ════════════════════════════════════════════ */}
                {/*  CHARACTER-SPECIFIC DETAILS                 */}
                {/* ════════════════════════════════════════════ */}

                {/* ── BLOB: blush ── */}
                {c.id === 'blob' && (
                  <>
                    <motion.circle cx={-36} cy={-36} r={7} fill="#FF9F9F"
                      animate={{ opacity: isLA ? 0.5 : interaction === 'buttonHover' ? 0.35 : 0 }}
                      transition={{ duration: 0.3 }} />
                    <motion.circle cx={36} cy={-36} r={7} fill="#FF9F9F"
                      animate={{ opacity: isLA ? 0.5 : interaction === 'buttonHover' ? 0.35 : 0 }}
                      transition={{ duration: 0.3 }} />
                  </>
                )}

                {/* ── PURPLE: covering hands ── */}
                {c.id === 'purple' && (
                  <>
                    <motion.rect width={25} height={18} rx={9} fill="#9B83FF"
                      initial={{ x: -34, y: -70, opacity: 0 }}
                      animate={{ x: isLA ? -24 : -34, y: isLA ? -136 : -70, opacity: isLA ? 1 : 0 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 18, delay: isLA ? 0.1 : 0 }} />
                    <motion.rect width={25} height={18} rx={9} fill="#9B83FF"
                      initial={{ x: 9, y: -70, opacity: 0 }}
                      animate={{ x: isLA ? -1 : 9, y: isLA ? -136 : -70, opacity: isLA ? 1 : 0 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 18, delay: isLA ? 0.16 : 0 }} />
                    {isLA && (
                      <>
                        <motion.line x1={-16} y1={-132} x2={-16} y2={-122} stroke="#8a6ff0" strokeWidth={0.8} strokeLinecap="round"
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.26 }} />
                        <motion.line x1={-8} y1={-132} x2={-8} y2={-122} stroke="#8a6ff0" strokeWidth={0.8} strokeLinecap="round"
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.29 }} />
                        <motion.line x1={8} y1={-132} x2={8} y2={-122} stroke="#8a6ff0" strokeWidth={0.8} strokeLinecap="round"
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.26 }} />
                        <motion.line x1={16} y1={-132} x2={16} y2={-122} stroke="#8a6ff0" strokeWidth={0.8} strokeLinecap="round"
                          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.29 }} />
                      </>
                    )}
                  </>
                )}

                {/* ── DARK: squeeze lines + sweat ── */}
                {c.id === 'dark' && (
                  <>
                    {SQ_L.map((l, j) => (
                      <motion.line key={`sl${j}`}
                        x1={c.leftEye.x + l.x1} y1={c.leftEye.y + l.y1}
                        x2={c.leftEye.x + l.x2} y2={c.leftEye.y + l.y2}
                        stroke={c.browColor} strokeWidth={1.2} strokeLinecap="round"
                        animate={{ opacity: isLA ? 0.7 : 0 }}
                        transition={{ duration: isLA ? 0.12 : 0.2, delay: isLA ? j * 0.04 + 0.06 : 0 }} />
                    ))}
                    {SQ_R.map((l, j) => (
                      <motion.line key={`sr${j}`}
                        x1={c.rightEye.x + l.x1} y1={c.rightEye.y + l.y1}
                        x2={c.rightEye.x + l.x2} y2={c.rightEye.y + l.y2}
                        stroke={c.browColor} strokeWidth={1.2} strokeLinecap="round"
                        animate={{ opacity: isLA ? 0.7 : 0 }}
                        transition={{ duration: isLA ? 0.12 : 0.2, delay: isLA ? j * 0.04 + 0.06 : 0 }} />
                    ))}
                    <motion.ellipse cx={c.rightEye.x + 14} cy={c.rightEye.y - 6} rx={2} ry={3}
                      fill="#87CEEB" fillOpacity={0.7}
                      animate={{ opacity: isLA ? 1 : 0, y: isLA ? 4 : 0 }}
                      transition={{ duration: 0.3, delay: 0.15 }} />
                  </>
                )}

                {/* ── YELLOW: blush + music note ── */}
                {c.id === 'yellow' && (
                  <>
                    <motion.circle cx={-28} cy={-24} r={5.5} fill="#FFA07A"
                      animate={{ opacity: isLA ? 0.4 : 0 }} transition={{ duration: 0.3, delay: c.laDelay }} />
                    <motion.circle cx={24} cy={-24} r={5.5} fill="#FFA07A"
                      animate={{ opacity: isLA ? 0.4 : 0 }} transition={{ duration: 0.3, delay: c.laDelay }} />
                    {isLA && (
                      <motion.g initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0.8], y: -14 }}
                        transition={{ duration: 1.5, delay: 0.4 }}>
                        <text x={c.mouthPos.x + 12} y={c.mouthPos.y - 6} fontSize="10"
                          fill={c.browColor} fontFamily="serif" opacity={0.6}>♪</text>
                      </motion.g>
                    )}
                  </>
                )}

              </motion.g>
            </motion.g>
          </g>
        )
      })}
    </svg>
  )
}
