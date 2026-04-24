import { useState } from 'react'
import { User } from '../../types/auth'
import { useAccountStore } from '../../store/accountStore'
import { ArrowLeft, User as UserIcon, Monitor } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { TableView } from '../TableView'
import { TradingInsights } from '../TradingInsights'
import { GoalsView } from '../GoalsView'

interface AdminUserDetailProps {
  user: User
  onBack: () => void
}

export function AdminUserDetail({ user, onBack }: AdminUserDetailProps) {
  const { getUserAccounts } = useAccountStore()
  
  // Notice we can get user accounts securely since the admin is authenticated!
  const userAccounts = getUserAccounts(user.id)
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    userAccounts.length > 0 ? userAccounts[0].id : null
  )

  const [activeTab, setActiveTab] = useState<'trades' | 'insights' | 'goals'>('insights')

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <UserIcon className="h-6 w-6 text-emerald-500" />
                User Profile: {user.email}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-4">
                <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium">
                  Role: {user.role.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground text-sm">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

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
                <Monitor className="h-5 w-5 text-emerald-500" />
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
                    className={selectedAccountId === acc.id ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
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
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'insights' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Insights & Analytics
                </button>
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'trades' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Trade History
                </button>
                <button
                  onClick={() => setActiveTab('goals')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'goals' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
