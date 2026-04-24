import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useTradeStore } from '../store/tradeStore'
import { useAuthStore } from '../store/authStore'
import { useAccountStore } from '../store/accountStore'
import { Trade } from '../types/trade'
import { ImageUpload } from './ui/ImageUpload'
import {
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  ImageIcon,
  DollarSign,
  Save,
  Crosshair,
  CalendarDays,
  Minus,
} from 'lucide-react'

interface TradeFormModalProps {
  isOpen: boolean
  onClose: () => void
  editTrade?: Trade | null
  prefillDate?: string
  duplicateFrom?: Trade | null
}

// Helper to get images array from trade (handles legacy single-image fields)
function getTradeImages(trade: Trade, type: 'analysis' | 'result'): string[] {
  if (type === 'analysis') {
    if (trade.analysisImages && trade.analysisImages.length > 0) return trade.analysisImages
    if (trade.analysisImage) return [trade.analysisImage]
    return []
  } else {
    if (trade.resultImages && trade.resultImages.length > 0) return trade.resultImages
    if (trade.resultImage) return [trade.resultImage]
    return []
  }
}

interface FormData {
  pair: string
  date: string
  time: string
  session: string
  direction: string
  account: string
  entryPrice: string
  stopLoss: string
  takeProfit: string
  lotSize: string
  riskReward: string
  exitPrice: string
  profitLoss: string
  result: string
  emotions: string
  mistakes: string
  tradeAnalysis: string
  analysisImages: string[]
  resultImages: string[]
}

interface FormErrors {
  [key: string]: string
}

const SESSIONS = ['', 'London', 'New York', 'Tokyo', 'Sydney', 'Overlap']
const DIRECTIONS = ['-', 'Long', 'Short']
const ACCOUNTS = ['Demo', 'Funded', 'Personal']
const RESULTS = ['Breakeven', 'Win', 'Loss']

function getDefaultFormData(date?: string): FormData {
  return {
    pair: '',
    date: date || new Date().toISOString().split('T')[0],
    time: '',
    session: '',
    direction: '-',
    account: 'Demo',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: '',
    riskReward: '',
    exitPrice: '',
    profitLoss: '',
    result: 'Breakeven',
    emotions: '',
    mistakes: '',
    tradeAnalysis: '',
    analysisImages: [],
    resultImages: [],
  }
}

function tradeToFormData(trade: Trade): FormData {
  return {
    pair: trade.pair || '',
    date: trade.date || '',
    time: trade.time || '',
    session: trade.session || '',
    direction: trade.direction || '-',
    account: trade.account || 'Demo',
    entryPrice: trade.entryPrice != null ? String(trade.entryPrice) : '',
    stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : '',
    takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : '',
    lotSize: trade.lotSize != null ? String(trade.lotSize) : '',
    riskReward: trade.riskReward != null ? String(trade.riskReward) : '',
    exitPrice: trade.exitPrice != null ? String(trade.exitPrice) : '',
    profitLoss: trade.profitLoss != null ? String(trade.profitLoss) : '',
    result: trade.result || 'Breakeven',
    emotions: trade.emotions || '',
    mistakes: trade.mistakes || '',
    tradeAnalysis: trade.tradeAnalysis || '',
    analysisImages: getTradeImages(trade, 'analysis'),
    resultImages: getTradeImages(trade, 'result'),
  }
}

