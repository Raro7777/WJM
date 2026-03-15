import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '../../hooks/useTasks'
import { useAppStore } from '../../stores/appStore'

function getUrgencyStyle(count: number) {
  if (count === 0) {
    return {
      gradient: 'from-gray-400 to-gray-500',
      shadow: 'shadow-lg shadow-gray-400/20',
      size: 56,
      fontSize: 'text-lg',
      pulse: false,
    }
  }
  if (count <= 5) {
    return {
      gradient: 'from-blue-500 to-blue-700',
      shadow: 'shadow-lg shadow-blue-500/30',
      size: 60,
      fontSize: 'text-xl',
      pulse: false,
    }
  }
  if (count <= 10) {
    return {
      gradient: 'from-amber-400 to-orange-600',
      shadow: 'shadow-lg shadow-orange-500/40',
      size: 66,
      fontSize: 'text-xl',
      pulse: false,
    }
  }
  if (count <= 20) {
    return {
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-xl shadow-red-500/40',
      size: 72,
      fontSize: 'text-2xl',
      pulse: true,
    }
  }
  // 20+
  return {
    gradient: 'from-red-500 to-red-800',
    shadow: 'shadow-xl shadow-red-600/50',
    size: 78,
    fontSize: 'text-2xl',
    pulse: true,
  }
}

export function FloatingButton() {
  const { setExpanded } = useAppStore()
  const { tasks } = useTasks()

  const pendingCount = useMemo(() =>
    tasks.filter(
      (t) => t.status === 'pending' || t.status === 'processing' || t.status === 'need_confirm'
    ).length
  , [tasks])

  const style = useMemo(() => getUrgencyStyle(pendingCount), [pendingCount])

  const handleMouseEnter = async () => {
    setExpanded(true)
    await window.electronAPI?.expandWidget()
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Pulse ring for urgent states */}
      {style.pulse && (
        <motion.div
          className={`absolute rounded-full bg-gradient-to-br ${style.gradient} opacity-30`}
          style={{ width: style.size, height: style.size }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <motion.div
        onMouseEnter={handleMouseEnter}
        className={`drag-region rounded-full bg-gradient-to-br ${style.gradient} ${style.shadow} flex items-center justify-center cursor-pointer relative select-none`}
        style={{ width: style.size, height: style.size }}
        whileHover={{ scale: 1.1 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <span className={`text-white font-bold ${style.fontSize} no-drag`}>
          {pendingCount}
        </span>
      </motion.div>
    </div>
  )
}
