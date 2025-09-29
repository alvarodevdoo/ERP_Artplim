import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  disabled?: boolean
  options?: Map<string, React.ReactNode>
}>({ 
  isOpen: false,
  setIsOpen: () => {},
})

export function Select({ value, onValueChange, disabled, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const options = useMemo(() => {
    const map = new Map<string, React.ReactNode>()
    React.Children.forEach(children, (child: any) => {
      if (child && child.type === SelectContent) {
        React.Children.forEach(child.props.children, (item: any) => {
          if (item && item.props && item.props.value) {
            map.set(item.props.value, item.props.children)
          }
        })
      }
    })
    return map
  }, [children])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, disabled, options }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { isOpen, setIsOpen, disabled } = React.useContext(SelectContext)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 
        bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      {children}
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

export function SelectContent({ children }: SelectContentProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={contentRef}
      className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
      role="listbox"
    >
      {children}
    </div>
  )
}

export function SelectItem({ value, children }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext)

  const handleClick = () => {
    onValueChange?.(value)
    setIsOpen(false)
  }

  const isSelected = selectedValue === value

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm 
        outline-none hover:bg-gray-100 focus:bg-gray-100
        ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
      `}
      role="option"
      aria-selected={isSelected}
    >
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, options } = React.useContext(SelectContext)
  
  const displayValue = value ? options?.get(value) : null

  if (!value || !displayValue) {
    return <span className="text-gray-500">{placeholder}</span>
  }

  return <span>{displayValue}</span>
}