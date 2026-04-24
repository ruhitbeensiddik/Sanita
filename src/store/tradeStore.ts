import { create } from 'zustand'
import { Trade, TradeSummary, Goal, GoalSummary, GoalHistoryEntry } from '../types/trade'
import { getTruePnL } from '../lib/tradeUtils'
import { useAuthStore } from './authStore'
import { supabase } from '../lib/supabase'

function mapTradeFromSupabase(d: any): Trade {
  return {
    id: d.id,
    userId: d.user_id,
    accountId: d.account_id || undefined,
    pair: d.pair,
    date: d.date,
    time: d.time || undefined,
    direction: d.direction,
    profitLoss: Number(d.profit_loss),
    result: d.result,
    riskReward: Number(d.risk_reward),
    account: d.account_type,
    emotions: d.emotions,
    tags: d.tags || [],
    entryPrice: d.entry_price != null ? Number(d.entry_price) : undefined,
    stopLoss: d.stop_loss != null ? Number(d.stop_loss) : undefined,
    takeProfit: d.take_profit != null ? Number(d.take_profit) : undefined,
    lotSize: d.lot_size != null ? Number(d.lot_size) : undefined,
    exitPrice: d.exit_price != null ? Number(d.exit_price) : undefined,
    session: d.session || '',
    mistakes: d.mistakes || undefined,
    tradeAnalysis: d.trade_analysis || undefined,
    analysisImages: d.analysis_images || [],
    resultImages: d.result_images || [],
    source: d.source,
    externalId: d.external_id,
    brokerAccount: d.broker_account,
    openTime: d.open_time,
    closeTime: d.close_time
  }
}

function mapTradeToSupabase(t: Partial<Trade>) {
  const s: any = {}
  if (t.userId !== undefined) s.user_id = t.userId
  if (t.accountId !== undefined) s.account_id = t.accountId || null
  if (t.pair !== undefined) s.pair = t.pair
  if (t.date !== undefined) s.date = t.date
  if (t.time !== undefined) s.time = t.time || null
  if (t.direction !== undefined) s.direction = t.direction
  if (t.profitLoss !== undefined) s.profit_loss = t.profitLoss
  if (t.result !== undefined) s.result = t.result
  if (t.riskReward !== undefined) s.risk_reward = t.riskReward
  if (t.account !== undefined) s.account_type = t.account
  if (t.emotions !== undefined) s.emotions = t.emotions
  if (t.tags !== undefined) s.tags = t.tags
  if (t.entryPrice !== undefined) s.entry_price = t.entryPrice
  if (t.stopLoss !== undefined) s.stop_loss = t.stopLoss
  if (t.takeProfit !== undefined) s.take_profit = t.takeProfit
  if (t.lotSize !== undefined) s.lot_size = t.lotSize
  if (t.exitPrice !== undefined) s.exit_price = t.exitPrice
  if (t.session !== undefined) s.session = t.session || null
  if (t.mistakes !== undefined) s.mistakes = t.mistakes || null
  if (t.tradeAnalysis !== undefined) s.trade_analysis = t.tradeAnalysis || null
  if (t.analysisImages !== undefined) s.analysis_images = t.analysisImages
  if (t.resultImages !== undefined) s.result_images = t.resultImages
  if (t.source !== undefined) s.source = t.source
  if (t.externalId !== undefined) s.external_id = t.externalId
  if (t.brokerAccount !== undefined) s.broker_account = t.brokerAccount
  if (t.openTime !== undefined) s.open_time = t.openTime
  if (t.closeTime !== undefined) s.close_time = t.closeTime
  return s
}

function mapGoalFromSupabase(d: any): Goal {
  return {
    id: d.id,
    userId: d.user_id,
    accountId: d.account_id || undefined,
    title: d.title,
    description: d.description || '',
    targetAmount: Number(d.target_amount),
    currentAmount: Number(d.current_amount),
    priority: d.priority,
    profitAllocationPercentage: Number(d.profit_allocation_percentage),
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    completedAt: d.completed_at || undefined,
    category: d.category || undefined,
    notes: d.notes || undefined,
    origin: d.origin,
    history: d.history || [],
    tags: d.tags || [],
    targetDate: d.target_date || undefined,
    isArchived: d.is_archived
  }
}

