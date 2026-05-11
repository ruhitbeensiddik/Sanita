import { useState, useEffect } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DollarSign, Save, Percent } from 'lucide-react'
import toast from 'react-hot-toast'

export function AdminSubscriptionSettings() {
  const { settings, fetchSettings, updateSettings } = useSubscriptionStore()
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [yearlyPrice, setYearlyPrice] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSettings() }, [])

  useEffect(() => {
    if (settings) {
      setMonthlyPrice(String(settings.monthlyPrice))
      setYearlyPrice(String(settings.yearlyPrice))
      setGlobalDiscount(String(settings.globalDiscountPercent))
    }
  }, [settings])

  const handleSave = async () => {
    const mp = parseFloat(monthlyPrice), yp = parseFloat(yearlyPrice), gd = parseFloat(globalDiscount)
    if (isNaN(mp) || mp < 0) { toast.error('Invalid monthly price'); return }
    if (isNaN(yp) || yp < 0) { toast.error('Invalid yearly price'); return }
    if (isNaN(gd) || gd < 0 || gd > 100) { toast.error('Discount must be 0–100%'); return }
    setSaving(true)
    await updateSettings({ monthlyPrice: mp, yearlyPrice: yp, globalDiscountPercent: gd })
    setSaving(false)
    toast.success('Settings saved!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" /> Subscription & Pricing
        </CardTitle>
        <CardDescription>Configure global pricing and discount for all users.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Price ($)</label>
            <Input type="number" step="0.01" min="0" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Yearly Price ($)</label>
            <Input type="number" step="0.01" min="0" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">Global Discount <Percent className="h-3.5 w-3.5 text-muted-foreground" /></label>
            <Input type="number" step="1" min="0" max="100" value={globalDiscount} onChange={e => setGlobalDiscount(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
        {settings && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted/30 rounded-lg border"><div className="text-2xl font-bold text-emerald-600">${settings.monthlyPrice}</div><div className="text-xs text-muted-foreground">Monthly</div></div>
            <div className="p-3 bg-muted/30 rounded-lg border"><div className="text-2xl font-bold text-emerald-600">${settings.yearlyPrice}</div><div className="text-xs text-muted-foreground">Yearly</div></div>
            <div className="p-3 bg-muted/30 rounded-lg border"><div className="text-2xl font-bold text-orange-500">{settings.globalDiscountPercent}%</div><div className="text-xs text-muted-foreground">Global Discount</div></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
