import { Trade } from '../types/trade'

/**
 * Ensures that the numerical output of a Profit/Loss matches the logical intent of the 'Result' toggle.
 * If a user accidentally types a positive number but selects "Loss", mathematically correct it.
 */
export function getTruePnL(trade: Trade): number {
  const amount = Number(trade.profitLoss || 0)
  
  if (trade.result === 'Loss') {
    return -Math.abs(amount)
  }
  
  if (trade.result === 'Win') {
    return Math.abs(amount)
  }
  
  // Breakeven should natively be exactly 0, 
  // but if it has a trailing value (like tiny spread fees mapping to Breakeven), trust the exact typed value.
  return amount
}

export interface TradeMetrics {
  totalProfit: number
  totalLoss: number
  netPnL: number
  profitRate: number
  lossRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
}

/**
 * Consistently calculates core overarching metrics given a sliced or filtered array of trade data.
 */
export function calculateTradeMetrics(trades: Trade[]): TradeMetrics {
  let totalProfit = 0
  let totalLoss = 0
  let winningTrades = 0
  let losingTrades = 0
  let breakevenTrades = 0

  trades.forEach(trade => {
    const truePnL = getTruePnL(trade)

    if (trade.result === 'Win') {
      totalProfit += Math.abs(truePnL)
      winningTrades++
    } else if (trade.result === 'Loss') {
      totalLoss += Math.abs(truePnL)
      losingTrades++
    } else {
      breakevenTrades++
      // For literal strict tracking, if a breakeven has minor fees (negative) or minor trailing positive slippage:
      if (truePnL > 0) totalProfit += truePnL
      if (truePnL < 0) totalLoss += Math.abs(truePnL)
    }
  })

  const totalTrades = trades.length
  const profitRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0
  const netPnL = totalProfit - totalLoss

  return {
    totalProfit,
    totalLoss,
    netPnL,
    profitRate,
    lossRate,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades
  }
}
