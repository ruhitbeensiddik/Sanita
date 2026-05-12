import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Download, X, FileText, Loader2, Check } from 'lucide-react'
import { generatePDFReport, ExportPDFData } from '../lib/exportPDF'
import { calculateTradeMetrics } from '../lib/tradeUtils'
import toast from 'react-hot-toast'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  adminOverrideAccountId?: string
  adminOverrideUserId?: string
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

type TradeCountOption = 10 | 20 | 50 | 100 | 'all' | 'custom'

export function ExportModal({ isOpen, onClose, adminOverrideAccountId, adminOverrideUserId }: ExportModalProps) {
  const storeTrades = useTradeStore(state => state.trades)
  const { getCurrentMonthTrades, currentMonth } = useTradeStore()
  const { activeAccountId, accounts } = useAccountStore()
  const [isExporting, setIsExporting] = useState(false)

  // Filter state
  const [tradeCountOption, setTradeCountOption] = useState<TradeCountOption>('all')
  const [customCount, setCustomCount] = useState('')
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set(['Win', 'Loss', 'Breakeven']))
  
  if (!isOpen) return null

  const currentViewAccountId = adminOverrideAccountId || activeAccountId
  const allTrades = storeTrades ? getCurrentMonthTrades(currentViewAccountId, adminOverrideUserId) : []
  
  // Determine context name for filename
  const activeAccount = accounts.find((a: any) => a.id === currentViewAccountId)
  const accountName = activeAccount?.name || 'all-accounts'
  const safeAccountName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const monthName = monthNames[currentMonth.month - 1].toLowerCase()
  const baseFileName = `trading-journal-${safeAccountName}-${monthName}-${currentMonth.year}`

  // Toggle result filter
  const toggleResult = (result: string) => {
    const newSet = new Set(selectedResults)
    if (newSet.has(result)) {
      // Don't allow deselecting all
      if (newSet.size > 1) {
        newSet.delete(result)
      }
    } else {
      newSet.add(result)
    }
    setSelectedResults(newSet)
  }

  // Get filtered trades based on selections
  const getFilteredTrades = () => {
    // 1. Sort by newest first
    let trades = [...allTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // 2. Filter by result type
    trades = trades.filter(t => selectedResults.has(t.result))
    
    // 3. Apply trade count limit
    let limit: number | null = null
    if (tradeCountOption === 'custom') {
      const parsed = parseInt(customCount)
      if (!isNaN(parsed) && parsed > 0) limit = parsed
    } else if (tradeCountOption !== 'all') {
      limit = tradeCountOption
    }
    
    if (limit !== null && limit < trades.length) {
      trades = trades.slice(0, limit)
    }
    
    return trades
  }

  const filteredTrades = getFilteredTrades()

  const exportToPDF = async () => {
    if (filteredTrades.length === 0) {
      toast.error('No trades match your filters.')
      return
    }

    setIsExporting(true)
    try {
      const metrics = calculateTradeMetrics(filteredTrades)

      const exportData: ExportPDFData = {
        title: 'Forex Dairy Report',
        subtitle: `${accountName} — ${monthNames[currentMonth.month - 1]} ${currentMonth.year}`,
        trades: filteredTrades,
        totalTrades: metrics.totalTrades,
        netPnL: metrics.netPnL,
        totalProfit: metrics.totalProfit,
        totalLoss: metrics.totalLoss,
        profitRate: metrics.profitRate
      }

      await generatePDFReport(exportData, `${baseFileName}.pdf`)

      toast.success(`Exported ${filteredTrades.length} trades to PDF`)
      onClose()
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('PDF export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const countOptions: { value: TradeCountOption; label: string }[] = [
    { value: 10, label: 'Last 10' },
    { value: 20, label: 'Last 20' },
    { value: 50, label: 'Last 50' },
    { value: 100, label: 'Last 100' },
    { value: 'all', label: 'All' },
    { value: 'custom', label: 'Custom' },
  ]

  const resultOptions = [
    { value: 'Win', label: 'Profit', color: 'emerald' },
    { value: 'Loss', label: 'Loss', color: 'red' },
    { value: 'Breakeven', label: 'Breakeven', color: 'amber' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="w-full max-w-md shadow-2xl border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5 text-foreground" />
                  PDF Export Options
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Context Info */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  Account: <span className="font-semibold text-foreground">{accountName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthNames[currentMonth.month - 1]} {currentMonth.year} · {allTrades.length} total trades
                </p>
              </div>

              {/* Number of trades */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Number of Latest Trades</label>
                <div className="flex flex-wrap gap-2">
                  {countOptions.map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setTradeCountOption(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                        tradeCountOption === opt.value
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {tradeCountOption === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number..."
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>

              {/* Result type filter */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Result Types</label>
                <div className="flex gap-2">
                  {resultOptions.map(opt => {
                    const isSelected = selectedResults.has(opt.value)
                    const colorMap: Record<string, string> = {
                      emerald: isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60',
                      red: isSelected
                        ? 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60',
                      amber: isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60',
                    }
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleResult(opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 flex-1 justify-center ${colorMap[opt.color]}`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preview count */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground text-lg">{filteredTrades.length}</span>{' '}
                  trade{filteredTrades.length !== 1 ? 's' : ''} will be exported
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3 pt-1">
                <button
                  onClick={exportToPDF}
                  disabled={isExporting || filteredTrades.length === 0}
                  className="group flex items-center gap-4 w-full p-4 rounded-xl border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-3 rounded-lg bg-primary/10 text-foreground">
                    {isExporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-foreground">
                      {isExporting ? 'Generating PDF...' : 'Export PDF'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Download filtered trade report
                    </p>
                  </div>
                </button>
                <Button variant="ghost" onClick={onClose} disabled={isExporting} className="w-full text-foreground hover:bg-muted font-medium">
                  Cancel
                </Button>
              </div>

              {filteredTrades.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-1 font-medium">
                  No trades match your selected filters.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}