import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { FeatureSwitcher } from './components/layout/FeatureSwitcher'
import { useTradeStore } from './store/tradeStore'
import { calculateTradeMetrics } from './lib/tradeUtils'
const TableView = lazy(() => import('./components/TableView').then(m => ({ default: m.TableView })))
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })))
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })))
const GoalsView = lazy(() => import('./components/GoalsView'))
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { 
  BarChart3, 
  Calendar, 
  Moon, 
  Sun, 
  ChevronLeft,
  ChevronRight,
  PieChart,
  Target,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react'
import logoImage from './logodudde.png'
import { Sidebar } from './components/Sidebar'
import { useAuthStore } from './store/authStore'
import { useAccountStore } from './store/accountStore'
import { AuthPage } from './components/auth/AuthPage'
import { AccountSwitcher } from './components/layout/AccountSwitcher'
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'calendar' | 'goals' | 'admin'>(() => {
    const saved = localStorage.getItem('activeTab') as 'dashboard' | 'table' | 'calendar' | 'goals' | 'admin' | null
    return saved || 'dashboard'
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  const { trades, currentMonth, setCurrentMonth } = useTradeStore()
  
  const { currentUser, logout } = useAuthStore()
  const { activeAccountId } = useAccountStore()
  
  const currentMonthTrades = useMemo(() => {
    return trades.filter(trade => {
      if (activeAccountId && trade.accountId !== activeAccountId) return false;
      const tradeDate = new Date(trade.date)
      return tradeDate.getFullYear() === currentMonth.year &&
             tradeDate.getMonth() + 1 === currentMonth.month
    })
  }, [trades, currentMonth, activeAccountId])
  
  // Realtime Supabase Initialization
  useEffect(() => {
    // 1. Initialize Auth State
    useAuthStore.getState().initializeAuth()
  }, [])
  
  useEffect(() => {
    if (currentUser?.id) {
      // 2. Initialize Realtime Listeners for this user
      const unsubAccounts = useAccountStore.getState().initializeAccounts(currentUser.id)
      const unsubTrades = useTradeStore.getState().initializeTrades(currentUser.id)
      const unsubGoals = useTradeStore.getState().initializeGoals(currentUser.id)
      
      return () => {
        unsubAccounts()
        unsubTrades()
        unsubGoals()
      }
    }
  }, [currentUser?.id])
  
  const summary = useMemo(() => {
    const metrics = calculateTradeMetrics(currentMonthTrades)
    return {
      totalProfitLoss: metrics.netPnL,
      totalRiskReward: currentMonthTrades.reduce((sum, trade) => sum + trade.riskReward, 0),
      winRate: metrics.profitRate,
      totalTrades: metrics.totalTrades
    }
  }, [currentMonthTrades])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Legacy data migration
  useEffect(() => {
    if (currentUser?.id && activeAccountId) {
      useTradeStore.getState().migrateLegacyData(currentUser.id, activeAccountId)
    }
  }, [currentUser?.id, activeAccountId])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) {
        return
      }
      if (e.key === 't') { e.preventDefault(); toggleTheme() }
      if (e.key === 'n') {
        e.preventDefault()
        setActiveTab('table')
        window.dispatchEvent(new CustomEvent('shortcut:add-trade'))
      }
      if (e.key === '/') {
        e.preventDefault()
        setActiveTab('table')
        window.dispatchEvent(new CustomEvent('shortcut:focus-search'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, toggleTheme])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = currentMonth.month
    let newYear = currentMonth.year

    if (direction === 'prev') {
      newMonth -= 1
      if (newMonth < 1) { newMonth = 12; newYear -= 1 }
    } else {
      newMonth += 1
      if (newMonth > 12) { newMonth = 1; newYear += 1 }
    }

    setCurrentMonth(newYear, newMonth)
  }

  let tabs: { id: string; label: string; icon: any; description: string }[] = []

  if (currentUser?.role === 'super_admin') {
    tabs = [
      { id: 'admin', label: 'Admin', icon: ShieldAlert, description: 'System Management' }
    ]
  } else {
    tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: PieChart, description: 'Overview & Analytics' },
      { id: 'table', label: 'Trades', icon: BarChart3, description: 'Trade Management' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Daily View' },
      { id: 'goals', label: 'Goals', icon: Target, description: 'Financial Goals' }
    ]
    if (currentUser?.role === 'admin') {
      tabs.push({ id: 'admin', label: 'Admin', icon: ShieldAlert, description: 'System Management' })
    }
  }

  const effectiveActiveTab = currentUser?.role === 'super_admin' ? 'admin' : activeTab

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" />
        <AuthPage />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#1a2332' : '#ffffff',
            color: isDark ? '#f0f4f8' : '#1a2332',
            border: isDark ? '1px solid #2d3f54' : '1px solid #d1dbe6',
          },
        }}
      />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2 w-full lg:w-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img 
                        src={logoImage} 
                        alt="Trading Journal Logo" 
                        className="h-10 sm:h-12 w-auto object-contain"
                      />
                      <div>
                        <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                          Trading Journal
                        </CardTitle>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0" 
                      onClick={() => setIsMobileMenuOpen(true)}
                    >
                      <Menu className="h-6 w-6" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-base sm:text-lg hidden sm:block">
                    Professional trading performance analytics
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto mt-2 lg:mt-0">
                  {/* Quick Stats - hidden for Super Admin */}
                  {currentUser?.role !== 'super_admin' && (
                    <div className="flex justify-between sm:justify-start gap-4 sm:gap-6 text-sm bg-muted/30 p-3 sm:p-0 rounded-xl sm:bg-transparent">
                      <div className="text-center">
                        <div className={`text-xl font-bold ${summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(summary.totalProfitLoss).toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">P&L</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-emerald-600">
                          {summary.winRate.toFixed(0)}%
                        </div>
                        <div className="text-muted-foreground">Profit Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {currentMonthTrades.length}
                        </div>
                        <div className="text-muted-foreground">Trades</div>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
                    {currentUser?.role !== 'super_admin' && (
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-full sm:w-[220px] justify-between shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')} className="h-8 w-8 p-0 hover:bg-background shrink-0">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-center font-medium px-2 py-1 flex-1 whitespace-nowrap text-sm sm:text-sm">
                          {monthNames[currentMonth.month - 1]} {currentMonth.year}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')} className="h-8 w-8 p-0 hover:bg-background shrink-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date().getFullYear(), new Date().getMonth() + 1)} className="h-8 px-2 ml-1 shrink-0 text-xs sm:text-sm" title="Jump to current month">
                          Today
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-between sm:justify-end flex-wrap sm:flex-nowrap">
                      {currentUser?.role !== 'super_admin' && (
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 sm:flex-none">
                          <FeatureSwitcher />
                          <AccountSwitcher />
                        </div>
                      )}

                      <Button variant="outline" size="icon" onClick={toggleTheme} className="h-10 w-10 shrink-0 hover:scale-105 transition-transform" title="Toggle Theme">
                        <motion.div initial={false} animate={{ rotate: isDark ? 0 : 180 }} transition={{ duration: 0.3 }}>
                          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </motion.div>
                      </Button>

                      <Button variant="outline" onClick={logout} className="h-10 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10">
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 hidden lg:block">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = effectiveActiveTab === tab.id
                  
                  return (
                    <motion.div key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative overflow-hidden transition-all duration-300 ${
                          isActive 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg scale-105 text-white' 
                            : 'hover:bg-muted/80 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium">{tab.label}</div>
                            <div className={`text-xs ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                              {tab.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile Sidebar overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 left-0 w-[280px] bg-background border-r shadow-2xl z-50 lg:hidden overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    Menu
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <Sidebar 
                    activeTab={effectiveActiveTab} 
                    onChange={(t) => {
                      setActiveTab(t as any)
                      setIsMobileMenuOpen(false)
                    }} 
                    className="w-full block" 
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex gap-6">
          <Sidebar activeTab={effectiveActiveTab} onChange={(t) => setActiveTab(t as any)} className="hidden lg:block w-64 shrink-0 pr-4" />
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
                  {effectiveActiveTab === 'dashboard' && <DashboardView />}
                  {effectiveActiveTab === 'table' && <TableView />}
                  {effectiveActiveTab === 'calendar' && <CalendarView />}
                  {effectiveActiveTab === 'goals' && <GoalsView />}
                  {effectiveActiveTab === 'admin' && <AdminDashboard />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 border-t border-border/50 pt-8 pb-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Brand */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={logoImage} alt="Trading Journal" className="h-8 w-auto object-contain" />
                  <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    Trading Journal
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Professional trading performance analytics and journal management platform.
                </p>
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Support</h4>
                <p className="text-sm text-muted-foreground">
                  Need help? Reach out to our support team for assistance.
                </p>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-border/30 pt-4">
              <p className="text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} Trading Journal. All rights reserved.
              </p>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}

export default App