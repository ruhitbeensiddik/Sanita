import { useState } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, FileText, Send } from 'lucide-react'
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
  'All payments are non-refundable.',
  'If a user buys a yearly plan and uses the service for some months, no refund will be given for unused months.',
  'Refunds are only considered if the user can prove data loss caused by the system.',
  'If eligible data loss is proven, only 50% of the amount paid may be refunded.',
  'If the lost data is from the last 3 months, no refund will be provided.',
  'Refunds may only be considered for proven data loss older than 3 months.',
  'For any technical issue, the user must allow at least 72 working hours for investigation and resolution before requesting any compensation or refund.',
  'By continuing, the user agrees to these terms.'
]

export function CheckoutModal({ isOpen, onClose, plan, originalPrice, totalDiscount, finalPrice, couponCode }: CheckoutModalProps) {
  const { submitPaymentRequest } = useSubscriptionStore()
  const { currentUser } = useAuthStore()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
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
      finalPrice,
      couponCode,
      termsAccepted: true
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
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-blue-500" /> Payment Instructions</h3>
                  <p className="text-sm text-muted-foreground italic">Payment instructions will be added by admin.</p>
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
