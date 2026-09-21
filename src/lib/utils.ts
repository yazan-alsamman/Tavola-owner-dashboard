import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, differenceInMinutes } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const h12 = h % 12 || 12
  const suffix = h >= 12 ? 'م' : 'ص'
  return `${h12}:${minutes} ${suffix}`
}

export function formatTimeEn(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDisplayDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'Today'
    return format(d, 'EEE, MMM d')
  } catch {
    return dateStr
  }
}

export function parseReservationDateTime(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const d = parseISO(date)
  d.setHours(h, m, 0, 0)
  return d
}

export function minutesUntilReservation(date: string, time: string): number {
  return differenceInMinutes(parseReservationDateTime(date, time), new Date())
}

export function isWithinNextMinutes(date: string, time: string, minutes: number): boolean {
  const diff = minutesUntilReservation(date, time)
  return diff >= 0 && diff <= minutes
}

export function getServicePeriod(): 'breakfast' | 'lunch' | 'dinner' | 'late' {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 22) return 'dinner'
  return 'late'
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export function normalizeDemoDate(date: string): string {
  if (date === '2026-07-13') return getTodayISO()
  if (date === '2026-07-14') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return format(tomorrow, 'yyyy-MM-dd')
  }
  return date
}
