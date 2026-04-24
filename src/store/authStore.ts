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
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) return null
  return {
    id: data.id,
    email: data.email,
    role: data.role as Role,
    status: data.status as AccountStatus,
    createdAt: data.created_at
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let currentUser = null
      if (session?.user) {
        currentUser = await fetchProfile(session.user.id)
        if (currentUser && currentUser.status === 'pending') {
          // Safety: never auto-restore a pending user session
          await supabase.auth.signOut()
          currentUser = null
        }
      }
      set({ currentUser, isInitialized: true })
      
      // If super_admin, auto-fetch all users
      if (currentUser?.role === 'super_admin') {
        get().subscribeToAllUsers()
      }
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
          if (user?.role === 'super_admin') {
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
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    
    if (authError || !authData.user) {
      set({ error: 'Invalid email or password.', isLoading: false })
      return null
    }

    const user = await fetchProfile(authData.user.id)
    
    if (user && user.status === 'pending') {
      await supabase.auth.signOut()
      set({
        error: 'Your account is awaiting approval from the Super Admin. You\'ll be able to access the system once your account is approved.',
        isLoading: false
      })
      return null
    }
    
    set({ currentUser: user, isLoading: false })
    if (user?.role === 'super_admin') {
      get().subscribeToAllUsers()
    }
    return user
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    
    if (password.length < 6) {
      set({ error: 'Password must be at least 6 characters.', isLoading: false })
      return { user: null }
    }

    // Attempt signup
    const { data, error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        set({ error: 'This email is already registered. Please use another email.', isLoading: false })
      } else {
        set({ error: error.message, isLoading: false })
      }
      return { user: null }
    }

    let user = null
    if (data.user) {
        // Sign out immediately so they don't get auto-logged in since they are pending
        await supabase.auth.signOut()
        
        user = await fetchProfile(data.user.id)
        if (!user) { // Fallback if trigger was slow
            user = {
                id: data.user.id,
                email,
                role: 'user' as Role,
                status: 'pending' as AccountStatus,
                createdAt: new Date().toISOString()
            }
        }
    }
    
    set({ isLoading: false })
    return { user: user, pendingApproval: true }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ currentUser: null, users: [] })
  },

  subscribeToAllUsers: () => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (!error && data) {
        const mappedUsers = data.map(d => ({
          id: d.id,
          email: d.email,
          role: d.role as Role,
          status: d.status as AccountStatus,
          createdAt: d.created_at
        }))
        set({ users: mappedUsers })
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
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (!error) {
      get().subscribeToAllUsers()
    }
  },

  deleteUser: async (userId) => {
    if (isDefaultSuperAdmin(userId)) {
      console.warn('Cannot delete super admin.')
      return
    }
    
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (!error) {
      get().subscribeToAllUsers()
    }
  },

  approveUser: async (userId) => {
    const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
    if (!error) {
      get().subscribeToAllUsers()
    }
  },

  rejectUser: async (userId) => {
    if (isDefaultSuperAdmin(userId)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (!error) {
       get().subscribeToAllUsers()
    }
  }
}))
