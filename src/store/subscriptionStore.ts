import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Coupon, UserDiscount, PaymentRequest, SubscriptionSettings } from '../types/auth'
import { useAuthStore } from './authStore'

interface SubscriptionStore {
  settings: SubscriptionSettings | null
  coupons: Coupon[]
  userDiscounts: UserDiscount[]
  paymentRequests: PaymentRequest[]
  myDiscount: UserDiscount | null

  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<Pick<SubscriptionSettings, 'monthlyPrice' | 'yearlyPrice' | 'globalDiscountPercent'>>) => Promise<void>

  fetchCoupons: () => Promise<void>
  createCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'currentUses'>) => Promise<void>
  updateCoupon: (id: string, updates: Partial<Coupon>) => Promise<void>
  deleteCoupon: (id: string) => Promise<void>
  validateCoupon: (code: string) => Promise<Coupon | null>

  fetchUserDiscounts: () => Promise<void>
  setUserDiscount: (userId: string, discountPercent: number) => Promise<void>
  fetchMyDiscount: (userId: string) => Promise<void>

  fetchPaymentRequests: () => Promise<void>
  submitPaymentRequest: (req: {
    userId: string
    selectedPlan: string
    originalPrice: number
    discountPercent: number
    finalPrice: number
    couponCode: string | null
    termsAccepted: boolean
    txid: string
    senderInfo: string
    paymentDate: string
    keywordCode: string
  }) => Promise<boolean>
  approvePaymentRequest: (id: string, days: number) => Promise<void>
  rejectPaymentRequest: (id: string, note: string) => Promise<void>

  calculateFinalPrice: (
    basePrice: number,
    globalDiscount: number,
    couponDiscount: number,
    userDiscount: number
  ) => number
}

function mapCouponFromSupabase(d: any): Coupon {
  return {
    id: d.id,
    code: d.code,
    discountPercent: Number(d.discount_percent),
    isActive: d.is_active,
    validFrom: d.valid_from,
    validUntil: d.valid_until,
    maxUses: d.max_uses,
    currentUses: d.current_uses || 0,
    createdAt: d.created_at,
    updatedAt: d.updated_at
  }
}

function mapUserDiscountFromSupabase(d: any): UserDiscount {
  return {
    id: d.id,
    userId: d.user_id,
    discountPercent: Number(d.discount_percent),
    createdAt: d.created_at,
    updatedAt: d.updated_at
  }
}

function mapPaymentRequestFromSupabase(d: any): PaymentRequest {
  return {
    id: d.id,
    userId: d.user_id,
    selectedPlan: d.selected_plan,
    originalPrice: Number(d.original_price),
    discountPercent: Number(d.discount_percent),
    finalPrice: Number(d.final_price),
    couponCode: d.coupon_code,
    paymentMethod: d.payment_method,
    transactionReference: d.transaction_reference,
    termsAccepted: d.terms_accepted,
    status: d.status,
    adminNote: d.admin_note,
    approvedAt: d.approved_at,
    approvedBy: d.approved_by,
    senderInfo: d.sender_info,
    paymentDate: d.payment_date,
    keywordCode: d.keyword_code,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    userEmail: d.profiles?.email || undefined
  }
}

