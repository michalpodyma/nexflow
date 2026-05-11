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
  // SSR default: final value so crawlers and no-JS users see real numbers, not zeros
  const [displayed, setDisplayed] = useState<string>(value)

  const parsed = useMemo(() => parseValue(value), [value])

  useEffect(() => {
    const el = ref.current
    if (!el || !parsed) return

    // Respect reduced motion — keep final value, no count-up
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Already in viewport at mount — skip count-up to avoid visible flash of final→0→final
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return

    const runCountUp = () => {
      setDisplayed(`0${parsed.suffix}`)
      const duration = 1200
      const startTime = performance.now()

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(eased * parsed.num)
        setDisplayed(`${current}${parsed.suffix}`)
        if (progress < 1) requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.unobserve(el)
          runCountUp()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [parsed, value])

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  )
}
