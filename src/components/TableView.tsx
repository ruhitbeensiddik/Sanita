import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { useAuthStore } from '../store/authStore'
import { Trade } from '../types/trade'
import { formatCurrency } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { 
  Plus, 
  Download, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  TrendingUp,
  TrendingDown,
  Copy,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react'
import { ExportModal } from './ExportModal'
import { TradingInsights } from './TradingInsights'
import { TradeDetailModal } from './TradeDetailModal'
import { TradeFormModal } from './TradeFormModal'
import { PremiumPopup } from './subscription/PremiumPopup'
import { CheckoutModal } from './subscription/CheckoutModal'

import { calculateTradeMetrics } from '../lib/tradeUtils'

type SortField = 'date' | 'profitLoss' | 'riskReward' | 'pair'
type SortDirection = 'asc' | 'desc'

interface TableViewProps {
  adminOverrideAccountId?: string
  adminOverrideUserId?: string
  hideControls?: boolean
}

export function TableView({ adminOverrideAccountId, adminOverrideUserId, hideControls }: TableViewProps) {
  const storeTrades = useTradeStore(state => state.trades)
  const { getCurrentMonthTrades, updateTrade, getActiveTradeCount } = useTradeStore()
  const { activeAccountId } = useAccountStore()
  const { currentUser } = useAuthStore()
  
  const currentViewAccountId = adminOverrideAccountId || activeAccountId

  // Calculate current month trades reactively
  const allTrades = useMemo(() => {
    return getCurrentMonthTrades(currentViewAccountId, adminOverrideUserId)
  }, [getCurrentMonthTrades, currentViewAccountId, adminOverrideUserId, storeTrades])
  
  // Calculate summary reactively
  const summary = useMemo(() => calculateTradeMetrics(allTrades), [allTrades])
  
  const [editingCell, setEditingCell] = useState<{tradeId: string, field: string} | null>(null)
  const [inspectingTrade, setInspectingTrade] = useState<Trade | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterResult, setFilterResult] = useState<'all' | 'Win' | 'Loss' | 'Breakeven'>('all')
  const [filterAccount, setFilterAccount] = useState<'all' | 'Funded' | 'Demo' | 'Personal'>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const monthlySummaryRef = useRef<HTMLDivElement | null>(null)

  // Trade form modal state
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [duplicatingTrade, setDuplicatingTrade] = useState<Trade | null>(null)

  // Premium popup state
  const [showPremiumPopup, setShowPremiumPopup] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ plan: string; originalPrice: number; totalDiscount: number; finalPrice: number; couponCode: string | null } | null>(null)



  const canCreateTrade = () => {
    if (!currentUser) return false
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return true
    // Paused users cannot add trades
    if (currentUser.subscriptionPaused) return false
    if (currentUser.subscriptionStatus === 'active') {
      // Check if subscription has expired
      if (currentUser.subscriptionExpiresAt) {
        const expiryDate = new Date(currentUser.subscriptionExpiresAt)
        if (expiryDate > new Date()) return true
        // Expired - fall through to free trade limit check
      } else {
        return true
      }
    }
    const activeCount = getActiveTradeCount()
    const limit = currentUser.freeTradeLimit ?? 2
    return activeCount < limit
  }

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = allTrades.filter(trade => {
      // Search filter
      const searchMatch = !searchQuery || 
        trade.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.emotions.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.date.includes(searchQuery) ||
        (trade.tradeAnalysis && trade.tradeAnalysis.toLowerCase().includes(searchQuery.toLowerCase()))

      // Result filter
      const resultMatch = filterResult === 'all' || trade.result === filterResult

      // Account filter
      const accountMatch = filterAccount === 'all' || trade.account === filterAccount

      return searchMatch && resultMatch && accountMatch
    })

    // Sort trades
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'date') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [allTrades, searchQuery, filterResult, filterAccount, sortField, sortDirection])

  // Keyboard shortcuts from App
  useEffect(() => {
    const onAdd = () => openAddTradeModal()
    const onFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
    window.addEventListener('shortcut:add-trade', onAdd as EventListener)
    window.addEventListener('shortcut:focus-search', onFocusSearch as EventListener)
    return () => {
      window.removeEventListener('shortcut:add-trade', onAdd as EventListener)
      window.removeEventListener('shortcut:focus-search', onFocusSearch as EventListener)
    }
  }, [])

  const openAddTradeModal = () => {
    if (!canCreateTrade()) {
      setShowPremiumPopup(true)
      return
    }
    setEditingTrade(null)
    setDuplicatingTrade(null)
    setShowTradeForm(true)
  }

  const openEditTradeModal = (trade: Trade) => {
    setEditingTrade(trade)
    setDuplicatingTrade(null)
    setShowTradeForm(true)
  }

  const openDuplicateTradeModal = (trade: Trade) => {
    setEditingTrade(null)
    setDuplicatingTrade(trade)
    setShowTradeForm(true)
  }

  const closeTradeForm = () => {
    setShowTradeForm(false)
    setEditingTrade(null)
    setDuplicatingTrade(null)
  }



  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }



  const EditableCell = ({ 
    trade, 
    field, 
    type = 'text',
    options,
    placeholder
  }: { 
    trade: Trade
    field: keyof Trade
    type?: 'text' | 'number' | 'date' | 'select' | 'time'
    options?: string[]
    placeholder?: string
  }) => {
    const isEditing = editingCell?.tradeId === trade.id && editingCell?.field === field
    const [tempValue, setTempValue] = useState(trade[field] as string | number)
    const value = trade[field]

    // Update tempValue when trade value changes or when starting to edit
    React.useEffect(() => {
      if (isEditing) {
        setTempValue(trade[field] as string | number)
      }
    }, [isEditing, trade[field]])

    const handleSave = () => {
      let finalValue = tempValue
      if (type === 'number') {
        const parsed = parseFloat(tempValue as string)
        finalValue = isNaN(parsed) ? 0 : parsed
      }
      updateTrade(trade.id, { [field]: finalValue })
      setEditingCell(null)
      toast.success('Trade updated successfully!')
    }

    const handleCancel = () => {
      setTempValue(trade[field] as string | number)
      setEditingCell(null)
    }

    if (isEditing) {
      if (type === 'select' && options) {
        return (
          <Select
            value={value as string}
            onValueChange={(newValue) => {
              updateTrade(trade.id, { [field]: newValue })
              setEditingCell(null)
              toast.success('Trade updated successfully!')
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'Win' ? 'Profit' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      return (
        <Input
          type={type}
          value={tempValue}
          placeholder={placeholder}
          onChange={(e) => {
            setTempValue(e.target.value)
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            } else if (e.key === 'Escape') {
              handleCancel()
            }
          }}
          className="h-8"
          autoFocus
        />
      )
    }

    const displayValue = type === 'number' && field === 'profitLoss' 
      ? formatCurrency(value as number)
      : type === 'number' && field === 'riskReward'
      ? (value != null && value !== '' ? `1:${Number(value).toFixed(2)}` : '')
      : value === 'Win' ? 'Profit' : value

    return (
      <div
        className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[32px] flex items-center group transition-colors"
        onClick={() => setEditingCell({ tradeId: trade.id, field })}
      >
        <span className={displayValue === null || displayValue === undefined || displayValue === '' ? 'text-muted-foreground' : ''}>
          {displayValue !== null && displayValue !== undefined && displayValue !== '' ? displayValue : 'Click to edit'}
        </span>
        <Edit3 className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
    )
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'Win': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'Loss': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <SortAsc className="h-4 w-4" /> : 
            <SortDesc className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Enhanced Header with Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Trade History
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage and analyze your trading performance with advanced filtering and insights
          </p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 max-w-6xl mx-auto">
            <Card className={`border-0 shadow-lg h-full bg-gradient-to-br ${summary.netPnL >= 0 ? 'from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10' : 'from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20'}`}>
              <CardContent className="p-6">
                <div className={`text-2xl font-bold ${summary.netPnL >= 0 ? 'text-foreground' : 'text-rose-600'}`}>{formatCurrency(summary.netPnL)}</div>
                <div className="text-sm font-medium text-muted-foreground mt-1">Net P&L</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg h-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center min-h-[90px]">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalProfit)}</div>
                <div className="text-sm text-muted-foreground">Total Profit</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
              <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center min-h-[90px]">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalLoss)}</div>
                <div className="text-sm text-muted-foreground">Total Loss</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center min-h-[90px]">
                <div className="text-2xl font-bold text-blue-600">{summary.profitRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Profit Rate</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg h-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center min-h-[90px]">
                <div className="text-2xl font-bold text-orange-600">{summary.lossRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Loss Rate</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg h-full bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center min-h-[90px]">
                <div className="text-2xl font-bold text-purple-600">{summary.totalTrades}</div>
                <div className="text-sm text-muted-foreground">Total Trades</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        {!hideControls && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4">
 
            
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowExportModal(true)} 
                className="flex items-center gap-2 hover:shadow-md transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button 
                onClick={openAddTradeModal} 
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Add Trade
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trades by pair, date, emotions, or analysis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                  ref={searchInputRef}
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Filters
              </Button>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="text-sm font-medium mb-2 block">Result</label>
                    <Select value={filterResult} onValueChange={(value: any) => setFilterResult(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        <SelectItem value="Win">Profits Only</SelectItem>
                        <SelectItem value="Loss">Losses Only</SelectItem>
                        <SelectItem value="Breakeven">Breakeven Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Account</label>
                    <Select value={filterAccount} onValueChange={(value: any) => setFilterAccount(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        <SelectItem value="Funded">Funded</SelectItem>
                        <SelectItem value="Demo">Demo</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterResult('all')
                        setFilterAccount('all')
                        toast.success('Filters cleared!')
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Trade Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">

                    <SortableHeader field="pair">Pair</SortableHeader>
                    <SortableHeader field="date">Date</SortableHeader>
                    <TableHead>Direction</TableHead>
                    <SortableHeader field="profitLoss">P&L</SortableHeader>
                    <TableHead>Result</TableHead>
                    <SortableHeader field="riskReward">R:R</SortableHeader>
                    {!hideControls && <TableHead className="w-24 sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTrades.map((trade, index) => (
                      <motion.tr
                        key={trade.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('input') || target.closest('select') || target.closest('button')) return;
                          setInspectingTrade(trade);
                        }}
                      >

                        <TableCell>
                          <EditableCell trade={trade} field="pair" />
                        </TableCell>
                        <TableCell>
                          <EditableCell trade={trade} field="date" type="date" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {trade.direction === 'Long' && <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />}
                            {trade.direction === 'Short' && <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />}
                            <EditableCell 
                              trade={trade} 
                              field="direction" 
                              type="select"
                              options={['Long', 'Short', '-']}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell trade={trade} field="profitLoss" type="number" />
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(trade.result)}`}>
                            <EditableCell 
                              trade={trade} 
                              field="result" 
                              type="select"
                              options={['Win', 'Loss', 'Breakeven']}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell trade={trade} field="riskReward" type="number" />
                        </TableCell>
                        {!hideControls && (
                          <TableCell className="sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditTradeModal(trade)}
                                className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Edit trade details"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDuplicateTradeModal(trade)}
                                className="h-8 w-8 hover:bg-muted"
                                title="Duplicate trade"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {filteredTrades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <div className="space-y-2">
                          <p className="text-lg">No trades found</p>
                          <p className="text-sm">
                            {searchQuery || filterResult !== 'all' || filterAccount !== 'all' 
                              ? 'Try adjusting your search or filters' 
                              : 'Click "Add Trade" to get started'
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-r from-card to-card/90" ref={monthlySummaryRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg min-w-0">
                <div className="text-3xl font-bold text-green-600 truncate" title={formatCurrency(summary.totalProfit)}>
                  {formatCurrency(summary.totalProfit)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Profit</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg min-w-0">
                <div className="text-3xl font-bold text-red-600 truncate" title={formatCurrency(summary.totalLoss)}>
                  {formatCurrency(summary.totalLoss)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Loss</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg min-w-0">
                <div className="text-3xl font-bold text-blue-600 truncate">
                  {summary.profitRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Profit Rate</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg min-w-0">
                <div className="text-3xl font-bold text-orange-600 truncate">
                  {summary.lossRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Loss Rate</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg min-w-0">
                <div className="text-3xl font-bold text-purple-600 truncate">
                  {summary.totalTrades}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Trades</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trading Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <TradingInsights />
      </motion.div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)}
        adminOverrideAccountId={adminOverrideAccountId}
        adminOverrideUserId={adminOverrideUserId}
      />

      {/* Trade Form Modal */}
      <TradeFormModal
        isOpen={showTradeForm}
        onClose={closeTradeForm}
        editTrade={editingTrade}
        duplicateFrom={duplicatingTrade}
      />


      {/* Trade Detail Inspector */}
      <TradeDetailModal 
        trade={inspectingTrade}
        isOpen={!!inspectingTrade}
        onClose={() => setInspectingTrade(null)}
      />

      {/* Premium Popup */}
      <PremiumPopup
        isOpen={showPremiumPopup}
        onClose={() => setShowPremiumPopup(false)}
        onCheckout={(plan, originalPrice, totalDiscount, finalPrice, couponCode) => {
          setCheckoutData({ plan, originalPrice, totalDiscount, finalPrice, couponCode })
          setShowPremiumPopup(false)
          setShowCheckoutModal(true)
        }}
      />

      {/* Checkout Modal */}
      {checkoutData && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => { setShowCheckoutModal(false); setCheckoutData(null) }}
          plan={checkoutData.plan}
          originalPrice={checkoutData.originalPrice}
          totalDiscount={checkoutData.totalDiscount}
          finalPrice={checkoutData.finalPrice}
          couponCode={checkoutData.couponCode}
        />
      )}
    </div>
  )
}