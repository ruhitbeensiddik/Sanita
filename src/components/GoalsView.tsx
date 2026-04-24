import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTradeStore } from '../store/tradeStore'
import { useAccountStore } from '../store/accountStore'
import { Goal } from '../types/trade'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'

import { 
  Plus, 
  Target, 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  Clock,
  Pause,
  Edit,
  Trash2,
  ArrowLeft,
  ArrowRight,
  History,
  Tag,
  AlertTriangle,
  Archive,
  Save
} from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartTooltip } from './ui/ChartTooltip'

type ViewMode = 'list' | 'detail'

interface GoalsViewProps {
  adminOverrideAccountId?: string
  adminOverrideUserId?: string
  hideControls?: boolean
}

export function GoalsView({ adminOverrideAccountId, adminOverrideUserId, hideControls }: GoalsViewProps) {
  const { 
    getGoals, 
    getGoalSummary, 
    addGoal, 
    updateGoal, 
    deleteGoal, 
    toggleGoalStatus,
    allocateProfitToGoals, 
    getGoalById 
  } = useTradeStore()
  // Subscribe to raw goals state for reactivity — ensures re-render on add/edit/delete
  const storeGoals = useTradeStore(state => state.goals)
  void storeGoals
  const { activeAccountId } = useAccountStore()

  // Use the admin override ID if provided, otherwise the current user's active account
  const currentViewAccountId = adminOverrideAccountId || activeAccountId

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [manualAllocationAmount, setManualAllocationAmount] = useState(0)
  const [showArchivedGoals, setShowArchivedGoals] = useState(false)
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetAmount: 0,
    currentAmount: 0,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    profitAllocationPercentage: 0,
    status: 'Active' as 'Active' | 'Completed' | 'Paused',
    category: '',
    origin: 'Manual' as 'Manual' | 'Auto' | 'Template' | 'Import',
    tags: [] as string[],
    targetDate: '',
    notes: ''
  })

  // Use currentViewAccountId and explicitly pass adminOverrideUserId down to getters
  const goals = getGoals(showArchivedGoals, currentViewAccountId, adminOverrideUserId)
  const goalSummary = getGoalSummary(currentViewAccountId, adminOverrideUserId)
  const selectedGoal = selectedGoalId ? getGoalById(selectedGoalId) : null
  
  // Navigation between goals
  const currentGoalIndex = selectedGoal ? goals.findIndex(g => g.id === selectedGoal.id) : -1
  const canNavigatePrev = currentGoalIndex > 0
  const canNavigateNext = currentGoalIndex < goals.length - 1

  // Handler functions
  const handleAddGoal = () => {
    if (newGoal.title.trim() && newGoal.targetAmount > 0) {
      addGoal({
        ...newGoal,
        targetAmount: Number(newGoal.targetAmount),
        currentAmount: Number(newGoal.currentAmount),
        profitAllocationPercentage: Number(newGoal.profitAllocationPercentage)
      })
      resetNewGoalForm()
      setShowAddGoal(false)
    }
  }

  const resetNewGoalForm = () => {
    setNewGoal({
      title: '',
      description: '',
      targetAmount: 0,
      currentAmount: 0,
      priority: 'Medium',
      profitAllocationPercentage: 0,
      status: 'Active',
      category: '',
      origin: 'Manual',
      tags: [],
      targetDate: '',
      notes: ''
    })
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal({ ...goal })
  }

  const handleSaveEdit = () => {
    if (editingGoal && editingGoal.title.trim() && editingGoal.targetAmount > 0) {
      updateGoal(editingGoal.id, editingGoal, 'Goal details updated')
      setEditingGoal(null)
    }
  }

  const handleDeleteGoal = (goalId: string, permanent = false) => {
    deleteGoal(goalId, permanent)
    setShowDeleteConfirm(null)
    if (selectedGoalId === goalId) {
      setViewMode('list')
      setSelectedGoalId(null)
    }
  }

  const handleViewGoalDetail = (goalId: string) => {
    setSelectedGoalId(goalId)
    setViewMode('detail')
  }

  const handleNavigateGoal = (direction: 'prev' | 'next') => {
    if (!selectedGoal) return
    
    const newIndex = direction === 'prev' ? currentGoalIndex - 1 : currentGoalIndex + 1
    if (newIndex >= 0 && newIndex < goals.length) {
      setSelectedGoalId(goals[newIndex].id)
    }
  }

  const handleManualAllocation = () => {
    if (manualAllocationAmount > 0) {
      allocateProfitToGoals(manualAllocationAmount)
      setManualAllocationAmount(0)
    }
  }

  const handleToggleStatus = (goalId: string, status: Goal['status']) => {
    toggleGoalStatus(goalId, status)
  }

  const getProgressPercentage = (goal: Goal) => {
    return goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'Low': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Paused': return <Pause className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'Auto': return <Target className="h-4 w-4" />
      case 'Template': return <Tag className="h-4 w-4" />
      case 'Import': return <Archive className="h-4 w-4" />
      default: return <Edit className="h-4 w-4" />
    }
  }

  // Data for pie chart
  const chartData = goals.filter(g => g.status === 'Active' && !g.isArchived).map(goal => ({
    name: goal.title,
    value: goal.profitAllocationPercentage,
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  // Render different views based on mode
  if (viewMode === 'detail' && selectedGoal) {
    return <GoalDetailView 
      goal={selectedGoal}
      onBack={() => setViewMode('list')}
      onEdit={handleEditGoal}
      onDelete={(id) => setShowDeleteConfirm(id)}
      onNavigate={handleNavigateGoal}
      canNavigatePrev={canNavigatePrev}
      canNavigateNext={canNavigateNext}
      getProgressPercentage={getProgressPercentage}
      getStatusIcon={getStatusIcon}
      getOriginIcon={getOriginIcon}
      onToggleStatus={handleToggleStatus}
      editingGoal={editingGoal}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={() => setEditingGoal(null)}
      setEditingGoal={setEditingGoal}
      showDeleteConfirm={showDeleteConfirm}
      onConfirmDelete={handleDeleteGoal}
      onCancelDelete={() => setShowDeleteConfirm(null)}
    />
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header aligned with Emerald Theme */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
            <Target className="h-8 w-8 text-emerald-500" />
            Financial Goals
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Set, track, and automatically fund your trading objectives
          </p>
        </div>
        
        {!hideControls && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowArchivedGoals(!showArchivedGoals)}
              className="flex items-center gap-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
            >
              <Archive className="h-4 w-4" />
              {showArchivedGoals ? 'Hide Archived' : 'Show Archived'}
            </Button>
            <Button 
              onClick={() => setShowAddGoal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
            >
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Target</div>
            <div className="text-2xl font-bold text-foreground">
              ${goalSummary.totalTargetAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-500/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <DollarSign className="w-24 h-24" />
            </div>
            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1 z-10">Current Funded</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 z-10 flex items-center gap-1">
              ${goalSummary.totalCurrentAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              {goalSummary.totalCurrentAmount > 0 && (
                <TrendingUp className="h-4 w-4 text-emerald-500 inline ml-1" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">Overall Progress</div>
            <div className="text-2xl font-bold text-teal-600">
              {goalSummary.totalProgressPercentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">Active Goals</div>
            <div className="text-2xl font-bold text-foreground">
              {goalSummary.totalActiveGoals}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Profit Allocation */}
      {goals.filter(g => g.status === 'Active').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex gap-4">
            {!hideControls && (
              <Card className="flex-1 bg-card border-border shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Fund Manual Profit</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        value={manualAllocationAmount || ''} 
                        onChange={(e) => setManualAllocationAmount(Number(e.target.value))}
                        placeholder="Amount to allocate" 
                        className="pl-8"
                      />
                    </div>
                    <Button onClick={handleManualAllocation} disabled={manualAllocationAmount <= 0} className="bg-emerald-600 hover:bg-emerald-700">
                      Allocate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Manually distribute extra capital across your active goals based on their percentage.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {/* Goals Chart and Add Button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Allocation Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Profit Allocation Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatterType="currency" />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No active goals to display
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Goal Button */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-full p-6">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Add New Goal</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Set financial targets and track your progress automatically
              </p>
              <Button onClick={() => setShowAddGoal(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Goals List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first financial goal
                </p>
                <Button onClick={() => setShowAddGoal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Archive Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {showArchivedGoals ? 'All Goals' : 'Active Goals'} ({goals.length})
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowArchivedGoals(!showArchivedGoals)}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    {showArchivedGoals ? 'Hide Archived' : 'Show Archived'}
                  </Button>
                </div>

                {goals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      goal.isArchived ? 'opacity-60 border-dashed' : ''
                    }`}
                    onClick={() => handleViewGoalDetail(goal.id)}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(goal.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{goal.title}</h4>
                            {goal.isArchived && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                Archived
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getOriginIcon(goal.origin)}
                            <span className="text-xs text-muted-foreground">
                              {goal.origin} • Created {new Date(goal.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditGoal(goal)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(goal.id)
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                        <span className="text-sm font-medium">
                          {goal.profitAllocationPercentage}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(getProgressPercentage(goal), 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getProgressPercentage(goal).toFixed(1)}% complete • 
                        ${(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                        {goal.targetDate && (
                          <> • Target: {new Date(goal.targetDate).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowAddGoal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Emergency Fund, New Car, Investment Portfolio"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your goal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Amount ($)</label>
                  <Input
                    type="number"
                    value={newGoal.targetAmount || ''}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
                    placeholder="10000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Current Amount ($)</label>
                  <Input
                    type="number"
                    value={newGoal.currentAmount || ''}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, currentAmount: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Profit Allocation (%)</label>
                  <Input
                    type="number"
                    value={newGoal.profitAllocationPercentage || ''}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, profitAllocationPercentage: Number(e.target.value) }))}
                    placeholder="25"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category (Optional)</label>
                <Input
                  value={newGoal.category}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Emergency Fund, Investment, Purchase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Date (Optional)</label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <Input
                  value={newGoal.notes}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this goal"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddGoal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddGoal} className="flex-1">
                Create Goal
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingGoal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Edit Goal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  value={editingGoal.description}
                  onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Amount ($)</label>
                  <Input
                    type="number"
                    value={editingGoal.targetAmount || ''}
                    onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, targetAmount: Number(e.target.value) }) : null)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Current Amount ($)</label>
                  <Input
                    type="number"
                    value={editingGoal.currentAmount || ''}
                    onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, currentAmount: Number(e.target.value) }) : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={editingGoal.priority}
                    onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' }) : null)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Profit Allocation (%)</label>
                  <Input
                    type="number"
                    value={editingGoal.profitAllocationPercentage || ''}
                    onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, profitAllocationPercentage: Number(e.target.value) }) : null)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingGoal.status}
                  onChange={(e) => setEditingGoal(prev => prev ? ({ ...prev, status: e.target.value as 'Active' | 'Completed' | 'Paused' }) : null)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingGoal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this goal? This action will archive the goal and remove it from active tracking.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleDeleteGoal(showDeleteConfirm, false)} 
                className="flex-1"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteGoal(showDeleteConfirm, true)} 
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

// Goal Detail View Component
function GoalDetailView({ 
  goal, 
  onBack, 
  onEdit, 
  onDelete, 
  onNavigate, 
  canNavigatePrev, 
  canNavigateNext,
  getProgressPercentage,
  getStatusIcon,
  getOriginIcon,
  onToggleStatus,
  editingGoal,
  onSaveEdit,
  onCancelEdit,
  setEditingGoal,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete
}: {
  goal: Goal
  onBack: () => void
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onNavigate: (direction: 'prev' | 'next') => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
  getProgressPercentage: (goal: Goal) => number
  getStatusIcon: (status: string) => JSX.Element
  getOriginIcon: (origin: string) => JSX.Element
  onToggleStatus: (id: string, status: Goal['status']) => void
  editingGoal: Goal | null
  onSaveEdit: () => void
  onCancelEdit: () => void
  setEditingGoal: (goal: Goal | null) => void
  showDeleteConfirm: string | null
  onConfirmDelete: (id: string, permanent?: boolean) => void
  onCancelDelete: () => void
}) {
  // Progress chart data
  const progressData = goal.history
    .filter(entry => entry.action === 'Progress' || entry.action === 'Created')
    .map(entry => ({
      date: new Date(entry.timestamp).toLocaleDateString(),
      amount: entry.amount || goal.currentAmount,
      timestamp: entry.timestamp
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const progress = getProgressPercentage(goal)

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={!canNavigatePrev}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={!canNavigateNext}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit(goal)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onDelete(goal.id)} className="gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* Goal Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(goal.status)}
                <div>
                  <CardTitle className="text-2xl">{goal.title}</CardTitle>
                  <p className="text-muted-foreground mt-1">{goal.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {goal.status === 'Completed' ? (
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                ) : goal.status === 'Paused' ? (
                  <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Pause className="w-3 h-3" /> Paused
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-lg font-bold">
                  {getProgressPercentage(goal).toFixed(1)}%
                </span>
              </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-[1s] ease-out ${progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${goal.currentAmount.toLocaleString()}</span>
                <span>${goal.targetAmount.toLocaleString()}</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm font-medium">
                  ${(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                </span>
              </div>
            </div>

            {/* Goal Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Profit Allocation</div>
                <div className="font-semibold">{goal.profitAllocationPercentage}%</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Origin</div>
                <div className="flex items-center gap-2">
                  {getOriginIcon(goal.origin)}
                  <span className="font-semibold">{goal.origin}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Category</div>
                <div className="font-semibold">{goal.category || 'None'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-semibold">{new Date(goal.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="font-semibold">{new Date(goal.updatedAt).toLocaleDateString()}</div>
              </div>
              {goal.targetDate && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Target Date</div>
                  <div className="font-semibold">{new Date(goal.targetDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {goal.notes && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Notes</div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {goal.notes}
                </div>
              </div>
            )}

            {/* Status Controls */}
            <div className="flex gap-2">
              <Button
                variant={goal.status === 'Active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleStatus(goal.id, 'Active')}
                disabled={goal.isArchived}
              >
                Active
              </Button>
              <Button
                variant={goal.status === 'Paused' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleStatus(goal.id, 'Paused')}
                disabled={goal.isArchived}
              >
                Paused
              </Button>
              <Button
                variant={goal.status === 'Completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleStatus(goal.id, 'Completed')}
                disabled={goal.isArchived}
              >
                Completed
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Chart */}
      {progressData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    content={<ChartTooltip formatterType="currency" customLabel="Data Point" />}
                    cursor={{ stroke: 'var(--tw-colors-emerald-500)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Goal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {goal.history.map((entry, _) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    entry.action === 'Completed' ? 'bg-green-500' :
                    entry.action === 'Progress' ? 'bg-blue-500' :
                    entry.action === 'Updated' ? 'bg-yellow-500' :
                    entry.action === 'Created' ? 'bg-gray-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                    {entry.amount && (
                      <p className="text-sm font-medium text-green-600">
                        +${entry.amount.toFixed(2)}
                      </p>
                    )}
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.changes.map((change, changeIndex) => (
                          <div key={changeIndex} className="text-xs text-muted-foreground">
                            {change.field}: {String(change.oldValue)} → {String(change.newValue)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Modal (if editing) */}
      <AnimatePresence>
        {editingGoal && editingGoal.id === goal.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onCancelEdit()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold mb-4">Edit Goal</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={editingGoal.title}
                    onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={editingGoal.description}
                    onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Amount ($)</label>
                    <Input
                      type="number"
                      value={editingGoal.targetAmount || ''}
                      onChange={(e) => setEditingGoal({ ...editingGoal, targetAmount: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Amount ($)</label>
                    <Input
                      type="number"
                      value={editingGoal.currentAmount || ''}
                      onChange={(e) => setEditingGoal({ ...editingGoal, currentAmount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={editingGoal.priority}
                      onChange={(e) => setEditingGoal({ ...editingGoal, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Profit Allocation (%)</label>
                    <Input
                      type="number"
                      value={editingGoal.profitAllocationPercentage || ''}
                      onChange={(e) => setEditingGoal({ ...editingGoal, profitAllocationPercentage: Number(e.target.value) })}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={onCancelEdit} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onSaveEdit} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm === goal.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete "{goal.title}"? This action will archive the goal and remove it from active tracking.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onCancelDelete} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => onConfirmDelete(goal.id, false)} 
                  className="flex-1"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => onConfirmDelete(goal.id, true)} 
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GoalsView