function mapSettingsFromSupabase(d: any): SubscriptionSettings {
  return {
    id: d.id,
    monthlyPrice: Number(d.monthly_price),
    yearlyPrice: Number(d.yearly_price),
    globalDiscountPercent: Number(d.global_discount_percent),
    updatedAt: d.updated_at
  }
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  settings: null,
  coupons: [],
  userDiscounts: [],
  paymentRequests: [],
  myDiscount: null,

  fetchSettings: async () => {
    const { data, error } = await supabase.from('subscription_settings').select('*').limit(1).single()
    if (!error && data) {
      set({ settings: mapSettingsFromSupabase(data) })
    }
  },

  updateSettings: async (updates) => {
    const settings = get().settings
    if (!settings) return
    const payload: any = {}
    if (updates.monthlyPrice !== undefined) payload.monthly_price = updates.monthlyPrice
    if (updates.yearlyPrice !== undefined) payload.yearly_price = updates.yearlyPrice
    if (updates.globalDiscountPercent !== undefined) payload.global_discount_percent = updates.globalDiscountPercent
    const { data, error } = await supabase.from('subscription_settings').update(payload).eq('id', settings.id).select().single()
    if (!error && data) {
      set({ settings: mapSettingsFromSupabase(data) })
    }
  },

  fetchCoupons: async () => {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      set({ coupons: data.map(mapCouponFromSupabase) })
    }
  },

  createCoupon: async (coupon) => {
    const { data, error } = await supabase.from('coupons').insert({
      code: coupon.code.toUpperCase(),
      discount_percent: coupon.discountPercent,
      is_active: coupon.isActive,
      valid_from: coupon.validFrom,
      valid_until: coupon.validUntil,
      max_uses: coupon.maxUses
    }).select().single()
    if (!error && data) {
      set({ coupons: [mapCouponFromSupabase(data), ...get().coupons] })
    }
  },

  updateCoupon: async (id, updates) => {
    const payload: any = {}
    if (updates.code !== undefined) payload.code = updates.code.toUpperCase()
    if (updates.discountPercent !== undefined) payload.discount_percent = updates.discountPercent
    if (updates.isActive !== undefined) payload.is_active = updates.isActive
    if (updates.validFrom !== undefined) payload.valid_from = updates.validFrom
    if (updates.validUntil !== undefined) payload.valid_until = updates.validUntil
    if (updates.maxUses !== undefined) payload.max_uses = updates.maxUses
    const { data, error } = await supabase.from('coupons').update(payload).eq('id', id).select().single()
    if (!error && data) {
      set({ coupons: get().coupons.map(c => c.id === id ? mapCouponFromSupabase(data) : c) })
    }
  },

  deleteCoupon: async (id) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (!error) {
      set({ coupons: get().coupons.filter(c => c.id !== id) })
    }
  },

  validateCoupon: async (code) => {
    const { data, error } = await supabase.from('coupons').select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()
    if (error || !data) return null

    const coupon = mapCouponFromSupabase(data)
    const now = new Date()

    // Check validity period
    if (coupon.validFrom && new Date(coupon.validFrom) > now) return null
    if (coupon.validUntil && new Date(coupon.validUntil) < now) return null

    // Check usage limit
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) return null

    return coupon
  },

  fetchUserDiscounts: async () => {
    const { data, error } = await supabase.from('user_discounts').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      set({ userDiscounts: data.map(mapUserDiscountFromSupabase) })
    }
  },

  setUserDiscount: async (userId, discountPercent) => {
    // Upsert: insert or update
    const { data, error } = await supabase.from('user_discounts').upsert({
      user_id: userId,
      discount_percent: discountPercent,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).select().single()
    if (!error && data) {
      const mapped = mapUserDiscountFromSupabase(data)
      const existing = get().userDiscounts.find(d => d.userId === userId)
      if (existing) {
        set({ userDiscounts: get().userDiscounts.map(d => d.userId === userId ? mapped : d) })
      } else {
        set({ userDiscounts: [mapped, ...get().userDiscounts] })
      }
    }
  },

  fetchMyDiscount: async (userId) => {
    const { data, error } = await supabase.from('user_discounts').select('*').eq('user_id', userId).single()
    if (!error && data) {
      set({ myDiscount: mapUserDiscountFromSupabase(data) })
    } else {
      set({ myDiscount: null })
    }
  },

  fetchPaymentRequests: async () => {
    const { data, error } = await supabase.from('payment_requests')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
    if (!error && data) {
      set({ paymentRequests: data.map(mapPaymentRequestFromSupabase) })
    }
  },

  submitPaymentRequest: async (req) => {
    const { error } = await supabase.from('payment_requests').insert({
      user_id: req.userId,
      selected_plan: req.selectedPlan,
      original_price: req.originalPrice,
      discount_percent: req.discountPercent,
      final_price: req.finalPrice,
      coupon_code: req.couponCode,
      transaction_reference: req.txid,
      sender_info: req.senderInfo,
      payment_date: req.paymentDate,
      keyword_code: req.keywordCode,
      terms_accepted: req.termsAccepted,
      status: 'pending'
    })
    return !error
  },

  approvePaymentRequest: async (id, days) => {
    const req = get().paymentRequests.find(r => r.id === id)
    if (!req) return

    // Update payment request status
    await supabase.from('payment_requests').update({ 
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: useAuthStore.getState().currentUser?.id
    }).eq('id', id)

    // Calculate expiry based on admin-selected days
    const now = new Date()
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Update user's subscription
    await supabase.from('profiles').update({
      subscription_status: 'active',
      subscription_plan: req.selectedPlan,
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      subscription_approved_days: days,
      subscription_paused: false,
      subscription_paused_at: null,
      subscription_paused_by: null
    }).eq('id', req.userId)

    // Increment coupon usage if coupon was used
    if (req.couponCode) {
      try {
        const { error: rpcError } = await supabase.rpc('increment_coupon_usage', { coupon_code: req.couponCode })
        if (rpcError) {
          // If RPC doesn't exist, do manual update
          await supabase.from('coupons')
            .update({ current_uses: (get().coupons.find(c => c.code === req.couponCode)?.currentUses || 0) + 1 })
            .eq('code', req.couponCode)
        }
      } catch {
        // Fallback: manual update
        await supabase.from('coupons')
          .update({ current_uses: (get().coupons.find(c => c.code === req.couponCode)?.currentUses || 0) + 1 })
          .eq('code', req.couponCode)
      }
    }

    // Refresh local state
    set({
      paymentRequests: get().paymentRequests.map(r =>
        r.id === id ? { ...r, status: 'approved' as const } : r
      )
    })
  },

  rejectPaymentRequest: async (id, note) => {
    await supabase.from('payment_requests').update({
      status: 'rejected',
      admin_note: note
    }).eq('id', id)

    set({
      paymentRequests: get().paymentRequests.map(r =>
        r.id === id ? { ...r, status: 'rejected' as const, adminNote: note } : r
      )
    })
  },

  calculateFinalPrice: (basePrice, globalDiscount, couponDiscount, userDiscount) => {
    // Stack all discounts (sum of percentages, capped at 100%)
    const totalDiscount = Math.min(100, Math.max(0, globalDiscount + couponDiscount + userDiscount))
    const finalPrice = basePrice * (1 - totalDiscount / 100)
    return Math.max(0, Math.round(finalPrice * 100) / 100)
  }
}))
