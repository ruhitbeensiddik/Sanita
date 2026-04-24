export interface Trade {
  id: string
  userId?: string // Optional for backwards compatibility
  accountId?: string // Optional for backwards compatibility
  pair: string
  date: string
  time?: string // Format: HH:mm (24-hour format)
  direction: 'Long' | 'Short' | '-'
  profitLoss: number
  result: 'Win' | 'Loss' | 'Breakeven'
  riskReward: number
  account: 'Funded' | 'Demo' | 'Personal'
  emotions: string
  tags?: string[]
  // Entry & Risk fields
  entryPrice?: number
  stopLoss?: number
  takeProfit?: number
  lotSize?: number
  exitPrice?: number
  session?: 'London' | 'New York' | 'Tokyo' | 'Sydney' | 'Overlap' | ''
  // Notes & Analysis
  mistakes?: string
  tradeAnalysis?: string
  // Image uploads (base64 data URLs) — multiple per category
  analysisImages?: string[]
  resultImages?: string[]
  // Legacy single image fields (backwards compat)
  analysisImage?: string
  resultImage?: string
  // Optional metadata
  source?: string
  externalId?: string
  brokerAccount?: string
  openTime?: string // ISO timestamp
  closeTime?: string // ISO timestamp
}

export interface TradeMonth {
  year: number
  month: number
  trades: Trade[]
}

export interface TradeSummary {
  totalProfitLoss: number
  totalRiskReward: number
  winRate: number
  totalTrades: number
}

export interface Goal {
  id: string
  userId?: string
  accountId?: string
  title: string
  description: string
  targetAmount: number
  currentAmount: number
  priority: 'Low' | 'Medium' | 'High'
  profitAllocationPercentage: number
  status: 'Active' | 'Completed' | 'Paused'
  createdAt: string
  updatedAt: string
  completedAt?: string
  category?: string
  notes?: string
  origin: 'Manual' | 'Auto' | 'Template' | 'Import'
  history: GoalHistoryEntry[]
  tags?: string[]
  targetDate?: string
  isArchived?: boolean
}

export interface GoalHistoryEntry {
  id: string
  timestamp: string
  action: 'Created' | 'Updated' | 'Progress' | 'Completed' | 'Paused' | 'Resumed' | 'Deleted'
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  amount?: number
  note?: string
}

export interface GoalSummary {
  totalTargetAmount: number
  totalCurrentAmount: number
  totalProgressPercentage: number
  totalActiveGoals: number
  totalCompletedGoals: number
  totalProfitAllocated: number
}