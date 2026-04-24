import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Download, X, FileText, Loader2 } from 'lucide-react'
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

export function ExportModal({ isOpen, onClose, adminOverrideAccountId, adminOverrideUserId }: ExportModalProps) {
  const storeTrades = useTradeStore(state => state.trades)
  const { getCurrentMonthTrades, currentMonth } = useTradeStore()
  const { activeAccountId, accounts } = useAccountStore()
  const [isExporting, setIsExporting] = useState(false)
  
  if (!isOpen) return null

  const currentViewAccountId = adminOverrideAccountId || activeAccountId
  const trades = storeTrades ? getCurrentMonthTrades(currentViewAccountId, adminOverrideUserId) : []
  
  // Determine context name for filename
  const activeAccount = accounts.find((a: any) => a.id === currentViewAccountId)
  const accountName = activeAccount?.name || 'all-accounts'
  const safeAccountName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const monthName = monthNames[currentMonth.month - 1].toLowerCase()
  const baseFileName = `trading-journal-${safeAccountName}-${monthName}-${currentMonth.year}`

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const metrics = calculateTradeMetrics(trades)

      const exportData: ExportPDFData = {
        title: 'Trading Journal Report',
        subtitle: `${accountName} — ${monthNames[currentMonth.month - 1]} ${currentMonth.year}`,
        trades: trades,
        totalTrades: metrics.totalTrades,
        netPnL: metrics.netPnL,
        totalProfit: metrics.totalProfit,
        totalLoss: metrics.totalLoss,
        profitRate: metrics.profitRate
      }

      await generatePDFReport(exportData, `${baseFileName}.pdf`)

      toast.success(`Exported PDF report successfully`)
      onClose()
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('PDF export failed')
    } finally {
      setIsExporting(false)
    }
  }



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
                  <Download className="h-5 w-5 text-emerald-500" />
                  Export Trades
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Context Info */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  Exporting <span className="font-semibold text-foreground">{trades.length} trades</span> from{' '}
                  <span className="font-semibold text-foreground">{accountName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthNames[currentMonth.month - 1]} {currentMonth.year}
                </p>
              </div>



              {/* Export Options */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={exportToPDF}
                  disabled={isExporting || trades.length === 0}
                  className="group flex items-center gap-4 w-full p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    {isExporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-emerald-900 dark:text-emerald-100">
                      {isExporting ? 'Generating PDF...' : 'Confirm Export'}
                    </div>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                      Download beautiful multi-page PDF report
                    </p>
                  </div>
                </button>
                <Button variant="ghost" onClick={onClose} disabled={isExporting} className="w-full text-foreground hover:bg-muted font-medium">
                  Cancel
                </Button>
              </div>

              {trades.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-2 font-medium">
                  No trades to export for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}