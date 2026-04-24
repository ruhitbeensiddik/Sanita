import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAccountStore } from '../../store/accountStore'
import { useTradeStore } from '../../store/tradeStore'
import toast from 'react-hot-toast'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
}

export function DeleteAccountModal({ isOpen, onClose, accountId, accountName }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const { deleteAccount } = useAccountStore()
  const { deleteDataByAccountId } = useTradeStore()

  const handleDelete = () => {
    if (confirmText !== 'CONFIRM') return

    // Cascade deletion
    deleteDataByAccountId(accountId)
    deleteAccount(accountId)
    
    toast.success(`Account "${accountName}" permanently deleted`, {
      icon: '🗑️',
    })
    
    // Clean up modal state
    setConfirmText('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-destructive/20 relative"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground">Delete Account</h2>
              
              <div className="text-muted-foreground text-sm space-y-2">
                <p>
                  You are about to permanently delete the account <strong>"{accountName}"</strong>.
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone.
                </p>
                <p>
                  All associated data including trades, analysis text, images, insights, and journals will be permanently destroyed.
                </p>
              </div>

              <div className="w-full pt-4 space-y-2 text-left">
                <label className="text-sm font-medium text-muted-foreground">
                  Type <span className="font-bold text-foreground select-all">CONFIRM</span> to permanently delete this account and all of its journal data:
                </label>
                <Input 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full text-center font-mono placeholder:font-sans"
                  autoFocus
                />
              </div>

              <div className="w-full flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setConfirmText('')
                    onClose()
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete}
                  disabled={confirmText !== 'CONFIRM'}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
