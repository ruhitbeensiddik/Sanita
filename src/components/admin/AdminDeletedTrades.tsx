import { useState, useEffect } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Trash2, RotateCcw, AlertTriangle, Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export function AdminDeletedTrades() {
  const { deletedTrades, fetchDeletedTrades, restoreTrade, permanentlyDeleteTrade } = useTradeStore()
  const { users } = useAuthStore()
  const { accounts } = useAccountStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDeletedTrades()
  }, [])

  const loadDeletedTrades = async () => {
    setLoading(true)
    await fetchDeletedTrades()
    setLoading(false)
  }

  const getUserEmail = (userId?: string) => {
    if (!userId) return 'Unknown'
    const user = users.find(u => u.id === userId)
    return user?.email || userId.slice(0, 8) + '...'
  }

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '-'
    const account = accounts.find(a => a.id === accountId)
    return account?.name || '-'
  }

  const filteredTrades = deletedTrades.filter(trade => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        trade.pair?.toLowerCase().includes(q) ||
        trade.date?.includes(q) ||
        getUserEmail(trade.userId).toLowerCase().includes(q) ||
        getAccountName(trade.accountId).toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleRestore = async (id: string) => {
    const ok = await restoreTrade(id)
    if (ok) {
      toast.success('Trade restored successfully! It is now visible to the user.')
    } else {
      toast.error('Failed to restore trade. Check console for details.')
    }
  }

  const handlePermanentDelete = async (id: string) => {
    const ok = await permanentlyDeleteTrade(id)
    setShowConfirmDelete(null)
    if (ok) {
      toast.success('Trade permanently deleted from the database.')
    } else {
      toast.error('Failed to permanently delete. Check console for details.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Deleted Trades / Trash
              </CardTitle>
              <CardDescription>
                Trades soft-deleted by users. Restore them or permanently remove them from the database.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {filteredTrades.length} deleted trade{filteredTrades.length !== 1 ? 's' : ''}
              </span>
              <Button size="sm" variant="outline" onClick={loadDeletedTrades} disabled={loading} className="h-7 text-xs">
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pair, date, user email, or account name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Pair</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">P&L</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Deleted At</th>
                  <th className="px-4 py-3">Deleted By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTrades.map(trade => (
                  <tr
                    key={trade.id}
                    className="hover:bg-muted/30 transition-colors opacity-75 bg-red-500/5"
                  >
                    <td className="px-4 py-3 font-medium text-foreground text-xs">
                      {getUserEmail(trade.userId)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {getAccountName(trade.accountId)}
                    </td>
                    <td className="px-4 py-3 font-medium">{trade.pair || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{trade.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        trade.direction === 'Long' ? 'text-green-600' :
                        trade.direction === 'Short' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>{trade.direction}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(trade.profitLoss).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        trade.result === 'Win' ? 'bg-green-500/10 text-green-600' :
                        trade.result === 'Loss' ? 'bg-red-500/10 text-red-600' :
                        'bg-yellow-500/10 text-yellow-600'
                      }`}>{trade.result === 'Win' ? 'Profit' : trade.result}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {trade.deletedAt
                        ? new Date(trade.deletedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {getUserEmail(trade.deletedBy || undefined)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(trade.id)}
                          className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowConfirmDelete(trade.id)}
                          className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete Forever
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      {loading ? 'Loading deleted trades...' : 'No deleted trades found. The trash is empty.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmDelete(null)} />
            <motion.div
              className="relative bg-card rounded-xl shadow-2xl border border-border p-6 max-w-md mx-4 z-10"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Permanent Delete</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete the trade and <strong>cannot be restored</strong>.
                Are you sure you want to continue?
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handlePermanentDelete(showConfirmDelete)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
