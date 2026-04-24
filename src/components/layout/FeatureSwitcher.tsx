import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ChevronDown, Beaker, LineChart, PlayCircle, BrainCircuit, X, Sparkles } from 'lucide-react'

export function FeatureSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false)
  const [selectedUpcomingFeature, setSelectedUpcomingFeature] = useState<{name: string, icon: any, desc: string} | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options = [
    { id: 'journal', name: 'Journal', icon: Beaker, active: true, desc: 'Your core trade logging platform.' },
    { id: 'analytics', name: 'Journal Pro', icon: LineChart, active: false, desc: 'Advanced multidimensional trade scaling and regression analytics.' },
    { id: 'replay', name: 'Journal Automation', icon: PlayCircle, active: false, desc: 'Replay your exact market price action execution timelines.' },
    { id: 'ai', name: 'Signal Share', icon: BrainCircuit, active: false, desc: 'Share your signals and insights instantly with your network.' }
  ]

  const handleSelect = (option: typeof options[0]) => {
    setIsOpen(false)
    if (option.id === 'journal') {
      // It's the active one, do nothing
      return
    }
    // Otherwise open the coming soon modal
    setSelectedUpcomingFeature(option)
    setComingSoonModalOpen(true)
  }

  return (
    <>
      <div className="relative" ref={containerRef}>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={isOpen} 
          className="h-10 shrink-0 w-[180px] sm:w-[200px] justify-between bg-card hover:bg-muted/50 border-emerald-500/30 overflow-hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2 overflow-hidden flex-1 text-left">
            <Beaker className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="truncate block font-medium">
              Journal
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
              className="absolute top-full right-0 sm:left-0 mt-2 w-[240px] sm:w-[280px] bg-card border border-border shadow-xl rounded-lg p-2 z-50 overflow-hidden"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Features
              </div>
              
              <div className="space-y-1 mb-2">
                {options.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt)}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm flex items-center justify-between transition-colors ${
                        opt.active 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{opt.name}</span>
                      </div>
                      
                      {!opt.active && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text ml-2 px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5">
                          Soon
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {comingSoonModalOpen && selectedUpcomingFeature && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md"
            >
              <Card className="border-border/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <Button variant="ghost" size="icon" onClick={() => setComingSoonModalOpen(false)} className="rounded-full h-8 w-8 hover:bg-muted">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <CardHeader className="pt-8 pb-4 text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <selectedUpcomingFeature.icon className="h-8 w-8 text-indigo-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    {selectedUpcomingFeature.name}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="text-center space-y-6 pb-8">
                  <div className="text-muted-foreground text-sm space-y-2">
                    <p>{selectedUpcomingFeature.desc}</p>
                    <p className="font-medium text-foreground py-2 border-y border-border/50 my-4 flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Our engineers are actively building this feature.
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => setComingSoonModalOpen(false)}
                  >
                    Got it
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
