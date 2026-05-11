import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export function AdminPaymentRequests() {
  const { paymentRequests, fetchPaymentRequests, approvePaymentRequest, rejectPaymentRequest } = useSubscriptionStore()
  const { subscribeToAllUsers } = useAuthStore()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => { fetchPaymentRequests() }, [])

  const filtered = paymentRequests.filter(r => filter === 'all' || r.status === filter)

  const handleApprove = async (id: string) => {
    await approvePaymentRequest(id)
    subscribeToAllUsers() // refresh user list to show updated subscription
    toast.success('Payment approved! User subscription activated.')
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
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Original</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Coupon</th>
                <th className="px-4 py-3">Date</th>
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
                  <td className="px-4 py-3 capitalize font-medium">{req.selectedPlan}</td>
                  <td className="px-4 py-3">${req.originalPrice}</td>
                  <td className="px-4 py-3 text-emerald-600">{req.discountPercent}%</td>
                  <td className="px-4 py-3 font-bold">${req.finalPrice}</td>
                  <td className="px-4 py-3 font-mono text-xs">{req.couponCode || '-'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleApprove(req.id)}
                          className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(req.id); setRejectNote('') }}
                          className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
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
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No payment requests found.</td></tr>
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
