import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { CreditCard, CheckCircle, XCircle, Clock, Copy, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const DURATION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '15 days', value: 15 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
]

export function AdminPaymentRequests() {
  const { paymentRequests, fetchPaymentRequests, approvePaymentRequest, rejectPaymentRequest } = useSubscriptionStore()
  const { subscribeToAllUsers } = useAuthStore()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  // Duration state: one per pending request
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [customDays, setCustomDays] = useState<Record<string, string>>({})

  useEffect(() => { fetchPaymentRequests() }, [])

  const filtered = paymentRequests.filter(r => filter === 'all' || r.status === filter)

  const getDays = (reqId: string): number => {
    return durations[reqId] || 30
  }

  const handleApprove = async (id: string) => {
    const days = getDays(id)
    await approvePaymentRequest(id, days)
    subscribeToAllUsers()
    toast.success(`Payment approved! Subscription active for ${days} days.`)
  }

  const handleReject = async () => {
    if (!rejectingId) return
    await rejectPaymentRequest(rejectingId, rejectNote)
    setRejectingId(null)
    setRejectNote('')
    toast.success('Payment request rejected.')
  }

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
    if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-red-500" />
    return <Clock className="h-3.5 w-3.5 text-amber-500" />
  }

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    if (status === 'rejected') return 'bg-red-500/10 text-red-500 border-red-500/20'
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-500" /> Payment Requests
            </CardTitle>
            <CardDescription>{paymentRequests.filter(r => r.status === 'pending').length} pending</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}
                className={`text-xs ${filter === f ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-800 dark:text-orange-200">
          <div className="font-bold flex items-center gap-1 mb-1"><Info className="h-4 w-4" /> Verify manually before approval:</div>
          <ol className="list-decimal pl-5 space-y-0.5 font-medium">
            <li>Open BscScan.</li>
            <li>Search the submitted TxID.</li>
            <li>Check transaction status is Success.</li>
            <li>Check token is USDT.</li>
            <li>Check network is BNB Smart Chain / BEP20.</li>
            <li>Check receiving address matches: <span className="font-mono bg-orange-500/20 px-1 rounded select-all">0x535998dd21e75be323915290ec37ae72c23da745</span></li>
            <li>Check amount matches the selected plan.</li>
            <li>Check transaction time is reasonable.</li>
          </ol>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan & Price</th>
                <th className="px-4 py-3">Payment Details</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(req => (
                <tr key={req.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(req.status)}`}>
                      {statusIcon(req.status)} {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground text-xs">{req.userEmail || req.userId.slice(0, 8) + '...'}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="capitalize font-bold text-sm">{req.selectedPlan}</div>
                      <div className="font-bold text-emerald-600">${req.finalPrice}</div>
                      {req.couponCode && <div className="text-[10px] text-muted-foreground font-mono">Coupon: {req.couponCode}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-muted-foreground">TxID:</span>
                        {req.transactionReference ? (
                          <>
                            <span className="font-mono bg-muted/50 px-1 rounded truncate max-w-[120px]">{req.transactionReference}</span>
                            <button onClick={() => { navigator.clipboard.writeText(req.transactionReference || ''); toast.success('TxID Copied!') }} className="text-emerald-500 hover:text-emerald-600 p-0.5"><Copy className="h-3 w-3" /></button>
                          </>
                        ) : (
                          <span className="italic text-muted-foreground">None</span>
                        )}
                      </div>
                      
                      {req.senderInfo && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground">Sender:</span>
                          <span className="truncate max-w-[150px]">{req.senderInfo}</span>
                        </div>
                      )}
                      
                      {req.paymentDate && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground">Paid:</span>
                          <span>{new Date(req.paymentDate).toLocaleString()}</span>
                        </div>
                      )}
                      
                      {req.keywordCode && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground">Code:</span>
                          <span className="font-mono bg-muted/50 px-1 rounded">{req.keywordCode}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'pending' ? (
                      <div className="flex flex-col items-end gap-2">
                        {/* Duration selector */}
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {DURATION_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setDurations(p => ({ ...p, [req.id]: opt.value })); setCustomDays(p => ({ ...p, [req.id]: '' })) }}
                              className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                getDays(req.id) === opt.value && !customDays[req.id]
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Custom"
                            value={customDays[req.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setCustomDays(p => ({ ...p, [req.id]: val }))
                              if (val && Number(val) > 0) {
                                setDurations(p => ({ ...p, [req.id]: Number(val) }))
                              }
                            }}
                            className="w-16 px-2 py-1 rounded text-[10px] border border-border bg-background text-foreground"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground mr-1">{getDays(req.id)}d</span>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(req.id)}
                            className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingId(req.id); setRejectNote('') }}
                            className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {req.status === 'rejected' && req.adminNote ? `Note: ${req.adminNote}` : req.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payment requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectingId(null)} />
            <motion.div className="relative bg-card rounded-xl shadow-2xl border border-border p-6 max-w-md mx-4 z-10"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h3 className="text-lg font-bold mb-3">Reject Payment Request</h3>
              <div className="space-y-3">
                <label className="text-sm font-medium">Rejection Note (optional)</label>
                <Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for rejection..." />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject}>Reject</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
