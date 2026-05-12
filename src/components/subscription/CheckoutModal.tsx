import { useState } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, FileText, Send, Copy } from 'lucide-react'
import { Button } from '../ui/button'
import toast from 'react-hot-toast'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  plan: string
  originalPrice: number
  totalDiscount: number
  finalPrice: number
  couponCode: string | null
}

const TERMS_TEXT = [
  'All payments are non-refundable unless otherwise stated below.',
  'If user data is lost within 3 months of purchase due to a verified system issue on our side, the user may be eligible for a 50% refund. The user must provide valid proof of the data loss for verification.',
  'Without valid proof, no refund will be provided.',
  'After 3 months from the purchase date, no refund will be provided for data loss claims.',
  'If a user purchases a yearly subscription but does not use the service for several months, no refund will be provided for the unused period.',
  'Refunds are not available for inactivity, non-use, change of mind, or failure to use the service.',
  'All refund requests are subject to verification and approval.',
  'For any technical issue, the user must allow at least 72 working hours for investigation and resolution before requesting any compensation or refund.',
  'By continuing, the user agrees to these terms.'
]

export function CheckoutModal({ isOpen, onClose, plan, originalPrice, totalDiscount, finalPrice, couponCode }: CheckoutModalProps) {
  const { submitPaymentRequest } = useSubscriptionStore()
  const { currentUser } = useAuthStore()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Payment Form State
  const [amountInput, setAmountInput] = useState(finalPrice.toString())
  const [txid, setTxid] = useState('')
  const [senderInfo, setSenderInfo] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [keywordCode, setKeywordCode] = useState('')
  const [formError, setFormError] = useState('')

  const handleSubmit = async () => {
    setFormError('')
    
    if (!amountInput || isNaN(Number(amountInput))) {
      setFormError('Please enter a valid payment amount.')
      return
    }
    if (!txid.trim()) {
      setFormError('Transaction Hash / TxID is required.')
      return
    }
    if (!paymentDate) {
      setFormError('Payment Date is required.')
      return
    }

    if (!termsAccepted) {
      setTermsError(true)
      toast.error('You must accept the Terms and Conditions.')
      return
    }
    if (!currentUser) return

    setSubmitting(true)
    const success = await submitPaymentRequest({
      userId: currentUser.id,
      selectedPlan: plan,
      originalPrice,
      discountPercent: totalDiscount,
      finalPrice: Number(amountInput),
      couponCode,
      termsAccepted: true,
      txid: txid.trim(),
      senderInfo: senderInfo.trim(),
      paymentDate,
      keywordCode: keywordCode.trim()
    })
    setSubmitting(false)

    if (success) {
      toast.success('Payment request submitted! Awaiting admin approval.')
      onClose()
    } else {
      toast.error('Failed to submit. Please try again.')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative w-full max-w-lg mx-4 my-8 z-10" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }}>
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-r from-card to-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg"><ShieldCheck className="h-5 w-5 text-white" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Checkout</h2>
                    <p className="text-sm text-muted-foreground">Review and submit your payment request</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Order Summary */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-3">Order Summary</h3>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{plan}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Original Price</span><span className="font-medium">${originalPrice.toFixed(2)}</span></div>
                  {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Discount</span><span className="text-emerald-600 font-medium">-{totalDiscount}%</span></div>}
                  {couponCode && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Coupon</span><span className="font-mono text-xs">{couponCode}</span></div>}
                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2"><span>Amount Due</span><span className="text-emerald-600">${finalPrice.toFixed(2)}</span></div>
                </div>

                {/* Payment Instructions */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-500" /> Payment Instructions</h3>
                  
                  <div className="flex flex-col items-center p-4 bg-muted/20 rounded-xl border border-border/50">
                    <div className="p-2 border-2 border-border/50 rounded-xl bg-white shadow-sm mb-5 w-full max-w-[200px]">
                      <img 
                        src="/payment-qr.png" 
                        alt="USDT BEP20 Payment QR Code" 
                        className="w-full h-auto object-contain aspect-square"
                      />
                    </div>
                    
                    <div className="w-full space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background rounded-lg p-3 border border-border/50 shadow-sm">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Currency</p>
                          <p className="text-sm font-bold text-foreground">USDT</p>
                        </div>
                        <div className="bg-background rounded-lg p-3 border border-border/50 shadow-sm">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Network</p>
                          <p className="text-sm font-bold text-foreground">BNB Smart Chain <span className="text-[10px] sm:text-xs font-normal text-muted-foreground block sm:inline">(BEP20)</span></p>
                        </div>
                      </div>

                      <div className="bg-background rounded-lg p-3 border border-border/50 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Deposit Address</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText('0x535998dd21e75be323915290ec37ae72c23da745');
                              toast.success('Address copied to clipboard!');
                            }}
                            className="text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-mono bg-muted/50 p-2 rounded border border-border/30 text-foreground break-all select-all text-center">
                          0x535998dd21e75be323915290ec37ae72c23da745
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                    <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-2 list-disc pl-4 font-medium leading-relaxed">
                      <li>Send only <strong className="font-bold">USDT</strong>.</li>
                      <li>Use only <strong className="font-bold">BNB Smart Chain (BEP20)</strong>.</li>
                      <li>Do not use TRC20, ERC20, Polygon, or any other network.</li>
                      <li>Screenshot is not required.</li>
                      <li>After payment, submit your Transaction Hash / TxID.</li>
                      <li>Payment will be verified manually by super admin.</li>
                      <li>If the user sends to the wrong network or wrong address, payment may not be approved.</li>
                    </ul>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Payment Details</h3>
                  <div className="space-y-4 bg-muted/10 border border-border rounded-xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Plan Type</label>
                        <input type="text" value={plan} readOnly className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm capitalize cursor-not-allowed" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Payment Amount (USDT) *</label>
                        <input type="number" step="any" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="e.g. 10" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Transaction Hash / TxID *</label>
                      <input type="text" value={txid} onChange={e => setTxid(e.target.value)} placeholder="e.g. 0x123abc..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      <p className="text-[10px] text-muted-foreground">Paste your Binance/BSC transaction hash here.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Sender Name or Binance Email</label>
                        <input type="text" value={senderInfo} onChange={e => setSenderInfo(e.target.value)} placeholder="Optional" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Payment Date *</label>
                        <input type="datetime-local" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Keyword Code</label>
                      <input type="text" value={keywordCode} onChange={e => setKeywordCode(e.target.value)} placeholder="Optional" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      <p className="text-[10px] text-muted-foreground">Enter the keyword code shown in the payment instructions if applicable.</p>
                    </div>
                  </div>
                  {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Terms & Conditions</h3>
                  <div className="max-h-48 overflow-y-auto bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground space-y-2 border border-border/50">
                    {TERMS_TEXT.map((t, i) => (
                      <p key={i} className="leading-relaxed">
                        <span className="font-medium text-foreground">{i + 1}.</span> {t}
                      </p>
                    ))}
                  </div>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${termsAccepted ? 'border-emerald-500 bg-emerald-500/5' : termsError ? 'border-red-500 bg-red-500/5' : 'border-border hover:border-muted-foreground/40'}`}>
                    <input type="checkbox" checked={termsAccepted} onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setTermsError(false) }}
                      className="mt-0.5 rounded" />
                    <span className="text-sm">I have read and agree to the Terms and Conditions</span>
                  </label>
                  {termsError && <p className="text-xs text-red-500 font-medium">You must accept the Terms and Conditions to proceed.</p>}
                </div>

                {/* Submit */}
                <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg">
                  <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit Payment Request'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
