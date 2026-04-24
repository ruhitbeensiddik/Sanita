export type Role = 'user' | 'admin' | 'super_admin'
export type AccountStatus = 'pending' | 'approved'

export interface User {
  id: string
  email: string
  passwordHash?: string // No longer needed with Supabase Auth
  role: Role
  status?: AccountStatus // 'pending' until Super Admin approves; undefined treated as 'approved'
  createdAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  createdAt: string
  isDefault?: boolean
}
