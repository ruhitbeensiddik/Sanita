import { TooltipProps } from 'recharts'
import { formatCurrency } from '../../lib/utils'

interface CustomTooltipProps extends TooltipProps<any, any> {
  formatterType?: 'currency' | 'percentage' | 'number' | 'text'
  customLabel?: string
  active?: boolean
  payload?: any[]
  label?: string
}

export function ChartTooltip({ active, payload, label, formatterType = 'number', customLabel }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-4 min-w-[150px] animate-in fade-in zoom-in-95 duration-200">
        {label && (
          <p className="text-sm font-semibold mb-2 border-b border-border/50 pb-2">
            {customLabel ? `${customLabel} ${label}` : label}
          </p>
        )}
        <div className="space-y-1.5">
          {payload.map((entry, index) => {
            let formattedValue = entry.value

            if (typeof entry.value === 'number') {
              switch (formatterType) {
                case 'currency':
                  formattedValue = formatCurrency(entry.value)
                  break
                case 'percentage':
                  formattedValue = `${entry.value.toFixed(2)}%`
                  break
                case 'number':
                  formattedValue = entry.value.toLocaleString()
                  break
              }
            }

            return (
              <div key={index} className="flex items-center gap-2 text-sm justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground capitalize font-medium">{entry.name}:</span>
                </div>
                <span className="font-bold text-foreground">{formattedValue}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
