import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  color: string
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl border p-5`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
