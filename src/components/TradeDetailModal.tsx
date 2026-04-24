import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Clock, Activity, Target, AlertCircle, Award, Brain, ImageIcon } from 'lucide-react'
import { Trade } from '../types/trade'
import { formatCurrency } from '../lib/utils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ImageLightbox } from './ui/ImageLightbox'
import { Separator } from './ui/separator'

interface TradeDetailModalProps {
  trade: Trade | null
  isOpen: boolean
  onClose: () => void
}

export function TradeDetailModal({ trade, isOpen, onClose }: TradeDetailModalProps) {
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxTitle, setLightboxTitle] = useState('')

  if (!isOpen || !trade) return null

  const openLightbox = (images: string[], index: number, title: string) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxTitle(title)
    setLightboxOpen(true)
  }

  const isWin = trade.result === 'Win'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{trade.pair}</h2>
                <Badge variant={trade.direction === 'Long' ? 'default' : 'destructive'} className="text-sm">
                  {trade.direction}
                </Badge>
                {trade.account && (
                  <Badge variant="outline" className="text-sm text-emerald-600 border-emerald-600">
                    {trade.account}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                {trade.date}
                <span className="mx-2">•</span>
                <Activity className="w-4 h-4" />
                Session: <span className="font-medium text-foreground">{trade.session}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Execution Grid */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-emerald-500" /> Execution Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Entry Price</div>
                  <div className="font-mono font-medium">{trade.entryPrice}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Stop Loss</div>
                  <div className="font-mono font-medium">{trade.stopLoss}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Take Profit</div>
                  <div className="font-mono font-medium">{trade.takeProfit}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Exit Price</div>
                  <div className="font-mono font-medium">{trade.exitPrice || '-'}</div>
                </div>
              </div>
            </div>

            {/* Outcome Grid */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-purple-500" /> Outcome Logs
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border relative overflow-hidden ${isWin ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'}`}>
                  <div className="text-sm opacity-80 mb-1 z-10 relative">Profit / Loss</div>
                  <div className="font-bold text-xl z-10 relative">{formatCurrency(trade.profitLoss)}</div>
                  {isWin ? <TrendingUp className="absolute -bottom-2 -right-2 w-12 h-12 opacity-10" /> : <TrendingDown className="absolute -bottom-2 -right-2 w-12 h-12 opacity-10" />}
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Lot / Size</div>
                  <div className="font-medium">{trade.lotSize || '-'}</div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Risk:Reward</div>
                  <div className="font-medium">{trade.riskReward ? Number(trade.riskReward).toFixed(2) : '-'}</div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge variant={isWin ? 'default' : 'destructive'} className={isWin ? 'bg-emerald-500' : 'bg-red-500'}>
                    {trade.result === 'Win' ? 'Profit' : trade.result}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Qualitative Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-card rounded-lg border border-border p-5 h-full">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4" /> Trade Analysis
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{trade.tradeAnalysis || 'No analysis provided.'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-card rounded-lg border border-border p-5 h-full">
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4" /> Mistakes & Emotions
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">Mistakes</span>
                      <p className="text-sm whitespace-pre-wrap">{trade.mistakes || 'None logged.'}</p>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">Emotions</span>
                      <p className="text-sm whitespace-pre-wrap">{trade.emotions || 'None logged.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Images */}
            {((trade.analysisImages?.length ?? 0) > 0 || (trade.resultImages?.length ?? 0) > 0) && (
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-blue-500" /> Attached Evidence
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {trade.analysisImages?.map((img, idx) => (
                    <div 
                      key={`analysis-${idx}`} 
                      className="aspect-video relative rounded-lg overflow-hidden border border-border cursor-pointer group"
                      onClick={() => openLightbox(trade.analysisImages!, idx, 'Analysis Timeline')}
                    >
                      <img src={img} alt={`Analysis ${idx + 1}`} className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium px-2 py-1 bg-black/60 rounded">View Analysis</span>
                      </div>
                    </div>
                  ))}
                  
                  {trade.resultImages?.map((img, idx) => (
                    <div 
                      key={`result-${idx}`} 
                      className="aspect-video relative rounded-lg overflow-hidden border border-border cursor-pointer group"
                      onClick={() => openLightbox(trade.resultImages!, idx, 'Result Timeline')}
                    >
                      <img src={img} alt={`Result ${idx + 1}`} className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium px-2 py-1 bg-black/60 rounded">View Result</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </motion.div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        title={lightboxTitle}
      />
    </AnimatePresence>
  )
}
