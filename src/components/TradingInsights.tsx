// React import removed - not needed with modern JSX transform
import { motion } from 'framer-motion'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { formatCurrency } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  Award,
  BarChart3,
  DollarSign,
  Zap,
  Trophy
} from 'lucide-react'
import { useRef } from 'react'

import { getTruePnL } from '../lib/tradeUtils'

interface TradingInsightsProps {
  adminOverrideAccountId?: string
  adminOverrideUserId?: string
  hideControls?: boolean
}

export function TradingInsights({ adminOverrideAccountId, adminOverrideUserId }: TradingInsightsProps) {
  const storeTrades = useTradeStore(state => state.trades)
  const { getCurrentMonthTrades } = useTradeStore()
  const { activeAccountId } = useAccountStore()
  
  const currentViewAccountId = adminOverrideAccountId || activeAccountId
  const trades = storeTrades ? getCurrentMonthTrades(currentViewAccountId, adminOverrideUserId) : []
  const insightsRef = useRef<HTMLDivElement | null>(null)

  if (trades.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4"
      >
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Trading Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-16">
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-muted-foreground">No Trading Data</p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Add some trades to see detailed insights and analytics that will help improve your trading performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const wins = trades.filter(t => t.result === 'Win')
  const losses = trades.filter(t => t.result === 'Loss')
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Math.abs(getTruePnL(t)), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Math.abs(getTruePnL(t)), 0) / losses.length : 0
  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0

  const mostTradedPairs = trades.reduce((acc, trade) => {
    if (trade.pair) {
      acc[trade.pair] = (acc[trade.pair] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const topPair = Object.entries(mostTradedPairs).sort((a, b) => b[1] - a[1])[0]
  
  const bestTrade = trades.reduce((best, current) => 
    getTruePnL(current) > getTruePnL(best) ? current : best, trades[0])
  
  const worstTrade = trades.reduce((worst, current) => 
    getTruePnL(current) < getTruePnL(worst) ? current : worst, trades[0])

  const longTrades = trades.filter(t => t.direction === 'Long')
  const shortTrades = trades.filter(t => t.direction === 'Short')
  
  const longWinRate = longTrades.length > 0 ? 
    (longTrades.filter(t => t.result === 'Win').length / longTrades.length) * 100 : 0
  const shortWinRate = shortTrades.length > 0 ? 
    (shortTrades.filter(t => t.result === 'Win').length / shortTrades.length) * 100 : 0

  // Calculate consecutive streaks
  let maxWinStreak = 0
  let maxLossStreak = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  trades.forEach(trade => {
    if (trade.result === 'Win') {
      currentWinStreak++
      currentLossStreak = 0
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
    } else if (trade.result === 'Loss') {
      currentLossStreak++
      currentWinStreak = 0
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
    } else {
      currentWinStreak = 0
      currentLossStreak = 0
    }
  })

  // Account performance
  const accountStats = ['Funded', 'Demo', 'Personal'].map(account => {
    const accountTrades = trades.filter(t => t.account === account)
    const accountWins = accountTrades.filter(t => t.result === 'Win').length
    const accountPnL = accountTrades.reduce((sum, t) => sum + getTruePnL(t), 0)
    const accountWinRate = accountTrades.length > 0 ? (accountWins / accountTrades.length) * 100 : 0
    
    return {
      account,
      trades: accountTrades.length,
      winRate: accountWinRate,
      pnl: accountPnL
    }
  }).filter(stat => stat.trades > 0)

  // Risk management metrics
  const totalRisk = trades.reduce((sum, t) => sum + Math.abs(t.riskReward || 0), 0)
  const avgRiskReward = trades.length > 0 ? totalRisk / trades.length : 0
  const riskConsistency = trades.filter(t => t.riskReward >= 1).length / trades.length * 100

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4" ref={insightsRef}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Trading Insights
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Deep analysis of your trading patterns, performance metrics, and actionable insights
        </p>
      </motion.div>

      {/* Main Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatCurrency(avgWin)}
                </div>
                <div className="text-sm text-muted-foreground">Average Profit</div>
                <div className="text-xs text-green-600 mt-1">
                  {wins.length} profit trades
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {formatCurrency(avgLoss)}
                </div>
                <div className="text-sm text-muted-foreground">Average Loss</div>
                <div className="text-xs text-red-600 mt-1">
                  {losses.length} losing trades
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {profitFactor.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Profit Factor</div>
                <div className={`text-xs mt-1 ${profitFactor > 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitFactor > 1 ? 'Profitable system' : 'Needs improvement'}
                </div>
              </motion.div>
            </div>

            {/* Trade Direction Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Direction Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="p-6 border-2 border-green-200 dark:border-green-800 rounded-xl bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/20 text-center hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-lg">Long Trades</span>
                      <p className="text-sm text-muted-foreground">Buy positions</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-medium">{longTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Profit Rate</span>
                      <span className={`font-medium ${longWinRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {longWinRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P&L</span>
                      <span className={`font-medium ${longTrades.reduce((sum, t) => sum + t.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(longTrades.reduce((sum, t) => sum + t.profitLoss, 0))}
                      </span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="p-6 border-2 border-red-200 dark:border-red-800 rounded-xl bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-lg">Short Trades</span>
                      <p className="text-sm text-muted-foreground">Sell positions</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-medium">{shortTrades.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Profit Rate</span>
                      <span className={`font-medium ${shortWinRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {shortWinRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P&L</span>
                      <span className={`font-medium ${shortTrades.reduce((sum, t) => sum + t.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(shortTrades.reduce((sum, t) => sum + t.profitLoss, 0))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Best & Worst Trades + Streaks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Best/Worst Trades */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Trade Extremes
                </h3>
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="p-4 border-2 border-green-200 dark:border-green-800 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-400">Best Trade</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatCurrency(bestTrade.profitLoss)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {bestTrade.pair} • {new Date(bestTrade.date).toLocaleDateString()}
                    </div>
                    {bestTrade.emotions && (
                      <div className="text-xs text-green-700 dark:text-green-300 mt-2 italic">
                        "{bestTrade.emotions}"
                      </div>
                    )}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="p-4 border-2 border-red-200 dark:border-red-800 rounded-lg bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800 dark:text-red-400">Worst Trade</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {formatCurrency(worstTrade.profitLoss)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {worstTrade.pair} • {new Date(worstTrade.date).toLocaleDateString()}
                    </div>
                    {worstTrade.emotions && (
                      <div className="text-xs text-red-700 dark:text-red-300 mt-2 italic">
                        "{worstTrade.emotions}"
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Streaks & Risk Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                  >
                    <div className="text-2xl font-bold text-emerald-600">{maxWinStreak}</div>
                    <div className="text-sm text-muted-foreground">Max Profit Streak</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="text-center p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 rounded-lg border border-rose-200 dark:border-rose-800"
                  >
                    <div className="text-2xl font-bold text-rose-600">{maxLossStreak}</div>
                    <div className="text-sm text-muted-foreground">Max Loss Streak</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                    className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800"
                  >
                    <div className="text-2xl font-bold text-purple-600">{avgRiskReward.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Avg R:R</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.1 }}
                    className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="text-2xl font-bold text-amber-600">{riskConsistency.toFixed(0)}%</div>
                    <div className="text-sm text-muted-foreground">Risk Discipline</div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Account Performance */}
            {accountStats.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Account Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {accountStats.map((account, index) => (
                    <motion.div
                      key={account.account}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                      className="p-4 border rounded-lg bg-gradient-to-br from-muted/50 to-muted/20"
                    >
                      <div className="font-medium mb-2">{account.account} Account</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trades</span>
                          <span className="font-medium">{account.trades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit Rate</span>
                          <span className={`font-medium ${account.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {account.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P&L</span>
                          <span className={`font-medium ${account.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(account.pnl)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Traded Pair */}
            {topPair && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">Most Traded Pair</div>
                  <div className="text-2xl font-bold text-primary mb-2">{topPair[0]}</div>
                  <div className="text-lg font-medium mb-1">{topPair[1]} trades</div>
                  <div className="text-sm text-muted-foreground">
                    {((topPair[1] / trades.length) * 100).toFixed(1)}% of all trades
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 