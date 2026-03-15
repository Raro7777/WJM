import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  color: string
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl border p-6`}>
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <span className="text-[14px] font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-[28px] sm:text-[32px] font-bold text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}
