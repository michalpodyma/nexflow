'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// Parses "240+" -> { num: 240, suffix: '+' }, "21+" -> { num: 21, suffix: '+' }
// "5 dni" -> null (no counter animation, render as-is)
function parseValue(value: string): { num: number; suffix: string } | null {
  const match = value.match(/^(\d+)(.*)$/)
  if (!match) return null
  return { num: parseInt(match[1], 10), suffix: match[2] }
}

export function AnimatedCounter({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayed, setDisplayed] = useState<string>('0')
  const [started, setStarted] = useState(false)

  const parsed = useMemo(() => parseValue(value), [value])

  useEffect(() => {
    if (!parsed) {
      setDisplayed(value)
      return
    }
    setDisplayed(`0${parsed.suffix}`)
  }, [value, parsed])

  useEffect(() => {
    const el = ref.current
    if (!el || !parsed) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [parsed])

  useEffect(() => {
    if (!started || !parsed) return

    // Respect reduced motion — jump straight to final value
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setDisplayed(`${parsed.num}${parsed.suffix}`)
      return
    }

    const duration = 1200
    const startTime = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(eased * parsed.num)
      setDisplayed(`${current}${parsed.suffix}`)
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [started, parsed])

  return (
    <span ref={ref} className={className}>
      {parsed ? displayed : value}
    </span>
  )
}
