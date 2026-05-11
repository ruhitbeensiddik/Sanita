import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Users, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminUserDiscounts() {
  const { userDiscounts, fetchUserDiscounts, setUserDiscount } = useSubscriptionStore()
  const { users } = useAuthStore()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => { fetchUserDiscounts() }, [])

  const approvedUsers = users.filter(u => u.role !== 'super_admin' && u.status === 'approved')

  const getDiscount = (userId: string) => {
    const d = userDiscounts.find(ud => ud.userId === userId)
    return d ? d.discountPercent : 0
  }

  const handleSave = async (userId: string) => {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0 || val > 100) { toast.error('Must be 0–100%'); return }
    await setUserDiscount(userId, val)
    setEditingUser(null)
    toast.success('User discount updated!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" /> User-Specific Discounts
        </CardTitle>
        <CardDescription>Set individual discount percentages per user. This stacks with global and coupon discounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Discount %</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvedUsers.map(user => {
                const disc = getDiscount(user.id)
                const isEditing = editingUser === user.id
                return (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.subscriptionStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                        user.subscriptionStatus === 'expired' ? 'bg-red-500/10 text-red-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>{(user.subscriptionStatus || 'free').toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input type="number" min="0" max="100" className="h-8 w-24" value={editValue} onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSave(user.id); if (e.key === 'Escape') setEditingUser(null) }} autoFocus />
                      ) : (
                        <span className={`font-medium ${disc > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{disc}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(null)} className="h-7 text-xs">Cancel</Button>
                          <Button size="sm" onClick={() => handleSave(user.id)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setEditingUser(user.id); setEditValue(String(disc)) }} className="h-7 text-xs">
                          Set Discount
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {approvedUsers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No approved users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
