'use client'

import { useEffect, useRef, useState, CSSProperties, ReactNode } from 'react'

type Direction = 'up' | 'left' | 'right' | 'none'

const hiddenTransform: Record<Direction, string> = {
  up: 'translateY(24px)',
  left: 'translateX(-24px)',
  right: 'translateX(24px)',
  none: 'none',
}

export function FadeIn({
  children,
  delay = 0,
  className = '',
  direction = 'up',
  threshold = 0.1,
}: {
  children: ReactNode
  delay?: number
  className?: string
  direction?: Direction
  threshold?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : hiddenTransform[direction],
    transition: `opacity 0.65s ease-out ${delay}ms, transform 0.65s ease-out ${delay}ms`,
    willChange: visible ? 'auto' : 'opacity, transform',
  }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
