import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseDate(dateString: string): Date {
  return new Date(dateString)
} 

// --- Timezone-safe helpers for YYYY-MM-DD strings ---
function pad2(n: number): string { return String(n).padStart(2, '0') }

export function formatLocalYMD(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function parseYMDParts(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split('-').map(Number)
  return { year: y, month: m, day: d }
}

export function dateFromLocalYMD(ymd: string): Date {
  const { year, month, day } = parseYMDParts(ymd)
  // Construct with local timezone to avoid UTC shift
  return new Date(year, month - 1, day)
}