export function TradeFormModal({ isOpen, onClose, editTrade, prefillDate, duplicateFrom }: TradeFormModalProps) {
  const { addTrade, updateTrade } = useTradeStore()
  const { currentUser } = useAuthStore()
  const { activeAccountId } = useAccountStore()
  const [formData, setFormData] = useState<FormData>(getDefaultFormData())
  const [errors, setErrors] = useState<FormErrors>({})
  const [activeSection, setActiveSection] = useState(0)

  const isEditing = !!editTrade

  useEffect(() => {
    if (!isOpen) return

    if (editTrade) {
      setFormData(tradeToFormData(editTrade))
    } else if (duplicateFrom) {
      const data = tradeToFormData(duplicateFrom)
      data.date = new Date().toISOString().split('T')[0]
      data.analysisImages = []
      data.resultImages = []
      setFormData(data)
    } else {
      setFormData(getDefaultFormData(prefillDate))
    }
    setErrors({})
    setActiveSection(0)
  }, [isOpen, editTrade, duplicateFrom, prefillDate])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const updateField = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }, [errors])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.date) newErrors.date = 'Date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors before saving.')
      return
    }

    const parseNum = (val: string) => {
      const n = parseFloat(val)
      return isNaN(n) ? 0 : n
    }

    const tradeData: Omit<Trade, 'id'> = {
      userId: currentUser?.id,
      accountId: activeAccountId || undefined,
      pair: formData.pair,
      date: formData.date,
      time: formData.time || undefined,
      session: (formData.session as Trade['session']) || '',
      direction: formData.direction as Trade['direction'],
      account: formData.account as Trade['account'],
      entryPrice: formData.entryPrice ? parseNum(formData.entryPrice) : undefined,
      stopLoss: formData.stopLoss ? parseNum(formData.stopLoss) : undefined,
      takeProfit: formData.takeProfit ? parseNum(formData.takeProfit) : undefined,
      lotSize: formData.lotSize ? parseNum(formData.lotSize) : undefined,
      riskReward: parseNum(formData.riskReward),
      exitPrice: formData.exitPrice ? parseNum(formData.exitPrice) : undefined,
      profitLoss: parseNum(formData.profitLoss),
      result: formData.result as Trade['result'],
      emotions: formData.emotions,
      mistakes: formData.mistakes || undefined,
      tradeAnalysis: formData.tradeAnalysis || undefined,
      analysisImages: formData.analysisImages.length > 0 ? formData.analysisImages : undefined,
      resultImages: formData.resultImages.length > 0 ? formData.resultImages : undefined,
    }

    if (isEditing && editTrade) {
      updateTrade(editTrade.id, tradeData)
      toast.success('Trade updated successfully!')
    } else {
      addTrade(tradeData)
      toast.success('Trade added successfully!')
    }

    onClose()
  }

  const sections = [
    { label: 'Basic Info', icon: CalendarDays },
    { label: 'Entry & Risk', icon: Crosshair },
    { label: 'Result', icon: DollarSign },
    { label: 'Notes', icon: Brain },
    { label: 'Images', icon: ImageIcon },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-3xl mx-4 my-8 z-10"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="trade-form-modal">
              {/* Header */}
              <div className="trade-form-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {isEditing ? 'Edit Trade' : 'Add New Trade'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? 'Update your trade details' : 'Record your trade with full details'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Section Nav Pills */}
              <div className="trade-form-nav">
                {sections.map((section, idx) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`trade-form-nav-pill ${activeSection === idx ? 'trade-form-nav-pill-active' : ''}`}
                      onClick={() => setActiveSection(idx)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{section.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="trade-form-body">
                  {/* Section 0: Basic Trade Info */}
                  {activeSection === 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="trade-form-section-header">
                        <CalendarDays className="h-5 w-5 text-emerald-500" />
                        <span>Basic Trade Information</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="trade-form-field">
                          <label htmlFor="tf-pair" className="trade-form-label">Pair / Symbol</label>
                          <input id="tf-pair" type="text" className="trade-form-input" placeholder="Enter trading pair (e.g. EURUSD, BTCUSDT)" value={formData.pair} onChange={(e) => updateField('pair', e.target.value)} />
                        </div>

                        <div className="trade-form-field">
                          <label htmlFor="tf-date" className="trade-form-label">Date <span className="text-red-400">*</span></label>
                          <input id="tf-date" type="date" className={`trade-form-input ${errors.date ? 'trade-form-input-error' : ''}`} value={formData.date} onChange={(e) => updateField('date', e.target.value)} />
                          {errors.date && <p className="trade-form-error">{errors.date}</p>}
                        </div>

                        <div className="trade-form-field">
                          <label htmlFor="tf-time" className="trade-form-label">Time</label>
                          <input id="tf-time" type="time" className="trade-form-input" value={formData.time} onChange={(e) => updateField('time', e.target.value)} />
                        </div>

                        <div className="trade-form-field">
                          <label htmlFor="tf-session" className="trade-form-label">Session</label>
                          <select id="tf-session" className="trade-form-input" value={formData.session} onChange={(e) => updateField('session', e.target.value)}>
                            <option value="">Select trading session</option>
                            {SESSIONS.filter(s => s).map(s => (<option key={s} value={s}>{s}</option>))}
                          </select>
                        </div>

                        <div className="trade-form-field">
                          <label className="trade-form-label">Direction</label>
                          <div className="flex gap-2">
                            {DIRECTIONS.map(dir => (
                              <button key={dir} type="button"
                                className={`trade-form-toggle-btn ${formData.direction === dir ? dir === 'Long' ? 'trade-form-toggle-active-green' : dir === 'Short' ? 'trade-form-toggle-active-red' : 'trade-form-toggle-active-neutral' : ''}`}
                                onClick={() => updateField('direction', dir)}
                              >
                                {dir === 'Long' && <TrendingUp className="h-3.5 w-3.5" />}
                                {dir === 'Short' && <TrendingDown className="h-3.5 w-3.5" />}
                                {dir === '-' && <Minus className="h-3.5 w-3.5" />}
                                {dir === '-' ? 'None' : dir}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="trade-form-field">
                          <label htmlFor="tf-account" className="trade-form-label">Account</label>
                          <select id="tf-account" className="trade-form-input" value={formData.account} onChange={(e) => updateField('account', e.target.value)}>
                            {ACCOUNTS.map(a => (<option key={a} value={a}>{a}</option>))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 1: Entry & Risk */}
                  {activeSection === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="trade-form-section-header">
                        <Crosshair className="h-5 w-5 text-orange-500" />
                        <span>Entry & Risk Management</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="trade-form-field">
                          <label htmlFor="tf-entry" className="trade-form-label">Entry Price</label>
                          <input id="tf-entry" type="number" step="any" className="trade-form-input" placeholder="Enter your entry price" value={formData.entryPrice} onChange={(e) => updateField('entryPrice', e.target.value)} />
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-sl" className="trade-form-label">Stop Loss</label>
                          <input id="tf-sl" type="number" step="any" className="trade-form-input" placeholder="Enter stop loss price" value={formData.stopLoss} onChange={(e) => updateField('stopLoss', e.target.value)} />
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-tp" className="trade-form-label">Take Profit</label>
                          <input id="tf-tp" type="number" step="any" className="trade-form-input" placeholder="Enter take profit price" value={formData.takeProfit} onChange={(e) => updateField('takeProfit', e.target.value)} />
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-lot" className="trade-form-label">Lot Size / Position Size</label>
                          <input id="tf-lot" type="number" step="any" className="trade-form-input" placeholder="Enter lot size (e.g. 0.01)" value={formData.lotSize} onChange={(e) => updateField('lotSize', e.target.value)} />
                        </div>
                        <div className="trade-form-field sm:col-span-2">
                          <label htmlFor="tf-rr" className="trade-form-label">Risk / Reward Ratio</label>
                          <input id="tf-rr" type="number" step="any" className="trade-form-input" placeholder="e.g. 2.5" value={formData.riskReward} onChange={(e) => updateField('riskReward', e.target.value)} />
                          <p className="text-xs text-muted-foreground mt-1">The ratio of potential reward to risk taken</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 2: Trade Result */}
                  {activeSection === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="trade-form-section-header">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        <span>Trade Result</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="trade-form-field">
                          <label htmlFor="tf-exit" className="trade-form-label">Exit Price</label>
                          <input id="tf-exit" type="number" step="any" className="trade-form-input" placeholder="Enter exit price (if trade is closed)" value={formData.exitPrice} onChange={(e) => updateField('exitPrice', e.target.value)} />
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-pnl" className="trade-form-label">Profit / Loss ($)</label>
                          <input id="tf-pnl" type="number" step="any" className="trade-form-input" placeholder="Enter profit or loss amount" value={formData.profitLoss} onChange={(e) => updateField('profitLoss', e.target.value)} />
                        </div>
                        <div className="trade-form-field sm:col-span-2">
                          <label className="trade-form-label">Result</label>
                          <div className="flex gap-2">
                            {RESULTS.map(r => (
                              <button key={r} type="button"
                                className={`trade-form-toggle-btn flex-1 ${formData.result === r ? r === 'Win' ? 'trade-form-toggle-active-green' : r === 'Loss' ? 'trade-form-toggle-active-red' : 'trade-form-toggle-active-neutral' : ''}`}
                                onClick={() => updateField('result', r)}
                              >
                                {r === 'Win' && <TrendingUp className="h-3.5 w-3.5" />}
                                {r === 'Loss' && <TrendingDown className="h-3.5 w-3.5" />}
                                {r === 'Breakeven' && <Minus className="h-3.5 w-3.5" />}
                                {r === 'Win' ? 'Profit' : r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 3: Notes & Psychology */}
                  {activeSection === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="trade-form-section-header">
                        <Brain className="h-5 w-5 text-purple-500" />
                        <span>Notes & Psychology</span>
                      </div>

                      <div className="space-y-4">
                        <div className="trade-form-field">
                          <label htmlFor="tf-analysis" className="trade-form-label">Trade Analysis — Why I Took This Trade</label>
                          <textarea id="tf-analysis" className="trade-form-textarea" rows={4} placeholder="Explain why you took this trade" value={formData.tradeAnalysis} onChange={(e) => updateField('tradeAnalysis', e.target.value)} />
                          <p className="text-xs text-muted-foreground mt-1">Document your reasoning for future review</p>
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-emotions" className="trade-form-label">Emotions</label>
                          <input id="tf-emotions" type="text" className="trade-form-input" placeholder="How did you feel during this trade?" value={formData.emotions} onChange={(e) => updateField('emotions', e.target.value)} />
                        </div>
                        <div className="trade-form-field">
                          <label htmlFor="tf-mistakes" className="trade-form-label">Mistakes Made</label>
                          <textarea id="tf-mistakes" className="trade-form-textarea" rows={3} placeholder="Describe any mistakes you made" value={formData.mistakes} onChange={(e) => updateField('mistakes', e.target.value)} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 4: Trade Images */}
                  {activeSection === 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="trade-form-section-header">
                        <ImageIcon className="h-5 w-5 text-indigo-500" />
                        <span>Trade Images</span>
                      </div>

                      <ImageUpload
                        id="tf-analysis-imgs"
                        label="Analysis / Setup Screenshots"
                        helperText="Charts, setups, confirmations — add multiple images"
                        value={formData.analysisImages}
                        onChange={(val) => updateField('analysisImages', val)}
                        max={10}
                      />

                      <ImageUpload
                        id="tf-result-imgs"
                        label="Result Screenshots"
                        helperText="Exit screenshots, final outcomes — add multiple images"
                        value={formData.resultImages}
                        onChange={(val) => updateField('resultImages', val)}
                        max={10}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="trade-form-footer">
                  <div className="flex items-center gap-1">
                    {sections.map((_, idx) => (
                      <div key={idx} className={`h-1.5 rounded-full transition-all duration-200 ${idx === activeSection ? 'w-6 bg-emerald-500' : 'w-1.5 bg-muted-foreground/30'}`} />
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {activeSection > 0 && (
                      <button type="button" className="trade-form-btn-secondary" onClick={() => setActiveSection(prev => prev - 1)}>
                        Back
                      </button>
                    )}
                    {activeSection < sections.length - 1 ? (
                      <button type="button" className="trade-form-btn-primary" onClick={() => setActiveSection(prev => prev + 1)}>
                        Next
                      </button>
                    ) : (
                      <button type="submit" className="trade-form-btn-save">
                        <Save className="h-4 w-4" />
                        {isEditing ? 'Update Trade' : 'Save Trade'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
