import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Ticket, X, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import toast from 'react-hot-toast'

interface PremiumPopupProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: (plan: string, originalPrice: number, totalDiscount: number, finalPrice: number, couponCode: string | null) => void
}

export function PremiumPopup({ isOpen, onClose, onCheckout }: PremiumPopupProps) {
  const { settings, fetchSettings, validateCoupon, myDiscount, fetchMyDiscount, calculateFinalPrice } = useSubscriptionStore()
  const { currentUser } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
      if (currentUser?.id) fetchMyDiscount(currentUser.id)
      setCouponCode('')
      setCouponDiscount(0)
      setCouponApplied(false)
    }
  }, [isOpen])

  const monthlyPrice = settings?.monthlyPrice ?? 10
  const yearlyPrice = settings?.yearlyPrice ?? 100
  const globalDiscount = settings?.globalDiscountPercent ?? 0
  const userDiscount = myDiscount?.discountPercent ?? 0
  const basePrice = selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice
  const totalDiscount = Math.min(100, globalDiscount + couponDiscount + userDiscount)
  const finalPrice = calculateFinalPrice(basePrice, globalDiscount, couponDiscount, userDiscount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    if (selectedPlan !== 'yearly') {
      toast.error('Coupons are only available for yearly subscriptions.')
      return
    }
    setValidatingCoupon(true)
    const coupon = await validateCoupon(couponCode.trim())
    setValidatingCoupon(false)
    if (coupon) {
      setCouponDiscount(coupon.discountPercent)
      setCouponApplied(true)
      toast.success(`Coupon applied: ${coupon.discountPercent}% off!`)
    } else {
      setCouponDiscount(0)
      setCouponApplied(false)
      toast.error('Invalid or expired coupon code.')
    }
  }

  // Reset coupon when switching to monthly
  const handlePlanChange = (plan: 'monthly' | 'yearly') => {
    setSelectedPlan(plan)
    if (plan === 'monthly') {
      setCouponDiscount(0)
      setCouponApplied(false)
      setCouponCode('')
    }
  }

  const handleContinue = () => {
    onCheckout(selectedPlan, basePrice, totalDiscount, finalPrice, couponApplied ? couponCode.trim().toUpperCase() : null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div className="relative w-full max-w-lg mx-4 my-8 z-10" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} transition={{ duration: 0.3, type: 'spring', damping: 25 }}>
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-8 text-center bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted/50 transition-colors"><X className="h-5 w-5" /></button>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Upgrade to Premium</h2>
                <p className="text-muted-foreground mt-2 text-sm">You've reached your free trade limit. Unlock unlimited trades with a premium plan.</p>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Plan Selection */}
                <div className="grid grid-cols-2 gap-3">
                  {[{ plan: 'monthly' as const, price: monthlyPrice, label: 'Monthly', period: '/mo' }, { plan: 'yearly' as const, price: yearlyPrice, label: 'Yearly', period: '/yr', badge: 'Best Value' }].map(({ plan, price, label, period, badge }) => (
                    <button key={plan} onClick={() => handlePlanChange(plan)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${selectedPlan === plan ? 'border-emerald-500 bg-emerald-500/5 shadow-md' : 'border-border hover:border-muted-foreground/40'}`}>
                      {badge && <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">{badge}</span>}
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="text-2xl font-bold text-foreground">${price}<span className="text-sm font-normal text-muted-foreground">{period}</span></div>
                      {selectedPlan === plan && <Sparkles className="absolute top-3 right-3 h-4 w-4 text-emerald-500" />}
                    </button>
                  ))}
                </div>

                {/* Coupon Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5"><Ticket className="h-4 w-4 text-purple-500" /> Coupon Code</label>
                  <div className="flex gap-2">
                    <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Enter coupon code" disabled={couponApplied || selectedPlan === 'monthly'}
                      onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon() }} />
                    <Button variant="outline" onClick={handleApplyCoupon} disabled={validatingCoupon || couponApplied || !couponCode.trim() || selectedPlan === 'monthly'}>
                      {couponApplied ? '✓ Applied' : validatingCoupon ? '...' : 'Apply'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Coupons are only valid for yearly subscription plans.</p>
                  {couponApplied && <p className="text-xs text-emerald-600 font-medium">Coupon discount: {couponDiscount}% off</p>}
                </div>

                {/* Price Breakdown */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base Price ({selectedPlan})</span><span className="font-medium">${basePrice.toFixed(2)}</span></div>
                  {globalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Global Discount</span><span className="text-emerald-600 font-medium">-{globalDiscount}%</span></div>}
                  {couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Coupon Discount</span><span className="text-emerald-600 font-medium">-{couponDiscount}%</span></div>}
                  {userDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Your Special Discount</span><span className="text-emerald-600 font-medium">-{userDiscount}%</span></div>}
                  {totalDiscount > 0 && <div className="flex justify-between text-sm border-t border-border pt-2"><span className="text-muted-foreground">Total Discount</span><span className="text-emerald-600 font-bold">-{totalDiscount}%</span></div>}
                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>Final Price</span><span className="text-emerald-600">${finalPrice.toFixed(2)}</span></div>
                </div>

                {/* Continue Button */}
                <Button onClick={handleContinue} className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg">
                  Continue to Checkout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
