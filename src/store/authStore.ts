import { create } from 'zustand'
import { User, Role, AccountStatus, SubscriptionStatus } from '../types/auth'
import { supabase } from '../lib/supabase'

export function isDefaultSuperAdmin(userId: string): boolean {
  const user = useAuthStore.getState().users.find(u => u.id === userId)
  return user?.role === 'super_admin'
}

export function getUserStatus(user: User): AccountStatus {
  return user.status ?? 'approved'
}

interface AuthState {
  users: User[]
  currentUser: User | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Actions
  initializeAuth: () => void
  login: (email: string, password: string) => Promise<User | null>
  register: (email: string, password: string) => Promise<{ user: User | null; pendingApproval?: boolean }>
  logout: () => Promise<void>
  
  // Admin Actions
  subscribeToAllUsers: () => () => void
  updateUserRole: (userId: string, newRole: Role) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  approveUser: (userId: string) => Promise<void>
  rejectUser: (userId: string) => Promise<void>
}

// ─── Module-level coordination flags ────────────────────
// These prevent onAuthStateChange from racing with login()/register()
let _loginInProgress = false
let _registerInProgress = false
let _initialSessionDone = false
let _authSubscription: { unsubscribe: () => void } | null = null

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const promise = supabase.from('profiles').select('*').eq('id', userId).single()
    const { data, error } = await Promise.race([
      promise,
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Profile fetch timed out after 10s')), 10000))
    ])
    if (error) {
      console.error('[Auth] fetchProfile Supabase error:', error.message)
      return null
    }
    if (!data) return null
    return {
      id: data.id,
      email: data.email,
      role: data.role as Role,
      status: data.status as AccountStatus,
      createdAt: data.created_at,
      subscriptionStatus: (data.subscription_status || 'free') as SubscriptionStatus,
      subscriptionPlan: data.subscription_plan || null,
      subscriptionExpiresAt: data.subscription_expires_at || null,
      freeTradeLimit: data.free_trade_limit ?? 2
    }
  } catch (err: any) {
    console.error('[Auth] fetchProfile exception:', err)
    return null
  }
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000, context: string = 'Request'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs / 1000}s`)), timeoutMs))
  ])
}

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  currentUser: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initializeAuth: () => {
    if (get().isInitialized) return

    // Clean up previous subscription if any
    if (_authSubscription) {
      _authSubscription.unsubscribe()
      _authSubscription = null
    }
    _initialSessionDone = false

    // 1. Restore session on page load
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error.message)
        set({ isInitialized: true })
        _initialSessionDone = true
        return
      }

      let currentUser = null
      if (session?.user) {
        currentUser = await fetchProfile(session.user.id)
        if (currentUser && currentUser.status === 'pending') {
          console.warn('[Auth] Pending user in restored session, signing out.')
          await supabase.auth.signOut()
          currentUser = null
        }
      }
      set({ currentUser, isInitialized: true })
      _initialSessionDone = true
      
      if (currentUser?.role === 'super_admin' && currentUser?.status === 'approved') {
        get().subscribeToAllUsers()
      }
    }).catch(err => {
      console.error('[Auth] getSession exception:', err)
      set({ isInitialized: true })
      _initialSessionDone = true
    })

    // 2. Listen for SUBSEQUENT auth state changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip events while login() or register() are handling their own flow
      if (_loginInProgress || _registerInProgress) {
        return
      }

      // Skip events before initial getSession() completes (avoid double-processing)
      if (!_initialSessionDone) {
        return
      }

      if (event === 'SIGNED_OUT') {
        set({ currentUser: null, users: [] })
        return
      }

      if (event === 'SIGNED_IN') {
        if (!session?.user) return

        // If we already have this user loaded, skip redundant re-fetch
        const existing = get().currentUser
        if (existing && existing.id === session.user.id) return

        const user = await fetchProfile(session.user.id)
        if (user && user.status === 'pending') {
          // Don't call signOut() here to avoid event loops.
          // Just don't grant access.
          set({ currentUser: null })
        } else if (user) {
          set({ currentUser: user })
          if (user.role === 'super_admin' && user.status === 'approved') {
            get().subscribeToAllUsers()
          }
        }
        // If user is null (fetchProfile failed), do NOT clear currentUser.
        // This prevents random logout on temporary network issues.
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc.: no action needed
    })

    _authSubscription = subscription
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    _loginInProgress = true
    try {
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Auth Login'
      )
      
      if (authError || !authData.user) {
        console.error('[Auth] Login error:', authError)
        set({ error: authError?.message || 'Invalid email or password.' })
        return null
      }

      const user = await fetchProfile(authData.user.id)
      
      if (!user) {
        set({ error: 'Your user profile could not be loaded. Please try again.' })
        return null
      }

      if (user.status === 'pending') {
        await supabase.auth.signOut()
        set({
          currentUser: null,
          error: 'Your account is awaiting approval from the Super Admin. You\'ll be able to access the system once your account is approved.'
        })
        return null
      }
      
      set({ currentUser: user })
      if (user?.role === 'super_admin' && user?.status === 'approved') {
        get().subscribeToAllUsers()
      }
      return user
    } catch (err: any) {
      console.error('[Auth] Login exception:', err)
      set({ error: err.message || 'An unexpected error occurred during login.' })
      return null
    } finally {
      _loginInProgress = false
      set({ isLoading: false })
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    _registerInProgress = true
    
    if (password.length < 6) {
      set({ error: 'Password must be at least 6 characters.', isLoading: false })
      _registerInProgress = false
      return { user: null }
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        15000,
        'Auth Register'
      )
      
      if (error) {
        console.error('[Auth] Register signUp error:', error)
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('user already exists')) {
          set({ error: 'This email is already registered. Please use another email.' })
        } else {
          set({ error: error.message })
        }
        return { user: null }
      }

      let user = null
      if (data.user) {
          // Fetch or insert profile WHILE STILL LOGGED IN
          user = await fetchProfile(data.user.id)
          if (!user) { // Fallback creation if trigger failed or hasn't fired yet
             try {
                const { data: profileInsert, error: insertError } = await supabase.from('profiles').insert({
                  id: data.user.id,
                  email,
                  role: 'user',
                  status: 'pending'
                }).select().single()

                if (insertError) {
                   console.error('[Auth] Register profile creation fallback error:', insertError)
                } else if (profileInsert) {
                   user = {
                       id: profileInsert.id,
                       email: profileInsert.email,
                       role: profileInsert.role as Role,
                       status: profileInsert.status as AccountStatus,
                       createdAt: profileInsert.created_at
                   }
                }
             } catch (insertEx) {
                console.error('[Auth] Register profile insertion exception:', insertEx)
             }
             
             // Final fallback if even manual insert fails
             if (!user) {
                user = {
                    id: data.user.id,
                    email,
                    role: 'user' as Role,
                    status: 'pending' as AccountStatus,
                    createdAt: new Date().toISOString()
                }
             }
          }

          // NOW force sign out because they need approval
          await supabase.auth.signOut()
      }
      
      return { user: user, pendingApproval: true }
    } catch (err: any) {
      console.error('[Auth] Register exception:', err)
      set({ error: err.message || 'An unexpected error occurred during registration.' })
      return { user: null }
    } finally {
      _registerInProgress = false
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      set({ currentUser: null, users: [] })
    }
  },

  subscribeToAllUsers: () => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (error) {
          console.error('[Auth] subscribeToAllUsers Supabase error:', error.message)
          return
        }
        if (data) {
          const mappedUsers = data.map(d => ({
            id: d.id,
            email: d.email,
            role: d.role as Role,
            status: d.status as AccountStatus,
            createdAt: d.created_at,
            subscriptionStatus: (d.subscription_status || 'free') as SubscriptionStatus,
            subscriptionPlan: d.subscription_plan || null,
            subscriptionExpiresAt: d.subscription_expires_at || null,
            freeTradeLimit: d.free_trade_limit ?? 2
          }))
          set({ users: mappedUsers })
        }
      } catch (err) {
        console.error('[Auth] subscribeToAllUsers exception:', err)
      }
    }
    
    fetchUsers()
    return () => {}
  },

  updateUserRole: async (userId, newRole) => {
    if (isDefaultSuperAdmin(userId) || newRole === 'super_admin') {
      console.warn('Cannot change super admin roles.')
      return
    }
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) {
        console.error('updateUserRole error:', error.message)
      } else {
        get().subscribeToAllUsers()
      }
    } catch (err) {
      console.error('updateUserRole exception:', err)
    }
  },

  deleteUser: async (userId) => {
    if (isDefaultSuperAdmin(userId)) {
      console.warn('Cannot delete super admin.')
      return
    }
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) {
        console.error('deleteUser error:', error.message)
      } else {
        get().subscribeToAllUsers()
      }
    } catch (err) {
      console.error('deleteUser exception:', err)
    }
  },

  approveUser: async (userId) => {
    try {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
      if (error) {
        console.error('approveUser error:', error.message)
      } else {
        get().subscribeToAllUsers()
      }
    } catch (err) {
      console.error('approveUser exception:', err)
    }
  },

  rejectUser: async (userId) => {
    if (isDefaultSuperAdmin(userId)) return
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) {
        console.error('rejectUser error:', error.message)
      } else {
         get().subscribeToAllUsers()
      }
    } catch (err) {
      console.error('rejectUser exception:', err)
    }
  }
}))
