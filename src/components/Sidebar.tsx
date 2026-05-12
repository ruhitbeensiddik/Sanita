import React from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { PieChart, BarChart3, Calendar, Target } from 'lucide-react'
import logoImage from '../forexdairy-logo.png'
type TabId = 'dashboard' | 'table' | 'calendar' | 'goals' | 'admin'

interface SidebarProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
  className?: string
}

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ComponentType<any>; description: string; color: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: PieChart, description: 'Overview & Analytics', color: 'text-foreground' },
  { id: 'table', label: 'Trades', icon: BarChart3, description: 'Trade Management', color: 'text-foreground' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Daily View', color: 'text-foreground' },
  { id: 'goals', label: 'Goals', icon: Target, description: 'Financial Goals', color: 'text-foreground' },
]

import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function Sidebar({ activeTab, onChange, className = "hidden lg:block w-64 shrink-0 pr-4" }: SidebarProps) {
  const { currentUser } = useAuthStore()
  
  let navItems: Array<{ id: TabId; label: string; icon: React.ComponentType<any>; description: string; color: string }> = []
  
  if (currentUser?.role === 'super_admin') {
    // Super Admin only sees management
    navItems = [{ id: 'admin', label: 'Admin', icon: ShieldAlert, description: 'System Management', color: 'text-foreground' }]
  } else {
    navItems = [...NAV_ITEMS]
    if (currentUser?.role === 'admin') {
      navItems.push({ id: 'admin', label: 'Admin', icon: ShieldAlert, description: 'System Management', color: 'text-foreground' } as any)
    }
  }

  return (
    <aside aria-label="Primary" className={className}>
      <Card className="border-0 shadow-xl p-4 sticky top-4 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
        <div className="text-center mb-4">
          <img 
            src={logoImage} 
            alt="Forex Dairy" 
            className="w-40 sm:w-48 h-auto object-contain mx-auto dark:invert"
          />
        </div>
        
        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                className={`justify-start h-auto py-4 px-4 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20' 
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
                onClick={() => onChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.color}`} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold leading-none">{item.label}</div>
                    <div className="text-xs opacity-80 mt-1">{item.description}</div>
                  </div>
                  {isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                  )}
                </div>
              </Button>
            )
          })}
        </nav>


      </Card>
    </aside>
  )
}

export default Sidebar