function mapGoalToSupabase(g: Partial<Goal>) {
  const s: any = {}
  if (g.userId !== undefined) s.user_id = g.userId
  if (g.accountId !== undefined) s.account_id = g.accountId || null
  if (g.title !== undefined) s.title = g.title
  if (g.description !== undefined) s.description = g.description || null
  if (g.targetAmount !== undefined) s.target_amount = g.targetAmount
  if (g.currentAmount !== undefined) s.current_amount = g.currentAmount
  if (g.priority !== undefined) s.priority = g.priority
  if (g.profitAllocationPercentage !== undefined) s.profit_allocation_percentage = g.profitAllocationPercentage
  if (g.status !== undefined) s.status = g.status
  if (g.category !== undefined) s.category = g.category || null
  if (g.notes !== undefined) s.notes = g.notes || null
  if (g.origin !== undefined) s.origin = g.origin
  if (g.history !== undefined) s.history = g.history
  if (g.tags !== undefined) s.tags = g.tags
  if (g.targetDate !== undefined) s.target_date = g.targetDate || null
  if (g.isArchived !== undefined) s.is_archived = g.isArchived
  if (g.completedAt !== undefined) s.completed_at = g.completedAt || null
  if (g.updatedAt !== undefined) s.updated_at = g.updatedAt
  return s
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10)

interface TradeStore {
  trades: Trade[]
  goals: Goal[]
  currentMonth: { year: number; month: number }
  
  initializeTrades: (userId: string) => () => void
  initializeGoals: (userId: string) => () => void

