import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { Trade } from '../types/trade'
import { formatCurrency } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useRef } from 'react'
import { Button } from './ui/button'
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown,
  Award,
  Activity,
  Plus,
  Eye,
  DollarSign,
  FileText,
  Edit3
} from 'lucide-react'
import { TradeFormModal } from './TradeFormModal'
import { ImageLightbox } from './ui/ImageLightbox'

// Helper to get images array from trade (handles legacy single-image fields)
function getTradeImages(trade: Trade, type: 'analysis' | 'result'): string[] {
  if (type === 'analysis') {
    if (trade.analysisImages && trade.analysisImages.length > 0) return trade.analysisImages
    if (trade.analysisImage) return [trade.analysisImage]
    return []
  } else {
    if (trade.resultImages && trade.resultImages.length > 0) return trade.resultImages
    if (trade.resultImage) return [trade.resultImage]
    return []
  }
}

export function CalendarView() {
  const { trades, currentMonth, getTradesByDate, getDailyTradeSummary } = useTradeStore()
  const { activeAccountId } = useAccountStore()
  const monthlyPanelRef = useRef<HTMLDivElement | null>(null)
  
  const currentMonthTrades = useMemo(() => {
    return trades.filter(trade => {
      if (activeAccountId && trade.accountId !== activeAccountId) return false;
      const [y, m] = (trade.date || '').split('-')
      return Number(y) === currentMonth.year && Number(m) === currentMonth.month
    })
  }, [trades, currentMonth, activeAccountId])
  
  const getDailySummary = (date: string) => getDailyTradeSummary(date, activeAccountId)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  // Trade form modal state
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined)

  // Image lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxTitle, setLightboxTitle] = useState('')

  const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month - 1, 1)
  const lastDayOfMonth = new Date(currentMonth.year, currentMonth.month, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayOfWeek = firstDayOfMonth.getDay()

  const calendarDays = []
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null)
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day)

  const formatDateString = (day: number) => `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getResultColor = (result: string) => {
    switch (result) {
      case 'Win': return 'text-green-600'
      case 'Loss': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getResultGradient = (result: string) => {
    switch (result) {
      case 'Win': return 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20'
      case 'Loss': return 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20'
      default: return 'from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20'
    }
  }

  const addTradeForDate = (date: string) => {
    setPrefillDate(date)
    setEditingTrade(null)
    setShowTradeForm(true)
    setSelectedDate(date)
  }

  const openEditTradeModal = (trade: Trade) => {
    setEditingTrade(trade)
    setPrefillDate(undefined)
    setShowTradeForm(true)
  }

  const closeTradeForm = () => {
    setShowTradeForm(false)
    setEditingTrade(null)
    setPrefillDate(undefined)
  }

  const openLightbox = (images: string[], index: number, title: string) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxTitle(title)
    setLightboxOpen(true)
  }

  const tradingDays = new Set(currentMonthTrades.map(t => t.date)).size
  const uniqueDates = [...new Set(currentMonthTrades.map(t => t.date))]
  const dailyPnLs = uniqueDates.map(date => getDailyTradeSummary(date, activeAccountId).totalPL)
  const totalPnL = dailyPnLs.reduce((sum, dayPnL) => sum + dayPnL, 0)
  const bestDay = dailyPnLs.length > 0 ? Math.max(...dailyPnLs) : 0
  const worstDay = dailyPnLs.length > 0 ? Math.min(...dailyPnLs) : 0
  const avgDailyPnL = dailyPnLs.length > 0 ? totalPnL / dailyPnLs.length : 0
  const winningDays = uniqueDates.filter(date => getDailyTradeSummary(date, activeAccountId).result === 'Win').length
  const losingDays = uniqueDates.filter(date => getDailyTradeSummary(date, activeAccountId).result === 'Loss').length

  const selectedDayTrades = useMemo(() => selectedDate ? getTradesByDate(selectedDate, activeAccountId) : [], [selectedDate, trades, activeAccountId])
  const selectedDaySummary = useMemo(() => selectedDate ? getDailySummary(selectedDate) : null, [selectedDate, trades, activeAccountId])

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4" ref={monthlyPanelRef}>
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Trading Calendar
        </h1>
        <p className="text-xl text-muted-foreground">
          {currentMonth.year} - {['January','February','March','April','May','June','July','August','September','October','November','December'][currentMonth.month - 1]}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Profits</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{currentMonthTrades.filter(t => t.result === 'Win').length}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Losses</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{currentMonthTrades.filter(t => t.result === 'Loss').length}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Total</span>
              </div>
              <div className="text-2xl font-bold text-teal-600">{currentMonthTrades.length}</div>
            </CardContent>
          </Card>
        </div>

      </motion.div>

      {/* Calendar Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CalendarIcon className="h-6 w-6 text-emerald-600" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center p-2 font-semibold text-muted-foreground">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) return <div key={index} className="h-24" />
                const dateString = formatDateString(day)
                const dayTrades = getTradesByDate(dateString, activeAccountId)
                const dailySummary = getDailySummary(dateString)
                const isSelected = selectedDate === dateString
                const isHovered = hoveredDate === dateString
                return (
                  <motion.div key={index}
                    className={`h-24 border rounded-lg p-1 cursor-pointer transition-all duration-200
                      ${isSelected ? 'ring-2 ring-emerald-500 scale-105' : ''}
                      ${isHovered ? 'shadow-lg' : 'hover:shadow-md'}
                      ${dayTrades.length > 0 ? 'bg-gradient-to-br ' + getResultGradient(dailySummary.result) : 'bg-card hover:bg-muted/50'}`}
                    onClick={() => setSelectedDate(dateString)}
                    onMouseEnter={() => setHoveredDate(dateString)}
                    onMouseLeave={() => setHoveredDate(null)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-right text-sm font-medium mb-1">{day}</div>
                    {dayTrades.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-center">{formatCurrency(dailySummary.totalPL)}</div>
                        <div className="text-[10px] sm:text-xs text-center opacity-80">{dayTrades.length} <span className="hidden sm:inline">trade{dayTrades.length !== 1 ? 's' : ''}</span></div>
                        {dailySummary.result && (
                          <div className={`text-[10px] sm:text-xs text-center px-1 py-0.5 rounded-full font-medium ${getResultColor(dailySummary.result)} bg-opacity-20`}>
                            <span className="hidden sm:inline">{dailySummary.result === 'Win' ? 'Profit' : dailySummary.result}</span>
                            <span className="sm:hidden">{dailySummary.result === 'Win' ? 'P' : dailySummary.result[0]}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Trade Details */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-6">
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div key={selectedDate} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-4 w-4" />
                    {new Date(selectedDate).toLocaleDateString()}
                    <Button size="sm" className="ml-auto flex items-center gap-1" onClick={() => addTradeForDate(selectedDate)}>
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDayTrades.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-muted/50 to-muted/30 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total P&L</p>
                            <p className={`font-bold text-lg ${getResultColor(selectedDaySummary?.result || 'Breakeven')}`}>
                              {formatCurrency(selectedDaySummary?.totalPL || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total R:R</p>
                            <p className="font-semibold">{selectedDaySummary?.totalRR.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Trades</p>
                            <p className="font-semibold">{selectedDaySummary?.tradeCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pairs</p>
                            <p className="font-semibold text-xs">{selectedDaySummary?.pairs.join(', ') || 'None'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Individual Trades:</p>
                        {selectedDayTrades.map((trade, index) => {
                          const analysisImgs = getTradeImages(trade, 'analysis')
                          const resultImgs = getTradeImages(trade, 'result')

                          return (
                            <div key={trade.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">Trade #{index + 1}</span>
                                <div className="flex items-center gap-1">
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(trade.result)} bg-gradient-to-r ${getResultGradient(trade.result)}`}>
                                    {trade.result === 'Win' ? 'Profit' : trade.result}
                                  </div>
                                  <button onClick={() => openEditTradeModal(trade)} className="p-1 rounded hover:bg-muted transition-colors" title="Edit trade">
                                    <Edit3 className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-muted-foreground">Pair:</span> {trade.pair || 'N/A'}</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Direction:</span>
                                  {trade.direction === 'Long' && <TrendingUp className="h-3 w-3 text-green-600" />}
                                  {trade.direction === 'Short' && <TrendingDown className="h-3 w-3 text-red-600" />}
                                  {trade.direction}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">P&L:</span>
                                  <span className={`font-semibold ml-1 ${getResultColor(trade.result)}`}>{formatCurrency(trade.profitLoss)}</span>
                                </div>
                                <div><span className="text-muted-foreground">R:R:</span> {trade.riskReward != null ? Number(trade.riskReward).toFixed(2) : '-'}</div>
                              </div>
                              {trade.emotions && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Emotions:</span>
                                  <span className="italic ml-1">"{trade.emotions}"</span>
                                </div>
                              )}
                              {trade.tradeAnalysis && (
                                <div className="text-xs mt-1">
                                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                                    <FileText className="h-3 w-3" /><span>Analysis:</span>
                                  </div>
                                  <p className="text-foreground/80 italic pl-4 line-clamp-3">{trade.tradeAnalysis}</p>
                                </div>
                              )}

                              {/* Analysis Images */}
                              {analysisImgs.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[10px] text-muted-foreground font-medium mb-1">Analysis Images</p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {analysisImgs.map((img, imgIdx) => (
                                      <button key={imgIdx} onClick={() => openLightbox(analysisImgs, imgIdx, 'Analysis Images')}
                                        className="h-14 w-20 rounded border border-border overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all">
                                        <img src={img} alt={`Analysis ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Result Images */}
                              {resultImgs.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[10px] text-muted-foreground font-medium mb-1">Result Images</p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {resultImgs.map((img, imgIdx) => (
                                      <button key={imgIdx} onClick={() => openLightbox(resultImgs, imgIdx, 'Result Images')}
                                        className="h-14 w-20 rounded border border-border overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all">
                                        <img src={img} alt={`Result ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-muted-foreground mb-3">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No trade recorded</p>
                      </div>
                      <Button size="sm" onClick={() => addTradeForDate(selectedDate)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Trade
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monthly Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md h-full">
            <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg mb-2"><Activity className="h-5 w-5 text-teal-600" /></div>
              <p className="text-sm text-muted-foreground">Trading Days</p>
              <p className="text-xl font-bold">{tradingDays}</p>
              <p className="text-xs text-muted-foreground">{((tradingDays / daysInMonth) * 100).toFixed(0)}% of month</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md h-full">
            <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mb-2"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              <p className="text-sm text-muted-foreground">Best Day</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(bestDay)}</p>
              <p className="text-xs text-muted-foreground">Single best trading day</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md h-full">
            <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mb-2"><TrendingDown className="h-5 w-5 text-red-600" /></div>
              <p className="text-sm text-muted-foreground">Worst Day</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(worstDay)}</p>
              <p className="text-xs text-muted-foreground">Largest single loss day</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md h-full">
            <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-2"><DollarSign className="h-5 w-5 text-purple-600" /></div>
              <p className="text-sm text-muted-foreground">Avg Daily P&L</p>
              <p className={`text-xl font-bold ${avgDailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(avgDailyPnL)}</p>
              <p className="text-xs text-muted-foreground">Per trading day</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Monthly Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Calendar Performance Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{winningDays}</div>
                <div className="text-sm text-muted-foreground">Profit Days</div>
                <div className="text-xs text-muted-foreground mt-1">{tradingDays > 0 ? ((winningDays / tradingDays) * 100).toFixed(0) : 0}% of trading days</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{losingDays}</div>
                <div className="text-sm text-muted-foreground">Losing Days</div>
                <div className="text-xs text-muted-foreground mt-1">{tradingDays > 0 ? ((losingDays / tradingDays) * 100).toFixed(0) : 0}% of trading days</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg">
                <div className="text-2xl font-bold text-teal-600">{tradingDays}</div>
                <div className="text-sm text-muted-foreground">Active Days</div>
                <div className="text-xs text-muted-foreground mt-1">{((tradingDays / daysInMonth) * 100).toFixed(0)}% of month</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalPnL)}</div>
                <div className="text-sm text-muted-foreground">Monthly P&L</div>
                <div className="text-xs text-muted-foreground mt-1">Total performance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <TradeFormModal isOpen={showTradeForm} onClose={closeTradeForm} editTrade={editingTrade} prefillDate={prefillDate} />
      <ImageLightbox images={lightboxImages} currentIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} onNavigate={setLightboxIndex} title={lightboxTitle} />
    </div>
  )
}