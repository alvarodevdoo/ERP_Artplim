import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  className?: string
}

const badgeVariants = {
  default: 'bg-blue-500 text-white',
  secondary: 'bg-gray-100 text-gray-900',
  destructive: 'bg-red-500 text-white',
  outline: 'border border-gray-300 text-gray-900 bg-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${badgeVariants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}