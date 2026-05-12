export type Role = 'user' | 'admin' | 'super_admin'
export type AccountStatus = 'pending' | 'approved'
export type SubscriptionStatus = 'free' | 'pending_payment' | 'active' | 'expired' | 'blocked'

export interface User {
  id: string
  email: string
  passwordHash?: string // No longer needed with Supabase Auth
  role: Role
  status?: AccountStatus // 'pending' until Super Admin approves; undefined treated as 'approved'
  createdAt: string
  subscriptionStatus?: SubscriptionStatus
  subscriptionPlan?: 'monthly' | 'yearly' | null
  subscriptionExpiresAt?: string | null
  subscriptionStartedAt?: string | null
  subscriptionPaused?: boolean
  subscriptionApprovedDays?: number | null
  freeTradeLimit?: number
  adminNotice?: string | null
  adminNoticeUpdatedAt?: string | null
  firstName?: string | null
  lastName?: string | null
}

export interface Account {
  id: string
  userId: string
  name: string
  createdAt: string
  isDefault?: boolean
}

export interface Coupon {
  id: string
  code: string
  discountPercent: number
  isActive: boolean
  validFrom: string
  validUntil: string | null
  maxUses: number | null
  currentUses: number
  createdAt: string
  updatedAt: string
}

export interface UserDiscount {
  id: string
  userId: string
  discountPercent: number
  createdAt: string
  updatedAt: string
}

export interface PaymentRequest {
  id: string
  userId: string
  selectedPlan: string
  originalPrice: number
  discountPercent: number
  finalPrice: number
  couponCode: string | null
  paymentMethod: string | null
  transactionReference: string | null
  senderInfo: string | null
  paymentDate: string | null
  keywordCode: string | null
  termsAccepted: boolean
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  approvedAt: string | null
  approvedBy: string | null
  createdAt: string
  updatedAt: string
  // Joined field (for admin display)
  userEmail?: string
}

export interface SubscriptionSettings {
  id: string
  monthlyPrice: number
  yearlyPrice: number
  globalDiscountPercent: number
  updatedAt: string
}
