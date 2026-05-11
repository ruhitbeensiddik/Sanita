import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminCoupons() {
  const { coupons, fetchCoupons, createCoupon, updateCoupon, deleteCoupon } = useSubscriptionStore()
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [maxUses, setMaxUses] = useState('')

  useEffect(() => { fetchCoupons() }, [])

  const handleCreate = async () => {
    if (!code.trim()) { toast.error('Code is required'); return }
    const dp = parseFloat(discount)
    if (isNaN(dp) || dp < 0 || dp > 100) { toast.error('Discount must be 0–100%'); return }
    await createCoupon({
      code: code.trim(),
      discountPercent: dp,
      isActive: true,
      validFrom: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      maxUses: maxUses ? parseInt(maxUses) : null
    })
    setCode(''); setDiscount(''); setValidUntil(''); setMaxUses('')
    setShowForm(false)
    toast.success('Coupon created!')
  }

  const toggleActive = async (id: string, current: boolean) => {
    await updateCoupon(id, { isActive: !current })
    toast.success(`Coupon ${!current ? 'activated' : 'deactivated'}`)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this coupon?')) {
      await deleteCoupon(id)
      toast.success('Coupon deleted')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5 text-purple-500" /> Coupon Management
            </CardTitle>
            <CardDescription>{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <Plus className="h-4 w-4 mr-1" /> New Coupon
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-4 border border-border rounded-xl bg-muted/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code</label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="SAVE20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Discount %</label>
                <Input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="20" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Max Uses (blank=unlimited)</label>
                <Input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Valid From</label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Valid Until (blank=forever)</label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Valid Period</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{c.discountPercent}%</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.currentUses}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.validFrom).toLocaleDateString()} — {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '∞'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(c.id, c.isActive)} className="h-7 w-7 p-0" title={c.isActive ? 'Deactivate' : 'Activate'}>
                        {c.isActive ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No coupons created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