  addTrade: (trade: Omit<Trade, 'id'>) => Promise<void>
  updateTrade: (id: string, trade: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  setCurrentMonth: (year: number, month: number) => void
  getCurrentMonthTrades: (accountId?: string | null, requestedUserId?: string | null) => Trade[]
  getTradeSummary: (accountId?: string | null, requestedUserId?: string | null) => TradeSummary
  getTradeByDate: (date: string, accountId?: string | null, requestedUserId?: string | null) => Trade | undefined
  getTradesByDate: (date: string, accountId?: string | null, requestedUserId?: string | null) => Trade[]
  getDailyTradeSummary: (date: string, accountId?: string | null, requestedUserId?: string | null) => { totalPL: number; totalRR: number; pairs: string[]; tradeCount: number; result: 'Win' | 'Loss' | 'Breakeven' }
  bulkUpsertTrades: (incoming: Omit<Trade, 'id'>[]) => Promise<{ added: number; updated: number }>
  findByExternalId: (externalId: string) => Trade | undefined
  
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<void>
  updateGoal: (id: string, goal: Partial<Goal>, note?: string) => Promise<void>
  deleteGoal: (id: string, hard?: boolean) => Promise<void>
  getGoals: (includeArchived?: boolean, accountId?: string | null, requestedUserId?: string | null) => Goal[]
  getGoalSummary: (accountId?: string | null, requestedUserId?: string | null) => GoalSummary
  allocateProfitToGoals: (profitAmount: number) => Promise<void>
  getGoalById: (id: string) => Goal | undefined
  addGoalHistoryEntry: (goalId: string, entry: Omit<GoalHistoryEntry, 'id' | 'timestamp'>) => Promise<void>
  toggleGoalStatus: (id: string, status: Goal['status']) => Promise<void>
  
  migrateLegacyData: (userId: string, accountId: string) => void
  deleteDataByAccountId: (accountId: string) => void
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  goals: [],
  currentMonth: { 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() + 1 
  },
  
  initializeTrades: (userId) => {
    const fetchTrades = async () => {
      const currentUser = useAuthStore.getState().currentUser
      let query = supabase.from('trades').select('*').order('date', { ascending: false })
      
      if (currentUser?.role !== 'super_admin') {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      if (error || !data) return
      
      set({ trades: data.map(mapTradeFromSupabase) })
    }
    fetchTrades()
    return () => {} 
  },

  initializeGoals: (userId) => {
    const fetchGoals = async () => {
      const currentUser = useAuthStore.getState().currentUser
      let query = supabase.from('goals').select('*').order('created_at', { ascending: false })
      
      if (currentUser?.role !== 'super_admin') {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      if (error || !data) return
      
      set({ goals: data.map(mapGoalFromSupabase) })
    }
    fetchGoals()
    return () => {} 
  },

  addTrade: async (trade) => {
    const { data, error } = await supabase.from('trades').insert(mapTradeToSupabase(trade)).select().single()
    if (error || !data) return
    
    const newTrade = mapTradeFromSupabase(data)
    set({ trades: [newTrade, ...get().trades] })
    
    if (newTrade.profitLoss > 0) {
      await get().allocateProfitToGoals(newTrade.profitLoss)
    }
  },
  
  updateTrade: async (id, updatedFields) => {
    const existingTrade = get().trades.find(t => t.id === id)
    const oldProfitLoss = existingTrade?.profitLoss || 0
    
    const { data, error } = await supabase.from('trades').update(mapTradeToSupabase(updatedFields)).eq('id', id).select().single()
    if (error || !data) return

    const updatedTrade = mapTradeFromSupabase(data)
    set({ trades: get().trades.map(t => t.id === id ? updatedTrade : t) })

    if (updatedFields.profitLoss !== undefined) {
      const profitDifference = updatedFields.profitLoss - oldProfitLoss
      if (profitDifference > 0) {
        await get().allocateProfitToGoals(profitDifference)
      }
    }
  },
  
  deleteTrade: async (id) => {
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (!error) {
      set({ trades: get().trades.filter(t => t.id !== id) })
    }
  },
  
  setCurrentMonth: (year, month) => set({ currentMonth: { year, month } }),
  
  getCurrentMonthTrades: (accountId?, requestedUserId?) => {
    const { trades, currentMonth } = get()
    const currentUser = useAuthStore.getState().currentUser
    if (!currentUser) return []
    const isSuperAdmin = currentUser.role === 'super_admin'

    return trades.filter(trade => {
      if (!isSuperAdmin && trade.userId !== currentUser.id) return false
      if (isSuperAdmin && requestedUserId && trade.userId !== requestedUserId) return false
      if (accountId && trade.accountId !== accountId) return false
      const tradeDate = new Date(trade.date)
      return tradeDate.getFullYear() === currentMonth.year &&
             tradeDate.getMonth() + 1 === currentMonth.month
    })
  },
  
  getTradeSummary: (accountId?, requestedUserId?) => {
    const currentTrades = get().getCurrentMonthTrades(accountId, requestedUserId)
    const totalProfitLoss = currentTrades.reduce((sum, trade) => sum + getTruePnL(trade), 0)
    const totalRiskReward = currentTrades.reduce((sum, trade) => sum + trade.riskReward, 0)
    const winningTrades = currentTrades.filter(trade => trade.result === 'Win').length
    const winRate = currentTrades.length > 0 ? (winningTrades / currentTrades.length) * 100 : 0
    
    return {
      totalProfitLoss,
      totalRiskReward,
      winRate,
      totalTrades: currentTrades.length
    }
  },
  
  getTradeByDate: (date, accountId?, requestedUserId?) => {
    const trades = get().getCurrentMonthTrades(accountId, requestedUserId)
    return trades.find(trade => trade.date === date)
  },

  getTradesByDate: (date, accountId?, requestedUserId?) => {
    const trades = get().getCurrentMonthTrades(accountId, requestedUserId)
    return trades.filter(trade => trade.date === date)
  },

  getDailyTradeSummary: (date, accountId?, requestedUserId?) => {
    const dailyTrades = get().getTradesByDate(date, accountId, requestedUserId)
    
    if (dailyTrades.length === 0) {
      return { totalPL: 0, totalRR: 0, pairs: [], tradeCount: 0, result: 'Breakeven' as const }
    }

    const totalPL = dailyTrades.reduce((sum, trade) => sum + getTruePnL(trade), 0)
    const totalRR = dailyTrades.reduce((sum, trade) => sum + trade.riskReward, 0)
    const pairs = [...new Set(dailyTrades.map(trade => trade.pair).filter(pair => pair && pair.trim() !== ''))]
    const tradeCount = dailyTrades.length

    let result: 'Win' | 'Loss' | 'Breakeven'
    if (totalPL > 0) {
      result = 'Win'
    } else if (totalPL < 0) {
      result = 'Loss'
    } else {
      result = 'Breakeven'
    }

    return { totalPL, totalRR, pairs, tradeCount, result }
  },

  findByExternalId: (externalId) => {
    const { trades } = get()
    return trades.find(t => t.externalId === externalId)
  },

  bulkUpsertTrades: async (incoming) => {
    let added = 0
    let updated = 0
    const stateTradesById: Record<string, Trade> = {}
    get().trades.forEach(t => { if (t.externalId) stateTradesById[t.externalId] = t })

    const toUpsert = []
    
    for (const inTrade of incoming) {
      if (inTrade.externalId && stateTradesById[inTrade.externalId]) {
        // Update
        const existingId = stateTradesById[inTrade.externalId].id
        toUpsert.push({ ...mapTradeToSupabase(inTrade), id: existingId })
        updated++
      } else {
        // Insert
        toUpsert.push({ ...mapTradeToSupabase(inTrade) })
        added++
      }
    }
    
    if (toUpsert.length > 0) {
      await supabase.from('trades').upsert(toUpsert)
      
      // Reload state for current user
      const currentUser = useAuthStore.getState().currentUser
      if (currentUser) {
        let query = supabase.from('trades').select('*').order('date', { ascending: false })
        if (currentUser.role !== 'super_admin') {
          query = query.eq('user_id', currentUser.id)
        }
        const { data } = await query
        if (data) set({ trades: data.map(mapTradeFromSupabase) })
      }
    }
    
    return { added, updated }
  },

  addGoal: async (goal) => {
    const now = new Date().toISOString()
    const historyEntry: GoalHistoryEntry = {
      id: generateId(), // keep purely local generation for history Array JSON items
      timestamp: now,
      action: 'Created',
      note: `Goal "${goal.title}" created with target of $${goal.targetAmount.toLocaleString()}`
    }
    
    const dbPayload = mapGoalToSupabase({
      ...goal,
      origin: goal.origin || 'Manual',
      history: [historyEntry],
      isArchived: false,
      createdAt: now,
      updatedAt: now
    })
    
    const { data, error } = await supabase.from('goals').insert(dbPayload).select().single()
    if (!error && data) {
      set({ goals: [...get().goals, mapGoalFromSupabase(data)] })
    }
  },

  updateGoal: async (id, updatedFields, note) => {
    const now = new Date().toISOString()
    const state = get()
    const goal = state.goals.find(g => g.id === id)
    if (!goal) return
    
    const changes: { field: string; oldValue: any; newValue: any }[] = []
    Object.keys(updatedFields).forEach(field => {
      const oldValue = (goal as any)[field]
      const newValue = (updatedFields as any)[field]
      if (oldValue !== newValue && field !== 'updatedAt') {
        changes.push({ field, oldValue, newValue })
      }
    })
    
    const historyEntry: GoalHistoryEntry = {
      id: generateId(),
      timestamp: now,
      action: 'Updated',
      changes,
      note: note || `Goal updated`
    }
    
    const updatedGoal = {
      ...goal,
      ...updatedFields,
      updatedAt: now,
      history: [...goal.history, historyEntry]
    }
    
    const { data, error } = await supabase.from('goals').update(mapGoalToSupabase(updatedGoal)).eq('id', id).select().single()
    if (!error && data) {
      set({ goals: state.goals.map(g => g.id === id ? mapGoalFromSupabase(data) : g) })
    }
  },

  deleteGoal: async (id, hard = false) => {
    const state = get()
    const goal = state.goals.find(g => g.id === id)
    if (!goal) return

    if (hard) {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (!error) {
        set({ goals: get().goals.filter(g => g.id !== id) })
      }
    } else {
      const now = new Date().toISOString()
      const historyEntry: GoalHistoryEntry = {
        id: generateId(),
        timestamp: now,
        action: 'Deleted',
        note: 'Goal archived'
      }
      
      const archivedGoal = {
        ...goal,
        isArchived: true,
        status: 'Paused' as const,
        updatedAt: now,
        history: [...goal.history, historyEntry]
      }
      
      const { data, error } = await supabase.from('goals').update(mapGoalToSupabase(archivedGoal)).eq('id', id).select().single()
      if (!error && data) {
        set({ goals: state.goals.map(g => g.id === id ? mapGoalFromSupabase(data) : g) })
      }
    }
  },

  getGoals: (includeArchived = false, accountId?, requestedUserId?) => {
    const { goals } = get()
    const currentUser = useAuthStore.getState().currentUser
    if (!currentUser) return []
    
    const isSuperAdmin = currentUser.role === 'super_admin'
    let filteredGoals = includeArchived ? goals : goals.filter(goal => !goal.isArchived)
    
    if (!isSuperAdmin) {
      filteredGoals = filteredGoals.filter(goal => goal.userId === currentUser.id)
    } else if (isSuperAdmin && requestedUserId) {
      filteredGoals = filteredGoals.filter(goal => goal.userId === requestedUserId)
    }

    if (accountId) {
      filteredGoals = filteredGoals.filter(goal => goal.accountId === accountId)
    }
    return filteredGoals
  },

  getGoalById: (id) => get().goals.find(goal => goal.id === id),

  addGoalHistoryEntry: async (goalId, entry) => {
    const now = new Date().toISOString()
    const state = get()
    const goal = state.goals.find(g => g.id === goalId)
    if (!goal) return

    const historyEntry: GoalHistoryEntry = {
      ...entry,
      id: generateId(),
      timestamp: now
    }
    
    const updatedHistory = [...goal.history, historyEntry]
    
    const { data, error } = await supabase.from('goals').update({ history: updatedHistory }).eq('id', goalId).select().single()
    if (!error && data) {
      set({ goals: state.goals.map(g => g.id === goalId ? mapGoalFromSupabase(data) : g) })
    }
  },

  toggleGoalStatus: async (id, status) => {
    const now = new Date().toISOString()
    const state = get()
    const goal = state.goals.find(g => g.id === id)
    if (!goal) return

    const historyEntry: GoalHistoryEntry = {
      id: generateId(),
      timestamp: now,
      action: status === 'Completed' ? 'Completed' : status === 'Paused' ? 'Paused' : 'Resumed',
      note: `Goal status changed to ${status}`
    }
    
    const updatedGoal = {
      ...goal,
      status,
      completedAt: status === 'Completed' ? now : goal.completedAt,
      updatedAt: now,
      history: [...goal.history, historyEntry]
    }
    
    const { data, error } = await supabase.from('goals').update(mapGoalToSupabase(updatedGoal)).eq('id', id).select().single()
    if (!error && data) {
      set({ goals: state.goals.map(g => g.id === id ? mapGoalFromSupabase(data) : g) })
    }
  },

  getGoalSummary: (accountId?, requestedUserId?): GoalSummary => {
    const goals = get().getGoals(false, accountId, requestedUserId)
    const activeGoals = goals.filter(goal => goal.status === 'Active')
    const completedGoals = goals.filter(goal => goal.status === 'Completed')
    
    const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0)
    const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)
    const totalProgressPercentage = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0
    const totalProfitAllocated = activeGoals.reduce((sum, goal) => sum + goal.profitAllocationPercentage, 0)

    return {
      totalTargetAmount,
      totalCurrentAmount,
      totalProgressPercentage,
      totalActiveGoals: activeGoals.length,
      totalCompletedGoals: completedGoals.length,
      totalProfitAllocated
    }
  },

  allocateProfitToGoals: async (profitAmount: number) => {
    if (profitAmount <= 0) return
    const now = new Date().toISOString()
    const state = get()
    
    const toUpdate = []
    
    for (const goal of state.goals) {
      if (goal.status !== 'Active' || goal.isArchived) continue
      
      const allocation = (goal.profitAllocationPercentage / 100) * profitAmount
      if (allocation === 0) continue
      
      const newCurrentAmount = goal.currentAmount + allocation
      const isCompleted = newCurrentAmount >= goal.targetAmount
      
      const historyEntry: GoalHistoryEntry = {
        id: generateId(),
        timestamp: now,
        action: isCompleted ? 'Completed' : 'Progress',
        amount: allocation,
        note: isCompleted 
          ? `Goal completed! Final allocation: $${allocation.toFixed(2)}` 
          : `Profit allocated: $${allocation.toFixed(2)}`
      }
      
      const updatedGoal = {
        ...goal,
        currentAmount: newCurrentAmount,
        status: isCompleted ? 'Completed' as const : goal.status,
        completedAt: isCompleted ? now : goal.completedAt,
        updatedAt: now,
        history: [...goal.history, historyEntry]
      }
      toUpdate.push(updatedGoal)
    }
    
    if (toUpdate.length === 0) return

    for (const updatedGoal of toUpdate) {
      const { data, error } = await supabase.from('goals').update(mapGoalToSupabase(updatedGoal)).eq('id', updatedGoal.id).select().single()
      if (!error && data) {
         set({ goals: get().goals.map(g => g.id === updatedGoal.id ? mapGoalFromSupabase(data) : g) })
      }
    }
  },
  
  migrateLegacyData: (_userId, _accountId) => {},
  deleteDataByAccountId: (_accountId) => {}
}))