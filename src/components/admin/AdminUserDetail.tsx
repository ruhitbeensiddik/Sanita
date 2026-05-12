import { useState } from 'react'
import { User } from '../../types/auth'
import { useAccountStore } from '../../store/accountStore'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, User as UserIcon, Monitor, PauseCircle, PlayCircle, Calendar } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { TableView } from '../TableView'
import { TradingInsights } from '../TradingInsights'
import { GoalsView } from '../GoalsView'
import { AdminNoticeEditor } from './AdminNoticeEditor'
import toast from 'react-hot-toast'

interface AdminUserDetailProps {
  user: User
  onBack: () => void
}

export function AdminUserDetail({ user, onBack }: AdminUserDetailProps) {
  const { getUserAccounts } = useAccountStore()
  const { subscribeToAllUsers } = useAuthStore()
  const [pausing, setPausing] = useState(false)
  
  const userAccounts = getUserAccounts(user.id)
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    userAccounts.length > 0 ? userAccounts[0].id : null
  )

  const [activeTab, setActiveTab] = useState<'trades' | 'insights' | 'goals'>('insights')

  // Calculate subscription info
  const now = new Date()
  const expiresAt = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null
  const startedAt = user.subscriptionStartedAt ? new Date(user.subscriptionStartedAt) : null
  const isExpired = expiresAt ? expiresAt < now : true
  const remainingDays = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const effectiveStatus = user.subscriptionPaused ? 'paused' : (isExpired ? 'expired' : (user.subscriptionStatus || 'free'))

  const handlePause = async () => {
    setPausing(true)
    const currentAdmin = useAuthStore.getState().currentUser
    const { error } = await supabase.from('profiles').update({
      subscription_paused: true,
      subscription_paused_at: new Date().toISOString(),
      subscription_paused_by: currentAdmin?.id || null
    }).eq('id', user.id)
    setPausing(false)
    if (error) {
      console.error('Pause user error:', error)
      toast.error('Failed to pause user.')
    } else {
      toast.success('User paused. They cannot add new trades.')
      subscribeToAllUsers()
    }
  }

  const handleResume = async () => {
    setPausing(true)
    const { error } = await supabase.from('profiles').update({
      subscription_paused: false,
      subscription_paused_at: null,
      subscription_paused_by: null
    }).eq('id', user.id)
    setPausing(false)
    if (error) {
      console.error('Resume user error:', error)
      toast.error('Failed to resume user.')
    } else {
      toast.success('User resumed.')
      subscribeToAllUsers()
    }
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <UserIcon className="h-6 w-6 text-foreground" />
                {fullName || user.email}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-4 flex-wrap">
                {fullName && (
                  <span className="text-muted-foreground text-sm">{user.email}</span>
                )}
                <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium">
                  Role: {user.role.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground text-sm">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </span>
                {user.subscriptionPaused && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    ⏸ PAUSED
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Subscription Info + Pause/Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                effectiveStatus === 'active' ? 'bg-green-500/10 text-green-600' :
                effectiveStatus === 'paused' ? 'bg-orange-500/10 text-orange-500' :
                effectiveStatus === 'expired' ? 'bg-red-500/10 text-red-500' :
                'bg-slate-500/10 text-slate-500'
              }`}>
                {effectiveStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Approved Days</div>
              <div className="text-sm font-semibold">{user.subscriptionApprovedDays ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Started</div>
              <div className="text-sm font-semibold">
                {startedAt ? startedAt.toLocaleDateString() : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Expires</div>
              <div className="text-sm font-semibold">
                {expiresAt ? expiresAt.toLocaleDateString() : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Remaining</div>
              <div className={`text-sm font-bold ${remainingDays > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {remainingDays} days
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Paused</div>
              <div className="text-sm font-semibold">{user.subscriptionPaused ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {user.subscriptionPaused ? (
              <Button size="sm" onClick={handleResume} disabled={pausing}
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <PlayCircle className="h-4 w-4 mr-1" /> {pausing ? 'Resuming...' : 'Resume User'}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handlePause} disabled={pausing}
                className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                <PauseCircle className="h-4 w-4 mr-1" /> {pausing ? 'Pausing...' : 'Pause User'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Notice for this user */}
      <AdminNoticeEditor userId={user.id} currentNotice={user.adminNotice || null} />

      {userAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            This user has not created any trading accounts yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="h-5 w-5 text-foreground" />
                Inspect Account Journals
              </CardTitle>
              <CardDescription>
                Select one of this user's sub-accounts to view their hidden analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userAccounts.map(acc => (
                  <Button
                    key={acc.id}
                    variant={selectedAccountId === acc.id ? 'default' : 'outline'}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={selectedAccountId === acc.id ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                  >
                    {acc.name} {acc.isDefault && '(Default)'}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedAccountId && (
            <div className="space-y-6">
              <div className="flex border-b border-border overflow-x-auto">
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'insights' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Insights & Analytics
                </button>
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'trades' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Trade History
                </button>
                <button
                  onClick={() => setActiveTab('goals')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'goals' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Financial Goals
                </button>
              </div>

              <div className="mt-6">
                {activeTab === 'insights' && <TradingInsights adminOverrideAccountId={selectedAccountId} adminOverrideUserId={user.id} hideControls={true} />}
                {activeTab === 'trades' && <TableView adminOverrideAccountId={selectedAccountId} adminOverrideUserId={user.id} hideControls={true} />}
                {activeTab === 'goals' && <GoalsView adminOverrideAccountId={selectedAccountId} adminOverrideUserId={user.id} hideControls={true} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
