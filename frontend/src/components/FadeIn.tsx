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
  // mounted tracks whether JS has run — before mount we emit no inline styles so
  // SSR output is fully visible to crawlers, no-JS users, and link-preview unfurlers.
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // prefers-reduced-motion: show immediately, no animation
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setMounted(true)
      setVisible(true)
      return
    }

    // Already in viewport at mount — appear immediately without flash
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setMounted(true)
      setVisible(true)
      return
    }

    // Below the fold: opt into hidden state and watch for intersection
    setMounted(true)

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

  // Before JS mounts: no inline styles — content is visible in SSR and on no-JS paint
  if (!mounted) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

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
