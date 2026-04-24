import { create } from 'zustand'
import { Account } from '../types/auth'
import { useAuthStore } from './authStore'
import { supabase } from '../lib/supabase'

interface AccountState {
  accounts: Account[]
  activeAccountId: string | null
  
  initializeAccounts: (userId: string) => () => void
  createAccount: (userId: string, name: string) => Promise<{ success: boolean; error?: string; account?: Account }>
  switchAccount: (accountId: string) => void
  getUserAccounts: (userId: string) => Account[]
  deleteAccount: (accountId: string) => Promise<void>
  renameAccount: (accountId: string, newName: string) => Promise<void>
}

const MAX_ACCOUNTS = 10

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountId: null,

  initializeAccounts: (userId) => {
    const fetchAccounts = async () => {
      const currentUser = useAuthStore.getState().currentUser
      let query = supabase.from('accounts').select('*').order('created_at', { ascending: true })
      
      if (currentUser?.role !== 'super_admin') {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      if (error || !data) return
      
      const mappedAccounts = data.map(d => ({
        id: d.id,
        userId: d.user_id,
        name: d.name,
        isDefault: d.is_default,
        createdAt: d.created_at
      }))

      let activeId = get().activeAccountId
      const userAccounts = mappedAccounts.filter(a => a.userId === userId)
      
      if (userAccounts.length > 0) {
        if (!activeId || !userAccounts.find(a => a.id === activeId)) {
          activeId = userAccounts[0].id
        }
      } else {
        activeId = null
      }

      set({ accounts: mappedAccounts, activeAccountId: activeId })
    }

    fetchAccounts()
    return () => {} 
  },

  createAccount: async (userId, name) => {
    const accounts = get().accounts.filter(a => a.userId === userId)
    
    if (accounts.length >= MAX_ACCOUNTS) {
      return { success: false, error: 'Maximum limit of 10 accounts reached.' }
    }

    const isFirst = accounts.length === 0

    const { data, error } = await supabase.from('accounts').insert({
      user_id: userId,
      name,
      is_default: isFirst
    }).select().single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create account.' }
    }

    const newAccount: Account = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      isDefault: data.is_default,
      createdAt: data.created_at
    }
    
    const updatedAccounts = [...get().accounts, newAccount]
    set({ accounts: updatedAccounts })
    
    if (isFirst) {
      set({ activeAccountId: newAccount.id })
    }
    
    return { success: true, account: newAccount }
  },

  switchAccount: (accountId) => {
    set({ activeAccountId: accountId })
  },

  getUserAccounts: (userId) => {
    return get().accounts.filter(a => a.userId === userId)
  },

  deleteAccount: async (accountId) => {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) return

    const updatedAccounts = get().accounts.filter(a => a.id !== accountId)
    const activeId = get().activeAccountId === accountId
      ? (updatedAccounts.length > 0 ? updatedAccounts[0].id : null)
      : get().activeAccountId
    
    set({ accounts: updatedAccounts, activeAccountId: activeId })
  },

  renameAccount: async (accountId, newName) => {
    const { error } = await supabase.from('accounts').update({ name: newName }).eq('id', accountId)
    if (error) return
    
    set({
      accounts: get().accounts.map(a => a.id === accountId ? { ...a, name: newName } : a)
    })
  }
}))
