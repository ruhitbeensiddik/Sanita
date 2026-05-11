import { useAuthStore } from '../store/authStore'
import { MessageSquare } from 'lucide-react'

export function UserNoticeBox() {
  const { currentUser } = useAuthStore()

  if (!currentUser?.adminNotice) return null

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-orange-500/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
          <MessageSquare className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Notice from Admin
          </h4>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
            {currentUser.adminNotice}
          </p>
          {currentUser.adminNoticeUpdatedAt && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Updated: {new Date(currentUser.adminNoticeUpdatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
