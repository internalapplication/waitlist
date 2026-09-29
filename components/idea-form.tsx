'use client'

import { useEffect, useRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_DESCRIPTION_LENGTH } from '@/lib/utils'

interface IdeaFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  ctaLabel: string
  ctaDisabled: boolean
  ctaLoading: boolean
  readOnly?: boolean
}

export function IdeaForm({ value, onChange, onSubmit, ctaLabel, ctaDisabled, ctaLoading, readOnly }: IdeaFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea with its content (up to a limit).
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`
  }, [value])

  return (
    <div className="border-b border-neutral-300 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-neutral-600">
          <label htmlFor="product-description">YOUR IDEA</label>
          <span aria-live="polite">
            {value.length} / {MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <div className="flex flex-col gap-2 border border-neutral-400 bg-white p-2 transition-colors sm:flex-row sm:items-center sm:gap-3 hover:border-black focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
          <textarea
            id="product-description"
            ref={textareaRef}
            rows={1}
            value={value}
            readOnly={readOnly}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault()
                if (!ctaDisabled) onSubmit()
              }
            }}
            aria-label="Describe your SaaS or business"
            aria-busy={ctaLoading}
            className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-1 py-3 text-base leading-5 outline-none placeholder:text-neutral-500 sm:px-0 sm:text-sm"
            placeholder="Describe your SaaS or business..."
          />
          <Button
            onClick={onSubmit}
            disabled={ctaDisabled}
            size="sm"
            className="h-11 w-full shrink-0 rounded-none bg-black px-4 text-sm text-white hover:bg-neutral-800 sm:w-auto"
          >
            {ctaLoading ? (
              <>
                {ctaLabel} <LoaderCircle data-icon="inline-end" className="animate-spin" />
              </>
            ) : (
              ctaLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
