import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccountStore } from '../../store/accountStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/button'
import { ChevronDown, Plus, Monitor, AlertTriangle } from 'lucide-react'
import { Input } from '../ui/input'
import toast from 'react-hot-toast'
import { DeleteAccountModal } from './DeleteAccountModal'

export function AccountSwitcher() {
  const { currentUser } = useAuthStore()
  const { accounts, activeAccountId, createAccount, switchAccount, renameAccount } = useAccountStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editAccountName, setEditAccountName] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteAccountInfo, setDeleteAccountInfo] = useState<{id: string; name: string} | null>(null)

  // Ensure user has at least one account upon load
  useEffect(() => {
    if (currentUser) {
      const userAccounts = accounts.filter(a => a.userId === currentUser.id)
      if (userAccounts.length === 0) {
        createAccount(currentUser.id, 'Default Account')
      } else if (!activeAccountId) {
        switchAccount(userAccounts[0].id)
      }
    }
  }, [currentUser, accounts, activeAccountId, createAccount, switchAccount])

  const userAccounts = accounts.filter(a => a.userId === currentUser?.id)
  const activeAccount = userAccounts.find(a => a.id === activeAccountId)

  const handleCreate = async () => {
    if (!currentUser) return
    if (!newAccountName.trim()) {
      toast.error('Account name cannot be empty')
      return
    }

    const { success } = await createAccount(currentUser.id, newAccountName.trim())
    if (success) {
      toast.success('Account created successfully')
      setNewAccountName('')
      setIsCreating(false)
      setIsOpen(false)
    } else {
      setShowLimitModal(true)
      setIsCreating(false)
      setIsOpen(false)
    }
  }

  const handleRename = (accountId: string) => {
    if (editAccountName.trim()) {
      renameAccount(accountId, editAccountName.trim())
    }
    setEditingAccountId(null)
    setEditAccountName('')
  }

  return (
    <>
      <div className="relative">
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={isOpen} 
          className="h-10 shrink-0 w-[220px] justify-between bg-card hover:bg-muted/50 border-emerald-500/30 overflow-hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2 overflow-hidden flex-1 text-left">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="truncate block font-medium">
              {activeAccount ? activeAccount.name : 'Select Account'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-[250px] bg-card border border-border shadow-xl rounded-lg p-2 z-50 overflow-hidden"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Your Accounts ({userAccounts.length}/10)
              </div>
              
              <div className="max-h-[200px] overflow-y-auto space-y-1 mb-2">
                {userAccounts.map(account => (
                  <div key={account.id} className="flex flex-col group relative">
                    {editingAccountId === account.id ? (
                      <div className="px-2 py-1 flex items-center gap-2">
                        <Input 
                          value={editAccountName}
                          onChange={(e) => setEditAccountName(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(account.id)
                            if (e.key === 'Escape') setEditingAccountId(null)
                          }}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRename(account.id)}>✓</Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            switchAccount(account.id)
                            setIsOpen(false)
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                            activeAccountId === account.id 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Monitor className="h-4 w-4 shrink-0" />
                          <span className="truncate pr-16">{account.name}</span>
                        </button>
                        
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-emerald-500/20 hover:text-emerald-600"
                            onClick={(e) => { e.stopPropagation(); setEditAccountName(account.name); setEditingAccountId(account.id); }}
                            title="Rename"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteAccountInfo({ id: account.id, name: account.name }); setShowDeleteModal(true); setIsOpen(false); }}
                            title="Permanently Delete"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border">
                {isCreating ? (
                  <div className="space-y-2 p-1">
                    <Input 
                      placeholder="E.g. Prop Firm, Swing..." 
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate()
                        if (e.key === 'Escape') setIsCreating(false)
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="w-full text-xs h-7" onClick={handleCreate}>Save</Button>
                      <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setIsCreating(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => {
                      if (userAccounts.length >= 10) {
                         setShowLimitModal(true)
                         setIsOpen(false)
                      } else {
                         setIsCreating(true)
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Account
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Max Accounts Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-destructive/20 relative"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Limit Reached</h2>
                <p className="text-muted-foreground">
                  You have reached the maximum limit of 10 accounts per user. This is enforced to maintain optimal performance.
                </p>
                <Button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 mt-4"
                >
                  Understood
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        accountId={deleteAccountInfo?.id || ''}
        accountName={deleteAccountInfo?.name || ''}
      />
    </>
  )
}
