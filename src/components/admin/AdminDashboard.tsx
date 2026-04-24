import { useAuthStore, isDefaultSuperAdmin, getUserStatus } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { useTradeStore } from '../../store/tradeStore'
import { Users, Monitor, BarChart3, ShieldAlert, Trash2, Eye, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { AdminUserDetail } from './AdminUserDetail'

export function AdminDashboard() {
  const { currentUser, users, updateUserRole, deleteUser, subscribeToAllUsers, approveUser, rejectUser } = useAuthStore()
  const { accounts } = useAccountStore()
  const { trades } = useTradeStore()
  
  const [inspectUserId, setInspectUserId] = useState<string | null>(null)

  // Refresh user list when admin dashboard mounts
  useEffect(() => {
    subscribeToAllUsers()
  }, [subscribeToAllUsers])

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  const isSuperAdmin = currentUser.role === 'super_admin'
  const isAdmin = currentUser.role === 'admin'

  const handlePromote = (userId: string) => {
    updateUserRole(userId, 'admin')
    toast.success('User promoted to Admin')
  }

  const handleDemote = (userId: string) => {
    // Only super_admin can demote
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can demote admins.')
      return
    }
    updateUserRole(userId, 'user')
    toast.success('Admin demoted to User')
  }

  const handleDelete = (userId: string) => {
    // Cannot delete the default super admin
    if (isDefaultSuperAdmin(userId)) {
      toast.error('The default Super Admin account cannot be deleted.')
      return
    }
    
    const targetUser = users.find(u => u.id === userId)
    
    // Admins cannot delete other admins or super_admins
    if (isAdmin && targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      toast.error('You do not have permission to delete this user.')
      return
    }

    if (confirm('Are you sure you want to permanently delete this user and all their data?')) {
      deleteUser(userId)
      toast.success('User deleted successfully')
    }
  }

  const handleApprove = async (userId: string) => {
    await approveUser(userId)
    toast.success('User approved successfully! They can now log in.')
  }

  const handleReject = async (userId: string) => {
    if (confirm('Are you sure you want to reject and remove this pending user?')) {
      await rejectUser(userId)
      toast.success('Pending user rejected and removed.')
    }
  }

  const pendingUsers = users.filter(u => getUserStatus(u) === 'pending')

  // Inspect: Super Admin only
  if (inspectUserId && isSuperAdmin) {
    const userToInspect = users.find(u => u.id === inspectUserId)
    if (userToInspect) {
      return (
        <AdminUserDetail 
          user={userToInspect} 
          onBack={() => setInspectUserId(null)} 
        />
      )
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Status: <span className={`uppercase font-semibold tracking-wider ${isSuperAdmin ? 'text-indigo-500' : 'text-emerald-600'}`}>
              {currentUser.role.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card h-full">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                 <Users className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">{users.length}</div>
            </div>
          </CardContent>
        </Card>
        
        {isSuperAdmin && (
          <Card className="bg-card h-full">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="h-full flex flex-col items-center justify-center min-h-[80px]">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${pendingUsers.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                   <Clock className="h-6 w-6" />
                </div>
                <div className={`text-3xl font-bold ${pendingUsers.length > 0 ? 'text-amber-500' : ''}`}>{pendingUsers.length}</div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-card h-full">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
                 <Monitor className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">{accounts.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card h-full">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades Logged</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                 <BarChart3 className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold">{trades.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Pending User Approvals — Super Admin Only ═══ */}
      {isSuperAdmin && pendingUsers.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-amber-500">Pending User Approvals</CardTitle>
                <CardDescription>
                  {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting your approval to access the system.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-amber-500/5 border-b border-amber-500/20">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingUsers.map(user => (
                    <tr key={user.id} className="hover:bg-amber-500/5">
                      <td className="px-4 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {user.email}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="h-2.5 w-2.5" /> PENDING
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(user.id)}
                            className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(user.id)}
                            className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            {isSuperAdmin 
              ? 'Full user management — inspect, promote, demote, or delete users.'
              : 'View users, promote to admin, or remove users.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Accounts</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(user => {
                  const isProtected = isDefaultSuperAdmin(user.id)
                  const isSelf = currentUser.id === user.id
                  const isTargetSuperAdmin = user.role === 'super_admin'
                  const isTargetAdmin = user.role === 'admin'
                  const isTargetUser = user.role === 'user'

                  return (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-4 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {user.email}
                          {isProtected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              <Shield className="h-2.5 w-2.5" /> PROTECTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                           user.role === 'super_admin' ? 'bg-indigo-500/10 text-indigo-500' :
                           user.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                         }`}>
                           {user.role.replace('_', ' ').toUpperCase()}
                         </span>
                      </td>
                      <td className="px-4 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                           getUserStatus(user) === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                         }`}>
                           {getUserStatus(user).toUpperCase()}
                         </span>
                      </td>
                      <td className="px-4 py-4">
                        {accounts.filter(a => a.userId === user.id).length}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/* SELF */}
                          {isSelf && (
                            <span className="text-xs text-muted-foreground italic">You</span>
                          )}

                          {/* Not self and not the protected super admin */}
                          {!isSelf && (
                            <>
                              {/* INSPECT — Super Admin only, not on other super_admins */}
                              {isSuperAdmin && !isTargetSuperAdmin && (
                                <Button size="sm" variant="outline" onClick={() => setInspectUserId(user.id)} className="h-8 text-xs">
                                  <Eye className="h-3 w-3 mr-1" /> Inspect
                                </Button>
                              )}

                              {/* PROMOTE to Admin — both admin and super_admin can promote regular users */}
                              {isTargetUser && (
                                <Button size="sm" variant="outline" onClick={() => handlePromote(user.id)} className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                                  Promote
                                </Button>
                              )}

                              {/* DEMOTE from Admin — Super Admin only */}
                              {isSuperAdmin && isTargetAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handleDemote(user.id)} className="h-8 text-xs">
                                  Demote
                                </Button>
                              )}

                              {/* DELETE — Cannot delete protected super admin */}
                              {/* Admin can only delete regular users */}
                              {/* Super admin can delete anyone except the protected account */}
                              {!isProtected && (
                                <>
                                  {isSuperAdmin && !isTargetSuperAdmin && (
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(user.id)} className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 leading-none">
                                      <Trash2 className="h-3 w-3 mr-1"/> Delete
                                    </Button>
                                  )}
                                  {isAdmin && isTargetUser && (
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(user.id)} className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 leading-none">
                                      <Trash2 className="h-3 w-3 mr-1"/> Delete
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Protected badge instead of actions */}
                              {isProtected && !isSelf && (
                                <span className="text-xs text-muted-foreground italic">Protected</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}
