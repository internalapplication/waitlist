'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  'Reading your idea',
  'Choosing a design direction',
  'Writing the page',
  'Adding the waitlist form and FAQ',
  'Checking the final file',
]

export function GenerationState({ regenerating }: { regenerating: boolean }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const step = STEPS[Math.min(Math.floor(seconds / 6), STEPS.length - 1)]

  return (
    <div role="status" aria-live="polite" className="flex h-full min-h-[380px] flex-col items-center justify-center gap-4 border border-neutral-400 bg-white p-8 text-center">
      <p className="text-sm font-medium">
        {regenerating ? 'Redesigning your page…' : 'Waitlist is creating your page…'}
      </p>
      <div className="h-0.5 w-56 overflow-hidden bg-neutral-200">
        <div className="waitlist-progress-bar h-full w-1/4 bg-black" />
      </div>
      <p className="text-[11px] text-neutral-600">
        {step} · {seconds}s
      </p>
      <p className="max-w-xs text-[11px] text-neutral-500">This usually takes 15 to 40 seconds. Please keep this tab open.</p>
    </div>
  )
}
