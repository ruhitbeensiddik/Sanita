import { create } from 'zustand'
import { User, Role, AccountStatus } from '../types/auth'
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

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error('fetchProfile Supabase error:', error.message)
      return null
    }
    if (!data) return null
    return {
      id: data.id,
      email: data.email,
      role: data.role as Role,
      status: data.status as AccountStatus,
      createdAt: data.created_at
    }
  } catch (err: any) {
    console.error('fetchProfile exception:', err)
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  currentUser: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initializeAuth: () => {
    if (get().isInitialized) return

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('initializeAuth getSession error:', error.message)
        set({ isInitialized: true })
        return
      }

      let currentUser = null
      if (session?.user) {
        currentUser = await fetchProfile(session.user.id)
        if (currentUser && currentUser.status === 'pending') {
          console.warn('Pending user found in session, logging out.')
          await supabase.auth.signOut()
          currentUser = null
        }
      }
      set({ currentUser, isInitialized: true })
      
      // If super_admin, auto-fetch all users
      if (currentUser?.role === 'super_admin' && currentUser?.status === 'approved') {
        get().subscribeToAllUsers()
      }
    }).catch(err => {
      console.error('initializeAuth getSession exception:', err)
      set({ isInitialized: true })
    })

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await fetchProfile(session.user.id)
        if (user && user.status === 'pending') {
          await supabase.auth.signOut()
          set({ currentUser: null })
        } else {
          set({ currentUser: user })
          if (user?.role === 'super_admin' && user?.status === 'approved') {
            get().subscribeToAllUsers()
          }
        }
      } else if (event === 'SIGNED_OUT') {
         set({ currentUser: null, users: [] })
      }
    })
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (authError || !authData.user) {
        console.error('Login Supabase auth error:', authError)
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
      console.error('Login exception:', err)
      set({ error: err.message || 'An unexpected error occurred during login.' })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    
    if (password.length < 6) {
      set({ error: 'Password must be at least 6 characters.', isLoading: false })
      return { user: null }
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        console.error('Register Supabase signUp error:', error)
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('user already exists')) {
          set({ error: 'This email is already registered. Please use another email.' })
        } else {
          set({ error: error.message })
        }
        return { user: null }
      }

      let user = null
      if (data.user) {
          // Force sign out because they need approval
          await supabase.auth.signOut()
          
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
                   console.error('Register Supabase profile creation fallback error:', insertError)
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
                console.error('Register profile insertion exception:', insertEx)
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
      }
      
      return { user: user, pendingApproval: true }
    } catch (err: any) {
      console.error('Register exception:', err)
      set({ error: err.message || 'An unexpected error occurred during registration.' })
      return { user: null }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      set({ currentUser: null, users: [] })
    }
  },

  subscribeToAllUsers: () => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (error) {
          console.error('subscribeToAllUsers Supabase error:', error.message)
          return
        }
        if (data) {
          const mappedUsers = data.map(d => ({
            id: d.id,
            email: d.email,
            role: d.role as Role,
            status: d.status as AccountStatus,
            createdAt: d.created_at
          }))
          set({ users: mappedUsers })
        }
      } catch (err) {
        console.error('subscribeToAllUsers exception:', err)
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
