import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { MessageSquare, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminNoticeEditorProps {
  userId: string
  currentNotice: string | null
}

export function AdminNoticeEditor({ userId, currentNotice }: AdminNoticeEditorProps) {
  const [notice, setNotice] = useState(currentNotice || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      admin_notice: notice.trim() || null,
      admin_notice_updated_at: notice.trim() ? new Date().toISOString() : null
    }).eq('id', userId)
    setSaving(false)

    if (error) {
      console.error('Save notice error:', error)
      toast.error('Failed to save notice.')
    } else {
      toast.success(notice.trim() ? 'Notice saved for this user.' : 'Notice cleared.')
    }
  }

  const handleClear = async () => {
    setNotice('')
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      admin_notice: null,
      admin_notice_updated_at: null
    }).eq('id', userId)
    setSaving(false)

    if (error) {
      console.error('Clear notice error:', error)
      toast.error('Failed to clear notice.')
    } else {
      toast.success('Notice cleared for this user.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-500" />
          User Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="Write a notice for this user... (They will see this on their dashboard)"
          className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-foreground text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save Notice'}
          </Button>
          {(notice || currentNotice) && (
            <Button size="sm" variant="outline" onClick={handleClear} disabled={saving}
              className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3 w-3 mr-1" /> Clear Notice
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
